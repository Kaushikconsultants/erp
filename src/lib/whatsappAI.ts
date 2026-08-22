import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessageAction } from "@/app/actions/whatsAppPlatformActions";

// Environment setup (fallbacks for missing envs, usually filled in Vercel)
const SHOPIFY_STORE_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL || process.env.SHOPIFY_STORE_URL || 'i2tu0d-jc.myshopify.com';
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

/**
 * Multi-Model LLM Router
 * Supports OpenAI, Anthropic, and Google Gemini
 */
export async function callAIEngine(messages: any[], aiModel: string, jsonMode = false, maxTokens = 600) {
  try {
    if (aiModel.includes('gpt')) {
      return await generateOpenAI(messages, maxTokens);
    } else if (aiModel.includes('claude')) {
      return await generateAnthropic(messages, maxTokens);
    } else if (aiModel.includes('gemini')) {
      return await generateGemini(messages, maxTokens);
    } else {
      // Fallback
      return await generateOpenAI(messages, maxTokens);
    }
  } catch (error: any) {
    console.error(`[AI Engine Error] Model: ${aiModel} failed:`, error.message);
    if (!aiModel.includes('gpt') && OPENAI_API_KEY) {
      console.log(`[AI Engine] Attempting failover to OpenAI (GPT-4o)`);
      return await generateOpenAI(messages, maxTokens);
    }
    throw new Error('All models failed: ' + error.message);
  }
}

async function generateOpenAI(messages: any[], maxTokens: number) {
  if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is missing");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o", messages, temperature: 0.7, max_tokens: maxTokens })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices[0].message.content;
}

async function generateAnthropic(messages: any[], maxTokens: number) {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is missing");
  // Extract system prompt since Anthropic separates it
  const systemMsg = messages.find(m => m.role === 'system')?.content || "";
  const userMsgs = messages.filter(m => m.role !== 'system');
  
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-3-5-sonnet-20240620", system: systemMsg, messages: userMsgs, max_tokens: maxTokens, temperature: 0.7 })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.content[0].text;
}

async function generateGemini(messages: any[], maxTokens: number) {
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is missing");
  let systemInstruction = null;
  const contents = [];
  for (const msg of messages) {
    if (msg.role === 'system') systemInstruction = { parts: [{ text: msg.content }] };
    else contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: msg.content }] });
  }

  const payload: any = { contents, generationConfig: { temperature: 0.7, maxOutputTokens: maxTokens } };
  if (systemInstruction) payload.systemInstruction = systemInstruction;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data.candidates[0].content.parts[0].text;
}

/**
 * Shopify Order Lookup with 10-Digit Mobile Verification
 */
export async function lookupOrder(orderNumber: string, senderPhone = '', userText = '', history = '') {
  const pureNum = String(orderNumber || '').replace(/[^0-9]/g, '');
  const cleanSender = String(senderPhone || '').replace(/\D/g, '').slice(-10);

  try {
    let order: any = null;

    if (!order && pureNum && SHOPIFY_ACCESS_TOKEN) {
      const url = `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/orders.json?status=any&name=${pureNum}`;
      const res = await fetch(url, {
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        }
      });
      const data = await res.json();
      const orders = data.orders || [];
      if (orders.length > 0) {
        order = orders[0];
      }
    }

    if (!order) {
      return { error: `No matching order found in store for ${pureNum ? '#' + pureNum : cleanSender}.` };
    }

    const registeredPhone = order.phone || order.customer?.phone || order.shipping_address?.phone || cleanSender || '';
    const order10Digits = String(registeredPhone).replace(/[^0-9]/g, '').slice(-10);

    const destination_location = `${order.shipping_address?.city || 'India'}, ${order.shipping_address?.province || ''} - ${order.shipping_address?.zip || ''}`.replace(/^[,\s-]+|[,\s-]+$/g, '') || 'India';
    const courier_company = order.fulfillments?.[0]?.tracking_company || 'Standard Delivery';
    const tracking_url = order.fulfillments?.[0]?.tracking_url || order.fulfillments?.[0]?.tracking_urls?.[0] || '';
    const rawStatus = order.fulfillment_status || 'unfulfilled';
    const readableStatus = rawStatus === 'fulfilled' ? 'FULFILLED / SHIPPED (In Transit)' : rawStatus.toUpperCase();

    const finStatus = (order.financial_status || '').toLowerCase();
    const totalAmount = `₹${order.total_price || 0}`;
    const payment_status = finStatus === 'paid'
      ? `💳 PAID ONLINE (Prepaid - ${totalAmount})`
      : finStatus === 'partially_paid'
      ? `🪙 PARTIALLY PAID (Advance Paid | Balance to Pay on COD: ${totalAmount})`
      : `💵 CASH ON DELIVERY (COD | Please Pay ${totalAmount} on Delivery)`;

    return {
      order_number: order.name,
      registered_mobile_10_digits: order10Digits || 'No mobile registered',
      status: readableStatus,
      payment_status,
      financial_status: order.financial_status,
      total_price: totalAmount,
      destination_location,
      courier_company,
      tracking_url,
      CRITICAL_INSTRUCTION_TO_AI: `You MUST compare Customer ka Current WhatsApp Number or Customer ka bataya hua 10-digit number with registered_mobile_10_digits (${order10Digits}). If they DO NOT MATCH exactly, DO NOT reveal status or tracking_url! When answering order status, ALWAYS clearly state the payment_status (${payment_status}) and order status. Never output '[SHOPIFY ORDER RESULT...]' or any JSON in your reply!`
    };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * Smart keyword extractor for Shopify GraphQL search
 */
function extractProductKeyword(text: string) {
  if (/combo|trio|pack|offer|deal|discount/i.test(text)) {
    if (!/short|oversize|t\-?i?shirt|shirt|tee|pant|track/i.test(text)) {
      return '';
    }
  }
  const terms = [];
  if (/short/i.test(text)) terms.push('shorts');
  if (/oversize|t\-?i?shirt|shirt|tee/i.test(text)) terms.push('shirt');
  if (/pant|track|lower|trouser/i.test(text)) terms.push('pant');
  return terms.join(' ');
}

/**
 * Shopify GraphQL Dynamic Product Search
 */
export async function searchProducts(userText: string) {
  const cleanKeyword = extractProductKeyword(userText);
  if (!SHOPIFY_ACCESS_TOKEN) return { error: 'No Shopify access token configured' };

  const query = `
    query SearchProducts($query: String!) {
      products(first: 5, query: $query) {
        edges {
          node {
            id
            title
            handle
            featuredImage { url }
            variants(first: 1) {
              edges {
                node { price }
              }
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch(
      `https://${SHOPIFY_STORE_URL}/admin/api/2024-10/graphql.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ query, variables: { query: `status:active ${cleanKeyword}` } })
      }
    );
    const data = await res.json();
    let edges = data?.data?.products?.edges || [];

    const productLines: string[] = [];
    const carouselCards: any[] = [];
    
    edges.forEach((e: any) => {
      const p = e.node;
      const singlePrice = p.variants.edges[0]?.node?.price || 'N/A';
      
      let cardPrice = `₹${singlePrice}`;
      let productUrl = `https://${SHOPIFY_STORE_URL}/products/${p.handle}`;

      productLines.push(`Product: ${p.title} - Price: ₹${singlePrice}`);
      
      carouselCards.push({
        title: p.title.slice(0, 60),
        price: cardPrice.slice(0, 160),
        image_url: p.featuredImage?.url || '',
        url: productUrl
      });
    });

    return { textLines: productLines, carouselCards };
  } catch (err: any) {
    return { error: err.message };
  }
}

/**
 * AI Size & Fit Advisor Tool
 */
export function recommendSize(userText: string) {
  const weightMatch = userText.match(/(?:weight\s*is\s*|weight\s*|wt\s*|@\s*|^|\D)(\d{2,3})\s*(?:kg|kilo|k)\b/i) || userText.match(/\b(\d{2,3})\s*(?:kg|kilo)\b/i);
  const waistMatch = userText.match(/(?:waist|kamar)\s*(?:is\s*|of\s*|=|-|:)?\s*(\d{2})\b/i) || userText.match(/\b(\d{2})\s*(?:waist|kamar|inch|in)\b/i);

  if (weightMatch) {
    const kg = parseInt(weightMatch[1], 10);
    let teeSize = 'M (Medium)';
    let teeChest = '44"';
    let bottomSize = 'L (30-32" waist)';
    if (kg < 60) {
      teeSize = 'S (Small)'; teeChest = '42"'; bottomSize = 'M (28-30" waist)';
    } else if (kg <= 72) {
      teeSize = 'M (Medium)'; teeChest = '44"'; bottomSize = 'M or L (29-31" waist)';
    } else if (kg <= 84) {
      teeSize = 'L (Large)'; teeChest = '46"'; bottomSize = 'L or XL (31-33" waist)';
    } else if (kg <= 95) {
      teeSize = 'XL (Extra Large)'; teeChest = '48"'; bottomSize = 'XL or XXL (33-35" waist)';
    } else {
      teeSize = 'XXL (Double XL)'; teeChest = '50"'; bottomSize = 'XXL (35-37" waist)';
    }

    return `[SIZE & FIT RECOMMENDATION FOR WEIGHT ~${kg} KG]:\n` +
      `👕 Oversized T-Shirts: Recommended Size **${teeSize}** (Chest ${teeChest} | Premium Boxy Drop-Shoulder Fit)\n` +
      `🩳 Shorts & Track Pants: Recommended Size **${bottomSize}** (4-Way Lycra stretchable waistband with drawstring)\n` +
      `💡 Note: Our tees already have a stylish drop-shoulder oversized streetwear cut — no need to size up for an oversized look!`;
  }

  if (waistMatch) {
    const waist = parseInt(waistMatch[1], 10);
    let bottomSize = 'M (Medium - 28-30")';
    if (waist >= 35) bottomSize = 'XXL (Double XL - 34-36"+)';
    else if (waist >= 33) bottomSize = 'XL (Extra Large - 32-34")';
    else if (waist >= 31) bottomSize = 'L (Large - 30-32")';

    return `[SIZE RECOMMENDATION FOR ~${waist}" WAIST]:\n` +
      `🩳 Recommended Bottom Size: **${bottomSize}** (4-Way Lycra stretchable waistband + adjustable drawstring for perfect comfort)\n` +
      `👕 For Oversized Tees: Choose based on chest/weight (M for 65-75kg, L for 75-85kg, XL for 85-95kg).`;
  }

  return `[GENERAL SIZE & FIT GUIDE]:\n` +
    `👕 Oversized T-Shirts (Combed Cotton Drop-Shoulder Boxy Fit):\n` +
    `   • S: Chest 42" (~50-63 kg)\n` +
    `   • M: Chest 44" (~63-73 kg)\n` +
    `   • L: Chest 46" (~74-84 kg)\n` +
    `   • XL: Chest 48" (~85-95 kg)\n` +
    `   • XXL: Chest 50" (~96-110 kg)\n` +
    `🩳 4-Way Lycra Shorts & Track Pants (Stretchable Waistband):\n` +
    `   • M (28-30"), L (30-32"), XL (32-34"), XXL (34-36"+)\n` +
    `💡 Advice: Our tees are already oversized streetwear fit — take your normal size!`;
}

/**
 * Generate AI Response and send it back to user
 */
export async function handleIncomingAILogic(senderPhone: string, userText: string, historyLines: string[]) {
  const history = historyLines.join('\n');
  let toolContext = '';
  
  // 1. Order Lookup Tool
  let orderNumToLookup = null;
  const digitsOnly = userText.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 10) {
    const historyOrderMatch = history.match(/(?:#|order\s*)([12]\d{3})\b/i) || history.match(/\b([12]\d{3})\b/);
    if (historyOrderMatch) orderNumToLookup = historyOrderMatch[1];
  } else {
    const explicitOrderMatch = userText.match(/(?:order|#)\s*([12]\d{3})\b/i);
    if (explicitOrderMatch) {
      orderNumToLookup = explicitOrderMatch[1];
    } else {
      const standaloneMatch = userText.match(/(?:^|\D)([12]\d{3})(?:\D|$)/);
      if (standaloneMatch) orderNumToLookup = standaloneMatch[1];
    }
  }

  if (orderNumToLookup) {
    const orderInfo = await lookupOrder(orderNumToLookup, senderPhone, userText, history);
    toolContext += `\n[SHOPIFY ORDER RESULT FOR #${orderNumToLookup}]: ${JSON.stringify(orderInfo)}`;
  }

  // 2. Product Search Tool
  const productKeywords = /short|combo|trio|pack|t\-?shirt|shirt|oversize|tee|pant|track|lower|trouser|clothes|dikhao|price|offer|deal|discount|buy|link|item|product|collection|catalog|sell|shop|store|show/i;
  if (productKeywords.test(userText)) {
    const productsInfo = await searchProducts(userText);
    if (productsInfo && productsInfo.textLines) {
      toolContext += `\n[SHOPIFY GRAPHQL PRODUCTS RESULT]: ${JSON.stringify(productsInfo.textLines)}`;
    }
  }

  // 3. Size Advisor Tool
  if (/size|fit|height|weight|wt\b|lamba|inch|cm|kg|kilo|medium|large|small|xl|xxl|5['']?\d|6['']?\d|waist|kamar|seena|chest/i.test(userText)) {
    const sizeInfo = recommendSize(userText);
    toolContext += `\n${sizeInfo}`;
  }

  const systemPrompt = `Tum ek AI Sales Assistant ho!
=== 🗣️ DYNAMIC LANGUAGE & TONE MIRRORING ===
- AUTOMATIC LANGUAGE SWITCHING: Customer jis language mein message kare, ussi language mein reply karo!
- SHORT & CRISP REPLIES: Max 2-4 lines. Never write long essays on WhatsApp.

=== 🔐 CUSTOMER LIVE WHATSAPP NUMBER ===
Customer ka Current WhatsApp Number: ${senderPhone}

=== 🚨 CRITICAL RULE ===
KABHI BHI "[SHOPIFY ORDER RESULT...]" ya koi JSON bracket text customer ko MAT bhejna. Natural text format me bhejo.

=== 🚨 CRITICAL SECURITY VERIFICATION ===
1. ORDER NUMBER FORMAT: Orders "#" se start hote hain.
2. AGAR CUSTOMER NE ORDER NUMBER DIYA H: Unse unka registered 10-digit number puchho verification ke liye (AGAR number already provided tool info me match nahi hota toh). Agar match ho jaye tabhi tracking details share karo.

RECENT CONVERSATION HISTORY:
${history}

TOOLS DATA (USE THIS TO ANSWER):
${toolContext}

CUSTOMER NEW MESSAGE:
${userText}`;

  // Fetch dynamic AI settings from DB
  const settings = await prisma.whatsAppSettings.findFirst();
  const activeModel = settings?.aiModel || "gpt-4o";

  try {
    const aiReply = await callAIEngine(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText }
      ],
      activeModel, false, 600
    );

    // Dispatch the message via live Meta API action
    if (aiReply) {
      // Create a simulated request format since sendWhatsAppMessageAction takes an object now
      await sendWhatsAppMessageAction({
        conversationId: "internal-ai-hook",
        senderId: "system",
        senderType: "AGENT", 
        messageType: "TEXT",
        content: aiReply,
        senderName: "AI Assistant",
        isInternalNote: false
      }).catch(e => {
        // If it throws, we ignore because we'll return aiReply and webhook can dispatch it
      });
    }
    
    return aiReply;
  } catch (err: any) {
    console.error("AI Generation failed:", err.message);
    return null;
  }
}
