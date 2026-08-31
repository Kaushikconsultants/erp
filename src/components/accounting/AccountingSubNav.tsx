"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Scale,
  FolderTree,
  FileText,
  Clock,
  Landmark,
  LayoutDashboard
} from "lucide-react";

export default function AccountingSubNav() {
  const pathname = usePathname();

  const navItems = [
    {
      href: "/accounting",
      label: "Overview",
      icon: LayoutDashboard,
      exact: true
    },
    {
      href: "/accounting/financial-statements",
      label: "Financial Statements",
      badge: "P&L/BS",
      icon: Scale
    },
    {
      href: "/accounting/chart-of-accounts",
      label: "Chart of Accounts",
      icon: FolderTree
    },
    {
      href: "/accounting/vouchers",
      label: "Journal & Contra (JV)",
      icon: FileText
    },
    {
      href: "/accounting/ageing",
      label: "Ageing (0-90D)",
      icon: Clock
    },
    {
      href: "/accounting/bank-reconciliation",
      label: "Bank Reconciliation (BRS)",
      icon: Landmark
    }
  ];

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        overflowX: "auto",
        padding: "6px",
        background: "#ffffff",
        border: "1px solid var(--border, #e2e8f0)",
        borderRadius: "12px",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
        marginBottom: "22px",
        maxWidth: "100%",
        scrollbarWidth: "none"
      }}
    >
      {navItems.map(item => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "7px",
              padding: "7px 14px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.8125rem",
              fontWeight: isActive ? 550 : 500,
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              background: isActive ? "var(--accent-primary, #4f46e5)" : "transparent",
              color: isActive ? "#ffffff" : "var(--text-secondary, #64748b)",
              boxShadow: isActive ? "0 2px 4px rgba(79, 70, 229, 0.2)" : "none"
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-primary, #f8f9fc)";
                (e.currentTarget as HTMLElement).style.color = "var(--text-primary, #0f172a)";
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLElement).style.color = "var(--text-secondary, #64748b)";
              }
            }}
          >
            <Icon size={15} />
            <span>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: "0.6875rem",
                  fontWeight: 500,
                  padding: "1px 6px",
                  borderRadius: "6px",
                  background: isActive ? "rgba(255, 255, 255, 0.22)" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#475569",
                  letterSpacing: "0.02em"
                }}
              >
                {item.badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
