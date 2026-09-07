import React from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Bell, ArrowLeft, Sliders, Smartphone } from "lucide-react";
import NotificationSettingsClient from "@/components/settings/NotificationSettingsClient";
import { getNotificationPreferences } from "@/app/actions/notificationActions";

export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const { settings } = await getNotificationPreferences();

  return (
    <div className="page-container" style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      {/* ─── BREADCRUMB & HEADER ─── */}
      <div style={{ marginBottom: "20px" }}>
        <Link
          href="/settings"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "0.82rem",
            color: "#64748b",
            textDecoration: "none",
            fontWeight: 600,
            marginBottom: "12px"
          }}
        >
          <ArrowLeft size={15} /> Back to Settings Hub
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)",
              flexShrink: 0
            }}
          >
            <Bell size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.015em" }}>
              Notification & Mobile Push Settings
            </h1>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Manage mobile push alerts, new lead triggers, incoming WhatsApp alerts, call reminders, and routing rules.
            </p>
          </div>
        </div>
      </div>

      {/* ─── CLIENT COMPONENT ─── */}
      <NotificationSettingsClient initialSettings={settings} />
    </div>
  );
}
