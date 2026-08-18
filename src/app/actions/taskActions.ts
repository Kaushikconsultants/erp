"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

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
    let dueDate = null;
    if (dueDateStr) {
      dueDate = new Date(dueDateStr);
    }

    // For MVP, creator is the first user
    const creator = await prisma.employee.findFirst();
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
