"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createRole(data: { name: string; permissions: string[] }) {
  try {
    const existing = await prisma.role.findUnique({ where: { name: data.name } });
    if (existing) return { error: "A role with this name already exists." };

    await prisma.role.create({
      data: {
        name: data.name,
        permissions: JSON.stringify(data.permissions)
      }
    });

    revalidatePath('/settings/roles');
    return { success: true };
  } catch (error: any) {
    console.error("Error creating role:", error);
    return { error: error.message || "Failed to create role." };
  }
}

export async function deleteRole(roleId: string) {
  try {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } }
    });

    if (!role) return { error: "Role not found." };
    if (role._count.users > 0) return { error: "Cannot delete role because it is assigned to users." };

    await prisma.role.delete({ where: { id: roleId } });

    revalidatePath('/settings/roles');
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting role:", error);
    return { error: error.message || "Failed to delete role." };
  }
}
