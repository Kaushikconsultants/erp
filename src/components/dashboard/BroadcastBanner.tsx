import React from "react";
import Link from "next/link";
import { Megaphone, Tag, Palmtree, AlertTriangle, ArrowRight } from "lucide-react";
import { prisma } from "@/lib/prisma";

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
        author: { select: { name: true } }
      }
    });

    if (!latestNotice) return null;

    const isOffer = latestNotice.category === "OFFER";
    const isHoliday = latestNotice.category === "HOLIDAY";
    const isUrgent = latestNotice.category === "URGENT";

    const bannerBg = isOffer
      ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
      : isHoliday
      ? "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)"
      : isUrgent
      ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
      : "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)";

    const Icon = isOffer ? Tag : isHoliday ? Palmtree : isUrgent ? AlertTriangle : Megaphone;

    return (
      <div
        style={{
          background: bannerBg,
          borderRadius: "12px",
          padding: "12px 18px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          boxShadow: "0 4px 14px rgba(0, 0, 0, 0.1)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "260px" }}>
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              borderRadius: "50%",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon size={20} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <span
                style={{
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  backgroundColor: "rgba(255, 255, 255, 0.25)",
                  padding: "2px 8px",
                  borderRadius: "10px",
                }}
              >
                {isOffer ? "🏷️ Offer of the Day" : isHoliday ? "🌴 Holiday Notice" : isUrgent ? "🚨 Urgent Notice" : "📢 Notice Board"}
              </span>
              <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                by {latestNotice.author?.name || "Admin"}
              </span>
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "2px" }}>
              {latestNotice.title}
            </div>
          </div>
        </div>

        <Link
          href="/broadcasts"
          style={{
            backgroundColor: "#ffffff",
            color: "#0f172a",
            padding: "8px 16px",
            borderRadius: "8px",
            textDecoration: "none",
            fontSize: "0.82rem",
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: "6px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            whiteSpace: "nowrap",
          }}
        >
          View & Revert <ArrowRight size={14} />
        </Link>
      </div>
    );
  } catch (err) {
    return null;
  }
}
