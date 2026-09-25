"use server";

import { internalExecuteVoiceCommand } from "@/lib/voiceEngine";
import type { VoiceAssistantResponse, VoicePendingContext } from "@/lib/voiceEngine";

export type {
  VoiceAssistantResponse,
  VoicePendingContext,
  VoiceMetricItem,
  ERPRouteMatch
} from "@/lib/voiceEngine";

function sanitizeServerResponse<T>(res: T): T {
  try {
    return JSON.parse(
      JSON.stringify(res, (key, value) => {
        if (value === undefined) return null;
        if (typeof value === "bigint") return value.toString();
        return value;
      })
    );
  } catch {
    return res;
  }
}

export async function executeVoiceCommand(
  spokenText: string,
  preferredProvider?: "gemini" | "openai",
  pendingContext?: VoicePendingContext | null
): Promise<VoiceAssistantResponse> {
  try {
    const res = await internalExecuteVoiceCommand(spokenText, preferredProvider, pendingContext);
    return sanitizeServerResponse(res);
  } catch (err: any) {
    console.error("Critical outer error in executeVoiceCommand:", err);
    return sanitizeServerResponse({
      success: false,
      spokenText: "I encountered an issue processing that voice command. Please try again.",
      actionText: "Error processing command",
      route: "/"
    });
  }
}

export async function parseVoiceIntent(spokenText: string) {
  const result = await executeVoiceCommand(spokenText);
  return {
    route: result.route || "/customers",
    searchTerm: spokenText,
    actionText: result.actionText,
    aiExplanation: result.spokenText,
    requiresConfirmation: result.requiresConfirmation,
    confirmationPayload: result.confirmationPayload
  };
}
