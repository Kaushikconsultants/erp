"use server";

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function updatePresenceHeartbeat(status: "ONLINE" | "IDLE" | "OFFLINE" = "ONLINE") {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { success: false };

    const userId = (session.user as any).id;
    if (!userId) return { success: false };

    await prisma.user.update({
      where: { id: userId },
      data: {
        lastActiveAt: new Date(),
        presenceStatus: status
      }
    });

    return { success: true };
  } catch (error) {
    return { success: false };
  }
}
