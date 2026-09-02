import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Basic static secret for webhook verification. 
// For production, set WHATSAPP_WEBHOOK_SECRET in your environment variables.
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET || "blip-whatsapp-secret-2024";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, whatsappNumber, shopName, organizationId } = body;

    if (!name || !whatsappNumber) {
      return NextResponse.json({ error: "Missing required fields (name, whatsappNumber)" }, { status: 400 });
    }

    // Use provided organizationId, or fallback to the first one in the DB (useful for single-tenant setup)
    let orgIdToUse = organizationId;
    if (!orgIdToUse) {
        const firstOrg = await prisma.organization.findFirst();
        if (firstOrg) orgIdToUse = firstOrg.id;
    }

    if (!orgIdToUse) {
        return NextResponse.json({ error: "No organization context available." }, { status: 400 });
    }

    // Check if lead already exists based on our previous logic
    const existingLead = await prisma.lead.findFirst({
      where: {
        whatsappNumber,
        organizationId: orgIdToUse
      },
      include: {
        assignedSalesperson: { include: { user: true } }
      }
    });

    if (existingLead) {
      const agentName = existingLead.assignedSalesperson?.user?.name || "an agent";
      return NextResponse.json({ 
        success: false, 
        error: `Lead with this mobile number already exists and is assigned to ${agentName}.`,
        existingLeadId: existingLead.id 
      }, { status: 409 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        whatsappNumber,
        shopName: shopName || null,
        organizationId: orgIdToUse,
        status: "New Lead"
      }
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });

  } catch (error: any) {
    console.error("Webhook lead creation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
