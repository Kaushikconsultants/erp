import webpush from "web-push";
import { prisma } from "@/lib/prisma";

// Configure Web Push VAPID credentials
const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "BIqLUY30-N9qSJrCz4tF1C65XgCRVyr-1TmiCTG2MNFL2_8_EAC4o626ehSdKSM5uUpNPJvpcNCjwOen8evAjRU";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "MJiZ0ppPI4Jx1RM43ryneCtprRbgnsaSGnBmCooFqN0";
const vapidEmail = process.env.VAPID_EMAIL || "mailto:clothingespon@gmail.com";

try {
  webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
} catch (e) {
  console.error("[Push Notifications] Failed to initialize VAPID:", e);
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  type?: string;
  data?: Record<string, any>;
}

/**
 * Send Web / Mobile Push Notification to specific user(s)
 * Automatically cleans up expired/unsubscribed device tokens (HTTP 410 / 404)
 * Also writes an in-app Notification record to the database
 */
export async function sendPushNotificationToUsers(
  userIds: string | string[],
  payload: PushNotificationPayload
) {
  const targetUserIds = Array.isArray(userIds) ? userIds.filter(Boolean) : [userIds].filter(Boolean);
  if (targetUserIds.length === 0) return { success: false, sentCount: 0, reason: "No target users" };

  // 1. Create In-App Notifications in the database
  try {
    await prisma.notification.createMany({
      data: targetUserIds.map((userId) => ({
        userId,
        title: payload.title,
        message: payload.body,
        type: payload.type || "System",
        link: payload.url || "/leads"
      }))
    });
  } catch (e) {
    console.error("[In-App Notification Error]:", e);
  }

  // 2. Fetch all registered device push subscriptions for these users
  let subscriptions: any[] = [];
  try {
    subscriptions = await prisma.whatsAppPushSubscription.findMany({
      where: {
        userId: { in: targetUserIds }
      }
    });
  } catch (e) {
    console.error("[Fetch Push Subscriptions Error]:", e);
  }

  if (subscriptions.length === 0) {
    console.log(`[Push Notification] In-app notification created for ${targetUserIds.length} user(s). No push device subscriptions found.`);
    return { success: true, sentCount: 0, inAppCreated: true };
  }

  const notificationString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    tag: payload.tag || `crm-${Date.now()}`,
    url: payload.url || "/leads",
    data: {
      url: payload.url || "/leads",
      type: payload.type,
      ...(payload.data || {})
    }
  });

  let sentCount = 0;
  const expiredEndpoints: string[] = [];

  // 3. Deliver to each registered mobile / browser device
  await Promise.all(
    subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notificationString, {
          TTL: 86400, // 24 hours
          urgency: "high"
        });
        sentCount++;
      } catch (err: any) {
        console.warn(`[Push Delivery Failed for ${sub.userId}]:`, err?.message || err);
        // If device unsubscribed or token expired (HTTP 410 or 404), queue for cleanup
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          expiredEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  // 4. Cleanup expired endpoints from DB
  if (expiredEndpoints.length > 0) {
    try {
      await prisma.whatsAppPushSubscription.deleteMany({
        where: { endpoint: { in: expiredEndpoints } }
      });
      console.log(`[Push Notification Cleanup] Removed ${expiredEndpoints.length} expired subscriptions.`);
    } catch (e) {}
  }

  return { success: true, sentCount, totalDevices: subscriptions.length };
}

/**
 * Notify relevant users when a NEW LEAD arrives
 * (Webhook from Meta Ads / WhatsApp / IndiaMART / Website / Manual CRM entry)
 */
export async function notifyNewLead(params: {
  leadId: string;
  name: string;
  whatsappNumber: string;
  shopName?: string | null;
  assignedSalespersonId?: string | null;
  organizationId?: string | null;
  source?: string | null;
}) {
  try {
    const { leadId, name, whatsappNumber, shopName, assignedSalespersonId, organizationId, source } = params;

    const targetUserIds = new Set<string>();

    // 1. If assigned to a salesperson, find that employee's user ID
    if (assignedSalespersonId) {
      const emp = await prisma.employee.findUnique({
        where: { id: assignedSalespersonId },
        select: { userId: true }
      });
      if (emp?.userId) {
        targetUserIds.add(emp.userId);
      }
    }

    // 2. Find all ADMIN and SUPER_ADMIN users in the tenant organization
    const orgWhere: any = {};
    if (organizationId) {
      orgWhere.organizationId = organizationId;
    }

    const adminUsers = await prisma.user.findMany({
      where: {
        ...orgWhere,
        role: { in: ["ADMIN", "SUPER_ADMIN", "SALES_MANAGER"] },
        isActive: true
      },
      select: { id: true }
    });

    adminUsers.forEach((u) => targetUserIds.add(u.id));

    // If no admin found, find any active user in organization
    if (targetUserIds.size === 0) {
      const fallbackUsers = await prisma.user.findMany({
        where: { ...orgWhere, isActive: true },
        take: 5,
        select: { id: true }
      });
      fallbackUsers.forEach((u) => targetUserIds.add(u.id));
    }

    const recipientList = Array.from(targetUserIds);
    if (recipientList.length === 0) return { success: false, reason: "No recipient users found" };

    const shopText = shopName ? ` (${shopName})` : "";
    const sourceText = source ? ` via ${source}` : "";

    return await sendPushNotificationToUsers(recipientList, {
      title: `🎯 New Lead: ${name}${shopText}`,
      body: `📱 ${whatsappNumber}${sourceText} • Tap to view lead & call customer`,
      url: `/leads`,
      tag: `lead-new-${leadId}`,
      type: "Lead",
      data: {
        leadId,
        whatsappNumber,
        name
      }
    });
  } catch (error) {
    console.error("[notifyNewLead Error]:", error);
    return { success: false, error };
  }
}

/**
 * Notify assigned agent / admins when an incoming WhatsApp customer message is received
 */
export async function notifyNewWhatsAppMessage(params: {
  phone: string;
  customerName?: string | null;
  previewText: string;
  assignedSalespersonId?: string | null;
  organizationId?: string | null;
}) {
  try {
    const { phone, customerName, previewText, assignedSalespersonId, organizationId } = params;
    const targetUserIds = new Set<string>();

    if (assignedSalespersonId) {
      const emp = await prisma.employee.findUnique({
        where: { id: assignedSalespersonId },
        select: { userId: true }
      });
      if (emp?.userId) targetUserIds.add(emp.userId);
    }

    const orgWhere: any = organizationId ? { organizationId } : {};
    const adminUsers = await prisma.user.findMany({
      where: {
        ...orgWhere,
        role: { in: ["ADMIN", "SUPER_ADMIN"] },
        isActive: true
      },
      select: { id: true }
    });
    adminUsers.forEach((u) => targetUserIds.add(u.id));

    const recipientList = Array.from(targetUserIds);
    if (recipientList.length === 0) return { success: false };

    const sender = customerName || phone;

    return await sendPushNotificationToUsers(recipientList, {
      title: `💬 New Message from ${sender}`,
      body: previewText || "Customer sent a new WhatsApp message",
      url: `/whatsapp/inbox`,
      tag: `wa-msg-${phone}`,
      type: "Message",
      data: { phone }
    });
  } catch (error) {
    console.error("[notifyNewWhatsAppMessage Error]:", error);
    return { success: false, error };
  }
}

/**
 * Notify on Quotation Confirmation / Token Payment
 */
export async function notifyQuotationConfirmed(params: {
  quotationId: string;
  quotationNumber: string;
  customerName: string;
  totalValue: number;
  salespersonId?: string | null;
  organizationId?: string | null;
}) {
  try {
    const { quotationId, quotationNumber, customerName, totalValue, salespersonId, organizationId } = params;
    const targetUserIds = new Set<string>();

    if (salespersonId) {
      const emp = await prisma.employee.findUnique({
        where: { id: salespersonId },
        select: { userId: true }
      });
      if (emp?.userId) targetUserIds.add(emp.userId);
    }

    const orgWhere: any = organizationId ? { organizationId } : {};
    const admins = await prisma.user.findMany({
      where: { ...orgWhere, role: { in: ["ADMIN", "SUPER_ADMIN"] }, isActive: true },
      select: { id: true }
    });
    admins.forEach((u) => targetUserIds.add(u.id));

    const recipientList = Array.from(targetUserIds);
    if (recipientList.length === 0) return { success: false };

    return await sendPushNotificationToUsers(recipientList, {
      title: `✅ Quotation Confirmed: ${quotationNumber}`,
      body: `${customerName} • Deal Value: ₹${totalValue.toLocaleString('en-IN')}`,
      url: `/quotations/${quotationId}`,
      tag: `quote-confirmed-${quotationId}`,
      type: "Quotation",
      data: { quotationId, quotationNumber }
    });
  } catch (error) {
    console.error("[notifyQuotationConfirmed Error]:", error);
    return { success: false, error };
  }
}

/**
 * Send a Live Test Notification to verify push delivery to current user's mobile device
 */
export async function sendTestNotificationToUser(userId: string) {
  return await sendPushNotificationToUsers([userId], {
    title: "🎉 Push Notification Test Successful!",
    body: "Your mobile device is successfully connected to CRM real-time alerts.",
    url: "/settings/notifications",
    tag: `test-push-${Date.now()}`,
    type: "System",
    data: { test: true }
  });
}
