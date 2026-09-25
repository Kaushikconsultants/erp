import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Background notification polling endpoint for native Android background worker & web clients
 * GET /api/notifications/poll?userId=XYZ&since=TIMESTAMP
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUserId = (session.user as any).id;
    const currentRole = (session.user as any).role;
    const currentOrgId = (session.user as any).organizationId;

    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get("userId") || currentUserId;
    const sinceParam = searchParams.get("since");
    const limit = Math.min(parseInt(searchParams.get("limit") || "15", 10), 50);

    // Prevent IDOR: users can only poll their own notifications, unless Admin in the same organization
    if (requestedUserId !== currentUserId) {
      const isAdmin = currentRole === "ADMIN" || currentRole === "SUPER_ADMIN";
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden: Access denied to other user's notifications" }, { status: 403 });
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: requestedUserId },
        select: { organizationId: true }
      });
      if (!targetUser || targetUser.organizationId !== currentOrgId) {
        return NextResponse.json({ error: "Forbidden: User not in your organization" }, { status: 403 });
      }
    }

    const whereClause: any = { userId: requestedUserId };

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
