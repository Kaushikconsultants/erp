"use server";

import { prisma } from "@/lib/prisma";

export async function processUnpaidInvoicesWorkflow() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Find invoices unpaid and created 7+ days ago
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: { in: ["Unpaid", "Overdue", "Pending"] },
        invoiceDate: { lte: sevenDaysAgo }
      },
      include: {
        customer: true
      }
    });

    let remindersSent = 0;
    let tasksCreated = 0;

    for (const inv of overdueInvoices) {
      if (inv.customer?.mobile || (inv.customer as any)?.whatsappNumber) {
        const phone = (inv.customer as any)?.whatsappNumber || inv.customer.mobile;
        const msg = `Dear ${inv.customer.contactPerson || inv.customer.businessName}, this is a gentle reminder regarding Invoice #${inv.invoiceNumber} for ₹${inv.totalAmount?.toLocaleString()}, which is pending payment. Thank you!`;

        await prisma.communicationLog.create({
          data: {
            type: "SMS",
            recipient: phone.replace(/\D/g, ''),
            message: msg,
            status: "DELIVERED",
            triggerEvent: "UNPAID_INVOICE_CRON"
          }
        });
        remindersSent++;
      }

      // Automatically create a follow-up Task for the assigned salesperson
      if (inv.customer?.assignedSalespersonId) {
        await prisma.task.create({
          data: {
            title: `Follow up on unpaid Invoice #${inv.invoiceNumber}`,
            description: `Invoice for ${inv.customer.businessName} (₹${inv.totalAmount}) is unpaid for over 7 days. Automated notification generated.`,
            priority: "High",
            status: "Pending",
            assigneeId: inv.customer.assignedSalespersonId,
            creatorId: inv.customer.assignedSalespersonId,
            dueDate: new Date()
          }
        });
        tasksCreated++;
      }
    }

    return {
      success: true,
      processedCount: overdueInvoices.length,
      remindersSent,
      tasksCreated
    };
  } catch (err: any) {
    console.error("Workflow processing error:", err);
    return { success: false, error: err.message };
  }
}

export async function getWorkflowRules() {
  try {
    let rules = await prisma.workflowRule.findMany({
      orderBy: { createdAt: 'desc' }
    });

    // Seed default rules if empty
    if (rules.length === 0) {
      await prisma.workflowRule.createMany({
        data: [
          {
            name: "Unpaid Invoice 7-Day Auto Alert",
            description: "Automatically create high-priority follow-up task for sales rep when invoice is 7+ days unpaid.",
            trigger: "UNPAID_INVOICE_7_DAYS",
            action: "CREATE_TASK_AND_LOG",
            isActive: true
          },
          {
            name: "New Order Automated Team Notification",
            description: "Send instant notification to dispatch & sales whenever a new sales order is generated.",
            trigger: "NEW_ORDER",
            action: "NOTIFY_TEAM",
            isActive: true
          }
        ]
      });
      rules = await prisma.workflowRule.findMany({ orderBy: { createdAt: 'desc' } });
    }

    return { success: true, rules };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function toggleWorkflowRule(id: string, isActive: boolean) {
  try {
    const updated = await prisma.workflowRule.update({
      where: { id },
      data: { isActive }
    });
    return { success: true, rule: updated };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function getCommunicationLogs() {
  try {
    const logs = await prisma.communicationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return { success: true, logs };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
