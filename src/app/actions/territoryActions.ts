"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getTerritories() {
  try {
    const territories = await prisma.territory.findMany({
      include: {
        _count: {
          select: { customers: true }
        }
      }
    });
    return { success: true, territories };
  } catch (error) {
    console.error("Failed to fetch territories:", error);
    return { error: "Failed to fetch territories" };
  }
}

export async function createTerritory(formData: FormData) {
  const name = formData.get("name") as string;
  const pincodes = formData.get("pincodes") as string;
  const description = formData.get("description") as string;

  if (!name) return { error: "Name is required" };

  try {
    const territory = await prisma.territory.create({
      data: { name, pincodes, description }
    });
    revalidatePath("/settings/territories");
    return { success: true, territory };
  } catch (error) {
    return { error: "Failed to create territory" };
  }
}
