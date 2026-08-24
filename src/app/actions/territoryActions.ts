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

export async function updateTerritory(id: string, data: { name: string; pincodes?: string; description?: string }) {
  if (!id || !data.name) return { error: "ID and Name are required" };

  try {
    const territory = await prisma.territory.update({
      where: { id },
      data: {
        name: data.name,
        pincodes: data.pincodes,
        description: data.description
      }
    });
    revalidatePath("/settings/territories");
    return { success: true, territory };
  } catch (error) {
    return { error: "Failed to update territory" };
  }
}

export async function deleteTerritory(id: string) {
  if (!id) return { error: "ID is required" };

  try {
    await prisma.territory.delete({
      where: { id }
    });
    revalidatePath("/settings/territories");
    return { success: true };
  } catch (error) {
    return { error: "Failed to delete territory" };
  }
}
