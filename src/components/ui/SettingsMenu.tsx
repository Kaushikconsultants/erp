"use client";

import React, { useState } from "react";
import Link from "next/link";
import SettingsModal from "./SettingsModal";
import ThemeSettingsModal from "./ThemeSettingsModal";
import {
  Building2,
  FileSpreadsheet,
  Receipt,
  Palette,
  Users,
  Target,
  Clock,
  Award,
  Sparkles,
  CreditCard,
  Database,
  KeyRound,
  ShieldCheck,
  MapPin,
  Crown,
  ChevronRight,
  Sliders,
  Layers,
  FileText
} from "lucide-react";

interface SettingsMenuProps {
  isPlatformOwner?: boolean;
}

interface SettingItem {
  label: string;
  desc: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  href?: string;
  modal?: string;
  badge?: string;
}

export default function SettingsMenu({ isPlatformOwner = false }: SettingsMenuProps) {
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // Group 1: Organization & Branding (4 items)
  const orgSettings: SettingItem[] = [
    {
      label: "Organization Profile & Logo",
      desc: "Company identity, legal addresses, contact details & branding logo",
      icon: <Building2 size={18} />,
      iconBg: "#eff6ff",
      iconColor: "#2563eb",
      href: "/settings/organization"
    },
    {
      label: "Tax Rates & GST Compliance",
      desc: "HSN codes, GST tax slabs, reverse charges & state tax rules",
      icon: <Receipt size={18} />,
      iconBg: "#ecfdf5",
      iconColor: "#059669",
      href: "/settings/taxes"
    },
    {
      label: "Document Templates & PDF Layouts",
      desc: "Custom layouts for invoices, quotations, POs & dispatch slips",
      icon: <FileSpreadsheet size={18} />,
      iconBg: "#f5f3ff",
      iconColor: "#7c3aed",
      href: "/settings/templates"
    },
    {
      label: "Appearance & Color Theme",
      desc: "Custom accent colors, light/dark themes & typography style",
      icon: <Palette size={18} />,
      iconBg: "#fdf2f8",
      iconColor: "#db2777",
      modal: "Theme"
    }
  ];

  // Group 2: Teams & Sales Operations (4 items)
  const teamSettings: SettingItem[] = [
    {
      label: "Manage Teams & Structure",
      desc: "Department hierarchy, branch units & lead routing rules",
      icon: <Users size={18} />,
      iconBg: "#eff6ff",
      iconColor: "#1d4ed8",
      modal: "Manage Teams"
    },
    {
      label: "Sales Targets & Quotas",
      desc: "Monthly revenue quotas, target benchmarks & pipeline tracking",
      icon: <Target size={18} />,
      iconBg: "#fef2f2",
      iconColor: "#dc2626",
      modal: "Sales Targets"
    },
    {
      label: "Attendance & Check-in Rules",
      desc: "Shift hours, working timings, geo-checkin & leave policies",
      icon: <Clock size={18} />,
      iconBg: "#fffbeb",
      iconColor: "#d97706",
      modal: "Attendance Rules"
    },
    {
      label: "Sales Incentive Policy Engine",
      desc: "5-Tier slab ladder, 2% zero-discount bonus & credit deal rates",
      icon: <Award size={18} />,
      iconBg: "#ecfdf5",
      iconColor: "#047857",
      modal: "Incentive Rules"
    }
  ];

  // Group 3: Automation & Cloud Billing (3 items)
  const automationSettings: SettingItem[] = [
    {
      label: "AI Workflows & Automation",
      desc: "Auto lead qualification, AI follow-ups & event webhooks",
      icon: <Sparkles size={18} />,
      iconBg: "#f5f3ff",
      iconColor: "#9333ea",
      href: "/settings/workflows",
      badge: "AI Powered"
    },
    {
      label: "Subscription & Cloud Billing",
      desc: "Active subscription plan, user seat limits & billing invoices",
      icon: <CreditCard size={18} />,
      iconBg: "#e0f2fe",
      iconColor: "#0284c7",
      href: "/settings/billing"
    },
    {
      label: "Data Backup & Sync",
      desc: "Offline database export, customer CSV dumps & sync logs",
      icon: <Database size={18} />,
      iconBg: "#f0fdf4",
      iconColor: "#16a34a",
      modal: "Backup Data"
    }
  ];

  // Group 4: Security, Access & Territory (3-4 items)
  const securitySettings: SettingItem[] = [
    {
      label: "Roles & Permissions (RBAC)",
      desc: "Granular section locks, feature privileges & role definitions",
      icon: <KeyRound size={18} />,
      iconBg: "#fffbeb",
      iconColor: "#b45309",
      href: "/settings/roles"
    },
    {
      label: "Audit Logs & Security Monitoring",
      desc: "User login records, security events & IP activity history",
      icon: <ShieldCheck size={18} />,
      iconBg: "#fee2e2",
      iconColor: "#b91c1c",
      href: "/settings/audit-logs"
    },
    {
      label: "Territory & Region Management",
      desc: "State pincodes, delivery hubs & sales territory mapping",
      icon: <MapPin size={18} />,
      iconBg: "#ecfeff",
      iconColor: "#0891b2",
      href: "/settings/territories"
    },
    ...(isPlatformOwner
      ? [
          {
            label: "SaaS Platform Admin",
            desc: "Global multi-tenant platform controls & license provision",
            icon: <Crown size={18} />,
            iconBg: "#ffedd5",
            iconColor: "#ea580c",
            href: "/platform-admin",
            badge: "Super Admin"
          }
        ]
      : [])
  ];

  const renderSection = (
    title: string,
    subtitle: string,
    badgeText: string,
    badgeBg: string,
    badgeColor: string,
    items: SettingItem[]
  ) => (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #e2e8f0",
        padding: "18px 20px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}
    >
      {/* Category Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "10px" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "0.98rem", fontWeight: 800, color: "#0f172a" }}>
            {title}
          </h3>
          <p style={{ margin: "2px 0 0 0", fontSize: "0.74rem", color: "#64748b" }}>
            {subtitle}
          </p>
        </div>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 700,
            padding: "3px 8px",
            borderRadius: "12px",
            backgroundColor: badgeBg,
            color: badgeColor
          }}
        >
          {badgeText}
        </span>
      </div>

      {/* Setting Items */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {items.map((item) => {
          const content = (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 12px",
                borderRadius: "10px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                transition: "all 0.15s ease",
                cursor: "pointer"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#ffffff";
                e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                e.currentTarget.style.boxShadow = "0 3px 8px rgba(79, 70, 229, 0.08)";
                e.currentTarget.style.transform = "translateX(2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#f8fafc";
                e.currentTarget.style.borderColor = "#e2e8f0";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.transform = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    backgroundColor: item.iconBg,
                    color: item.iconColor,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontWeight: 700, fontSize: "0.86rem", color: "#0f172a" }}>
                      {item.label}
                    </span>
                    {item.badge && (
                      <span
                        style={{
                          fontSize: "0.65rem",
                          fontWeight: 800,
                          padding: "1px 6px",
                          borderRadius: "6px",
                          backgroundColor: "#f3e8ff",
                          color: "#9333ea"
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
                    {item.desc}
                  </div>
                </div>
              </div>

              <div style={{ color: "#94a3b8", paddingLeft: "8px", flexShrink: 0 }}>
                <ChevronRight size={15} />
              </div>
            </div>
          );

          if (item.href) {
            return (
              <Link
                key={item.label}
                href={item.href}
                style={{ textDecoration: "none", display: "block" }}
              >
                {content}
              </Link>
            );
          }

          return (
            <div
              key={item.label}
              onClick={() => setActiveFeature(item.modal || item.label)}
              style={{ display: "block" }}
            >
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "18px",
          width: "100%",
          gridColumn: "1 / -1"
        }}
      >
        {/* Hub 1: Organization & Branding */}
        {renderSection(
          "Organization & Branding",
          "Company identity, GST details, document layouts & UI theme",
          "4 Settings",
          "#eff6ff",
          "#2563eb",
          orgSettings
        )}

        {/* Hub 2: Teams, HR & Operations */}
        {renderSection(
          "Teams, HR & Sales Operations",
          "Hierarchy, sales quotas, attendance rules & incentive policies",
          "4 Settings",
          "#ecfdf5",
          "#059669",
          teamSettings
        )}

        {/* Hub 3: Automation & Cloud Billing */}
        {renderSection(
          "Automation, Cloud & Data",
          "AI workflows, subscription plans, seat limits & backups",
          "3 Settings",
          "#f5f3ff",
          "#9333ea",
          automationSettings
        )}

        {/* Hub 4: Security, Access & Territory */}
        {renderSection(
          "Security, Access & Territory",
          "RBAC permissions, audit timeline & territory zones",
          isPlatformOwner ? "4 Settings" : "3 Settings",
          "#fffbeb",
          "#d97706",
          securitySettings
        )}
      </div>

      {activeFeature === "Theme" ? (
        <ThemeSettingsModal onClose={() => setActiveFeature(null)} />
      ) : activeFeature ? (
        <SettingsModal
          featureName={activeFeature}
          onClose={() => setActiveFeature(null)}
        />
      ) : null}
    </>
  );
}
