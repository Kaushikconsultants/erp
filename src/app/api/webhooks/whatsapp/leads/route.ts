import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  let rawBody = "";
  let orgIdToLog: string | null = null;

  async function sendResponse(status: number, data: any) {
    try {
      await prisma.webhookLog.create({
        data: {
          organizationId: orgIdToLog,
          endpoint: "/api/webhooks/whatsapp/leads",
          payload: rawBody,
          responseStatus: status,
          responseBody: JSON.stringify(data),
        }
      });
    } catch (e) {
      console.error("Failed to log webhook:", e);
    }
    return NextResponse.json(data, { status });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return sendResponse(401, { error: "Unauthorized. Missing Bearer Token." });
    }

    const orgIdFromToken = authHeader.replace("Bearer ", "").trim();
    orgIdToLog = orgIdFromToken;

    // Verify if this is a valid organization ID
    const org = await prisma.organization.findUnique({
      where: { id: orgIdFromToken }
    });

    if (!org) {
      return sendResponse(401, { error: "Unauthorized. Invalid Organization Token." });
    }

    rawBody = await req.text();
    const body = JSON.parse(rawBody);
    const { name, whatsappNumber, shopName, agentEmail } = body;

    if (!name || !whatsappNumber) {
      return sendResponse(400, { error: "Missing required fields (name, whatsappNumber)" });
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
      return sendResponse(409, { 
        success: false, 
        error: `Lead with this mobile number already exists and is assigned to ${agentName}.`,
        existingLeadId: existingLead.id 
      });
    }

    let assignedSalespersonId = undefined;
    if (agentEmail) {
      const employee = await prisma.employee.findFirst({
        where: {
          organizationId: orgIdToUse,
          user: { email: agentEmail }
        }
      });
      if (employee) {
        assignedSalespersonId = employee.id;
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        whatsappNumber,
        shopName: shopName || null,
        organizationId: orgIdToUse,
        status: "New Lead",
        assignedSalespersonId
      }
    });

    return sendResponse(201, { success: true, lead });

  } catch (error: any) {
    console.error("Webhook lead creation error:", error);
    return sendResponse(500, { error: "Internal Server Error" });
  }
}
