"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrCreateEmployee } from "@/lib/employeeHelper";

export async function createTask(formData: FormData) {
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const priority = formData.get("priority") as string || "Medium";
  const dueDateStr = formData.get("dueDate") as string;
  const assigneeId = formData.get("assigneeId") as string;
  const customerId = formData.get("customerId") as string;

  if (!title || !assigneeId) {
    return { error: "Title and Assignee are required" };
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    let dueDate = null;
    if (dueDateStr) {
      dueDate = new Date(dueDateStr);
    }

    const userId = (session.user as any).id;
    const creator = await getOrCreateEmployee(userId, session.user);
    if (!creator) return { error: "Creator profile not found" };

    const task = await prisma.task.create({
      data: {
        title,
        description: description || null,
        priority,
        status: "To Do",
        dueDate,
        assigneeId,
        creatorId: creator.id,
        customerId: customerId || null,
      },
    });

    revalidatePath("/tasks");
    return { success: true, task };
  } catch (error) {
    console.error("Failed to create task:", error);
    return { error: "Failed to create task. Please try again." };
  }
}

export async function createOrAssignTask(data: {
  title: string;
  description?: string;
  priority?: string;
  dueDate?: string;
  assigneeId: string;
  customerId?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    if (!data.title || !data.assigneeId) {
      return { success: false, error: "Title and Assignee are required" };
    }

    const userId = (session.user as any).id;
    const creator = await getOrCreateEmployee(userId, session.user);
    if (!creator) return { success: false, error: "Creator profile not found" };

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description || null,
        priority: data.priority || "Medium",
        status: "To Do",
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        assigneeId: data.assigneeId,
        creatorId: creator.id,
        customerId: data.customerId || null,
      },
      include: {
        assignee: { include: { user: true } },
        customer: true
      }
    });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to create/assign task:", error);
    return { success: false, error: error.message || "Failed to assign task" };
  }
}

export async function updateTask(data: {
  taskId: string;
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  assigneeId?: string;
  customerId?: string | null;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.dueDate !== undefined) {
      updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
    }

    const task = await prisma.task.update({
      where: { id: data.taskId },
      data: updateData,
      include: {
        assignee: { include: { user: true } },
        customer: true
      }
    });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true, task };
  } catch (error: any) {
    console.error("Failed to update task:", error);
    return { success: false, error: error.message || "Failed to update task" };
  }
}

export async function deleteTask(taskId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false, error: "Unauthorized" };

    await prisma.task.delete({
      where: { id: taskId }
    });

    revalidatePath("/tasks");
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete task:", error);
    return { success: false, error: error.message || "Failed to delete task" };
  }
}

