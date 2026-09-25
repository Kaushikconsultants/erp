import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatTranscriptWithNames } from "@/lib/transcriptUtils";
import { getTenantAIClient } from "@/lib/gemini";
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: "Unauthorized. Please log in to analyze call recordings.",
      }, { status: 401 });
    }

    const orgId = (session.user as any).organizationId;

    const body = await req.json();
    const { audioBase64, mimeType = "audio/mp4", spokenText, callContext } = body;

    const contactPhone = callContext?.contactPhone || callContext?.phoneNumber || "Unknown";
    const contactName = callContext?.contactName || "Contact";
    const durationSec = callContext?.durationSec || 0;

    const hasAudio = Boolean(audioBase64 && audioBase64.length > 50);
    const rawText = (spokenText || "").trim();

    if (!hasAudio && !rawText) {
      return NextResponse.json({
        success: false,
        error: "No audio payload or text transcript provided",
      }, { status: 400 });
    }

    // Do not transcribe or hallucinate on unconnected calls (0s duration) without explicit spoken text
    if (!rawText && durationSec <= 0) {
      return NextResponse.json({
        success: true,
        analysis: {
          transcript: "",
          summary: "",
          keyPoints: [],
          detectedOutcome: "No Answer / Busy",
          dealSentiment: "COLD",
          sentimentReason: "Call was not connected.",
          suggestedFollowUp: {
            hasFollowUp: false,
            date: null,
            hour12: "11",
            minute: "00",
            period: "AM",
            actionTitle: "Follow-up Call",
            reason: "Call not connected"
          }
        }
      });
    }

    // 1. Resolve Rep Name (Caller)
    let repName = (callContext?.repName || callContext?.salespersonName || callContext?.employeeName || "").trim();
    if (!repName) {
      try {
        const userId = (session.user as any)?.id;
        if (userId) {
          const userRec = await prisma.user.findUnique({
            where: { id: userId },
            select: { name: true }
          });
          repName = userRec?.name || session.user?.name || "";
        } else if (session.user?.name) {
          repName = session.user.name;
        }
      } catch {}
    }
    if (!repName) repName = "Sales Rep";

    // 2. Resolve Customer Name and whether they are an Old / Existing Customer (Tenant Scoped)
    let isOldCustomer = Boolean(callContext?.customerId || callContext?.isOldCustomer);
    let resolvedCustomerName = (contactName && contactName !== "Contact" && contactName !== "Direct Contact" && contactName !== "Phone Inquiry") ? contactName.trim() : "";

    const cleanPhone = String(contactPhone || "").replace(/\D/g, "");
    if (cleanPhone.length >= 7) {
      try {
        const cust = await prisma.customer.findFirst({
          where: {
            ...(orgId ? { organizationId: orgId } : {}),
            OR: [
              { mobile: { contains: cleanPhone.slice(-10) } },
              { whatsappNumber: { contains: cleanPhone.slice(-10) } }
            ]
          },
          select: { id: true, businessName: true, contactPerson: true }
        });
        if (cust) {
          isOldCustomer = true;
          if (!resolvedCustomerName) {
            resolvedCustomerName = cust.businessName || cust.contactPerson || "";
          }
        }
      } catch {}
    }

    const customerSpeakerLabel = resolvedCustomerName
      ? `${resolvedCustomerName} (${isOldCustomer ? "Old Customer" : "Customer"})`
      : (isOldCustomer ? "Old Customer" : "Customer");

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    // Resolve tenant organization
    const orgId = (session?.user as any)?.organizationId || callContext?.organizationId || body.organizationId || null;
    const { ai, isConfigured, model: preferredModel } = await getTenantAIClient(orgId);

    if (!isConfigured) {
      const fallback = generateFallback(rawText, contactName, contactPhone, durationSec, today);
      return NextResponse.json({ success: true, analysis: fallback, note: "Offline heuristic applied (Configure Gemini in Integrations)" });
    }

    let companyName = "Espon Clothing Private Limited";
    if (orgId) {
      try {
        const cSettings = await prisma.companySettings.findFirst({
          where: { OR: [{ organizationId: orgId }, { id: `settings-${orgId}` }] },
          select: { companyName: true }
        });
        if (cSettings?.companyName) companyName = cSettings.companyName;
      } catch {}
    }

    const systemPrompt = `
You are an expert Enterprise CRM Telecalling Sales Analyst & Deal Intelligence AI.
You are analyzing cellular audio or post-call debrief audio/text between a sales representative and a customer.
The speakers may speak in English, Hindi, or Hinglish (e.g., "Customer ko 50 sets summer tracksuits chahiye ₹420 mein. Parso subah 11 baje quotation final karke call karna hai.").

Current Reference Date & Time:
- Today's Date: ${todayStr} (${dayOfWeek})
- Current Time: ${today.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}

Call Participants Context:
- Selling Company: "${companyName}"
- Sales Representative: "${repName}" (Represents ${companyName})
- Customer / Buyer: "${customerSpeakerLabel}" (Status: ${isOldCustomer ? "Existing / Old Customer of the company" : "New Contact / Lead"})
- Phone: ${contactPhone}
- Call Duration: ${durationSec} seconds

Standard CRM Outcome Categories:
${CRM_OUTCOMES.map((o) => `- "${o}"`).join("\n")}

CRITICAL SPEAKER IDENTIFICATION & SPEAKER LABELING RULES:
1. In outbound cellular phone calls:
   - When the call connects, the person who answers first and says "Hello", "Haanji", or "Yes" is almost always the CUSTOMER ("${customerSpeakerLabel}").
   - The person who introduces themselves with the company name (e.g. "${repName} this side from ${companyName}", asking about orders, sharing catalogs, discussing fabrics or prices) is the SALES REPRESENTATIVE ("${repName}").
   - The person who responds, asks who is calling ("Aap kaun bol rahe ho?", "You are from, sorry?"), responds with order plans ("Haan madam/sir next week order bolunga"), or negotiates is the CUSTOMER ("${customerSpeakerLabel}").
2. DO NOT assume the first person to speak is the sales representative. Listen carefully to WHO introduces themselves as ${repName} and who represents ${companyName}.
3. In the "transcript" field:
   - Transcribe EVERY spoken word accurately as a clean line-by-line dialogue separated by newlines.
   - ALWAYS label the sales representative's speech using their exact name: "${repName}: <utterance>"
   - ALWAYS label the customer's speech using their exact name: "${customerSpeakerLabel}: <utterance>"
   - NEVER reverse or swap these roles! If a speaker introduces herself as "${repName} this side from [Company]", that speaker MUST be labeled "${repName}:", NEVER "${customerSpeakerLabel}:".
4. If there is background noise, telephone artifacts, or low volume, do your absolute best to decipher any audible speech, words, greetings, or sounds.
5. ONLY if the audio contains 100% pure silence with zero vocalization, set "transcript" to "[Call connected - silence/hold tone]". Do NOT say "No discernible speech detected" if any words or voice can be heard.
6. In the "summary", explicitly mention "${repName}" as the sales representative and "${resolvedCustomerName || "the customer"}${isOldCustomer ? " (Old Customer)" : ""}" as the customer.

Output a single valid JSON object strictly matching this schema:
{
  "transcript": string (Clean, verbatim, punctuated transcript with exact speaker names "${repName}:" and "${customerSpeakerLabel}:"),
  "summary": string (Crisp 2-3 sentence executive summary of conversation, agreed terms, customer intent, next action),
  "keyPoints": string[] (Array of 2 to 4 bullet points highlighting essential requirements, quantities, prices, terms),
  "detectedOutcome": string (Must be EXACTLY ONE of the standard CRM Outcome Categories listed above),
  "dealSentiment": "HOT" | "WARM" | "COLD",
  "sentimentReason": string (1 concise sentence explaining the sentiment rating),
  "suggestedFollowUp": {
    "hasFollowUp": boolean,
    "date": string | null (YYYY-MM-DD date based on reference date, or null if no follow-up needed),
    "hour12": string ("01" to "12"),
    "minute": string ("00", "15", "30", "45"),
    "period": "AM" | "PM",
    "actionTitle": string (Clear actionable task title, e.g. "Send Quotation for 50 Tracksuits & Follow-up"),
    "reason": string
  },
  "orderValueEstimate": number | null (Numeric estimated amount in INR if mentioned, else null),
  "suggestedLeadStatus": "Contacted" | "Quotation Sent" | "Negotiation" | "Converted" | "Lost"
}
`;

    let contents: any;
    if (hasAudio) {
      let cleanMime = (mimeType || "audio/mp4").split(";")[0].trim().toLowerCase();
      let rawAudioB64 = audioBase64;
      if (typeof rawAudioB64 === "string") {
        if (rawAudioB64.startsWith("data:")) {
          const match = rawAudioB64.match(/^data:([^;]+);base64,/);
          if (match && match[1]) {
            cleanMime = match[1].trim().toLowerCase();
          }
        }
        if (rawAudioB64.includes(",")) {
          rawAudioB64 = rawAudioB64.split(",")[1];
        }
      }
      if (cleanMime === "audio/mp3") cleanMime = "audio/mpeg";
      if (cleanMime === "audio/m4a" || cleanMime === "audio/x-m4a") cleanMime = "audio/mp4";

      contents = [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType: cleanMime,
            data: rawAudioB64,
          },
        },
      ];
      if (rawText) {
        contents.push({ text: `Additional notes or partial transcript: "${rawText}"` });
      }
    } else {
      contents = `${systemPrompt}\n\nSpoken Debrief Voice Text:\n"${rawText}"`;
    }

    let responseText = "";
    let parseSuccess = false;

    const candidateModels = [
      preferredModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest"
    ].filter((m, idx, arr) => m && arr.indexOf(m) === idx);

    // Multi-model resilience loop
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });
        responseText = response.text || "";
        if (responseText.trim()) {
          parseSuccess = true;
          break;
        }
      } catch (genErr: any) {
        console.warn(`Gemini model ${model} attempt failed:`, genErr?.message || genErr);
      }
    }

    if (!parseSuccess || !responseText) {
      const fallback = generateFallback(rawText, contactName, contactPhone, durationSec, today);
      return NextResponse.json({ success: true, analysis: fallback });
    }

    let parsed: any;
    try {
      const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanJson);
    } catch {
      const fallback = generateFallback(rawText, contactName, contactPhone, durationSec, today);
      return NextResponse.json({ success: true, analysis: fallback });
    }

    const validOutcome = CRM_OUTCOMES.includes(parsed.detectedOutcome)
      ? parsed.detectedOutcome
      : durationSec > 10
      ? "Interested / Follow-up Needed"
      : "No Answer / Busy";

    const validSentiment = ["HOT", "WARM", "COLD"].includes(parsed.dealSentiment?.toUpperCase())
      ? parsed.dealSentiment.toUpperCase()
      : "WARM";

    const rawTranscript = parsed.transcript || rawText || `Call discussion with ${contactName} (${contactPhone}).`;
    const formattedTranscript = formatTranscriptWithNames(rawTranscript, repName, resolvedCustomerName, isOldCustomer);

    const analysis = {
      transcript: formattedTranscript,
      summary: parsed.summary || `Call completed with ${contactName}. Duration: ${durationSec}s.`,
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
        ? parsed.keyPoints
        : [`Call duration: ${durationSec}s`, `Outcome: ${validOutcome}`],
      detectedOutcome: validOutcome,
      dealSentiment: validSentiment,
      sentimentReason: parsed.sentimentReason || "Evaluated from call audio analysis.",
      suggestedFollowUp: {
        hasFollowUp: parsed.suggestedFollowUp?.hasFollowUp ?? true,
        date: parsed.suggestedFollowUp?.date || getDefaultFollowUpDate(1),
        hour12: parsed.suggestedFollowUp?.hour12 || "11",
        minute: parsed.suggestedFollowUp?.minute || "00",
        period: parsed.suggestedFollowUp?.period === "PM" ? "PM" : "AM",
        actionTitle: parsed.suggestedFollowUp?.actionTitle || `Follow-up call with ${contactName}`,
        reason: parsed.suggestedFollowUp?.reason || "Discuss sales next steps",
      },
      orderValueEstimate: parsed.orderValueEstimate || null,
      suggestedLeadStatus: parsed.suggestedLeadStatus || "Contacted",
    };

    return NextResponse.json({ success: true, analysis });
  } catch (error: any) {
    console.error("POST /api/calls/analyze-debrief error:", error);
    return NextResponse.json({
      success: false,
      error: error?.message || "Internal server error analyzing call audio",
    }, { status: 500 });
  }
}

function getDefaultFollowUpDate(daysAhead: number = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generateFallback(text: string, contactName: string, phone: string, durationSec: number, refDate: Date) {
  const lower = (text || "").toLowerCase();
  let outcome = durationSec > 10 ? "Interested / Follow-up Needed" : "No Answer / Busy";
  let sentiment = "WARM";

  if (lower.includes("order") || lower.includes("confirm") || lower.includes("done") || lower.includes("closed")) {
    outcome = "Order Placed / Deal Closed";
    sentiment = "HOT";
  } else if (lower.includes("quotation") || lower.includes("quote") || lower.includes("estimate") || lower.includes("rate")) {
    outcome = "Quotation Requested";
    sentiment = "HOT";
  } else if (lower.includes("not interested") || lower.includes("nahi chahiye") || lower.includes("lost")) {
    outcome = "Not Interested / Lost";
    sentiment = "COLD";
  }

  const d = new Date(refDate);
  d.setDate(d.getDate() + 1);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return {
    transcript: text ? text : (durationSec > 0 ? `Call conversation with ${contactName} (${phone}) recorded (${durationSec}s). Audio replay available.` : ""),
    summary: text
      ? `Call connected with ${contactName}. Spoke for ${durationSec}s. Outcome marked as ${outcome}.`
      : `Call connected with ${contactName} (${phone}) for ${durationSec}s. Audio recording attached.`,
    keyPoints: [
      `Contact: ${contactName} (${phone})`,
      `Duration: ${durationSec} seconds`,
      `Outcome: ${outcome}`,
    ],
    detectedOutcome: outcome,
    dealSentiment: sentiment,
    sentimentReason: "Synthesized based on call context.",
    suggestedFollowUp: {
      hasFollowUp: outcome !== "Not Interested / Lost",
      date: `${yyyy}-${mm}-${dd}`,
      hour12: "11",
      minute: "00",
      period: "AM",
      actionTitle: `Follow-up with ${contactName}`,
      reason: "Continue discussion",
    },
    suggestedLeadStatus: outcome === "Order Placed / Deal Closed" ? "Converted" : "Contacted",
  };
}
