"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { sendTestNotificationToUser, sendPushNotificationToUsers } from "@/lib/pushNotifications";

export async function getMyNotifications() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30
    });

    return { success: true, notifications };
  } catch (error) {
    return { error: "Failed to load notifications" };
  }
}

export async function markNotificationAsRead(id: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to mark as read" };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true }
    });
    return { success: true };
  } catch (error) {
    return { error: "Failed to mark all as read" };
  }
}

export async function createSystemNotification(
  userId: string,
  title: string,
  message: string,
  type: string = "System",
  link?: string
) {
  try {
    await sendPushNotificationToUsers(userId, {
      title,
      body: message,
      url: link || "/leads",
      type
    });
  } catch (error) {
    console.error("Notification creation failed:", error);
  }
}

export async function sendTestPushNotificationAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Please log in first" };

    const userId = (session.user as any).id;
    const res = await sendTestNotificationToUser(userId);

    return {
      success: true,
      sentCount: res.sentCount,
      totalDevices: res.totalDevices
    };
  } catch (error: any) {
    console.error("Test notification action failed:", error);
    return { success: false, error: error.message || "Failed to send test push notification" };
  }
}

export async function getMyActivePushDevicesCount() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { count: 0 };

    const userId = (session.user as any).id;
    const count = await prisma.whatsAppPushSubscription.count({
      where: { userId }
    });

    return { count };
  } catch (e) {
    return { count: 0 };
  }
}

export interface NotificationSettingsData {
  notifyNewLeads: boolean;
  notifyWhatsAppMessages: boolean;
  notifyFollowUpsDue: boolean;
  notifyQuotesAccepted: boolean;
  notifyOrdersPlaced: boolean;
  notifyTeamBroadcasts: boolean;
  enablePushNotifications: boolean;
  enableNotificationSound: boolean;
  enableHapticVibration: boolean;
  leadRoutingAudience: "ASSIGNED_AND_ADMINS" | "ALL_SALES" | "ADMINS_ONLY";
  soundVolume: number;
}

const DEFAULT_SETTINGS: NotificationSettingsData = {
  notifyNewLeads: true,
  notifyWhatsAppMessages: true,
  notifyFollowUpsDue: true,
  notifyQuotesAccepted: true,
  notifyOrdersPlaced: true,
  notifyTeamBroadcasts: true,
  enablePushNotifications: true,
  enableNotificationSound: true,
  enableHapticVibration: true,
  leadRoutingAudience: "ASSIGNED_AND_ADMINS",
  soundVolume: 80
};

export async function getNotificationPreferences(): Promise<{ success: boolean; settings: NotificationSettingsData }> {
  try {
    const session = await getServerSession(authOptions);
    const orgId = await getTenantOrgId();

    if (!session?.user || !orgId) {
      return { success: true, settings: DEFAULT_SETTINGS };
    }

    const integration = await prisma.appIntegration.findUnique({
      where: {
        organizationId_providerId: {
          organizationId: orgId,
          providerId: "crm_notification_preferences"
        }
      }
    });

    if (integration?.settings) {
      try {
        const parsed = JSON.parse(integration.settings);
        return { success: true, settings: { ...DEFAULT_SETTINGS, ...parsed } };
      } catch (e) {}
    }

    return { success: true, settings: DEFAULT_SETTINGS };
  } catch (error) {
    return { success: true, settings: DEFAULT_SETTINGS };
  }
}

export async function saveNotificationPreferences(settings: Partial<NotificationSettingsData>) {
  try {
    const session = await getServerSession(authOptions);
    const orgId = await getTenantOrgId();

    if (!session?.user) return { success: false, error: "Unauthorized" };
    if (!orgId) return { success: false, error: "No organization found" };

    const existing = await getNotificationPreferences();
    const merged = { ...existing.settings, ...settings };

    await prisma.appIntegration.upsert({
      where: {
        organizationId_providerId: {
          organizationId: orgId,
          providerId: "crm_notification_preferences"
        }
      },
      update: {
        settings: JSON.stringify(merged),
        isEnabled: true
      },
      create: {
        organizationId: orgId,
        providerId: "crm_notification_preferences",
        category: "MESSAGING",
        name: "Notification & Mobile Alert Preferences",
        settings: JSON.stringify(merged),
        isEnabled: true
      }
    });

    revalidatePath("/settings/notifications");
    return { success: true, settings: merged };
  } catch (error: any) {
    console.error("Failed to save notification preferences:", error);
    return { success: false, error: error.message || "Failed to save preferences" };
  }
}
