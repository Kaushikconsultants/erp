"use server";

import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export interface CreateTicketParams {
  category: "BILLING" | "INVENTORY" | "ACCOUNTING" | "GST" | "SYSTEM" | "ACCESS";
  subject: string;
  description: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  diagnosticSnapshot?: any;
}

export async function createSupportTicket(params: CreateTicketParams) {
  try {
    const session = await getServerSession(authOptions);
    const organizationId = await getTenantOrgId();

    if (!organizationId) {
      return { success: false, error: "Unauthorized: No organization context" };
    }

    const count = await prisma.supportTicket.count({
      where: { organizationId }
    });

    const ticketNumber = `TKT-${1001 + count}`;

    const ticket = await prisma.supportTicket.create({
      data: {
        organizationId,
        userId: (session?.user as any)?.id || null,
        ticketNumber,
        category: params.category || "SYSTEM",
        subject: params.subject,
        description: params.description,
        priority: params.priority || "MEDIUM",
        status: "OPEN",
        diagnosticSnapshot: params.diagnosticSnapshot || null,
      }
    });

    return {
      success: true,
      ticket: {
        id: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt.toISOString()
      }
    };
  } catch (error: any) {
    console.error("createSupportTicket error:", error);
    return { success: false, error: error?.message || "Failed to create support ticket" };
  }
}

export async function getOrganizationTickets() {
  try {
    const organizationId = await getTenantOrgId();
    if (!organizationId) return { success: false, tickets: [] };

    const tickets = await prisma.supportTicket.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 20
    });

    return {
      success: true,
      tickets: tickets.map(t => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        category: t.category,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt.toISOString()
      }))
    };
  } catch (error: any) {
    console.error("getOrganizationTickets error:", error);
    return { success: false, tickets: [] };
  }
}
