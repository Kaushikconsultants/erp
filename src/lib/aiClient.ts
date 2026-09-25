import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";

let _openai: OpenAI | null = null;
export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "dummy",
    });
  }
  return _openai;
}

/**
 * Standard OpenAI Client Proxy
 */
export const openai = new Proxy({} as OpenAI, {
  get(_, prop, receiver) {
    return Reflect.get(getOpenAI(), prop, receiver);
  }
});

export const DEFAULT_GEMINI_KEY = "";

export function getGeminiApiKey(): string {
  const envKey = (process.env.GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  if (envKey && envKey !== "dummy") return envKey;
  return "";
}

let _gemini: GoogleGenAI | null = null;
export function getGemini(): GoogleGenAI {
  if (!_gemini) {
    _gemini = new GoogleGenAI({
      apiKey: getGeminiApiKey(),
    });
  }
  return _gemini;
}

/**
 * Google Gemini Client Proxy
 */
export const gemini = new Proxy({} as GoogleGenAI, {
  get(_, prop, receiver) {
    return Reflect.get(getGemini(), prop, receiver);
  }
});

/**
 * Utility to extract clean JSON from LLM responses (stripping markdown fences and preamble)
 */
export function extractJSON<T = any>(rawText: string): T | null {
  if (!rawText) return null;
  try {
    // 1. Direct JSON parse
    return JSON.parse(rawText.trim());
  } catch {
    // 2. Extract from ```json ... ``` or ``` ... ```
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch && fenceMatch[1]) {
      try {
        return JSON.parse(fenceMatch[1].trim());
      } catch {}
    }

    // 3. Find first { or [ to last } or ]
    const firstBracket = rawText.indexOf("{");
    const lastBracket = rawText.lastIndexOf("}");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        return JSON.parse(rawText.substring(firstBracket, lastBracket + 1).trim());
      } catch {}
    }

    const firstSquare = rawText.indexOf("[");
    const lastSquare = rawText.lastIndexOf("]");
    if (firstSquare !== -1 && lastSquare > firstSquare) {
      try {
        return JSON.parse(rawText.substring(firstSquare, lastSquare + 1).trim());
      } catch {}
    }
  }
  return null;
}

/**
 * Utility to strip chain-of-thought or reasoning logs if present
 */
export function stripThinkingTrace(text: string): string {
  if (!text) return "";
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  if (cleaned.startsWith("Here's a thinking process:")) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) return jsonMatch[0];

    // If it's a plain text answer after the numbered thinking steps
    const finalAnswerMatch = cleaned.match(/(?:Final Answer:|Output:|Response:)\s*([\s\S]+)$/i) ||
                             cleaned.match(/\n\s*(\"[^\"]+\")\s*$/) ||
                             cleaned.match(/\n\n([A-Z][^\n]+)$/);
    if (finalAnswerMatch && finalAnswerMatch[1]) {
      return finalAnswerMatch[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return cleaned;
}

/**
 * Query standard OpenAI models (e.g. gpt-4o-mini)
 */
export async function askOpenAI(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const model = options?.model || "gpt-4o-mini";
  const systemPrompt = options?.systemPrompt || "You are an intelligent ERP Assistant.";

  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: prompt }
    ],
    temperature: options?.temperature ?? 0.3,
    max_tokens: options?.maxTokens ?? 1024,
    response_format: options?.jsonMode ? { type: "json_object" } : undefined,
  });

  return completion.choices[0]?.message?.content || "";
}

/**
 * Query Google Gemini models
 */
export async function askGemini(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    jsonMode?: boolean;
  }
): Promise<string> {
  const models = options?.model
    ? [options.model]
    : ["gemini-3.5-flash-lite", "gemini-flash-lite-latest", "gemini-3.6-flash", "gemini-flash-latest"];
  const systemPrompt = options?.systemPrompt ? `${options.systemPrompt}\n\n` : "";
  const fullPrompt = `${systemPrompt}${prompt}`;

  const client = getGemini();
  let lastError: any = null;

  for (const m of models) {
    try {
      const response = await client.models.generateContent({
        model: m,
        contents: fullPrompt,
        config: options?.jsonMode ? { responseMimeType: "application/json" } : undefined,
      });

      const text = (response.text || "").trim();
      if (text) return text;
    } catch (err: any) {
      lastError = err;
      console.warn(`Gemini model ${m} failed in askGemini:`, err?.message || err);
    }
  }

  if (lastError) throw lastError;
  return "";
}

/**
 * High-Availability Smart ERP AI Engine
 * Prioritizes Gemini, automatically falling back to OpenAI on rate limits or errors.
 */
export async function askSmartAI(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
    preferredProvider?: "gemini" | "openai";
  }
): Promise<{ text: string; provider: "gemini" | "openai" | "none" }> {
  const hasGemini = Boolean(getGeminiApiKey());
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith("sk-"));

  // 1. Try Gemini if available or preferred
  if (hasGemini && options?.preferredProvider !== "openai") {
    try {
      const text = await askGemini(prompt, options);
      if (text && text.trim()) {
        return { text, provider: "gemini" };
      }
    } catch (err: any) {
      console.warn("Gemini provider failed, failing over to backup:", err.message);
    }
  }

  // 2. Fallback to OpenAI
  if (hasOpenAI) {
    try {
      const text = await askOpenAI(prompt, options);
      if (text && text.trim()) {
        return { text, provider: "openai" };
      }
    } catch (err: any) {
      console.warn("OpenAI provider failed:", err.message);
    }
  }

  // 3. If Gemini was skipped because of preference, try it now
  if (hasGemini && options?.preferredProvider === "openai") {
    try {
      const text = await askGemini(prompt, options);
      if (text && text.trim()) {
        return { text, provider: "gemini" };
      }
    } catch (err: any) {
      console.warn("Gemini backup attempt failed:", err.message);
    }
  }

  return { text: "", provider: "none" };
}

/**
 * High-Availability Smart ERP AI Engine for structured JSON
 */
export async function askSmartAIJSON<T = any>(
  prompt: string,
  options?: {
    systemPrompt?: string;
    temperature?: number;
    maxTokens?: number;
    preferredProvider?: "gemini" | "openai";
  }
): Promise<{ success: boolean; data: T | null; provider: string; raw: string }> {
  const result = await askSmartAI(prompt, { ...options, jsonMode: true });
  if (!result.text) {
    return { success: false, data: null, provider: result.provider, raw: "" };
  }

  const parsed = extractJSON<T>(result.text);
  return {
    success: !!parsed,
    data: parsed,
    provider: result.provider,
    raw: result.text
  };
}
