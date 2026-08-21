"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatPresence } from "@/app/actions/presenceActions";

export interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export async function getBroadcasts(filters?: { category?: string; search?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "SALES";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    // Audience filter for non-admins
    let audienceWhere: any = {};
    if (!isAdmin) {
      audienceWhere = {
        OR: [
          { targetAudience: "ALL" },
          { targetUserIds: { has: userId } },
          { targetRoles: { has: userRole } },
          { authorId: userId }
        ]
      };
    }

    let categoryWhere: any = {};
    if (filters?.category && filters.category !== "ALL") {
      categoryWhere = { category: filters.category };
    }

    let searchWhere: any = {};
    if (filters?.search && filters.search.trim()) {
      searchWhere = {
        OR: [
          { title: { contains: filters.search.trim(), mode: "insensitive" } },
          { content: { contains: filters.search.trim(), mode: "insensitive" } }
        ]
      };
    }

    const broadcasts = await prisma.teamBroadcast.findMany({
      where: {
        AND: [audienceWhere, categoryWhere, searchWhere]
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true
              }
            }
          }
        },
        reads: {
          select: {
            userId: true,
            readAt: true
          }
        }
      }
    });

    return { success: true, broadcasts };
  } catch (error) {
    console.error("Failed to load broadcasts:", error);
    return { error: "Failed to load team broadcasts." };
  }
}

export async function createBroadcast(data: {
  title: string;
  content: string;
  category?: string;
  priority?: string;
  attachments?: AttachmentItem[];
  targetAudience: "ALL" | "SELECTED";
  targetUserIds?: string[];
  targetRoles?: string[];
  isPinned?: boolean;
  expiresAt?: string | null;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    if (!isAdmin) {
      return { error: "Unauthorized: Only administrators can publish broadcasts." };
    }

    if (!data.title?.trim() || !data.content?.trim()) {
      return { error: "Title and Content are required." };
    }

    const attachmentsJson = data.attachments && data.attachments.length > 0
      ? JSON.stringify(data.attachments)
      : null;

    const broadcast = await prisma.teamBroadcast.create({
      data: {
        title: data.title.trim(),
        content: data.content.trim(),
        category: data.category || "GENERAL",
        priority: data.priority || "NORMAL",
        attachments: attachmentsJson,
        targetAudience: data.targetAudience || "ALL",
        targetUserIds: data.targetAudience === "SELECTED" ? (data.targetUserIds || []) : [],
        targetRoles: data.targetAudience === "SELECTED" ? (data.targetRoles || []) : [],
        isPinned: !!data.isPinned,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        authorId: userId
      },
      include: {
        author: {
          select: { id: true, name: true }
        }
      }
    });

    // Notify targeted users
    try {
      let recipientUserIds: string[] = [];
      if (data.targetAudience === "ALL") {
        const allUsers = await prisma.user.findMany({
          where: { isActive: true, id: { not: userId } },
          select: { id: true }
        });
        recipientUserIds = allUsers.map(u => u.id);
      } else {
        const directIds = data.targetUserIds || [];
        let roleIds: string[] = [];
        if (data.targetRoles && data.targetRoles.length > 0) {
          const roleUsers = await prisma.user.findMany({
            where: { isActive: true, role: { in: data.targetRoles } },
            select: { id: true }
          });
          roleIds = roleUsers.map(u => u.id);
        }
        recipientUserIds = Array.from(new Set([...directIds, ...roleIds])).filter(id => id !== userId);
      }

      if (recipientUserIds.length > 0) {
        const categoryLabels: Record<string, string> = {
          OFFER: "🏷️ Offer of the Day",
          HOLIDAY: "🌴 Holiday Notice",
          ANNOUNCEMENT: "📢 Team Announcement",
          URGENT: "🚨 Urgent Notice",
          MEETING: "📅 Meeting / Training",
          GENERAL: "ℹ️ Notice"
        };
        const categoryTag = categoryLabels[data.category || "GENERAL"] || "📢 Team Notice";

        await prisma.notification.createMany({
          data: recipientUserIds.map(recipientId => ({
            userId: recipientId,
            title: `${categoryTag}: ${data.title.trim()}`,
            message: data.content.slice(0, 120) + (data.content.length > 120 ? "..." : ""),
            type: data.category === "URGENT" ? "Alert" : "Message",
            link: "/broadcasts"
          }))
        });
      }
    } catch (notifErr) {
      console.error("Failed to create broadcast notifications:", notifErr);
    }

    revalidatePath("/broadcasts");
    revalidatePath("/");
    return { success: true, broadcast };
  } catch (error) {
    console.error("Failed to create broadcast:", error);
    return { error: "Failed to publish broadcast. Please try again." };
  }
}

export async function addBroadcastReply(broadcastId: string, content: string, attachments?: AttachmentItem[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return { error: "Unauthorized" };
    }

    const userId = (session.user as any).id;
    const userName = (session.user as any).name || "Team Member";

    if (!content?.trim()) {
      return { error: "Reply content cannot be empty." };
    }

    const broadcast = await prisma.teamBroadcast.findUnique({
      where: { id: broadcastId },
      select: { id: true, title: true, authorId: true }
    });

    if (!broadcast) {
      return { error: "Broadcast not found." };
    }

    const attachmentsJson = attachments && attachments.length > 0
      ? JSON.stringify(attachments)
      : null;

    const reply = await prisma.broadcastReply.create({
      data: {
        broadcastId,
        userId,
        content: content.trim(),
        attachments: attachmentsJson
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true
          }
        }
      }
    });

    // Notify author if someone else replied
    if (broadcast.authorId && broadcast.authorId !== userId) {
      try {
        await prisma.notification.create({
          data: {
            userId: broadcast.authorId,
            title: `💬 Reply on: ${broadcast.title}`,
            message: `${userName}: "${content.slice(0, 80)}${content.length > 80 ? '...' : ''}"`,
            type: "Message",
            link: "/broadcasts"
          }
        });
      } catch (err) {
        console.error("Failed to notify author on reply:", err);
      }
    }

    revalidatePath("/broadcasts");
    return { success: true, reply };
  } catch (error) {
    console.error("Failed to add broadcast reply:", error);
    return { error: "Failed to post reply. Please try again." };
  }
}

export async function markBroadcastAsRead(broadcastId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;

    await prisma.broadcastRead.upsert({
      where: {
        broadcastId_userId: { broadcastId, userId }
      },
      update: { readAt: new Date() },
      create: { broadcastId, userId }
    });

    return { success: true };
  } catch (error) {
    return { error: "Failed to mark as read" };
  }
}

export async function togglePinBroadcast(broadcastId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return { error: "Admin only" };
    }

    const current = await prisma.teamBroadcast.findUnique({
      where: { id: broadcastId },
      select: { isPinned: true }
    });

    if (!current) return { error: "Broadcast not found" };

    const updated = await prisma.teamBroadcast.update({
      where: { id: broadcastId },
      data: { isPinned: !current.isPinned }
    });

    revalidatePath("/broadcasts");
    revalidatePath("/");
    return { success: true, isPinned: updated.isPinned };
  } catch (error) {
    return { error: "Failed to toggle pin" };
  }
}

export async function deleteBroadcast(broadcastId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userRole = (session.user as any).role;
    if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
      return { error: "Unauthorized: Admin privileges required." };
    }

    await prisma.teamBroadcast.delete({
      where: { id: broadcastId }
    });

    revalidatePath("/broadcasts");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete broadcast:", error);
    return { error: "Failed to delete broadcast." };
  }
}

export async function getEmployeesForBroadcastTargeting() {
  try {
    const employees = await prisma.employee.findMany({
      where: { employmentStatus: "Active" },
      select: {
        id: true,
        department: true,
        designation: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { user: { name: "asc" } }
    });

    return { success: true, employees };
  } catch (error) {
    console.error("Failed to get employees for broadcast:", error);
    return { error: "Failed to load team list" };
  }
}

export async function getBroadcastAudienceReadStatus(broadcastId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const broadcast = await prisma.teamBroadcast.findUnique({
      where: { id: broadcastId },
      include: {
        reads: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastActiveAt: true,
                presenceStatus: true,
                employee: {
                  select: { department: true, designation: true }
                }
              }
            }
          }
        }
      }
    });

    if (!broadcast) return { error: "Broadcast not found" };

    // Get all targeted users
    let targetUsers: any[] = [];
    if (broadcast.targetAudience === "ALL") {
      targetUsers = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastActiveAt: true,
          presenceStatus: true,
          employee: {
            select: { department: true, designation: true }
          }
        },
        orderBy: { name: "asc" }
      });
    } else {
      const userIds = broadcast.targetUserIds || [];
      const roles = broadcast.targetRoles || [];
      targetUsers = await prisma.user.findMany({
        where: {
          isActive: true,
          OR: [
            { id: { in: userIds } },
            { role: { in: roles } }
          ]
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          lastActiveAt: true,
          presenceStatus: true,
          employee: {
            select: { department: true, designation: true }
          }
        },
        orderBy: { name: "asc" }
      });
    }

    const readMap = new Map<string, Date>();
    broadcast.reads.forEach((r) => {
      readMap.set(r.userId, r.readAt);
    });

    const detailedList = targetUsers.map((u) => {
      const isRead = readMap.has(u.id);
      const readAt = isRead ? readMap.get(u.id) : null;
      const presence = formatPresence(u.lastActiveAt, u.presenceStatus);

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.employee?.department || u.role,
        designation: u.employee?.designation || "",
        isRead,
        readAt,
        presence
      };
    });

    // Count stats
    const totalTargeted = detailedList.length;
    const readCount = detailedList.filter((d) => d.isRead).length;
    const unreadCount = totalTargeted - readCount;
    const onlineCount = detailedList.filter((d) => d.presence.status === "ONLINE").length;
    const idleCount = detailedList.filter((d) => d.presence.status === "IDLE").length;

    return {
      success: true,
      stats: { totalTargeted, readCount, unreadCount, onlineCount, idleCount },
      audience: detailedList
    };
  } catch (error) {
    console.error("Failed to get broadcast read status:", error);
    return { error: "Failed to load audience read status" };
  }
}

export async function getLatestActiveBannerNotice() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: true, notice: null };

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role || "SALES";
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let audienceWhere: any = {};
    if (!isAdmin) {
      audienceWhere = {
        OR: [
          { targetAudience: "ALL" },
          { targetUserIds: { has: userId } },
          { targetRoles: { has: userRole } },
          { authorId: userId }
        ]
      };
    }

    const latestNotice = await prisma.teamBroadcast.findFirst({
      where: {
        AND: [
          audienceWhere,
          {
            OR: [
              { isPinned: true },
              { category: { in: ["OFFER", "HOLIDAY", "URGENT"] } }
            ]
          }
        ]
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        author: { select: { name: true } },
        replies: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, user: { select: { name: true } } }
        }
      }
    });

    return { success: true, notice: latestNotice };
  } catch (err) {
    return { success: true, notice: null };
  }
}
