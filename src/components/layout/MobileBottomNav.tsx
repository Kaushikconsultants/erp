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
  Menu,
  Landmark,
  ScrollText,
  Package,
  Receipt,
  Mic
} from "lucide-react";
import { useVoiceStore } from "@/lib/stores/voiceStore";
import { openPhoneDialer } from "@/lib/dialer";
import "./MobileBottomNav.css";

interface MobileBottomNavProps {
  userRole?: string;
  allowedSections?: string[] | null;
  onMenuClick?: () => void;
}

export default function MobileBottomNav({ userRole, allowedSections, onMenuClick }: MobileBottomNavProps) {
  const pathname = usePathname();
  const [showActionSheet, setShowActionSheet] = useState<boolean>(false);

  // Close Action Sheet on Android hardware back button
  React.useEffect(() => {
    if (!showActionSheet) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setShowActionSheet(false);
    };
    window.addEventListener('app-back-button', handleBack);
    return () => window.removeEventListener('app-back-button', handleBack);
  }, [showActionSheet]);

  const isActive = (path: string) => {
    if (path === "/" && pathname !== "/") return false;
    return pathname.startsWith(path);
  };

  const isSuperOrAdmin = userRole === "SUPER_ADMIN" || userRole === "ADMIN";

  const canAccess = (sectionKey: string): boolean => {
    if (isSuperOrAdmin) return true;
    if (!allowedSections || allowedSections.length === 0) {
      if (userRole === 'DISPATCH') return ['dashboard', 'dispatches', 'eway_bills', 'eway-bills'].includes(sectionKey);
      if (userRole === 'SALES') return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products'].includes(sectionKey);
      if (userRole === 'HR') return ['dashboard', 'hrms', 'hiring'].includes(sectionKey);
      if (userRole === 'ACCOUNTS') return ['dashboard', 'invoices', 'payments', 'orders', 'hrms', 'purchases', 'procurement', 'reports', 'sales', 'credit_notes', 'credit-notes', 'gst_filing', 'gst-filing'].includes(sectionKey);
      if (userRole === 'WAREHOUSE') return ['dashboard', 'products', 'purchases', 'procurement', 'dispatches', 'eway_bills', 'eway-bills'].includes(sectionKey);
      if (userRole === 'PURCHASE') return ['dashboard', 'purchases', 'procurement', 'products'].includes(sectionKey);
      if (userRole === 'SUPPORT') return ['dashboard', 'customers', 'calls_tasks'].includes(sectionKey);
      return false;
    }
    return (
      allowedSections.includes(sectionKey) ||
      (sectionKey === 'credit_notes' && allowedSections.includes('credit-notes')) ||
      (sectionKey === 'credit-notes' && allowedSections.includes('credit_notes')) ||
      (sectionKey === 'eway_bills' && (allowedSections.includes('eway-bills') || allowedSections.includes('eway'))) ||
      (sectionKey === 'eway-bills' && (allowedSections.includes('eway_bills') || allowedSections.includes('eway'))) ||
      (sectionKey === 'gst_filing' && (allowedSections.includes('gst-filing') || allowedSections.includes('gst') || allowedSections.includes('gst_filings'))) ||
      (sectionKey === 'gst-filing' && (allowedSections.includes('gst_filing') || allowedSections.includes('gst') || allowedSections.includes('gst_filings'))) ||
      (sectionKey === 'purchases' && allowedSections.includes('procurement')) ||
      (sectionKey === 'procurement' && allowedSections.includes('purchases'))
    );
  };

  const { openAssistant } = useVoiceStore();

  return (
    <>
      <nav className="mobile-bottom-nav">
        {/* 1. Home Tab */}
        <Link href="/" className={`bottom-nav-item ${isActive("/") ? "active" : ""}`}>
          <div className="bottom-nav-icon">
            <LayoutDashboard size={20} />
          </div>
          <span className="bottom-nav-label">Home</span>
        </Link>

        {/* 2. Sales / Orders Tab */}
        <Link href="/orders" className={`bottom-nav-item ${isActive("/orders") || isActive("/quotations") ? "active" : ""}`}>
          <div className="bottom-nav-icon">
            <ShoppingCart size={20} />
          </div>
          <span className="bottom-nav-label">Sales</span>
        </Link>

        {/* 3. Central Elevated App Launcher FAB Button */}
        <div className="bottom-nav-fab-wrapper">
          <button
            type="button"
            className={`native-fab-btn ${showActionSheet ? "active" : ""}`}
            onClick={() => setShowActionSheet(!showActionSheet)}
            title="Quick Action Launcher"
            aria-label="Quick Action Launcher"
          >
            {showActionSheet ? <X size={22} color="#fff" /> : <Plus size={24} color="#fff" />}
          </button>
        </div>

        {/* 4. CRM Customers Tab */}
        <Link href="/customers" className={`bottom-nav-item ${isActive("/customers") || isActive("/leads") ? "active" : ""}`}>
          <div className="bottom-nav-icon">
            <Users size={20} />
          </div>
          <span className="bottom-nav-label">CRM</span>
        </Link>

        {/* 5. Menu / More Drawer Tab */}
        <button
          type="button"
          onClick={onMenuClick}
          className="bottom-nav-item"
        >
          <div className="bottom-nav-icon">
            <Menu size={20} />
          </div>
          <span className="bottom-nav-label">Menu</span>
        </button>
      </nav>

      {/* NATIVE iOS/ANDROID ACTION SHEET MODAL */}
      {showActionSheet && (
        <div className="mobile-action-sheet-backdrop" onClick={() => setShowActionSheet(false)}>
          <div className="mobile-action-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="action-sheet-handle-bar" />

            <div className="action-sheet-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap size={18} color="#2563eb" />
                <strong style={{ fontSize: "15px", color: "#0f172a" }}>Quick Mobile Actions</strong>
              </div>
              <button 
                type="button" 
                onClick={() => setShowActionSheet(false)} 
                className="action-sheet-close-btn"
              >
                <X size={18} />
              </button>
            </div>

            <div className="action-sheet-grid">
              <button
                type="button"
                className="action-sheet-tile"
                onClick={() => {
                  setShowActionSheet(false);
                  openPhoneDialer();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
              >
                <div className="tile-icon-box green" style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)", color: "#fff" }}>
                  <PhoneCall size={20} />
                </div>
                <span>Phone Dialer</span>
              </button>

              <button
                type="button"
                className="action-sheet-tile"
                onClick={() => {
                  setShowActionSheet(false);
                  openAssistant();
                }}
                style={{ background: "none", border: "none", cursor: "pointer", textAlign: "center" }}
              >
                <div className="tile-icon-box indigo" style={{ background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)", color: "#fff" }}>
                  <Mic size={20} />
                </div>
                <span>Voice AI</span>
              </button>

              <Link href="/orders" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box orange">
                  <ShoppingCart size={20} />
                </div>
                <span>New Order</span>
              </Link>

              <Link href="/quotations/new" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box purple">
                  <FileSpreadsheet size={20} />
                </div>
                <span>New Quote</span>
              </Link>

              <Link href="/customers" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                <div className="tile-icon-box indigo">
                  <UserPlus size={20} />
                </div>
                <span>Add Customer</span>
              </Link>

              {canAccess('gst_filing') && (
                <Link href="/gst-filing" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                  <div className="tile-icon-box blue">
                    <Landmark size={20} />
                  </div>
                  <span>GST Filing</span>
                </Link>
              )}

              {canAccess('calls_tasks') && (
                <Link href="/calls" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                  <div className="tile-icon-box blue">
                    <PhoneCall size={20} />
                  </div>
                  <span>Log Call</span>
                </Link>
              )}

              {canAccess('eway_bills') && (
                <Link href="/eway-bills" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                  <div className="tile-icon-box green">
                    <ScrollText size={20} />
                  </div>
                  <span>E-Way Bills</span>
                </Link>
              )}

              {canAccess('purchases') && (
                <Link href="/purchases" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                  <div className="tile-icon-box orange">
                    <Package size={20} />
                  </div>
                  <span>Purchases</span>
                </Link>
              )}

              {isSuperOrAdmin && (
                <Link href="/settings" className="action-sheet-tile" onClick={() => setShowActionSheet(false)}>
                  <div className="tile-icon-box gray">
                    <Settings size={20} />
                  </div>
                  <span>Settings</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
