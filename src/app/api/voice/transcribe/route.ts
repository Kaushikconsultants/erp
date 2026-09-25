import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGeminiApiKey } from "@/lib/aiClient";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;
    const languageHint = (formData.get("language") as string) || "auto";

    if (!file) {
      return NextResponse.json({ success: false, error: "No audio file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length < 100) {
      return NextResponse.json({
        success: false,
        error: languageHint === "hi-IN"
          ? "कोई आवाज़ नहीं सुनाई दी। कृपया माइक दबाकर दोबारा बोलें।"
          : "No speech detected. Please speak clearly into your mic."
      }, { status: 200 });
    }

    const rawMimeType = (file.type || "").toLowerCase();
    const cleanMimeType = rawMimeType.includes("wav")
      ? "audio/wav"
      : rawMimeType.includes("mp4") || rawMimeType.includes("m4a") || rawMimeType.includes("aac")
      ? "audio/mp4"
      : rawMimeType.includes("ogg")
      ? "audio/ogg"
      : rawMimeType.includes("3gp") || rawMimeType.includes("3gpp")
      ? "audio/3gpp"
      : "audio/webm";

    const prompt = `You are a voice speech-to-text transcriber for an Indian ERP application.
Transcribe this spoken audio exactly into text.
Language context: ${languageHint === 'hi-IN' ? 'Hindi (or Hinglish)' : 'Indian English, Hindi, or Hinglish'}.
Rules:
1. Output ONLY the raw spoken words verbatim.
2. Do NOT add quotation marks, explanations, notes, or prefixes.
3. Understand Indian business terminology (e.g. "air flex", "lycra", "shorts", "quotation", "banao", "kitna stock", "sale", "order", "debtors").
4. If Hindi speech is detected, transcribe it either in clear Devanagari or standard Romanized Hinglish.
5. If there is no human speech, or only background silence, ambient hiss or non-verbal sound, output [SILENT].`;

    const ext = cleanMimeType.includes("mp4")
      ? "mp4"
      : cleanMimeType.includes("wav")
      ? "wav"
      : cleanMimeType.includes("ogg")
      ? "ogg"
      : "webm";

    // 1. Primary provider: Google Gemini Multimodal Audio
    const geminiKey = getGeminiApiKey();
    if (geminiKey && geminiKey !== "dummy") {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const GEMINI_MODELS = [
        "gemini-flash-latest",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-1.5-flash",
        "gemini-flash-lite-latest"
      ];

      for (const modelName of GEMINI_MODELS) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Transcribe timeout")), 5000)
          );
          const generatePromise = ai.models.generateContent({
            model: modelName,
            contents: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: buffer.toString("base64")
                }
              },
              prompt
            ]
          });

          const response = await Promise.race([generatePromise, timeoutPromise]);

          const rawText = (response.text || "").trim();
          if (rawText) {
            const cleaned = rawText
              .replace(/^```[a-z]*\n?|```$/gi, "")
              .replace(/^["']|["']$/g, "")
              .trim();
            const stripped = cleaned.replace(/[\[\]"]/g, "").trim().toLowerCase();
            if (stripped === "silent" || stripped === "silence" || stripped === "no speech" || stripped === "no audio" || stripped === "no words") {
              return NextResponse.json({
                success: false,
                error: languageHint === "hi-IN"
                  ? "कोई आवाज़ नहीं सुनाई दी। कृपया माइक दबाकर दोबारा बोलें।"
                  : "No speech detected. Please speak clearly into your mic."
              }, { status: 200 });
            }

            return NextResponse.json({
              success: true,
              transcript: cleaned,
              provider: "gemini",
              model: modelName
            });
          }
        } catch (modelErr: any) {
          console.warn(`Gemini model ${modelName} transcribe attempt failed:`, modelErr?.message || modelErr);
        }
      }
    }

    // 2. Secondary provider: OpenAI Whisper
    const openaiKey = (process.env.OPENAI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const openaiForm = new FormData();
        const audioBlob = new Blob([buffer], { type: cleanMimeType });
        openaiForm.append("file", audioBlob, `speech.${ext}`);
        openaiForm.append("model", "whisper-1");
        if (languageHint === "hi-IN") {
          openaiForm.append("language", "hi");
        }

        const whisperRes = await fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${openaiKey}` },
          body: openaiForm
        });

        if (whisperRes.ok) {
          const wData = await whisperRes.json();
          if (wData.text && wData.text.trim()) {
            return NextResponse.json({
              success: true,
              transcript: wData.text.trim(),
              provider: "openai"
            });
          }
        }
      } catch (whisperErr) {
        console.warn("OpenAI Whisper transcribe error:", whisperErr);
      }
    }

    return NextResponse.json({
      success: false,
      error: "Could not clearly transcribe audio. Please speak again or type your command."
    }, { status: 200 });
  } catch (err: any) {
    console.error("Audio transcription API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to transcribe audio." },
      { status: 500 }
    );
  }
}
