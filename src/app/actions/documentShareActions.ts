"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getTenantOrgId } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

/**
 * Send Quotation Summary and Details directly to Customer WhatsApp
 */
export async function sendQuotationViaWhatsApp(quotationId: string, customPhone?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const [quotation, account, company] = await Promise.all([
      prisma.quotation.findUnique({
        where: { id: quotationId },
        include: { customer: true, items: { include: { product: true } } }
      }),
      prisma.whatsAppAccount.findFirst({
        where: {
          OR: [{ isDefault: true }, { status: 'CONNECTED' }],
          accessToken: { not: null },
          phoneId: { not: null }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.companySettings.findFirst({ where: { organizationId } })
    ]);

    if (!quotation) return { success: false, error: "Quotation not found" };

    const recipientPhone = customPhone || quotation.customer?.whatsappNumber || quotation.customer?.mobile;
    if (!recipientPhone) return { success: false, error: "No mobile or WhatsApp number on file for this customer." };

    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const itemsSummary = quotation.items.map((it, idx) => 
      `${idx + 1}. *${it.product?.name || 'Item'}* - ${it.quantity} pcs @ ₹${it.rate} = ₹${it.total.toLocaleString('en-IN')}`
    ).join('\n');

    const fmt = (n: number) => (n || 0).toLocaleString('en-IN');

    const messageText = 
      `*QUOTATION #${quotation.quotationNumber}*\n` +
      `*From:* ${company?.companyName || 'Espon Sports'}\n` +
      `*To:* ${quotation.customer?.businessName} (${quotation.customer?.contactPerson})\n` +
      `*Date:* ${new Date(quotation.date).toLocaleDateString('en-IN')}\n\n` +
      `*Items Summary:*\n${itemsSummary}\n\n` +
      `*Sub Total:* ₹${fmt(quotation.taxableAmount || quotation.subtotal)}\n` +
      `*GST:* ₹${fmt(quotation.taxTotal)}\n` +
      `*Grand Total:* *₹${fmt(quotation.totalValue)}*\n` +
      (quotation.receivedAmount > 0 ? `*Payment Received:* ₹${fmt(quotation.receivedAmount)}\n*Balance Due:* *₹${fmt(Math.max(0, quotation.totalValue - quotation.receivedAmount))}*\n` : '') +
      `\n*Bank Details for Payment:*\n` +
      `A/C: ${company?.accountNumber || '016805006415'}\n` +
      `IFSC: ${company?.ifscCode || 'ICIC0000168'} (${company?.bankAccountName || 'ESPON CLOTHING PVT LTD'})\n` +
      `UPI ID: ${company?.upiId || '7206066678@OKBIZAXIS'}\n\n` +
      `Please reply to this message to confirm your order. Thank you!`;

    // 1. Dispatch via Meta Cloud API if connected
    let metaMessageId = null;
    let deliveryStatus = 'SENT';

    if (account?.accessToken && account?.phoneId) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${account.phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: messageText }
          })
        });
        const metaData = await metaRes.json();
        if (metaData.messages?.[0]?.id) {
          metaMessageId = metaData.messages[0].id;
        }
      } catch (e) {
        console.warn("Meta API dispatch warning:", e);
      }
    }

    // 2. Log in WhatsApp Conversation table
    let conv = await prisma.whatsAppConversation.findFirst({
      where: {
        customer: { mobile: quotation.customer?.mobile }
      }
    });

    if (!conv && quotation.customerId) {
      conv = await prisma.whatsAppConversation.create({
        data: {
          customerId: quotation.customerId,
          accountId: account?.id || null,
          lastMessageText: `Quotation #${quotation.quotationNumber}`,
          lastMessageAt: new Date()
        }
      });
    }

    if (conv) {
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conv.id,
          senderType: 'AGENT',
          senderName: (session.user as any).name || 'Sales Rep',
          content: messageText,
          metaMessageId,
          status: 'SENT',
          sentAt: new Date()
        }
      });
    }

    // Update Quotation activity log
    await prisma.quotationActivity.create({
      data: {
        quotationId: quotation.id,
        userId: (session.user as any).id,
        userName: (session.user as any).name || 'Sales Agent',
        action: 'Sent via WhatsApp',
        details: `Quotation #${quotation.quotationNumber} dispatched to ${cleanPhone}`
      }
    });

    revalidatePath(`/quotations/${quotationId}`);
    return { 
      success: true, 
      message: `Quotation #${quotation.quotationNumber} sent successfully to +${cleanPhone}!`,
      phone: cleanPhone,
      text: messageText 
    };
  } catch (error: any) {
    console.error("Error sending quotation via WhatsApp:", error);
    return { success: false, error: error.message || "Failed to send quotation via WhatsApp" };
  }
}

/**
 * Send Tax Invoice Details & Payment Link directly to Customer WhatsApp
 */
export async function sendInvoiceViaWhatsApp(invoiceId: string, customPhone?: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const [invoice, account, company] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true, order: true }
      }),
      prisma.whatsAppAccount.findFirst({
        where: {
          OR: [{ isDefault: true }, { status: 'CONNECTED' }],
          accessToken: { not: null },
          phoneId: { not: null }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.companySettings.findFirst({ where: { organizationId } })
    ]);

    if (!invoice) return { success: false, error: "Invoice not found" };

    const recipientPhone = customPhone || invoice.customer?.whatsappNumber || invoice.customer?.mobile;
    if (!recipientPhone) return { success: false, error: "No mobile or WhatsApp number on file for this customer." };

    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const fmt = (n: number) => (n || 0).toLocaleString('en-IN');

    const messageText = 
      `*TAX INVOICE #${invoice.invoiceNumber}*\n` +
      `*Company:* ${company?.companyName || 'Espon Sports'}\n` +
      `*Customer:* ${invoice.customer?.businessName} (${invoice.customer?.contactPerson})\n` +
      `*Invoice Date:* ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}\n` +
      `*Due Date:* ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate'}\n\n` +
      `*Invoice Total:* ₹${fmt(invoice.totalAmount)}\n` +
      `*Amount Paid:* ₹${fmt(invoice.amountPaid)}\n` +
      `*Balance Due:* *₹${fmt(invoice.amountDue)}*\n` +
      `*Status:* ${invoice.status.toUpperCase()}\n\n` +
      `*Payment Details (NEFT / IMPS / UPI):*\n` +
      `A/C: ${company?.accountNumber || '016805006415'}\n` +
      `IFSC: ${company?.ifscCode || 'ICIC0000168'} (${company?.bankAccountName || 'ESPON CLOTHING PVT LTD'})\n` +
      `UPI ID: ${company?.upiId || '7206066678@OKBIZAXIS'}\n\n` +
      `Thank you for your valued business!`;

    // Dispatch via Meta
    let metaMessageId = null;
    if (account?.accessToken && account?.phoneId) {
      try {
        const metaRes = await fetch(`https://graph.facebook.com/v20.0/${account.phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${account.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: cleanPhone,
            type: 'text',
            text: { body: messageText }
          })
        });
        const metaData = await metaRes.json();
        if (metaData.messages?.[0]?.id) {
          metaMessageId = metaData.messages[0].id;
        }
      } catch (e) {
        console.warn("Meta API dispatch warning:", e);
      }
    }

    revalidatePath(`/invoices`);
    return {
      success: true,
      message: `Invoice #${invoice.invoiceNumber} dispatched to +${cleanPhone} successfully!`,
      phone: cleanPhone,
      text: messageText
    };
  } catch (error: any) {
    console.error("Error sending invoice via WhatsApp:", error);
    return { success: false, error: error.message || "Failed to send invoice via WhatsApp" };
  }
}

/**
 * Send Overdue Payment Reminder (Dunning)
 */
export async function sendPaymentReminder(invoiceId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const organizationId = await getTenantOrgId();

    const [invoice, account, company] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
      }),
      prisma.whatsAppAccount.findFirst({
        where: {
          OR: [{ isDefault: true }, { status: 'CONNECTED' }],
          accessToken: { not: null },
          phoneId: { not: null }
        }
      }),
      prisma.companySettings.findFirst({ where: { organizationId } })
    ]);

    if (!invoice) return { success: false, error: "Invoice not found" };
    if (invoice.amountDue <= 0) return { success: false, error: "This invoice is already fully paid." };

    const recipientPhone = invoice.customer?.whatsappNumber || invoice.customer?.mobile;
    if (!recipientPhone) return { success: false, error: "No mobile number available for this customer." };

    let cleanPhone = recipientPhone.replace(/\D/g, "");
    if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.replace(/^0+/, '');
    if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;

    const fmt = (n: number) => (n || 0).toLocaleString('en-IN');
    const dueDateStr = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Immediate';

    const reminderText = 
      `*PAYMENT REMINDER: INVOICE #${invoice.invoiceNumber}*\n\n` +
      `Dear ${invoice.customer?.contactPerson || invoice.customer?.businessName},\n\n` +
      `This is a friendly reminder regarding outstanding payment for Invoice *#${invoice.invoiceNumber}* issued on ${new Date(invoice.invoiceDate).toLocaleDateString('en-IN')}.\n\n` +
      `*Total Invoice Amount:* ₹${fmt(invoice.totalAmount)}\n` +
      `*Outstanding Balance Due:* *₹${fmt(invoice.amountDue)}*\n` +
      `*Due Date:* ${dueDateStr}\n\n` +
      `*Kindly process payment to our official account:*\n` +
      `Bank: ICICI Bank\n` +
      `A/C: ${company?.accountNumber || '016805006415'}\n` +
      `IFSC: ${company?.ifscCode || 'ICIC0000168'}\n` +
      `A/C Name: ${company?.bankAccountName || 'ESPON CLOTHING PRIVATE LIMITED'}\n` +
      `UPI ID: ${company?.upiId || '7206066678@OKBIZAXIS'}\n\n` +
      `If you have already made the transfer, please share the UTR/transaction receipt here.\n\n` +
      `Warm regards,\n*Accounts Team, ${company?.companyName || 'Espon Sports'}*`;

    if (account?.accessToken && account?.phoneId) {
      await fetch(`https://graph.facebook.com/v20.0/${account.phoneId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${account.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: { body: reminderText }
        })
      });
    }

    revalidatePath('/invoices');
    return {
      success: true,
      message: `Payment reminder sent to ${invoice.customer?.businessName} (+${cleanPhone})!`,
      phone: cleanPhone,
      text: reminderText
    };
  } catch (error: any) {
    console.error("Error sending payment reminder:", error);
    return { success: false, error: error.message || "Failed to send payment reminder" };
  }
}
