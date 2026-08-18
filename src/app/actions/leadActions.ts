"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getPipelineData() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };
  
  const role = (session.user as any).role;
  const userId = (session.user as any).id;
  
  let whereClause = {};
  
  // If not admin, only show assigned leads
  if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    const employee = await prisma.employee.findUnique({ where: { userId } });
    if (employee) {
      whereClause = { assignedSalespersonId: employee.id };
    }
  }

  try {
    const customers = await prisma.customer.findMany({
      where: whereClause,
      include: {
        assignedSalesperson: {
          include: { user: true }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    return { success: true, customers };
  } catch (error: any) {
    return { error: "Failed to fetch pipeline data: " + error.message };
  }
}

export async function updateLeadStage(customerId: string, newStage: string, newStatus?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    const dataToUpdate: any = { leadStage: newStage };
    if (newStatus) {
      dataToUpdate.status = newStatus;
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: dataToUpdate
    });
    
    // Log the activity
    await prisma.auditLog.create({
      data: {
        userId: (session.user as any).id,
        action: "UPDATE_STAGE",
        module: "CRM",
        recordId: customerId,
        newValue: JSON.stringify({ leadStage: newStage, status: newStatus })
      }
    });

    revalidatePath("/leads");
    revalidatePath("/customers");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead stage: " + error.message };
  }
}

export async function updateLeadValue(customerId: string, expectedValue: number) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return { error: "Unauthorized" };

  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { expectedValue }
    });
    
    revalidatePath("/leads");
    return { success: true };
  } catch (error: any) {
    return { error: "Failed to update lead value: " + error.message };
  }
}
