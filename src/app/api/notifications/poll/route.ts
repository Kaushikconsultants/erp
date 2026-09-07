import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Background notification polling endpoint for native Android background worker & web clients
 * GET /api/notifications/poll?userId=XYZ&since=TIMESTAMP
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const sinceParam = searchParams.get("since");
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const whereClause: any = { userId };

    if (sinceParam) {
      const sinceDate = !isNaN(Number(sinceParam))
        ? new Date(Number(sinceParam))
        : new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        whereClause.createdAt = { gt: sinceDate };
      }
    } else {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        message: true,
        type: true,
        link: true,
        isRead: true,
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      count: notifications.length,
      serverTime: new Date().toISOString(),
      notifications
    });
  } catch (error: any) {
    console.error("[Notification Poll API Error]:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to poll notifications" },
      { status: 500 }
    );
  }
}
