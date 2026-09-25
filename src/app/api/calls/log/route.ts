import { NextRequest, NextResponse } from "next/server";
import { logCall } from "@/app/actions/callActions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const result = await logCall(formData);
    if (result && (result as any).error) {
      return NextResponse.json({ success: false, error: (result as any).error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/calls/log error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to log call via API fallback" },
      { status: 500 }
    );
  }
}
