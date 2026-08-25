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
  Settings,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Terminal
} from "lucide-react";
import "./WhatsAppHeaderNav.css";

const subNavItems: Array<{name: string; path: string; icon: any; badge?: string; highlight?: boolean}> = [
  { name: "WhatsApp Inbox", path: "/whatsapp/inbox", icon: MessageSquare },
  { name: "Direct Messages", path: "/whatsapp/direct-messages", icon: Send },
  { name: "WhatsApp Dashboard", path: "/whatsapp/dashboard", icon: LayoutDashboard },
  { name: "WhatsApp Logs", path: "/whatsapp/logs", icon: Terminal },
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
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = React.useState(false);
  const [startX, setStartX] = React.useState(0);
  const [scrollLeftState, setScrollLeftState] = React.useState(0);

  const [accountInfo, setAccountInfo] = React.useState<any>({
    status: "NOT CONNECTED (Setup Required)",
    phoneNumber: "Not Configured",
    isConnected: false
  });

  React.useEffect(() => {
    getWhatsAppDashboardMetrics().then((res) => {
      if (res.success && res.account) {
        setAccountInfo({
          status: res.account.status || "NOT CONNECTED (Setup Required)",
          phoneNumber: res.account.phoneNumber || "Not Configured",
          isConnected: res.isConnected || false
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

  const handleScrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -240, behavior: "smooth" });
    }
  };

  const handleScrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 240, behavior: "smooth" });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsMouseDown(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeftState(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsMouseDown(false);
  };

  const handleMouseUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollRef.current.scrollLeft = scrollLeftState - walk;
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

        <Link
          href="/whatsapp/api-settings"
          className={`wa-header-status-badge ${accountInfo.isConnected ? "connected" : "disconnected"}`}
          style={{
            textDecoration: "none",
            background: accountInfo.isConnected ? "#f0fdf4" : "#fef2f2",
            borderColor: accountInfo.isConnected ? "#bbf7d0" : "#fca5a5"
          }}
        >
          <span
            className="wa-pulse-indicator"
            style={{ backgroundColor: accountInfo.isConnected ? "#10b981" : "#ef4444" }}
          ></span>
          <span
            className="wa-status-text"
            style={{ color: accountInfo.isConnected ? "#065f46" : "#991b1b" }}
          >
            Meta API: {accountInfo.status} {accountInfo.phoneNumber && accountInfo.phoneNumber !== "Not Configured" ? `(${accountInfo.phoneNumber})` : ""}
          </span>
          {!accountInfo.isConnected && (
            <span style={{ fontSize: "11px", fontWeight: 700, background: "#ef4444", color: "#fff", padding: "2px 8px", borderRadius: "10px" }}>
              Configure Credentials →
            </span>
          )}
        </Link>
      </div>

      <div className="wa-subnav-outer-container">
        <button className="wa-nav-arrow-btn left" onClick={handleScrollLeft} title="Scroll Left">
          <ChevronLeft size={16} />
        </button>

        <div
          className="wa-subnav-scroll-wrapper"
          ref={scrollRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <nav className="wa-subnav-bar">
            {subNavItems.map((item) => {
              const Icon = item.icon;
              const active = isItemActive(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  draggable={false}
                  className={`wa-subnav-item ${active ? "active" : ""} ${item.highlight ? "highlight" : ""}`}
                >
                  <Icon size={15} className="wa-nav-icon" />
                  <span>{item.name}</span>
                  {item.badge && <span className="wa-nav-badge">{item.badge}</span>}
                </Link>
              );
            })}

            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="wa-subnav-item fs-btn"
              title="Toggle Browser Full Screen Mode"
            >
              <Maximize2 size={14} />
              <span>Full Screen</span>
            </button>
          </nav>
        </div>

        <button className="wa-nav-arrow-btn right" onClick={handleScrollRight} title="Scroll Right">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
