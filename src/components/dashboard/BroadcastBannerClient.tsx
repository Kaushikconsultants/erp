"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Megaphone, Tag, Palmtree, AlertTriangle, ArrowRight, MessageSquare, Sparkles, X } from "lucide-react";
import { getLatestActiveBannerNotice } from "@/app/actions/broadcastActions";

interface BroadcastBannerClientProps {
  initialNotice: any;
}

export default function BroadcastBannerClient({ initialNotice }: BroadcastBannerClientProps) {
  const [notice, setNotice] = useState<any>(initialNotice);
  const [isDismissed, setIsDismissed] = useState<boolean>(true); // start hidden until client checks localStorage
  const [isClientMounted, setIsClientMounted] = useState<boolean>(false);
  const router = useRouter();

  // Check localStorage for dismissal or first-time user status
  const checkDismissalState = useCallback((currentNotice: any) => {
    if (typeof window === "undefined") return;

    // Check if the current notice is a Setup Tour / Onboarding Welcome notice
    const isSetupTour = 
      currentNotice?.category === "SETUP_TOUR" ||
      (currentNotice?.title && currentNotice.title.toLowerCase().includes("setup your erp")) ||
      (currentNotice?.title && currentNotice.title.toLowerCase().includes("setup tour"));

    if (isSetupTour) {
      const tourCompleted = localStorage.getItem("erp_setup_tour_completed");
      const tourDismissed = localStorage.getItem("erp_setup_tour_dismissed");
      if (tourCompleted || tourDismissed) {
        setIsDismissed(true);
        return;
      }
    }

    if (currentNotice?.id) {
      const noticeDismissed = localStorage.getItem(`dismissed_broadcast_${currentNotice.id}`);
      if (noticeDismissed) {
        setIsDismissed(true);
        return;
      }
    }

    // Notice is active and not dismissed
    setIsDismissed(false);
  }, []);

  useEffect(() => {
    setIsClientMounted(true);
    setNotice(initialNotice);
    if (initialNotice) {
      checkDismissalState(initialNotice);
    } else {
      // If no server notice, check if first-time user should see the default 3-minute setup tour banner
      const tourCompleted = localStorage.getItem("erp_setup_tour_completed");
      const tourDismissed = localStorage.getItem("erp_setup_tour_dismissed");
      if (!tourCompleted && !tourDismissed) {
        setNotice({
          id: "default-setup-tour",
          title: "Welcome! Setup your ERP in 3 minutes",
          content: "Configure company branches, import customer/lead spreadsheets, and invite team members.",
          category: "SETUP_TOUR"
        });
        setIsDismissed(false);
      } else {
        setIsDismissed(true);
      }
    }
  }, [initialNotice, checkDismissalState]);

  // Live polling every 20s when tab is visible
  useEffect(() => {
    let isMounted = true;
    const fetchLatest = async () => {
      if (document.hidden) return;
      try {
        const res = await getLatestActiveBannerNotice();
        if (isMounted && res.success) {
          if (res.notice) {
            setNotice(res.notice);
            checkDismissalState(res.notice);
          }
        }
      } catch (e) {}
    };

    const interval = setInterval(fetchLatest, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [checkDismissalState]);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (notice?.id) {
      localStorage.setItem(`dismissed_broadcast_${notice.id}`, "true");
    }
    const isSetupTour = 
      notice?.category === "SETUP_TOUR" ||
      (notice?.title && notice.title.toLowerCase().includes("setup your erp")) ||
      (notice?.title && notice.title.toLowerCase().includes("setup tour"));

    if (isSetupTour) {
      localStorage.setItem("erp_setup_tour_dismissed", "true");
    }
  };

  const handleStartSetupTour = () => {
    setIsDismissed(true);
    localStorage.setItem("erp_setup_tour_completed", "true");
    localStorage.setItem("erp_setup_tour_dismissed", "true");
    if (notice?.id) {
      localStorage.setItem(`dismissed_broadcast_${notice.id}`, "true");
    }
    router.push("/settings/organization");
  };

  if (!isClientMounted || isDismissed || !notice) return null;

  const isSetupTour = 
    notice.category === "SETUP_TOUR" ||
    (notice.title && notice.title.toLowerCase().includes("setup your erp")) ||
    (notice.title && notice.title.toLowerCase().includes("setup tour"));

  const isOffer = notice.category === "OFFER";
  const isHoliday = notice.category === "HOLIDAY";
  const isUrgent = notice.category === "URGENT";

  const bannerBg = isSetupTour
    ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #4f46e5 100%)"
    : isOffer
    ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
    : isHoliday
    ? "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)"
    : isUrgent
    ? "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)"
    : "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)";

  const Icon = isSetupTour ? Sparkles : isOffer ? Tag : isHoliday ? Palmtree : isUrgent ? AlertTriangle : Megaphone;
  const latestReply = notice.replies?.[0];

  return (
    <div
      style={{
        background: bannerBg,
        borderRadius: "14px",
        padding: "14px 18px",
        color: "#ffffff",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        marginBottom: "16px",
        boxShadow: "0 4px 16px rgba(37, 99, 235, 0.15)",
        position: "relative",
        animation: "fadeInBanner 0.25s ease-out"
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", flex: 1, minWidth: "260px" }}>
        <div
          style={{
            backgroundColor: "rgba(255, 255, 255, 0.22)",
            borderRadius: "10px",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backdropFilter: "blur(6px)"
          }}
        >
          <Icon size={20} color="#ffffff" />
        </div>
        <div style={{ flex: 1, paddingRight: "24px" }}>
          {!isSetupTour && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "3px" }}>
              <span
                style={{
                  fontSize: "0.68rem",
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
              <span style={{ fontSize: "0.74rem", opacity: 0.9 }}>
                by {notice.author?.name || "Admin"}
              </span>
              {latestReply && (
                <span style={{ fontSize: "0.72rem", backgroundColor: "rgba(0,0,0,0.15)", padding: "1px 6px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "3px" }}>
                  <MessageSquare size={10} /> Latest reply: {latestReply.user?.name}
                </span>
              )}
            </div>
          )}
          <div style={{ fontSize: "0.95rem", fontWeight: 700, lineHeight: 1.3 }}>
            {notice.title}
          </div>
          {notice.content && (
            <p style={{ margin: "4px 0 0 0", fontSize: "0.78rem", opacity: 0.92, lineHeight: 1.4, maxWidth: "680px" }}>
              {notice.content}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
        {isSetupTour ? (
          <button
            type="button"
            onClick={handleStartSetupTour}
            style={{
              backgroundColor: "#ffffff",
              color: "#1e40af",
              border: "none",
              padding: "9px 18px",
              borderRadius: "10px",
              fontSize: "0.82rem",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.12)",
              whiteSpace: "nowrap",
              transition: "transform 0.15s ease"
            }}
          >
            Start Setup Tour <ArrowRight size={15} />
          </button>
        ) : (
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
        )}

        {/* Close / Dismiss Button */}
        <button
          type="button"
          onClick={handleDismiss}
          title="Dismiss notice"
          aria-label="Dismiss banner"
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            borderRadius: "50%",
            width: "28px",
            height: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#ffffff",
            cursor: "pointer",
            transition: "background 0.15s ease",
            padding: 0
          }}
        >
          <X size={16} />
        </button>
      </div>

      <style>{`
        @keyframes fadeInBanner {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
