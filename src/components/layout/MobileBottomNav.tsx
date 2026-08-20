"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Users,
  ShoppingCart,
  Plus,
  X,
  PhoneCall,
  FileSpreadsheet,
  Settings,
  CheckSquare,
  UserPlus,
  Zap,
  Grid
} from "lucide-react";
import "./MobileBottomNav.css";

interface MobileBottomNavProps {
  userRole?: string;
  allowedSections?: string[] | null;
}

export default function MobileBottomNav({ userRole, allowedSections }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  const isSuperOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const canAccess = (sectionKey: string): boolean => {
    if (isSuperOrAdmin) return true;
    if (!allowedSections || allowedSections.length === 0) return true;
    return allowedSections.includes(sectionKey);
  };

  return (
    <>
      <nav className="mobile-bottom-nav">
        {/* 1. Home Tab */}
        {canAccess("dashboard") && (
          <Link href="/" className={`bottom-nav-item ${isActive("/") ? "active" : ""}`}>
            <div className="bottom-nav-icon">
              <LayoutDashboard size={20} />
            </div>
            <span className="bottom-nav-label">Home</span>
          </Link>
        )}

        {/* 2. WhatsApp Inbox Tab */}
        <Link href="/whatsapp/inbox" className={`bottom-nav-item ${isActive("/whatsapp") ? "active" : ""}`}>
          <div className="bottom-nav-icon wa-icon-badge">
            <MessageSquare size={20} color={isActive("/whatsapp") ? "#10b981" : "currentColor"} />
            <span className="wa-dot-indicator"></span>
          </div>
          <span className="bottom-nav-label" style={{ color: isActive("/whatsapp") ? "#10b981" : "inherit" }}>
            WhatsApp
          </span>
        </Link>

        {/* 3. Central Elevated App Launcher FAB Button */}
        <div className="bottom-nav-fab-wrapper">
          <button
            className={`native-fab-btn ${showActionSheet ? "active" : ""}`}
            onClick={() => setShowActionSheet(!showActionSheet)}
            title="Quick Action Launcher"
          >
            {showActionSheet ? <X size={22} color="#fff" /> : <Plus size={24} color="#fff" />}
          </button>
        </div>

        {/* 4. CRM Customers Tab */}
        {canAccess("customers") && (
          <Link href="/customers" className={`bottom-nav-item ${isActive("/customers") ? "active" : ""}`}>
            <div className="bottom-nav-icon">
              <Users size={20} />
            </div>
            <span className="bottom-nav-label">CRM</span>
          </Link>
        )}

        {/* 5. Orders Tab */}
        {canAccess("orders") && (
          <Link href="/orders" className={`bottom-nav-item ${isActive("/orders") ? "active" : ""}`}>
            <div className="bottom-nav-icon">
              <ShoppingCart size={20} />
            </div>
            <span className="bottom-nav-label">Orders</span>
          </Link>
        )}
      </nav>

      {/* NATIVE iOS/ANDROID ACTION SHEET MODAL */}
      {showActionSheet && (
        <div className="mobile-action-sheet-backdrop" onClick={() => setShowActionSheet(false)}>
          <div className="mobile-action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-handle-bar" />

            <div className="action-sheet-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} color="#10b981" />
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Quick Action Launcher</strong>
              </div>
              <button onClick={() => setShowActionSheet(false)} className="action-sheet-close-btn">
                <X size={18} />
              </button>
            </div>

            <div className="action-sheet-grid">
              <Link href="/whatsapp/inbox" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box green">
                  <MessageSquare size={20} />
                </div>
                <span>WhatsApp Chat</span>
              </Link>

              <Link href="/calls" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box blue">
                  <PhoneCall size={20} />
                </div>
                <span>Log Call</span>
              </Link>

              <Link href="/quotations/new" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box purple">
                  <FileSpreadsheet size={20} />
                </div>
                <span>New Quote</span>
              </Link>

              <Link href="/orders" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box orange">
                  <ShoppingCart size={20} />
                </div>
                <span>Create Order</span>
              </Link>

              <Link href="/customers" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box indigo">
                  <UserPlus size={20} />
                </div>
                <span>Add Customer</span>
              </Link>

              <Link href="/tasks" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box pink">
                  <CheckSquare size={20} />
                </div>
                <span>My Tasks</span>
              </Link>

              <Link href="/settings" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box gray">
                  <Settings size={20} />
                </div>
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
