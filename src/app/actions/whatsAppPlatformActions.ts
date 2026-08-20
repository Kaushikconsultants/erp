"use server";

import { prisma } from "@/lib/prisma";
import { seedWhatsAppPlatformData } from "@/lib/seedWhatsApp";
import { revalidatePath } from "next/cache";

// Ensure seed data is initialized automatically if database is fresh
async function ensureSeeded() {
  const count = await prisma.whatsAppConversation.count();
  if (count === 0) {
    await seedWhatsAppPlatformData();
  }
}

// ---------------------------------------------------------
// 1. INBOX & CONVERSATIONS
// ---------------------------------------------------------

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface ConversationFilterOptions {
  search?: string;
  tab?: 'all' | 'assigned_to_me' | 'unassigned' | 'mentions' | 'dms' | 'groups';
  unreadOnly?: boolean;
  leadStatus?: string;
  priority?: string;
  customerType?: string;
  assignedEmployeeId?: string;
  filterEmployeeId?: string; // Team member filter for Admins
  sortBy?: 'newest' | 'oldest';
}

export async function getWhatsAppConversations(filters: ConversationFilterOptions = {}) {
  await ensureSeeded();
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role || 'SALES';
    const userId = (session?.user as any)?.id;
    const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'MANAGER';

    let currentEmployee = null;
    if (userId) {
      currentEmployee = await prisma.employee.findUnique({ where: { userId } });
    }

    const where: any = {};

    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      where.OR = [
        { customer: { businessName: { contains: q, mode: 'insensitive' } } },
        { customer: { contactPerson: { contains: q, mode: 'insensitive' } } },
        { customer: { mobile: { contains: q, mode: 'insensitive' } } },
        { lastMessageText: { contains: q, mode: 'insensitive' } }
      ];
    }

    if (filters.unreadOnly) {
      where.unreadCount = { gt: 0 };
    }

    if (filters.leadStatus) {
      where.leadStatus = filters.leadStatus;
    }

    if (filters.priority) {
      where.priority = filters.priority;
    }

    if (filters.customerType) {
      where.customerType = filters.customerType;
    }

    // Role-Based Access Scoping:
    // Salespersons can ONLY view their own assigned leads!
    if (!isAdmin) {
      if (currentEmployee) {
        where.assignedEmployeeId = currentEmployee.id;
      } else {
        where.id = '00000000-0000-0000-0000-000000000000'; // Return empty if sales user has no employee
      }
    } else {
      // Admin / Manager View: Can see all leads, or filter by specific team member
      if (filters.filterEmployeeId) {
        where.assignedEmployeeId = filters.filterEmployeeId;
      } else if (filters.tab === 'unassigned') {
        where.assignedEmployeeId = null;
      } else if (filters.tab === 'assigned_to_me' && currentEmployee) {
        where.assignedEmployeeId = currentEmployee.id;
      } else if (filters.assignedEmployeeId) {
        where.assignedEmployeeId = filters.assignedEmployeeId;
      }
    }

    const conversations = await prisma.whatsAppConversation.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            email: true,
            city: true,
            state: true,
            customerType: true,
            status: true,
            leadStage: true,
            temperature: true,
            tags: true,
            totalOrders: true,
            totalPurchaseValue: true
          }
        },
        assignedEmployee: {
          select: {
            id: true,
            employeeId: true,
            mobile: true,
            user: { select: { name: true, email: true } }
          }
        },
        account: {
          select: {
            id: true,
            name: true,
            phoneNumber: true,
            status: true
          }
        }
      },
      orderBy: {
        lastMessageAt: filters.sortBy === 'oldest' ? 'asc' : 'desc'
      }
    });

    return { success: true, conversations };
  } catch (error: any) {
    console.error("Error fetching WhatsApp conversations:", error);
    return { success: false, error: error.message, conversations: [] };
  }
}

export async function getWhatsAppConversationById(id: string) {
  await ensureSeeded();
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id },
      include: {
        account: true,
        customer: {
          include: {
            orders: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            quotations: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            invoices: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            tasks: {
              orderBy: { createdAt: 'desc' },
              take: 5
            },
            followUps: {
              orderBy: { createdAt: 'desc' },
              take: 5
            }
          }
        },
        assignedEmployee: {
          include: { user: true }
        },
        messages: {
          orderBy: { sentAt: 'asc' }
        },
        paymentLinks: {
          orderBy: { createdAt: 'desc' },
          take: 3
        }
      }
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    // Reset unread count when viewed
    if (conversation.unreadCount > 0) {
      await prisma.whatsAppConversation.update({
        where: { id },
        data: { unreadCount: 0 }
      });
    }

    return { success: true, conversation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 2. MESSAGING & CHAT ACTIONS
// ---------------------------------------------------------

export async function sendWhatsAppMessageAction(data: {
  conversationId: string;
  senderType?: 'AGENT' | 'SYSTEM' | 'BOT' | 'AI' | 'CUSTOMER';
  senderId?: string;
  senderName?: string;
  messageType?: string;
  content: string;
  mediaUrl?: string;
  mediaType?: string;
  mediaFilename?: string;
  metadata?: string;
  isInternalNote?: boolean;
}) {
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: data.conversationId },
      include: { customer: true }
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    const message = await prisma.whatsAppMessage.create({
      data: {
        conversationId: data.conversationId,
        senderType: data.senderType || 'AGENT',
        senderId: data.senderId,
        senderName: data.senderName || 'Sales Agent',
        messageType: data.messageType || 'TEXT',
        content: data.content,
        mediaUrl: data.mediaUrl,
        mediaType: data.mediaType,
        mediaFilename: data.mediaFilename,
        metadata: data.metadata,
        isInternalNote: data.isInternalNote || false,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    // Update conversation metadata
    await prisma.whatsAppConversation.update({
      where: { id: data.conversationId },
      data: {
        lastMessageText: data.isInternalNote ? conversation.lastMessageText : data.content,
        lastMessageAt: new Date()
      }
    });

    // Log to CommunicationLog for system audit
    await prisma.communicationLog.create({
      data: {
        type: 'WHATSAPP',
        recipient: conversation.customer.mobile,
        message: data.content,
        status: 'SENT',
        triggerEvent: data.isInternalNote ? 'INTERNAL_NOTE' : 'MANUAL_CHAT'
      }
    });

    // Simulated AI Auto-Response if conversation is marked AI handled and message is from customer
    if (data.senderType === 'CUSTOMER' && conversation.aiHandled) {
      setTimeout(async () => {
        try {
          await prisma.whatsAppMessage.create({
            data: {
              conversationId: data.conversationId,
              senderType: 'AI',
              senderName: 'Espon AI Assistant',
              messageType: 'TEXT',
              content: `Thank you for your message! Our AI Assistant has logged your inquiry regarding "${data.content.slice(0, 40)}...". Our sales representative is reviewing details.`,
              status: 'SENT',
              sentAt: new Date()
            }
          });
        } catch (e) {
          console.error("AI Auto-reply simulation error:", e);
        }
      }, 1500);
    }

    revalidatePath(`/whatsapp/inbox`);
    return { success: true, message };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 3. CRM 360° PROFILE UPDATE DIRECTLY FROM WHATSAPP
// ---------------------------------------------------------

export async function updateCRMProfileFromWhatsApp(data: {
  conversationId: string;
  customerId: string;
  businessName?: string;
  contactPerson?: string;
  mobile?: string;
  email?: string;
  city?: string;
  state?: string;
  customerType?: string;
  leadStage?: string;
  priority?: string;
  tags?: string;
  assignedEmployeeId?: string;
  notes?: string;
}) {
  try {
    // Update Customer Model
    const updatedCustomer = await prisma.customer.update({
      where: { id: data.customerId },
      data: {
        businessName: data.businessName,
        contactPerson: data.contactPerson,
        mobile: data.mobile,
        email: data.email,
        city: data.city,
        state: data.state,
        customerType: data.customerType,
        leadStage: data.leadStage,
        tags: data.tags,
        assignedSalespersonId: data.assignedEmployeeId,
        notes: data.notes
      }
    });

    // Update Conversation Model
    await prisma.whatsAppConversation.update({
      where: { id: data.conversationId },
      data: {
        leadStatus: data.leadStage || undefined,
        priority: data.priority || undefined,
        customerType: data.customerType || undefined,
        tags: data.tags || undefined,
        assignedEmployeeId: data.assignedEmployeeId || undefined
      }
    });

    revalidatePath(`/whatsapp/inbox`);
    return { success: true, customer: updatedCustomer };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 4. QUICK COMMERCE ACTIONS (CREATE QUOTE, ORDER, PAYMENT LINK)
// ---------------------------------------------------------

export async function createWhatsAppQuotation(data: {
  conversationId: string;
  customerId: string;
  items: Array<{ name: string; quantity: number; rate: number }>;
  notes?: string;
}) {
  try {
    const customer = await prisma.customer.findUnique({ where: { id: data.customerId } });
    const employee = await prisma.employee.findFirst({ include: { user: true } });

    if (!customer || !employee) {
      return { success: false, error: "Customer or Employee record missing" };
    }

    const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxTotal = subtotal * 0.12; // 12% GST
    const totalValue = subtotal + taxTotal;
    const qNum = `QT-WA-${Math.floor(1000 + Math.random() * 9000)}`;

    const firstProduct = await prisma.product.findFirst();
    if (!firstProduct) {
      return { success: false, error: "No products in database to link quotation item" };
    }

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber: qNum,
        customerId: customer.id,
        salespersonId: employee.id,
        subtotal,
        taxTotal,
        totalValue,
        status: 'Sent',
        notes: data.notes || 'Created directly from WhatsApp Conversation',
        items: {
          create: data.items.map(item => ({
            productId: firstProduct.id,
            description: item.name,
            quantity: item.quantity,
            rate: item.rate,
            taxableAmount: item.quantity * item.rate,
            total: item.quantity * item.rate * 1.12
          }))
        }
      }
    });

    // Send Quotation Message Card into WhatsApp Chat
    await sendWhatsAppMessageAction({
      conversationId: data.conversationId,
      senderType: 'AGENT',
      senderName: employee.user?.name || 'Sales Agent',
      messageType: 'DOCUMENT',
      content: `Quotation ${qNum} generated for ₹${totalValue.toLocaleString('en-IN')}.\nItems: ${data.items.map(i => `${i.name} x${i.quantity}`).join(', ')}.`,
      mediaUrl: `/samples/Quotation-${qNum}.pdf`,
      mediaFilename: `${qNum}.pdf`,
      metadata: JSON.stringify({ quotationId: quotation.id, totalValue })
    });

    // Update conversation lead stage
    await prisma.whatsAppConversation.update({
      where: { id: data.conversationId },
      data: { leadStatus: 'Quotation Shared', orderStatus: 'Quotation Sent' }
    });

    return { success: true, quotation };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function generateWhatsAppPaymentLinkAction(data: {
  conversationId: string;
  customerId: string;
  amount: number;
  description: string;
}) {
  try {
    const paymentUrl = `https://espon.in/pay/wa_${Date.now()}`;
    
    const paymentLink = await prisma.whatsAppPaymentLink.create({
      data: {
        conversationId: data.conversationId,
        customerId: data.customerId,
        amount: data.amount,
        paymentUrl,
        status: 'PENDING'
      }
    });

    // Send Payment Link Message into WhatsApp Chat
    await sendWhatsAppMessageAction({
      conversationId: data.conversationId,
      senderType: 'AGENT',
      senderName: 'Billing System',
      messageType: 'PAYMENT_LINK',
      content: `Payment Request: ₹${data.amount.toLocaleString('en-IN')} for ${data.description}.\nClick link to complete payment via UPI / Card / NetBanking:\n${paymentUrl}`,
      metadata: JSON.stringify({ paymentLinkId: paymentLink.id, amount: data.amount, paymentUrl })
    });

    await prisma.whatsAppConversation.update({
      where: { id: data.conversationId },
      data: { orderStatus: 'Payment Pending', priority: 'HIGH' }
    });

    return { success: true, paymentLink };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 5. DASHBOARD & METRICS
// ---------------------------------------------------------

export async function getWhatsAppDashboardMetrics() {
  await ensureSeeded();
  try {
    const [
      account,
      totalConvs,
      openConvs,
      closedConvs,
      highPriority,
      totalMessages,
      sentToday,
      activeAutomations,
      activeTemplates,
      activeCampaigns
    ] = await Promise.all([
      prisma.whatsAppAccount.findFirst(),
      prisma.whatsAppConversation.count(),
      prisma.whatsAppConversation.count({ where: { status: 'OPEN' } }),
      prisma.whatsAppConversation.count({ where: { status: 'CLOSED' } }),
      prisma.whatsAppConversation.count({ where: { priority: 'HIGH' } }),
      prisma.whatsAppMessage.count(),
      prisma.whatsAppMessage.count({ where: { sentAt: { gte: new Date(new Date().setHours(0,0,0,0)) } } }),
      prisma.whatsAppAutomationRule.count({ where: { isActive: true } }),
      prisma.whatsAppTemplate.count({ where: { status: 'APPROVED' } }),
      prisma.whatsAppCampaign.count({ where: { status: 'COMPLETED' } })
    ]);

    return {
      success: true,
      account: account || {
        name: "Espon Main Sales",
        phoneNumber: "+91 7206066678",
        status: "CONNECTED",
        dailyLimit: "10K per day",
        usedToday: 1250,
        qualityRating: "GREEN"
      },
      metrics: {
        totalConvs,
        openConvs,
        closedConvs,
        highPriority,
        totalMessages,
        sentToday: sentToday || 125,
        activeAutomations,
        activeTemplates,
        activeCampaigns
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ---------------------------------------------------------
// 6. TEMPLATES, REPLIES, AUTOMATIONS, BOT & CAMPAIGNS
// ---------------------------------------------------------

export async function getWhatsAppTemplates() {
  await ensureSeeded();
  const templates = await prisma.whatsAppTemplate.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, templates };
}

export async function saveWhatsAppTemplateAction(data: any) {
  try {
    const template = await prisma.whatsAppTemplate.create({
      data: {
        name: data.name.toLowerCase().replace(/\s+/g, '_'),
        category: data.category || 'MARKETING',
        headerType: data.headerType || 'NONE',
        headerContent: data.headerContent,
        bodyText: data.bodyText,
        footerText: data.footerText,
        buttons: JSON.stringify(data.buttons || []),
        variables: JSON.stringify(data.variables || []),
        status: 'APPROVED'
      }
    });
    revalidatePath('/whatsapp/templates');
    return { success: true, template };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getWhatsAppReplyLibrary() {
  await ensureSeeded();
  const replies = await prisma.whatsAppReplyItem.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, replies };
}

export async function saveWhatsAppReplyItemAction(data: any) {
  try {
    const reply = await prisma.whatsAppReplyItem.create({
      data: {
        title: data.title,
        category: data.category || 'Quick Reply',
        shortcut: data.shortcut.startsWith('/') ? data.shortcut : `/${data.shortcut}`,
        content: data.content
      }
    });
    revalidatePath('/whatsapp/reply-library');
    return { success: true, reply };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getWhatsAppAutomationRules() {
  await ensureSeeded();
  const rules = await prisma.whatsAppAutomationRule.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, rules };
}

export async function getWhatsAppChatbotFlows() {
  await ensureSeeded();
  const flows = await prisma.whatsAppChatbotFlow.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, flows };
}

export async function getWhatsAppForms() {
  await ensureSeeded();
  const forms = await prisma.whatsAppForm.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, forms };
}

export async function getWhatsAppCampaigns() {
  await ensureSeeded();
  const campaigns = await prisma.whatsAppCampaign.findMany({ orderBy: { createdAt: 'desc' } });
  const segments = await prisma.whatsAppSegment.findMany({ orderBy: { createdAt: 'desc' } });
  return { success: true, campaigns, segments };
}

export async function createWhatsAppBroadcastCampaign(data: {
  name: string;
  templateId: string;
  segmentId?: string;
  totalAudience: number;
}) {
  try {
    const campaign = await prisma.whatsAppCampaign.create({
      data: {
        name: data.name,
        templateId: data.templateId,
        segmentId: data.segmentId,
        scheduledAt: new Date(),
        status: 'COMPLETED',
        totalAudience: data.totalAudience,
        sentCount: data.totalAudience,
        deliveredCount: Math.floor(data.totalAudience * 0.98),
        readCount: Math.floor(data.totalAudience * 0.85),
        repliedCount: Math.floor(data.totalAudience * 0.22),
        leadsGenerated: Math.floor(data.totalAudience * 0.10),
        ordersGenerated: Math.floor(data.totalAudience * 0.06),
        revenueGenerated: Math.floor(data.totalAudience * 4200),
        cost: data.totalAudience * 1.0
      }
    });
    revalidatePath('/whatsapp/broadcasts');
    revalidatePath('/whatsapp/campaigns');
    return { success: true, campaign };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------
// 7. TEAM MANAGEMENT & MANUAL / ROUND ROBIN ASSIGNMENT
// ---------------------------------------------------------

export async function assignWhatsAppLeadAction(data: {
  conversationId: string;
  employeeId?: string;
  method?: 'MANUAL' | 'ROUND_ROBIN';
}) {
  try {
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: data.conversationId },
      include: { customer: true }
    });

    if (!conversation) {
      return { success: false, error: "Conversation not found" };
    }

    let targetEmployeeId = data.employeeId;
    let assignmentNote = "";

    if (data.method === 'ROUND_ROBIN') {
      // Fetch all employees and count their active assigned WhatsApp conversations
      const activeEmployees = await prisma.employee.findMany({
        select: {
          id: true,
          employeeId: true,
          user: { select: { name: true, email: true } },
          assignedWhatsAppConversations: {
            where: { status: 'OPEN' },
            select: { id: true }
          }
        }
      });

      if (activeEmployees.length === 0) {
        return { success: false, error: "No active sales employees available for Round Robin assignment" };
      }

      // Sort by fewest active conversations
      activeEmployees.sort((a, b) => a.assignedWhatsAppConversations.length - b.assignedWhatsAppConversations.length);
      const leastAssigned = activeEmployees[0];
      targetEmployeeId = leastAssigned.id;
      const empName = leastAssigned.user?.name || leastAssigned.employeeId;
      assignmentNote = `Internal Note: Conversation auto-assigned to ${empName} via Round-Robin distribution.`;
    } else {
      if (!targetEmployeeId) {
        return { success: false, error: "Employee ID is required for manual assignment" };
      }
      const targetEmp = await prisma.employee.findUnique({
        where: { id: targetEmployeeId },
        include: { user: true }
      });
      const empName = targetEmp?.user?.name || "Sales Executive";
      assignmentNote = `Internal Note: Conversation manually assigned to ${empName}.`;
    }

    // Update Conversation & Customer Salesperson
    await prisma.whatsAppConversation.update({
      where: { id: data.conversationId },
      data: { assignedEmployeeId: targetEmployeeId }
    });

    await prisma.customer.update({
      where: { id: conversation.customerId },
      data: { assignedSalespersonId: targetEmployeeId }
    });

    // Add Internal Team Note
    await prisma.whatsAppMessage.create({
      data: {
        conversationId: data.conversationId,
        senderType: 'SYSTEM',
        senderName: 'System Assignment',
        messageType: 'TEXT',
        content: assignmentNote,
        isInternalNote: true,
        status: 'SENT',
        sentAt: new Date()
      }
    });

    revalidatePath('/whatsapp/inbox');
    revalidatePath('/whatsapp/team-inbox');
    return { success: true, assignedEmployeeId: targetEmployeeId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function getAllEmployeesAndTeams() {
  await ensureSeeded();
  try {
    const [teams, employees] = await Promise.all([
      prisma.team.findMany({
        include: {
          members: {
            include: {
              user: true,
              assignedWhatsAppConversations: {
                where: { status: 'OPEN' }
              }
            }
          }
        }
      }),
      prisma.employee.findMany({
        include: {
          user: true,
          team: true,
          assignedWhatsAppConversations: {
            where: { status: 'OPEN' }
          }
        }
      })
    ]);

    return { success: true, teams, employees };
  } catch (e: any) {
    return { success: false, error: e.message, teams: [], employees: [] };
  }
}

export async function addEmployeeToTeamAction(teamId: string, employeeId: string) {
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { teamId }
    });
    revalidatePath('/whatsapp/team-inbox');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function removeEmployeeFromTeamAction(employeeId: string) {
  try {
    await prisma.employee.update({
      where: { id: employeeId },
      data: { teamId: null }
    });
    revalidatePath('/whatsapp/team-inbox');
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function createNewTeamAction(name: string, description?: string) {
  try {
    const team = await prisma.team.create({
      data: { name, description }
    });
    revalidatePath('/whatsapp/team-inbox');
    return { success: true, team };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

