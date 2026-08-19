"use server";

import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage } from "./whatsappActions";

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
      if (inv.customer?.mobile || inv.customer?.whatsappNumber) {
        const phone = inv.customer.whatsappNumber || inv.customer.mobile;
        const msg = `Dear ${inv.customer.contactPerson || inv.customer.businessName}, this is a gentle reminder regarding Invoice #${inv.invoiceNumber} for ₹${inv.totalAmount?.toLocaleString()}, which is pending payment. Please click here to clear your dues or view your account portal. Thank you!`;

        await sendWhatsAppMessage(phone, msg, "UNPAID_INVOICE_CRON");
        remindersSent++;
      }

      // Automatically create a follow-up Task for the assigned salesperson
      if (inv.customer?.assignedSalespersonId) {
        await prisma.task.create({
          data: {
            title: `Follow up on unpaid Invoice #${inv.invoiceNumber}`,
            description: `Invoice for ${inv.customer.businessName} (₹${inv.totalAmount}) is unpaid for over 7 days. Automated WhatsApp reminder sent.`,
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
            description: "Automatically send WhatsApp payment reminder & create high-priority follow-up task for sales rep when invoice is 7+ days unpaid.",
            trigger: "UNPAID_INVOICE_7_DAYS",
            action: "SEND_WHATSAPP_AND_CREATE_TASK",
            isActive: true
          },
          {
            name: "New Order Instant WhatsApp Confirmation",
            description: "Send instant order summary via WhatsApp whenever a new sales order is generated.",
            trigger: "NEW_ORDER",
            action: "SEND_WHATSAPP",
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
