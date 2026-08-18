"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getMyNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };
    
    const userId = (session.user as any).id;
    
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 20
    });
    
    return { success: true, notifications };
  } catch (error) {
    return { error: "Failed to load notifications" };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to mark as read" };
  }
}

export async function createSystemNotification(userId: string, title: string, message: string, type: string = "System", link?: string) {
  try {
    await prisma.notification.create({
      data: { userId, title, message, type, link }
    });
  } catch (error) {
    console.error("Notification creation failed:", error);
  }
}
