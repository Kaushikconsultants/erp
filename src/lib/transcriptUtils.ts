/**
 * Utilities for formatting, parsing, and enriching call transcripts with actual Sales Rep and Customer names.
 * Includes intelligent speaker role inversion detection and correction.
 */

export interface DialogueTurn {
  speaker: string;
  text: string;
  isRep: boolean;
  isCustomer: boolean;
  isSystem: boolean;
  originalSpeaker?: string;
}

export interface ParsedTranscriptResult {
  rawTranscript: string;
  cleanedTranscript: string;
  dialogueTurns: DialogueTurn[];
  aiSummary: string;
  userNotes: string;
  wasInverted: boolean;
  effectiveRep: string;
  effectiveCustomer: string;
}

/**
 * Checks if the speakers in a parsed transcript dialogue are inverted
 * (e.g. Sales person speech labeled as Customer, or Customer speech labeled as Sales Rep).
 */
export function detectSpeakerInversion(
  turns: { speaker: string; text: string }[],
  repName: string,
  customerName: string,
  companyName?: string | null
): boolean {
  if (!turns || turns.length === 0) return false;

  const repLower = (repName || "").toLowerCase().trim();
  const custLower = (customerName || "").toLowerCase().trim();
  const compLower = (companyName || "").toLowerCase().trim();

  // Known company keywords for Espon / Sphone clothing
  const companyKeywords = ["sphone", "espon", "clothing private limited", "clothing pvt ltd", "clothing", "rohtak"];
  if (compLower && compLower.length >= 3) {
    companyKeywords.push(compLower);
  }

  // Common sales pitches & introductions made by the sales person
  const salesSpeechPatterns = [
    "this side from",
    "se baat kar rahi",
    "se baat kar raha",
    "se bol rahi",
    "se bol raha",
    "aap kuch order nahi kar rahe",
    "order ke liye bol rahe the",
    "articles share kiye",
    "samples share",
    "sample bheje the",
    "quotation share",
    "rate list share",
    "stock check karke",
    "naya catalog bheja",
    "humari baat hui thi"
  ];

  // Common customer responses (answering who is calling, saying they'll order later, addressing rep as madam/sir)
  const customerSpeechPatterns = [
    "you are from, sorry",
    "you are from sorry",
    "aap kaun",
    "kaun bol rahe",
    "kahan se bol rahe",
    "main bolunga madam",
    "main bolunga sir",
    "next week bolunga",
    "agle hafte bolunga",
    "agle hafte order",
    "baad mein order",
    "abhi zarurat nahi",
    "rate kam karo",
    "discount kitna",
    "dispatch kab hoga"
  ];

  let inversionScore = 0;

  for (const turn of turns) {
    const spk = turn.speaker.toLowerCase().trim();
    const txt = turn.text.toLowerCase().trim();

    const isTaggedCustomer =
      spk.includes("customer") ||
      spk.includes("client") ||
      spk.includes("receiver") ||
      spk.includes("caller 2") ||
      (custLower && custLower !== "customer" && spk.includes(custLower));

    const isTaggedRep =
      spk.includes("rep") ||
      spk.includes("agent") ||
      spk.includes("caller") ||
      spk.includes("sales") ||
      (repLower && spk.includes(repLower));

    // Check if the speaker tagged as CUSTOMER is actually introducing as the Sales Rep / Company
    if (isTaggedCustomer) {
      if (repLower && repLower.length >= 3 && txt.includes(`${repLower} this side`)) {
        inversionScore += 3;
      }
      if (repLower && repLower.length >= 3 && (txt.includes(`main ${repLower}`) || txt.includes(`mai ${repLower}`) || txt.includes(`mera naam ${repLower}`))) {
        inversionScore += 3;
      }
      for (const kw of companyKeywords) {
        if (txt.includes(kw) && (txt.includes("this side") || txt.includes("se") || txt.includes("from"))) {
          inversionScore += 3;
        }
      }
      for (const pattern of salesSpeechPatterns) {
        if (txt.includes(pattern)) {
          inversionScore += 2;
        }
      }
    }

    // Check if the speaker tagged as SALES REP is actually speaking as the customer
    if (isTaggedRep) {
      for (const pattern of customerSpeechPatterns) {
        if (txt.includes(pattern)) {
          inversionScore += 2;
        }
      }
      // If rep is female (e.g. Ikra) and says "main bolunga madam" -> addressed to female rep, so speaker is male customer!
      if (txt.includes("main bolunga madam") || txt.includes("bolunga madam")) {
        inversionScore += 3;
      }
    }
  }

  return inversionScore >= 2;
}

/**
 * Extracts and cleans the call transcript, AI summary, and user notes.
 * Parses turns, detects inversions, and standardizes speaker tags.
 */
export function parseTranscriptDialogue(
  rawInput: string | null | undefined,
  repName?: string | null,
  customerName?: string | null,
  isOldCustomer?: boolean,
  companyName?: string | null
): ParsedTranscriptResult {
  if (!rawInput || typeof rawInput !== "string") {
    return {
      rawTranscript: "",
      cleanedTranscript: "",
      dialogueTurns: [],
      aiSummary: "",
      userNotes: "",
      wasInverted: false,
      effectiveRep: repName || "Sales Rep",
      effectiveCustomer: customerName || (isOldCustomer ? "Old Customer" : "Customer")
    };
  }

  const text = rawInput.trim();

  // 1. Extract [AI Summary]: ...
  let aiSummary = "";
  const summaryMatch = text.match(/\[AI Summary\]:\s*([\s\S]*?)(?=(\n\n\[|$))/i);
  if (summaryMatch) {
    aiSummary = summaryMatch[1].trim();
  }

  // 2. Extract [Auto-Transcript]: ...
  let transcriptPart = text;
  const transcriptMatch = text.match(/\[Auto-Transcript\]:\s*([\s\S]*?)(?=(\n\n\[AI Summary\]|\n\n\[Dialed|\n\n\[|$))/i);
  if (transcriptMatch) {
    transcriptPart = transcriptMatch[1].trim();
  }

  // 3. Extract remaining user notes
  let remainingNotes = text
    .replace(/\[Auto-Transcript\]:\s*[\s\S]*?(?=(\n\n\[AI Summary\]|\n\n\[Dialed|\n\n\[|$))/i, "")
    .replace(/\[AI Summary\]:\s*[\s\S]*?(?=(\n\n\[|$))/i, "")
    .replace(/\[Dialed:\s*[^\]]+\]/gi, "")
    .trim();

  // If transcriptPart was the whole text and no [Auto-Transcript] tag existed, check if it's purely dialogue or just notes
  const hasDialogueColon = /(?:^|[\r\n]+|(?:(?<=[.!?])\s+))([A-Za-z0-9_ ()/.-]{1,35}):\s*/.test(transcriptPart);
  if (!transcriptMatch && !hasDialogueColon) {
    // Pure user note, no transcript dialogue
    return {
      rawTranscript: "",
      cleanedTranscript: "",
      dialogueTurns: [],
      aiSummary,
      userNotes: text,
      wasInverted: false,
      effectiveRep: repName || "Sales Rep",
      effectiveCustomer: customerName || (isOldCustomer ? "Old Customer" : "Customer")
    };
  }

  // Resolve Effective Rep Name
  let effectiveRep = (repName || "").trim();
  if (!effectiveRep || effectiveRep.toLowerCase() === "agent" || effectiveRep.toLowerCase() === "sales rep") {
    const introMatch = transcriptPart.match(
      /(?:(?:Mera naam|Main|Mai)\s+([A-Z][a-z]+)|([A-Z][a-z]+)\s+baat\s+kar\s+rah[a-i]\s+hoon|\[AI Summary\]:\s*([A-Z][a-z]+)\s+from|([A-Z][a-z]+)\s+this\s+side)/i
    );
    if (introMatch) {
      const detected = introMatch[1] || introMatch[2] || introMatch[3] || introMatch[4];
      if (
        detected &&
        detected.length >= 3 &&
        !["Hello", "Good", "Kaun", "Haan", "Haanji", "Sir", "Madam", "Okay", "Customer"].includes(detected)
      ) {
        effectiveRep = detected.charAt(0).toUpperCase() + detected.slice(1);
      }
    }
  }
  if (!effectiveRep || effectiveRep.toLowerCase() === "agent") {
    effectiveRep = "Sales Rep";
  }

  // Resolve Effective Customer Name
  const rawCustomer = (customerName || "").trim();
  const hasCustomerName = Boolean(
    rawCustomer &&
    rawCustomer !== "Contact" &&
    rawCustomer !== "Direct Contact" &&
    rawCustomer !== "Customer" &&
    rawCustomer !== "Phone Inquiry"
  );
  const effectiveCustomer = hasCustomerName
    ? `${rawCustomer}${isOldCustomer ? " (Old Customer)" : ""}`
    : (isOldCustomer ? "Old Customer" : "Customer");

  // 4. Tokenize dialogue turns
  // Matches speaker tags at start, newline, or right after sentence punctuation (. ! ?)
  const speakerRegex = /(?:^|[\r\n]+|(?:(?<=[.!?])\s+))([A-Za-z0-9_ ()/.-]{1,35}):\s*/g;
  const matches: { speaker: string; startIndex: number; contentStart: number }[] = [];
  let m: RegExpExecArray | null;

  while ((m = speakerRegex.exec(transcriptPart)) !== null) {
    matches.push({
      speaker: m[1].trim(),
      startIndex: m.index,
      contentStart: m.index + m[0].length
    });
  }

  const turns: { speaker: string; originalSpeaker: string; text: string }[] = [];

  if (matches.length > 0) {
    for (let i = 0; i < matches.length; i++) {
      const cur = matches[i];
      const nextStart = i + 1 < matches.length ? matches[i + 1].startIndex : transcriptPart.length;
      const utterance = transcriptPart.substring(cur.contentStart, nextStart).trim();
      if (utterance) {
        turns.push({
          speaker: cur.speaker,
          originalSpeaker: cur.speaker,
          text: utterance
        });
      }
    }
  } else {
    // If no explicit "Speaker:" format found, treat lines as utterances
    const lines = transcriptPart.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      turns.push({
        speaker: effectiveRep,
        originalSpeaker: effectiveRep,
        text: l
      });
    }
  }

  // 5. Detect Inversion
  const wasInverted = detectSpeakerInversion(turns, effectiveRep, effectiveCustomer, companyName);

  // 6. Map and normalize speakers
  const repLower = effectiveRep.toLowerCase();
  const custLower = effectiveCustomer.toLowerCase();

  const dialogueTurns: DialogueTurn[] = turns.map((t) => {
    const s = t.speaker;
    const spk = s.toLowerCase();
    const isTaggedCust =
      spk.includes("customer") ||
      spk.includes("client") ||
      spk.includes("receiver") ||
      (custLower !== "customer" && spk.includes(custLower));

    const isTaggedRep =
      spk.includes("rep") ||
      spk.includes("agent") ||
      spk.includes("caller") ||
      spk.includes("sales") ||
      spk.includes(repLower);

    const isSystem =
      spk.includes("ivr") ||
      spk.includes("system") ||
      spk.includes("call connected") ||
      spk.includes("hold");

    let finalSpeaker = s;
    let isRep = false;
    let isCustomer = false;

    if (isSystem) {
      finalSpeaker = "System";
    } else if (wasInverted) {
      // SWAP ROLES
      if (isTaggedCust) {
        finalSpeaker = effectiveRep;
        isRep = true;
      } else if (isTaggedRep) {
        finalSpeaker = effectiveCustomer;
        isCustomer = true;
      } else {
        finalSpeaker = effectiveCustomer;
        isCustomer = true;
      }
    } else {
      // Standard non-inverted mapping
      if (isTaggedRep) {
        finalSpeaker = effectiveRep;
        isRep = true;
      } else if (isTaggedCust) {
        finalSpeaker = effectiveCustomer;
        isCustomer = true;
      } else {
        // Fallback default
        if (t.originalSpeaker?.toLowerCase() === repLower) {
          finalSpeaker = effectiveRep;
          isRep = true;
        } else {
          finalSpeaker = effectiveCustomer;
          isCustomer = true;
        }
      }
    }

    return {
      speaker: finalSpeaker,
      text: t.text,
      isRep,
      isCustomer,
      isSystem,
      originalSpeaker: t.originalSpeaker
    };
  });

  // Construct clean formatted transcript with one speaker turn per line
  const cleanedTranscript = dialogueTurns
    .map((turn) => `${turn.speaker}: ${turn.text}`)
    .join("\n");

  return {
    rawTranscript: transcriptPart,
    cleanedTranscript,
    dialogueTurns,
    aiSummary,
    userNotes: remainingNotes,
    wasInverted,
    effectiveRep,
    effectiveCustomer
  };
}

/**
 * Fixes any inverted transcript text and returns clean formatted dialogue with newlines.
 */
export function fixInvertedTranscript(
  rawTranscript: string,
  repName?: string | null,
  customerName?: string | null,
  isOldCustomer?: boolean,
  companyName?: string | null
): string {
  const parsed = parseTranscriptDialogue(rawTranscript, repName, customerName, isOldCustomer, companyName);
  return parsed.cleanedTranscript;
}

/**
 * Format call notes/transcript with actual Sales Rep and Customer names,
 * fixing any inverted speakers and ensuring clean line breaks.
 */
export function formatTranscriptWithNames(
  transcriptText: string,
  repName?: string | null,
  customerName?: string | null,
  isOldCustomer?: boolean,
  companyName?: string | null
): string {
  if (!transcriptText || typeof transcriptText !== "string") return "";

  const parsed = parseTranscriptDialogue(transcriptText, repName, customerName, isOldCustomer, companyName);
  if (!parsed.cleanedTranscript) {
    return transcriptText;
  }

  // If input had [Auto-Transcript]: ... and [AI Summary], preserve structure cleanly with newlines
  const parts: string[] = [];
  if (parsed.cleanedTranscript) {
    parts.push(`[Auto-Transcript]:\n${parsed.cleanedTranscript}`);
  }
  if (parsed.aiSummary) {
    parts.push(`[AI Summary]: ${parsed.aiSummary}`);
  }
  if (parsed.userNotes) {
    parts.push(parsed.userNotes);
  }

  return parts.join("\n\n");
}
