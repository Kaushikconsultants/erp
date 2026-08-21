import React from "react";
import { prisma } from "@/lib/prisma";
import BroadcastBannerClient from "./BroadcastBannerClient";

interface BroadcastBannerProps {
  userId: string;
  userRole: string;
}

export default async function BroadcastBanner({ userId, userRole }: BroadcastBannerProps) {
  try {
    const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

    let audienceWhere: any = {};
    if (!isAdmin) {
      audienceWhere = {
        OR: [
          { targetAudience: "ALL" },
          { targetUserIds: { has: userId } },
          { targetRoles: { has: userRole } },
          { authorId: userId }
        ]
      };
    }

    const latestNotice = await prisma.teamBroadcast.findFirst({
      where: {
        AND: [
          audienceWhere,
          {
            OR: [
              { isPinned: true },
              { category: { in: ["OFFER", "HOLIDAY", "URGENT"] } }
            ]
          }
        ]
      },
      orderBy: [
        { isPinned: "desc" },
        { createdAt: "desc" }
      ],
      include: {
        author: { select: { name: true } },
        replies: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: { content: true, user: { select: { name: true } } }
        }
      }
    });

    return <BroadcastBannerClient initialNotice={latestNotice} />;
  } catch (err) {
    return null;
  }
}
