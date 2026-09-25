import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// Initialize web-push with VAPID keys if configured
if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@example.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST(req: NextRequest) {
  try {
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const secret = req.headers.get("x-internal-secret");
    if (!internalSecret || secret !== internalSecret) {
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
