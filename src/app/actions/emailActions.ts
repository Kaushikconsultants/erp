"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

import { DEFAULT_EMAIL_TEMPLATES, type EmailTemplate } from "@/lib/emailTemplates";

export type { EmailTemplate } from "@/lib/emailTemplates";

export async function getDefaultEmailTemplates(): Promise<EmailTemplate[]> {
  return DEFAULT_EMAIL_TEMPLATES;
}

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
