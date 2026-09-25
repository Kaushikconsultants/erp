import { NextRequest, NextResponse } from "next/server";
import { internalExecuteVoiceCommand } from "@/lib/voiceEngine";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const command = body?.command || body?.spokenText || "";
    const preferredProvider = body?.preferredProvider;
    const pendingContext = body?.pendingContext;

    if (!command || typeof command !== "string" || !command.trim()) {
      return NextResponse.json({
        success: false,
        spokenText: "I didn't catch that. Please speak or type your command.",
        actionText: "No input provided",
        route: "/"
      }, { status: 400 });
    }

    const result = await internalExecuteVoiceCommand(command.trim(), preferredProvider, pendingContext);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/voice/command error:", error);
    return NextResponse.json({
      success: false,
      spokenText: "I encountered an issue processing that voice command. Please try again.",
      actionText: "Error processing command",
      route: "/"
    }, { status: 200 });
  }
}
