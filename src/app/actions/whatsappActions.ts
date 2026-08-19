"use server";

import { prisma } from "@/lib/prisma";

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendWhatsAppMessage(
  recipient: string,
  messageText: string,
  triggerEvent: string = "MANUAL"
): Promise<WhatsAppSendResult> {
  if (!recipient) {
    return { success: false, error: "Recipient phone number is required" };
  }

  const cleanPhone = recipient.replace(/\D/g, '');

  try {
    // If TWILIO or META WhatsApp API keys are configured, send real HTTP request here
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_WHATSAPP_NUMBER;

    let isSent = false;

    if (twilioSid && twilioToken && twilioPhone) {
      // Send real API request via Twilio
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: `whatsapp:${twilioPhone}`,
          To: `whatsapp:+${cleanPhone}`,
          Body: messageText
        })
      });

      if (res.ok) {
        isSent = true;
      }
    } else {
      // Simulated / Logging mode for demonstration
      console.log(`[WhatsApp Simulated Sent to +${cleanPhone}]: ${messageText}`);
      isSent = true;
    }

    // Save to CommunicationLog in Database
    await prisma.communicationLog.create({
      data: {
        type: "WHATSAPP",
        recipient: cleanPhone,
        message: messageText,
        status: isSent ? "SENT" : "FAILED",
        triggerEvent: triggerEvent
      }
    });

    return { success: true, messageId: `wa_${Date.now()}` };
  } catch (err: any) {
    console.error("Failed to send WhatsApp message:", err);
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
