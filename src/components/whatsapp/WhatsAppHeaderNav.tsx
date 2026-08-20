"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Send,
  LayoutDashboard,
  Users,
  Bot,
  GitFork,
  BookOpen,
  FileText,
  FileCode,
  Radio,
  BarChart2,
  Key,
  Users2,
  PieChart,
  CreditCard,
  ShoppingBag,
  Settings
} from "lucide-react";
import "./WhatsAppHeaderNav.css";

const subNavItems = [
  { name: "WhatsApp Inbox", path: "/whatsapp/inbox", icon: MessageSquare, badge: "3" },
  { name: "Direct Messages", path: "/whatsapp/direct-messages", icon: Send },
  { name: "WhatsApp Dashboard", path: "/whatsapp/dashboard", icon: LayoutDashboard },
  { name: "Contacts", path: "/whatsapp/contacts", icon: Users },
  { name: "AI Automation", path: "/whatsapp/ai-automation", icon: Bot, highlight: true },
  { name: "Chatbot Builder", path: "/whatsapp/chatbot-builder", icon: GitFork },
  { name: "Reply Library", path: "/whatsapp/reply-library", icon: BookOpen },
  { name: "WhatsApp Forms", path: "/whatsapp/forms", icon: FileText },
  { name: "Templates", path: "/whatsapp/templates", icon: FileCode },
  { name: "Broadcasts", path: "/whatsapp/broadcasts", icon: Radio },
  { name: "Campaigns", path: "/whatsapp/campaigns", icon: BarChart2 },
  { name: "WhatsApp API", path: "/whatsapp/api-settings", icon: Key },
  { name: "Team Inbox", path: "/whatsapp/team-inbox", icon: Users2 },
  { name: "Analytics", path: "/whatsapp/analytics", icon: PieChart },
  { name: "Payments", path: "/whatsapp/payments", icon: CreditCard },
  { name: "Commerce", path: "/whatsapp/commerce", icon: ShoppingBag },
  { name: "Settings", path: "/whatsapp/settings", icon: Settings },
];

import { getWhatsAppDashboardMetrics } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppHeaderNav() {
  const pathname = usePathname();
  const [accountInfo, setAccountInfo] = React.useState<any>({
    status: "VERIFIED & CONNECTED",
    phoneNumber: "+91 7206066678",
    used: "1,250 / 10,000 used today"
  });

  React.useEffect(() => {
    getWhatsAppDashboardMetrics().then((res) => {
      if (res.success && res.account) {
        setAccountInfo({
          status: res.account.status || "VERIFIED & CONNECTED",
          phoneNumber: res.account.phoneNumber || "+91 7206066678",
          used: "1,250 / 10,000 used today"
        });
      }
    });
  }, []);

  const isItemActive = (path: string) => {
    if (path === "/whatsapp/inbox" && (pathname === "/whatsapp" || pathname === "/whatsapp/inbox")) {
      return true;
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="wa-header-nav-container">
      <div className="wa-header-brand-row">
        <div className="wa-header-brand-title">
          <div className="wa-brand-icon-wrapper">
            <MessageSquare size={22} color="#ffffff" />
          </div>
          <div>
            <h1 className="wa-title-text">WhatsApp Business Automation + CRM</h1>
            <p className="wa-subtitle-text">Deeply connected to customer 360° profiles, sales pipelines, orders & payments</p>
          </div>
        </div>

        <div className="wa-header-status-badge">
          <span className="wa-pulse-indicator"></span>
          <span className="wa-status-text">Meta API: {accountInfo.status} ({accountInfo.phoneNumber})</span>
          <span className="wa-limit-pill">10K / Day (12.5% used)</span>
        </div>
      </div>

      <div className="wa-subnav-scroll-wrapper">
        <nav className="wa-subnav-bar">
          {subNavItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item.path);
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`wa-subnav-item ${active ? "active" : ""} ${item.highlight ? "highlight" : ""}`}
              >
                <Icon size={16} className="wa-nav-icon" />
                <span>{item.name}</span>
                {item.badge && <span className="wa-nav-badge">{item.badge}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
