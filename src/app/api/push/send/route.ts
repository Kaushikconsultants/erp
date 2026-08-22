import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// Initialize web-push with VAPID keys
webpush.setVapidDetails(
  "mailto:admin@11fit.com",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BIqLUY30-N9qSJrCz4tF1C65XgCRVyr-1TmiCTG2MNFL2_8_EAC4o626ehSdKSM5uUpNPJvpcNCjwOen8evAjRU",
  process.env.VAPID_PRIVATE_KEY || "MJiZ0ppPI4Jx1RM43ryneCtprRbgnsaSGnBmCooFqN0"
);

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-internal-secret");
    if (secret !== (process.env.INTERNAL_API_SECRET || 'crm_internal_2026')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subscription, payload } = await req.json();

    if (!subscription || !payload) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    await webpush.sendNotification(subscription, payload);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Web Push Error]:", error);
    // If subscription is invalid/expired (HTTP 410 or 404), return failure status so caller can clean it up
    if (error.statusCode === 410 || error.statusCode === 404) {
      return NextResponse.json({ error: "Subscription expired", expired: true }, { status: 410 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
