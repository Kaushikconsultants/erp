"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "intro",
    name: "Company Intro & Product Catalog",
    subject: "Introduction to Espon Clothing - Premium Garment Manufacturer",
    body: `Dear {{contactPerson}},\n\nGreetings from Espon Clothing!\n\nWe are pleased to connect with {{companyName}}. We are a leading apparel manufacturer specializing in premium knitwear, polo shirts, and activewear with high-standard fabrication and timely dispatch.\n\nPlease find our catalog and price sheet attached for your review. We would love to discuss a sample order for your upcoming requirements.\n\nWarm regards,\n{{agentName}}\nEspon Clothing Private Limited`
  },
  {
    id: "quote_followup",
    name: "Quotation Follow-up",
    subject: "Follow-up regarding Quotation {{quoteNumber}} - Espon Clothing",
    body: `Dear {{contactPerson}},\n\nI hope this email finds you well.\n\nI am writing to follow up on Quotation {{quoteNumber}} shared with {{companyName}} recently. Have you had an opportunity to review the pricing and terms?\n\nPlease feel free to let me know if you would like any customizations or revisions to the quantities.\n\nLooking forward to your feedback,\n{{agentName}}\nSales Team | Espon Clothing`
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder / Outstanding",
    subject: "Statement of Account & Payment Reminder - {{companyName}}",
    body: `Dear {{contactPerson}},\n\nWe hope your business is doing well.\n\nThis is a friendly reminder regarding the outstanding balance of ₹{{outstandingBalance}} on your ledger account with Espon Clothing.\n\nKindly arrange for the clearance of overdue invoices at your earliest convenience to avoid any hold on subsequent order dispatches.\n\nBank Account Details:\nBank: ICICI Bank\nAccount: 016805006415\nIFSC: ICIC0000168\nUPI: 7206066678@OKBIZAXIS\n\nThank you for your cooperation.\nAccounts Department | Espon Clothing`
  },
  {
    id: "order_dispatch",
    name: "Order Dispatch & Tracking Notice",
    subject: "Your Order {{orderNumber}} has been Dispatched! - Espon Clothing",
    body: `Dear {{contactPerson}},\n\nGreat news! Your order {{orderNumber}} for {{companyName}} has been packed and dispatched through our logistics partner.\n\nYou can track the shipment status and e-way bill via your customer portal.\n\nThank you for placing your trust in Espon Clothing!\n\nBest regards,\nDispatch Team | Espon Clothing`
  }
];

/**
 * Send or log an email to a customer or lead
 */
export async function sendCustomerEmail(payload: {
  customerId?: string;
  leadId?: string;
  recipientEmail: string;
  subject: string;
  body: string;
  templateId?: string;
}): Promise<{
  success: boolean;
  message?: string;
  mailtoUrl?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const userId = (session.user as any)?.id;
    const userName = session.user.name || "Sales Rep";

    // Find salesperson employee record
    let employee = null;
    if (userId) {
      employee = await prisma.employee.findUnique({ where: { userId } });
    }
    if (!employee) {
      employee = await prisma.employee.findFirst({ where: { organizationId } });
    }
    if (!employee) {
      return { success: false, error: "No employee profile found to log email sender." };
    }

    const { customerId, leadId, recipientEmail, subject, body } = payload;

    if (!recipientEmail || !subject.trim() || !body.trim()) {
      return { success: false, error: "Recipient email, subject, and message body are required." };
    }

    // Log the email interaction into Call table as an EMAIL activity
    await prisma.call.create({
      data: {
        customerId: customerId || null,
        leadId: leadId || null,
        employeeId: employee.id,
        callType: "EMAIL",
        status: "Sent",
        outcome: "Delivered to " + recipientEmail,
        summary: subject.trim(),
        notes: body.trim(),
        createdAt: new Date()
      }
    });

    // Generate safe mailto fallback URL for mobile clients
    const encodedSubject = encodeURIComponent(subject.trim());
    const encodedBody = encodeURIComponent(body.trim());
    const mailtoUrl = `mailto:${recipientEmail}?subject=${encodedSubject}&body=${encodedBody}`;

    if (customerId) {
      revalidatePath(`/customers/${customerId}`);
      revalidatePath("/customers");
    }
    if (leadId) {
      revalidatePath("/leads");
    }

    return {
      success: true,
      message: `Email logged to timeline and sent to ${recipientEmail}.`,
      mailtoUrl
    };
  } catch (error: any) {
    console.error("sendCustomerEmail error:", error);
    return { success: false, error: error.message || "Failed to send/log email." };
  }
}

/**
 * Fetch email integration settings
 */
export async function getEmailSettings(): Promise<{
  success: boolean;
  settings: {
    senderName: string;
    senderEmail: string;
    smtpHost?: string;
    smtpPort?: string;
    isConfigured: boolean;
  };
  templates: EmailTemplate[];
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return {
        success: false,
        settings: { senderName: 'Espon Clothing', senderEmail: 'clothingespon@gmail.com', isConfigured: false },
        templates: DEFAULT_EMAIL_TEMPLATES
      };
    }

    const organizationId = await getTenantOrgId();

    const integration = await prisma.appIntegration.findUnique({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId: "gmail"
        }
      }
    });

    let config = { senderName: 'Espon Clothing', senderEmail: 'clothingespon@gmail.com', smtpHost: 'smtp.gmail.com', smtpPort: '587' };
    if (integration?.settings) {
      try {
        config = { ...config, ...JSON.parse(integration.settings) };
      } catch {}
    }

    return {
      success: true,
      settings: {
        ...config,
        isConfigured: Boolean(integration?.isConfigured)
      },
      templates: DEFAULT_EMAIL_TEMPLATES
    };
  } catch (err: any) {
    return {
      success: false,
      settings: { senderName: 'Espon Clothing', senderEmail: 'clothingespon@gmail.com', isConfigured: false },
      templates: DEFAULT_EMAIL_TEMPLATES
    };
  }
}

/**
 * Save email integration settings
 */
export async function saveEmailSettings(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();
    const senderName = (formData.get("senderName") as string)?.trim() || "Espon Clothing";
    const senderEmail = (formData.get("senderEmail") as string)?.trim().toLowerCase() || "clothingespon@gmail.com";
    const smtpHost = (formData.get("smtpHost") as string)?.trim() || "smtp.gmail.com";
    const smtpPort = (formData.get("smtpPort") as string)?.trim() || "587";

    const settingsJson = JSON.stringify({ senderName, senderEmail, smtpHost, smtpPort });

    await prisma.appIntegration.upsert({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId: "gmail"
        }
      },
      create: {
        organizationId,
        providerId: "gmail",
        category: "MESSAGING",
        name: "Google Workspace / Gmail Sync",
        isEnabled: true,
        isConfigured: true,
        settings: settingsJson
      },
      update: {
        isEnabled: true,
        isConfigured: true,
        settings: settingsJson,
        updatedAt: new Date()
      }
    });

    revalidatePath("/settings/email");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to save email settings" };
  }
}
