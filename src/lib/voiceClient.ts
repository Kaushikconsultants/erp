import { executeVoiceCommand, VoiceAssistantResponse, VoicePendingContext } from "@/app/actions/voiceActions";

/**
 * Robust, fault-tolerant voice command dispatcher for Heart Copilot.
 * 
 * Strategy:
 * 1. Dispatches via standard REST API (`/api/voice/command`) which is immune to Next.js
 *    Server Action deployment skew, CSRF Origin mismatches, and RSC Flight serialization error #441.
 * 2. If the API endpoint is unavailable, falls back to direct Server Action call.
 * 3. Guarantees that an uncaught error is NEVER thrown to the UI.
 */
export async function sendVoiceCommand(
  command: string,
  preferredProvider?: "gemini" | "openai",
  pendingContext?: VoicePendingContext | null
): Promise<VoiceAssistantResponse> {
  const trimmed = command ? command.trim() : "";
  if (!trimmed) {
    return {
      success: false,
      spokenText: "Please provide a voice command or question.",
      actionText: "No input",
      route: "/"
    };
  }

  // 1. Primary Strategy: Standard REST API endpoint (when running in browser)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/voice/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          command: trimmed,
          preferredProvider,
          pendingContext
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data === "object") {
          return data as VoiceAssistantResponse;
        }
      }
    } catch (apiErr) {
      console.warn("REST API /api/voice/command call failed, falling back to Server Action:", apiErr);
    }
  }

  // 2. Secondary Fallback: Direct Server Action call
  try {
    const actionRes = await executeVoiceCommand(trimmed, preferredProvider, pendingContext);
    if (actionRes && typeof actionRes === "object") {
      return actionRes;
    }
  } catch (saErr) {
    console.error("Server Action executeVoiceCommand fallback failed:", saErr);
  }

  // 3. Graceful Guaranteed Return: Never throws across UI boundary
  return {
    success: false,
    spokenText: "I could not complete that command right now. Please try again.",
    actionText: "Could not complete command",
    route: "/"
  };
}
