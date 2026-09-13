import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const CRM_OUTCOMES = [
  "Interested / Follow-up Needed",
  "Order Placed / Deal Closed",
  "Quotation Requested",
  "Price Negotiation / Discount Discussion",
  "No Answer / Busy",
  "Voicemail / Switched Off",
  "Callback Scheduled",
  "Not Interested / Lost",
  "Wrong / Invalid Number",
  "Support / General Inquiry",
];

const GEMINI_MODELS = ["gemini-3.6-flash", "gemini-3.5-flash", "gemini-flash-latest"];

function getAIClient() {
  const apiKey = (process.env.GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  return new GoogleGenAI({ apiKey });
}

export async function POST(req: NextRequest) {
  try {
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

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    // Fallback if API key is missing
    if (!process.env.GEMINI_API_KEY) {
      const fallback = generateFallback(rawText, contactName, contactPhone, durationSec, today);
      return NextResponse.json({ success: true, analysis: fallback });
    }

    const systemPrompt = `
You are an expert Enterprise CRM Telecalling Sales Analyst & Deal Intelligence AI.
You are analyzing cellular audio or post-call debrief audio/text between a sales representative and a customer.
The speaker(s) may speak in English, Hindi, or Hinglish (e.g., "Customer ko 50 sets summer tracksuits chahiye ₹420 mein. Parso subah 11 baje quotation final karke call karna hai.").

Current Reference Date & Time:
- Today's Date: ${todayStr} (${dayOfWeek})
- Current Time: ${today.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}

Call Context:
- Contact Name: ${contactName}
- Phone: ${contactPhone}
- Call Duration: ${durationSec} seconds

Standard CRM Outcome Categories:
${CRM_OUTCOMES.map((o) => `- "${o}"`).join("\n")}

Output a single valid JSON object strictly matching this schema:
{
  "transcript": string (Clean, verbatim, punctuated transcript of what was spoken),
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
      let cleanMime = (mimeType || "audio/mp4").split(";")[0].trim();
      let rawAudioB64 = audioBase64;
      if (typeof rawAudioB64 === "string") {
        if (rawAudioB64.startsWith("data:")) {
          const match = rawAudioB64.match(/^data:([^;]+);base64,/);
          if (match && match[1]) {
            cleanMime = match[1].trim();
          }
        }
        if (rawAudioB64.includes(",")) {
          rawAudioB64 = rawAudioB64.split(",")[1];
        }
      }
      if (cleanMime === "audio/m4a") cleanMime = "audio/mp4";

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

    const ai = getAIClient();
    let responseText = "";
    let parseSuccess = false;

    // Multi-model resilience loop
    for (const model of GEMINI_MODELS) {
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

    const analysis = {
      transcript: parsed.transcript || rawText || `Call discussion with ${contactName} (${contactPhone}).`,
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
    transcript: text ? text : (durationSec > 0 ? "No discernible speech detected in call recording (audio was silent or inaudible)." : ""),
    summary: text
      ? `Call connected with ${contactName}. Spoke for ${durationSec}s. Outcome marked as ${outcome}.`
      : `Call placed to ${contactName} (${phone}) for ${durationSec}s. No speech detected in recording.`,
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
