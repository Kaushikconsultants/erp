import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized. Missing Bearer Token." }, { status: 401 });
    }

    const orgIdFromToken = authHeader.replace("Bearer ", "").trim();

    // Verify if this is a valid organization ID
    const org = await prisma.organization.findUnique({
      where: { id: orgIdFromToken }
    });

    if (!org) {
      return NextResponse.json({ error: "Unauthorized. Invalid Organization Token." }, { status: 401 });
    }

    const body = await req.json();
    const { name, whatsappNumber, shopName } = body;

    if (!name || !whatsappNumber) {
      return NextResponse.json({ error: "Missing required fields (name, whatsappNumber)" }, { status: 400 });
    }

    const orgIdToUse = org.id;

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
