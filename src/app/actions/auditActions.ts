"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getAuditLogs(filters?: { module?: string; action?: string; userId?: string }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') return { error: "Unauthorized" };

  try {
    const where: any = {};
    if (filters?.module && filters.module !== 'All') where.module = filters.module;
    if (filters?.action && filters.action !== 'All') where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return { success: true, logs };
  } catch (error: any) {
    return { error: "Failed to fetch audit logs: " + error.message };
  }
}
