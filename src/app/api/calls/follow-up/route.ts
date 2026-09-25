import { NextRequest, NextResponse } from "next/server";
import { saveOrUpdateCallFollowUp } from "@/app/actions/callActions";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const result = await saveOrUpdateCallFollowUp(body);
    if (result && (result as any).error) {
      return NextResponse.json({ success: false, error: (result as any).error }, { status: 400 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/calls/follow-up error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update call follow-up via API fallback" },
      { status: 500 }
    );
  }
}
