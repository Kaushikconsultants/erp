import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET Endpoint - Webhook Verification Challenge from Meta WhatsApp API
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "espon_whatsapp_secure_webhook_token_2026";

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[WhatsApp Webhook] Verification successful!");
      return new NextResponse(challenge, { status: 200 });
    }
  }

  return NextResponse.json({ error: "Forbidden - Invalid verify token" }, { status: 403 });
}

// POST Endpoint - Incoming Messages & Delivery Receipts
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check Meta WhatsApp Cloud API Structure
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;

    if (!value) {
      return NextResponse.json({ status: "ignored" });
    }

    // 1. Process Incoming Messages
    if (value.messages && value.messages.length > 0) {
      const msg = value.messages[0];
      const fromPhone = msg.from; // Phone number e.g. "919812034567"
      const cleanPhone = fromPhone.replace(/\D/g, '').slice(-10);
      const textContent = msg.text?.body || msg.caption || "[Media Message]";

      // Step A: Search CRM by Phone Number
      let customer = await prisma.customer.findFirst({
        where: {
          OR: [
            { mobile: { contains: cleanPhone } },
            { whatsappNumber: { contains: cleanPhone } }
          ]
        }
      });

      // Step B: Auto-create Contact/Lead if customer does not exist
      if (!customer) {
        const defaultEmployee = await prisma.employee.findFirst();
        customer = await prisma.customer.create({
          data: {
            businessName: `WhatsApp Lead (${cleanPhone})`,
            contactPerson: value.contacts?.[0]?.profile?.name || `Contact +91 ${cleanPhone}`,
            mobile: cleanPhone,
            whatsappNumber: cleanPhone,
            customerType: "Wholesaler",
            status: "New Lead",
            leadStage: "New Enquiry",
            temperature: "HOT",
            assignedSalespersonId: defaultEmployee?.id,
            tags: "WhatsApp Lead, Auto Created"
          }
        });
      }

      // Step C: Link/Find Conversation
      let conversation = await prisma.whatsAppConversation.findFirst({
        where: { customerId: customer.id }
      });

      const account = await prisma.whatsAppAccount.findFirst() || await prisma.whatsAppAccount.create({
        data: {
          name: "Espon Main Sales",
          phoneNumber: "+91 7206066678",
          status: "CONNECTED"
        }
      });

      if (!conversation) {
        conversation = await prisma.whatsAppConversation.create({
          data: {
            accountId: account.id,
            customerId: customer.id,
            assignedEmployeeId: customer.assignedSalespersonId,
            status: "OPEN",
            priority: "HIGH",
            leadStatus: customer.leadStage || "New Lead",
            lastMessageText: textContent,
            lastMessageAt: new Date(),
            unreadCount: 1,
            tags: customer.tags
          }
        });
      } else {
        await prisma.whatsAppConversation.update({
          where: { id: conversation.id },
          data: {
            lastMessageText: textContent,
            lastMessageAt: new Date(),
            unreadCount: conversation.unreadCount + 1,
            status: "OPEN"
          }
        });
      }

      // Step D: Store Incoming Message
      await prisma.whatsAppMessage.create({
        data: {
          conversationId: conversation.id,
          senderType: "CUSTOMER",
          senderName: customer.contactPerson,
          messageType: msg.type ? msg.type.toUpperCase() : "TEXT",
          content: textContent,
          status: "RECEIVED",
          metaMessageId: msg.id,
          sentAt: new Date(msg.timestamp * 1000 || Date.now())
        }
      });

      console.log(`[WhatsApp Webhook] Incoming message from +91 ${cleanPhone} saved to CRM!`);
    }

    // 2. Process Message Status Updates (Delivered, Read, Failed)
    if (value.statuses && value.statuses.length > 0) {
      const statusUpdate = value.statuses[0];
      const metaMessageId = statusUpdate.id;
      const status = statusUpdate.status.toUpperCase();
      
      console.log(`[WhatsApp Webhook] Status update: ${status} for msg ID: ${metaMessageId}`);

      const updateData: any = { status };
      if (status === 'DELIVERED') updateData.deliveredAt = new Date(statusUpdate.timestamp * 1000 || Date.now());
      if (status === 'READ') updateData.readAt = new Date(statusUpdate.timestamp * 1000 || Date.now());

      try {
        await prisma.whatsAppMessage.update({
          where: { metaMessageId },
          data: updateData
        });
      } catch (e) {
        console.warn(`[WhatsApp Webhook] Could not update status for message ID ${metaMessageId}`);
      }
    }

    return NextResponse.json({ status: "success" });
  } catch (error: any) {
    console.error("[WhatsApp Webhook Error]:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
