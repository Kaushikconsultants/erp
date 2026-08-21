"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { formatPresence } from "@/lib/presenceUtils";
import { AttachmentItem } from "@/app/actions/broadcastActions";

export async function getDirectConversations() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;

    const conversations = await prisma.directConversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }]
      },
      orderBy: { lastMessageAt: "desc" },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastActiveAt: true,
            presenceStatus: true,
            employee: { select: { department: true, designation: true } }
          }
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastActiveAt: true,
            presenceStatus: true,
            employee: { select: { department: true, designation: true } }
          }
        },
        messages: {
          where: { receiverId: userId, isRead: false },
          select: { id: true }
        }
      }
    });

    const formatted = conversations.map((conv) => {
      const partner = conv.user1Id === userId ? conv.user2 : conv.user1;
      const unreadCount = conv.messages.length;
      const presence = formatPresence(partner.lastActiveAt, partner.presenceStatus);

      return {
        id: conv.id,
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          role: partner.role,
          department: partner.employee?.department || partner.role,
          designation: partner.employee?.designation || "",
          presence
        },
        lastMessageText: conv.lastMessageText || "Started a conversation",
        lastMessageAt: conv.lastMessageAt,
        unreadCount
      };
    });

    return { success: true, conversations: formatted };
  } catch (error) {
    console.error("Failed to load direct conversations:", error);
    return { error: "Failed to load chats." };
  }
}

export async function getConversationMessages(conversationId: string, markRead: boolean = false) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const userId = (session.user as any).id;

    // Check participation
    const conversation = await prisma.directConversation.findUnique({
      where: { id: conversationId },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastActiveAt: true,
            presenceStatus: true,
            employee: { select: { department: true, designation: true } }
          }
        },
        user2: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastActiveAt: true,
            presenceStatus: true,
            employee: { select: { department: true, designation: true } }
          }
        }
      }
    });

    if (!conversation || (conversation.user1Id !== userId && conversation.user2Id !== userId)) {
      return { error: "Conversation not found or access denied." };
    }

    // Only mark unread messages as read when requested (e.g. on chat open, not on background poll)
    if (markRead) {
      await prisma.directMessage.updateMany({
        where: {
          conversationId,
          receiverId: userId,
          isRead: false
        },
        data: {
          isRead: true,
          readAt: new Date()
        }
      });
    }

    const messages = await prisma.directMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    const partner = conversation.user1Id === userId ? conversation.user2 : conversation.user1;
    const presence = formatPresence(partner.lastActiveAt, partner.presenceStatus);

    return {
      success: true,
      partner: {
        id: partner.id,
        name: partner.name,
        email: partner.email,
        role: partner.role,
        department: partner.employee?.department || partner.role,
        designation: partner.employee?.designation || "",
        presence
      },
      messages
    };
  } catch (error) {
    console.error("Failed to load messages:", error);
    return { error: "Failed to load messages." };
  }
}

export async function sendDirectMessage(receiverId: string, content: string, attachments?: AttachmentItem[]) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const senderId = (session.user as any).id;
    const senderName = (session.user as any).name || "Team Member";

    if (!content?.trim() && (!attachments || attachments.length === 0)) {
      return { error: "Message cannot be empty." };
    }

    if (senderId === receiverId) {
      return { error: "Cannot send message to yourself." };
    }

    // Sort IDs to ensure unique 1-on-1 conversation
    const [user1Id, user2Id] = [senderId, receiverId].sort();

    const conversation = await prisma.directConversation.upsert({
      where: {
        user1Id_user2Id: { user1Id, user2Id }
      },
      update: {
        lastMessageText: content.trim() || (attachments && attachments.length > 0 ? `📎 ${attachments[0].name}` : "Sent an attachment"),
        lastMessageAt: new Date()
      },
      create: {
        user1Id,
        user2Id,
        lastMessageText: content.trim() || (attachments && attachments.length > 0 ? `📎 ${attachments[0].name}` : "Sent an attachment"),
        lastMessageAt: new Date()
      }
    });

    const attachmentsJson = attachments && attachments.length > 0
      ? JSON.stringify(attachments)
      : null;

    const message = await prisma.directMessage.create({
      data: {
        conversationId: conversation.id,
        senderId,
        receiverId,
        content: content.trim(),
        attachments: attachmentsJson
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    // Notify receiver
    try {
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: `💬 New message from ${senderName}`,
          message: content.slice(0, 100) || (attachments ? "Sent an attachment" : ""),
          type: "Message",
          link: `/chat?conv=${conversation.id}`
        }
      });
    } catch (notifErr) {
      console.error("Failed to notify message receiver:", notifErr);
    }

    return { success: true, message, conversationId: conversation.id };
  } catch (error) {
    console.error("Failed to send direct message:", error);
    return { error: "Failed to send message." };
  }
}

export async function getTeamDirectoryForChat() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    const currentUserId = (session.user as any).id;

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        id: { not: currentUserId }
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastActiveAt: true,
        presenceStatus: true,
        employee: {
          select: {
            id: true,
            department: true,
            designation: true
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const formatted = users.map((u) => {
      const presence = formatPresence(u.lastActiveAt, u.presenceStatus);
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.employee?.department || u.role,
        designation: u.employee?.designation || "",
        presence
      };
    });

    return { success: true, directory: formatted };
  } catch (error) {
    console.error("Failed to load team directory for chat:", error);
    return { error: "Failed to load team members." };
  }
}

export async function getUnreadChatCount() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { unreadCount: 0 };

    const userId = (session.user as any).id;
    if (!userId) return { unreadCount: 0 };

    const count = await prisma.directMessage.count({
      where: {
        receiverId: userId,
        isRead: false
      }
    });

    return { unreadCount: count };
  } catch (error) {
    return { unreadCount: 0 };
  }
}
