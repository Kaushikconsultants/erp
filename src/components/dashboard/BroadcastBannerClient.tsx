"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Megaphone, Tag, Palmtree, AlertTriangle, ArrowRight, MessageSquare } from "lucide-react";
import { getLatestActiveBannerNotice } from "@/app/actions/broadcastActions";

interface BroadcastBannerClientProps {
  initialNotice: any;
}

export default function BroadcastBannerClient({ initialNotice }: BroadcastBannerClientProps) {
  const [notice, setNotice] = useState<any>(initialNotice);

  useEffect(() => {
    setNotice(initialNotice);
  }, [initialNotice]);

  // Live polling every 20s when tab is visible
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      if (document.hidden) return;
      try {
        const res = await getLatestActiveBannerNotice();
        if (isMounted && res.success) {
          setNotice(res.notice);
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchLatest, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!notice) return null;

  const isOffer = notice.category === "OFFER";
  const isHoliday = notice.category === "HOLIDAY";
  const isUrgent = notice.category === "URGENT";

  const bannerBg = isOffer
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : isHoliday
    ? "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)"
    : isUrgent
    ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
    : "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)";

  const Icon = isOffer ? Tag : isHoliday ? Palmtree : isUrgent ? AlertTriangle : Megaphone;
  const latestReply = notice.replies?.[0];

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
        position: "relative",
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
              by {notice.author?.name || "Admin"}
            </span>
            {latestReply && (
              <span style={{ fontSize: "0.72rem", backgroundColor: "rgba(0,0,0,0.15)", padding: "1px 6px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "3px" }}>
                <MessageSquare size={10} /> Latest reply: {latestReply.user?.name}
              </span>
            )}
          </div>
          <div style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "2px" }}>
            {notice.title}
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
}
