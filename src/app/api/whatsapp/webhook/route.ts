import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleIncomingAILogic } from "@/lib/whatsappAI";
import { executeFlowEngine } from "@/lib/whatsappFlowEngine";

// GET Endpoint - Webhook Verification Challenge from Meta WhatsApp API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "espon_whatsapp_secure_webhook_token_2026";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verification successful!");
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Forbidden - Invalid verify token" }, { status: 403 });
}

// POST Endpoint - Incoming Messages & Delivery Receipts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: "ignored" });
    }

    // ══════════════════════════════════════════════════════
    // 0. EMERGENCY DEBUG LOGGING (Raw Payload Dump)
    // ══════════════════════════════════════════════════════
    try {
      const dbAccount = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({ data: { name: "Debug", phoneNumber: "000", status: "CONNECTED" } });
      let debugCustomer = await prisma.customer.findFirst({ where: { mobile: "0000000000" } });
      if (!debugCustomer) debugCustomer = await prisma.customer.create({ data: { businessName: "Debug", contactPerson: "Debug", mobile: "0000000000" } });
      let debugConv = await prisma.whatsAppConversation.findFirst({ where: { customerId: debugCustomer.id } });
      if (!debugConv) debugConv = await prisma.whatsAppConversation.create({ data: { accountId: dbAccount.id, customerId: debugCustomer.id, status: "OPEN" } });
      
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: debugConv.id,
          senderType: "SYSTEM",
          senderName: "WEBHOOK_PAYLOAD_DUMP",
          messageType: "TEXT",
          content: JSON.stringify(body).slice(0, 4000),
          status: "SENT",
          sentAt: new Date()
        }
      });
    } catch (e) {
      console.error("Failed to dump raw payload", e);
    }

    // ══════════════════════════════════════════════════════
    // 1. PROCESS INCOMING MESSAGES
    // ══════════════════════════════════════════════════════
    if (value.messages && value.messages.length > 0) {
      const metadata = value.metadata;
      
      // Ensure we only process messages for our specific CRM phone number (7404388242)
      // because Meta Webhook sends events for ALL numbers attached to the Meta App.
      if (metadata && metadata.display_phone_number !== '917404388242') {
        console.log(`[WhatsApp Webhook] Ignored message for other number: ${metadata.display_phone_number}`);
        return NextResponse.json({ status: "ignored - different phone number" });
      }

      const msg = value.messages[0];
      const fromPhone = msg.from;
      const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10);
      
      const isMedia = ["image", "video", "audio", "document"].includes(msg.type);
      const mediaId = isMedia ? msg[msg.type]?.id : null;
      const mediaMimeType = isMedia ? msg[msg.type]?.mime_type : null;
      const proxyMediaUrl = mediaId ? `/api/whatsapp/media/${mediaId}` : null;
      
      const textContent = msg.text?.body || msg[msg.type]?.caption || msg.interactive?.button_reply?.title || (isMedia ? `[${msg.type.toUpperCase()}]` : "[Message]");

      // Feature 5: Extract WhatsApp Profile Name from Meta payload
      const whatsappProfileName = value.contacts?.[0]?.profile?.name || null;

      // Step A: Search CRM by Phone Number
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { mobile: { contains: cleanPhone } },
            { whatsappNumber: { contains: cleanPhone } }
          ]
        }
      });

      // Step B: Auto-create Contact/Lead if customer does not exist
      if (!customer) {
        const defaultEmployee = await prisma.employee.findFirst();
        customer = await prisma.customer.create({
          data: {
            businessName: whatsappProfileName ? `WhatsApp Lead (${whatsappProfileName})` : `WhatsApp Lead (${cleanPhone})`,
            contactPerson: whatsappProfileName || `Contact +91 ${cleanPhone}`,
            mobile: cleanPhone,
            whatsappNumber: cleanPhone,
            customerType: "Wholesaler",
            status: "New Lead",
            leadStage: "New Enquiry",
            temperature: "HOT",
            assignedSalespersonId: defaultEmployee?.id,
            tags: "WhatsApp Lead, Auto Created"
          }
        });
      } else if (whatsappProfileName && (customer.contactPerson?.startsWith("Contact +91") || customer.contactPerson === "Unknown Lead" || !customer.contactPerson)) {
        // Feature 5: Update contact name if it was an auto-placeholder or Unknown
        await prisma.customer.update({
          where: { id: customer.id },
          data: { contactPerson: whatsappProfileName }
        });
        customer = { ...customer, contactPerson: whatsappProfileName };
      }

      // Step C: Link/Find Conversation
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: { customerId: customer.id }
      });

      const account = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({
        data: {
          name: "Main WhatsApp",
          phoneNumber: "+91 7206066678",
          status: "CONNECTED"
        }
      });

      const messageTimestamp = new Date(parseInt(msg.timestamp) * 1000 || Date.now());

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            accountId: account.id,
            customerId: customer.id,
            assignedEmployeeId: customer.assignedSalespersonId,
            status: "OPEN",
            priority: "HIGH",
            leadStatus: customer.leadStage || "New Lead",
            lastMessageText: textContent,
            lastMessageAt: messageTimestamp,
            unreadCount: 1,
            tags: customer.tags
          }
        });
      } else {
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageText: textContent,
            lastMessageAt: messageTimestamp,
            unreadCount: conversation.unreadCount + 1,
            status: "OPEN"
          }
        });
      }

      // Step D: Store Incoming Message
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          senderName: customer.contactPerson,
          messageType: msg.type ? msg.type.toUpperCase() : "TEXT",
          content: textContent,
          mediaUrl: proxyMediaUrl,
          mediaType: mediaMimeType,
          status: "RECEIVED",
          metaMessageId: msg.id,
          sentAt: messageTimestamp
        }
      });

      console.log(`[WhatsApp Webhook] Incoming message from +91 ${cleanPhone}: "${textContent.slice(0, 50)}"`);

      // Feature 1: Send Web Push Notification to all subscribed agents
      sendPushNotificationToAgents(
        `💬 ${customer.contactPerson || '+91 ' + cleanPhone}`,
        textContent.slice(0, 100),
        `/whatsapp/inbox`
      ).catch((e) => console.error("[Push] Failed:", e.message));

      // Feature 2: Chatbot Flow Engine — check if a flow should intercept
      const isTextMessage = msg.type === "text" || msg.type === "interactive";
      if (isTextMessage) {
        const flowHandled = await executeFlowEngine(fromPhone, textContent, conversation.id);

        if (!flowHandled && conversation.aiHandled) {
          // Feature 7: AI + Logging
          const aiStart = Date.now();
          const recentMessages = await prisma.whatsAppMessage.findMany({
            where: { conversationId: conversation.id, senderType: { in: ["CUSTOMER", "AGENT", "AI"] } },
            orderBy: { sentAt: 'desc' },
            take: 6
          });
          const historyLines = recentMessages.reverse().map(m => `${m.senderType}: ${m.content}`);

          let aiResponse: string | null = null;
          let aiStatus = "SUCCESS";
          let aiError: string | undefined;
          let toolsCalled = "none";

          try {
            aiResponse = await handleIncomingAILogic(fromPhone, textContent, historyLines);
            // Detect which tools were called from the response content
            const tools: string[] = [];
            if (textContent.match(/[12]\d{3}/)) tools.push("lookupOrder");
            if (/shirt|short|combo|pant|product/i.test(textContent)) tools.push("searchProducts");
            if (/size|weight|kg|cm|waist/i.test(textContent)) tools.push("recommendSize");
            toolsCalled = tools.length > 0 ? tools.join(", ") : "ai_reply";
          } catch (e: any) {
            aiStatus = "FAILED";
            aiError = e.message;
          }

          const aiDuration = Date.now() - aiStart;

          // Feature 7: Log AI execution to DB
          await prisma.whatsAppAILog.create({
            data: {
              phone: cleanPhone,
              userMessage: textContent.slice(0, 500),
              aiReply: aiResponse?.slice(0, 2000) || null,
              toolsCalled,
              status: aiStatus,
              errorMessage: aiError,
              durationMs: aiDuration
            }
          }).catch(() => {}); // Non-critical, don't fail webhook on log error

          if (aiResponse) {
            await prisma.whatsAppMessage.create({
              data: {
                conversationId: conversation.id,
                senderType: "AI",
                senderName: "AI Assistant",
                messageType: "TEXT",
                content: aiResponse,
                status: "SENT",
                sentAt: new Date()
              }
            });
          }
        }
      }
    }

    // ══════════════════════════════════════════════════════
    // 2. PROCESS MESSAGE STATUS UPDATES (Delivered, Read, Failed)
    // ══════════════════════════════════════════════════════
    if (value.statuses && value.statuses.length > 0) {
      const statusUpdate = value.statuses[0];
      const metaMessageId = statusUpdate.id;
      const status = statusUpdate.status.toUpperCase();

      console.log(`[WhatsApp Webhook] Status update: ${status} for msg ID: ${metaMessageId}`);

      const updateData: any = { status };
      if (status === 'DELIVERED') updateData.deliveredAt = new Date(parseInt(statusUpdate.timestamp) * 1000 || Date.now());
      if (status === 'READ') updateData.readAt = new Date(parseInt(statusUpdate.timestamp) * 1000 || Date.now());

      try {
        await prisma.whatsAppMessage.updateMany({
          where: { metaMessageId },
          data: updateData
        });
      } catch (_) {
        console.warn(`[WhatsApp Webhook] Could not update status for message ID ${metaMessageId}`);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Fire-and-forget Web Push to all subscribed agents
async function sendPushNotificationToAgents(title: string, body: string, url: string) {
  const subs = await prisma.whatsAppPushSubscription.findMany();
  if (subs.length === 0) return;

  const payload = JSON.stringify({ title, body, data: { url } });
  const baseUrl = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  for (const sub of subs) {
    try {
      const subscription = {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth }
      };

      // Call our own internal push endpoint (avoids importing web-push in Edge Runtime)
      await fetch(`${baseUrl}/api/push/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-secret': process.env.INTERNAL_API_SECRET || 'crm_internal_2026' },
        body: JSON.stringify({ subscription, payload })
      });
    } catch (_) {}
  }
}
