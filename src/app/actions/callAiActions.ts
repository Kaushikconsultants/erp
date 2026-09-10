"use server";

import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY || "";
  return new GoogleGenAI({ apiKey });
}

export interface CallVoiceDebriefAnalysis {
  transcript: string;
  summary: string;
  keyPoints: string[];
  detectedOutcome: string;
  dealSentiment: "HOT" | "WARM" | "COLD";
  sentimentReason: string;
  suggestedFollowUp: {
    hasFollowUp: boolean;
    date: string | null; // YYYY-MM-DD
    hour12: string; // "01"-"12"
    minute: string; // "00", "15", "30", "45"
    period: "AM" | "PM";
    actionTitle: string;
    reason: string;
  };
  orderValueEstimate?: number | null;
  suggestedLeadStatus?: string | null;
}

export interface AnalyzeDebriefPayload {
  spokenText?: string;
  audioBase64?: string;
  mimeType?: string;
  callContext?: {
    contactName?: string;
    contactPhone?: string;
    durationSec?: number;
    customerId?: string;
    leadId?: string;
  };
}

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
  "Support / General Inquiry"
];

/**
 * AI Voice Debrief Analyzer
 * Takes raw spoken voice transcription or audio recording and extracts structured sales intelligence.
 */
export async function analyzeCallVoiceDebrief(
  payload: AnalyzeDebriefPayload
): Promise<{ success: boolean; analysis?: CallVoiceDebriefAnalysis; error?: string }> {
  try {
    const rawText = (payload.spokenText || "").trim();
    const hasAudio = Boolean(payload.audioBase64);

    if (!rawText && !hasAudio) {
      return { success: false, error: "No voice audio or transcription provided." };
    }

    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const dayOfWeek = today.toLocaleDateString("en-US", { weekday: "long" });

    // Fallback parser if API key is not configured
    if (!process.env.GEMINI_API_KEY) {
      const fallbackAnalysis = generateFallbackDebrief(rawText, today);
      return { success: true, analysis: fallbackAnalysis };
    }

    const systemPrompt = `
You are an expert Enterprise CRM Telecalling Sales Analyst & Deal Intelligence AI.
Analyze the following post-call voice debrief spoken by a sales representative.
The sales rep may speak in English, Hindi, or Hinglish (e.g., "Customer ko 50 sets summer tracksuits chahiye ₹420 mein. Parso subah 11 baje quotation final karke call karna hai.").

Current Reference Date & Time:
- Today's Date: ${todayStr} (${dayOfWeek})
- Current Time: ${today.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}

Call Context:
- Contact Name: ${payload.callContext?.contactName || "Direct Contact"}
- Phone: ${payload.callContext?.contactPhone || "Unknown"}
- Call Duration: ${payload.callContext?.durationSec || 0} seconds

Standard CRM Outcome Categories:
${CRM_OUTCOMES.map((o) => `- "${o}"`).join("\n")}

Your task:
1. "transcript": Clean, punctuated verbatim transcript of what was spoken (preserving key English/Hindi terms accurately).
2. "summary": A crisp 2-3 sentence executive summary of the conversation, customer intent, agreed numbers, and next action.
3. "keyPoints": Array of 2 to 4 bullet points highlighting key discussion aspects (e.g., "Requested 50 units @ ₹420", "Samples required before bulk order", "Payment terms: 30 days credit").
4. "detectedOutcome": Must be EXACTLY ONE of the standard CRM Outcome Categories listed above.
5. "dealSentiment": Must be exactly "HOT" (Ready to buy, order confirmed, high purchase urgency), "WARM" (Interested, evaluating pricing/samples, need follow-up), or "COLD" (Low interest, budget issues, not looking now, wrong number).
6. "sentimentReason": 1 concise sentence explaining the sentiment rating.
7. "suggestedFollowUp":
   - "hasFollowUp": true/false (true if customer requested a callback, quote, or follow-up).
   - "date": Calculated YYYY-MM-DD date based on reference date (e.g., "tomorrow" = today+1, "parso" = today+2, "next Monday" = coming Monday). If no date mentioned, set to tomorrow's date or null.
   - "hour12": 2-digit hour string between "01" and "12" (e.g. "11" for 11 AM, "04" for 4 PM). Default to "11" if time not specified.
   - "minute": "00", "15", "30", or "45". Default "00".
   - "period": "AM" or "PM".
   - "actionTitle": Clear actionable task title (e.g. "Send Quotation for 50 Tracksuits & Follow-up").
   - "reason": Brief justification for the follow-up.
8. "orderValueEstimate": Numeric estimated amount in INR if mentioned (e.g. 21000 for 50 sets @ ₹420), or null.
9. "suggestedLeadStatus": "Contacted" | "Quotation Sent" | "Negotiation" | "Converted" | "Lost".

Output strict JSON only conforming to the schema.
`;

    let contents: any;

    if (hasAudio && payload.audioBase64) {
      const cleanMime = (payload.mimeType || "audio/webm").split(";")[0].trim();
      contents = [
        { text: systemPrompt },
        {
          inlineData: {
            mimeType: cleanMime,
            data: payload.audioBase64,
          },
        },
      ];
      if (rawText) {
        contents.push({ text: `Additional live speech transcript: "${rawText}"` });
      }
    } else {
      contents = `${systemPrompt}\n\nSpoken Debrief Voice Text:\n"${rawText}"`;
    }

    const ai = getAIClient();
    const candidateModels = ["gemini-3.6-flash", "gemini-1.5-flash", "gemini-2.0-flash"];
    let responseText = "";

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response.text && response.text.trim()) {
          responseText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`callAiActions: Model ${model} failed, trying next:`, err?.message || err);
      }
    }

    if (!responseText) {
      throw new Error("No response received from Gemini AI models");
    }

    const cleanJson = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanJson);

    const validOutcome = CRM_OUTCOMES.includes(parsed.detectedOutcome)
      ? parsed.detectedOutcome
      : "Interested / Follow-up Needed";

    const validSentiment: "HOT" | "WARM" | "COLD" = ["HOT", "WARM", "COLD"].includes(
      parsed.dealSentiment?.toUpperCase()
    )
      ? (parsed.dealSentiment.toUpperCase() as any)
      : "WARM";

    const analysis: CallVoiceDebriefAnalysis = {
      transcript: parsed.transcript || rawText || "Spoken sales debrief recorded.",
      summary: parsed.summary || `Call conversation debrief with ${payload.callContext?.contactName || "Customer"}.`,
      keyPoints: Array.isArray(parsed.keyPoints) && parsed.keyPoints.length > 0
        ? parsed.keyPoints
        : ["Discussion completed", "Follow-up scheduled"],
      detectedOutcome: validOutcome,
      dealSentiment: validSentiment,
      sentimentReason: parsed.sentimentReason || "Determined from voice debrief context.",
      suggestedFollowUp: {
        hasFollowUp: parsed.suggestedFollowUp?.hasFollowUp ?? true,
        date: parsed.suggestedFollowUp?.date || getDefaultFollowUpDate(1),
        hour12: parsed.suggestedFollowUp?.hour12 || "11",
        minute: parsed.suggestedFollowUp?.minute || "00",
        period: parsed.suggestedFollowUp?.period === "PM" ? "PM" : "AM",
        actionTitle:
          parsed.suggestedFollowUp?.actionTitle ||
          `Follow-up call with ${payload.callContext?.contactName || "Contact"}`,
        reason: parsed.suggestedFollowUp?.reason || "Discuss next steps",
      },
      orderValueEstimate: parsed.orderValueEstimate || null,
      suggestedLeadStatus: parsed.suggestedLeadStatus || "Contacted",
    };

    return { success: true, analysis };
  } catch (err: any) {
    console.warn("Gemini voice debrief warning, applying smart fallback:", err?.message);
    const textContext = payload.spokenText || `Call with ${payload.callContext?.contactName || "Customer"} for ${payload.callContext?.durationSec || 0} seconds.`;
    const fallbackAnalysis = generateFallbackDebrief(textContext, new Date());
    return { success: true, analysis: fallbackAnalysis };
  }
}

/**
 * 1-Tap Save Call with AI Debrief & Follow-Up Task
 */
export async function saveCallWithAIDebrief(payload: {
  customerId?: string | null;
  leadId?: string | null;
  phone?: string;
  contactName?: string;
  durationSec?: number | null;
  callType?: string;
  outcome: string;
  summary: string;
  notes: string;
  dealSentiment?: "HOT" | "WARM" | "COLD";
  followUpDateStr?: string | null;
  followUpTaskTitle?: string;
  createTask?: boolean;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const userId = (session.user as any).id;

    let employee = await prisma.employee.findUnique({ where: { userId } });
    if (!employee && organizationId) {
      employee = await prisma.employee.findFirst({ where: { organizationId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst();
    }
    if (!employee) {
      return { success: false, error: "Employee record not found" };
    }

    let customerId = payload.customerId || null;
    let leadId = payload.leadId || null;

    // If no ID is mapped but phone exists, auto-link to matching customer/lead
    if (!customerId && !leadId && payload.phone) {
      const cleanPhone = payload.phone.replace(/\D/g, "");
      if (cleanPhone.length >= 7) {
        const foundCustomer = await prisma.customer.findFirst({
          where: {
            organizationId: organizationId || undefined,
            OR: [
              { mobile: { contains: cleanPhone } },
              { whatsappNumber: { contains: cleanPhone } },
            ],
          },
        });
        if (foundCustomer) {
          customerId = foundCustomer.id;
        } else {
          const foundLead = await prisma.lead.findFirst({
            where: {
              organizationId: organizationId || undefined,
              whatsappNumber: { contains: cleanPhone },
            },
          });
          if (foundLead) {
            leadId = foundLead.id;
          }
        }
      }
    }

    let followUpDate: Date | null = null;
    if (payload.followUpDateStr) {
      const parsed = new Date(payload.followUpDateStr);
      if (!isNaN(parsed.getTime())) {
        followUpDate = parsed;
      }
    }

    // Sentiment prefix for executive summary
    const sentimentEmoji =
      payload.dealSentiment === "HOT"
        ? "🔥 [HOT DEAL]"
        : payload.dealSentiment === "COLD"
        ? "❄️ [COLD LEAD]"
        : "🟡 [WARM LEAD]";

    const enrichedSummary = payload.summary
      ? `${sentimentEmoji} ${payload.summary}`
      : `${sentimentEmoji} Call completed with ${payload.outcome}`;

    // Create the Call record
    const callRecord = await prisma.call.create({
      data: {
        employeeId: employee.id,
        customerId,
        leadId,
        callType: payload.callType || "OUTBOUND",
        durationSec: payload.durationSec || 0,
        status: "Completed",
        outcome: payload.outcome || "Completed",
        notes: payload.notes || null,
        summary: enrichedSummary,
        followUpDate,
        nextAction: payload.followUpTaskTitle || null,
      },
      include: {
        customer: true,
        lead: true,
        employee: { include: { user: true } },
      },
    });

    // Automatically create a linked Follow-Up Task in CRM if requested
    if (payload.createTask !== false && followUpDate) {
      const taskTitle =
        payload.followUpTaskTitle ||
        `Follow-up: ${payload.outcome} (${payload.contactName || payload.phone || "Contact"})`;

      await prisma.task.create({
        data: {
          title: taskTitle,
          description: `Auto-scheduled from AI Call Voice Debrief.\n\nSummary:\n${payload.summary}\n\nNotes:\n${payload.notes}`,
          priority: payload.dealSentiment === "HOT" ? "Urgent" : "High",
          dueDate: followUpDate,
          status: "To Do",
          assigneeId: employee.id,
          creatorId: employee.id,
          customerId: customerId || null,
          leadId: leadId || null,
        },
      }).catch((e) => console.error("Could not auto-create follow-up task:", e));
    }

    // Update Customer Temperature if customer exists
    if (customerId && payload.dealSentiment) {
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          temperature: payload.dealSentiment,
          lastContactDate: new Date(),
        },
      }).catch((e) => console.warn("Could not update customer temperature:", e));
    }

    revalidatePath("/calls");
    revalidatePath("/follow-ups");
    revalidatePath("/customers");
    if (customerId) revalidatePath(`/customers/${customerId}`);
    revalidatePath("/leads");
    if (leadId) revalidatePath(`/leads/${leadId}`);
    revalidatePath("/tasks");
    revalidatePath("/");

    return { success: true, callId: callRecord.id, callRecord };
  } catch (err: any) {
    console.error("Failed to save call with AI debrief:", err);
    return { success: false, error: err?.message || "Failed to save call log" };
  }
}

// Helpers
function getDefaultFollowUpDate(daysAhead: number = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function generateFallbackDebrief(text: string, refDate: Date): CallVoiceDebriefAnalysis {
  const lower = text.toLowerCase();

  let outcome = "Interested / Follow-up Needed";
  let sentiment: "HOT" | "WARM" | "COLD" = "WARM";
  let hasFollowUp = true;
  let days = 1;

  if (lower.includes("order") || lower.includes("confirm") || lower.includes("done") || lower.includes("closed") || lower.includes("final")) {
    outcome = "Order Placed / Deal Closed";
    sentiment = "HOT";
  } else if (lower.includes("quotation") || lower.includes("quote") || lower.includes("estimate") || lower.includes("rate")) {
    outcome = "Quotation Requested";
    sentiment = "HOT";
  } else if (lower.includes("discount") || lower.includes("price") || lower.includes("rate negotiation") || lower.includes("kam karo")) {
    outcome = "Price Negotiation / Discount Discussion";
    sentiment = "WARM";
  } else if (lower.includes("no answer") || lower.includes("busy") || lower.includes("not reachable") || lower.includes("uthaya nahi")) {
    outcome = "No Answer / Busy";
    sentiment = "COLD";
  } else if (lower.includes("not interested") || lower.includes("nahi chahiye") || lower.includes("mana kar diya") || lower.includes("lost")) {
    outcome = "Not Interested / Lost";
    sentiment = "COLD";
    hasFollowUp = false;
  }

  if (lower.includes("parso") || lower.includes("day after tomorrow")) {
    days = 2;
  } else if (lower.includes("next week") || lower.includes("agle hafte")) {
    days = 7;
  }

  const d = new Date(refDate);
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");

  return {
    transcript: text,
    summary: `Sales debrief: ${text.slice(0, 180)}`,
    keyPoints: text.split(/[.,;\n]+/).filter(Boolean).slice(0, 3).map((s) => s.trim()),
    detectedOutcome: outcome,
    dealSentiment: sentiment,
    sentimentReason: `Categorized based on debrief keywords.`,
    suggestedFollowUp: {
      hasFollowUp,
      date: hasFollowUp ? `${yyyy}-${mm}-${dd}` : null,
      hour12: "11",
      minute: "00",
      period: "AM",
      actionTitle: `Follow-up on ${outcome}`,
      reason: "Continue sales discussion",
    },
    suggestedLeadStatus: outcome === "Order Placed / Deal Closed" ? "Converted" : "Contacted",
  };
}
