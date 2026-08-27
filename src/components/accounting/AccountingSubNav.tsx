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
        padding: "4px",
        background: "var(--bg-secondary, #f1f5f9)",
        borderRadius: "10px",
        marginBottom: "20px",
        maxWidth: "100%"
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
              gap: "6px",
              padding: "7px 14px",
              borderRadius: "8px",
              textDecoration: "none",
              fontSize: "0.825rem",
              fontWeight: isActive ? 700 : 500,
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
              background: isActive ? "var(--primary, #4f46e5)" : "transparent",
              color: isActive ? "#ffffff" : "var(--text-secondary, #475569)",
              boxShadow: isActive ? "0 1px 3px rgba(79, 70, 229, 0.25)" : "none"
            }}
          >
            <Icon size={15} />
            <span>{item.label}</span>
            {item.badge && (
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 700,
                  padding: "1px 5px",
                  borderRadius: "6px",
                  background: isActive ? "rgba(255, 255, 255, 0.25)" : "#e2e8f0",
                  color: isActive ? "#ffffff" : "#475569"
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
