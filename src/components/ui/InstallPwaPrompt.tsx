"use client";

import React, { useState, useEffect, useRef } from "react";
import { Smartphone, Download, X, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  // Close modal when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) {
      alert("To install as Web App:\n1. Open in Chrome / Safari on your phone\n2. Tap browser menu (3 dots or Share icon)\n3. Tap 'Add to Home Screen'");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstallable(false);
      setIsOpen(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="install-pwa-container" style={{ position: "relative", display: "inline-block" }}>
      {/* Topbar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
          color: "#ffffff",
          padding: "6px 14px",
          borderRadius: "20px",
          border: "none",
          fontSize: "0.82rem",
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(239, 68, 68, 0.35)",
          transition: "all 0.2s ease"
        }}
        title="Download & Install Mobile App"
      >
        <Smartphone size={15} />
        <span>Install App</span>
      </button>

      {/* Modal Popup */}
      {isOpen && (
        <div
          ref={modalRef}
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            width: "320px",
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.06)",
            padding: "18px",
            zIndex: 9999,
            animation: "fadeInDown 0.2s ease-out"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  color: "#ef4444",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Smartphone size={18} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 700, color: "#1e293b" }}>
                  Get Mobile App
                </h4>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  ERP Tinkal - Made by tinkal.in
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "#94a3b8",
                padding: "4px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%"
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Option 1: Direct Android APK Download (Recommended) */}
          <div
            style={{
              border: "1.5px solid #ef4444",
              backgroundColor: "#fef2f2",
              borderRadius: "12px",
              padding: "14px",
              marginBottom: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
              <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#991b1b", display: "flex", alignItems: "center", gap: "5px" }}>
                <Sparkles size={14} color="#ef4444" /> Android App (.APK)
              </span>
              <span
                style={{
                  backgroundColor: "#fee2e2",
                  color: "#b91c1c",
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  padding: "2px 6px",
                  borderRadius: "10px",
                  border: "1px solid #fca5a5"
                }}
              >
                Recommended
              </span>
            </div>
            <p style={{ margin: "0 0 10px 0", fontSize: "0.75rem", color: "#7f1d1d", lineHeight: 1.4 }}>
              Direct APK installation for Android devices. Full native camera barcode scanning & real-time sync.
            </p>
            <a
              href="/downloads/espon-erp.apk"
              download="espon-erp.apk"
              onClick={() => setIsOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                backgroundColor: "#ef4444",
                color: "#ffffff",
                padding: "8px 12px",
                borderRadius: "8px",
                textDecoration: "none",
                fontSize: "0.82rem",
                fontWeight: 700,
                boxShadow: "0 2px 6px rgba(239, 68, 68, 0.3)",
                transition: "background 0.2s"
              }}
            >
              <Download size={15} />
              <span>Download APK (5.0 MB)</span>
            </a>
          </div>

          {/* Option 2: PWA / Web App Install */}
          <div
            style={{
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              padding: "12px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#334155" }}>
                Web App / iOS (PWA)
              </span>
            </div>
            <p style={{ margin: "0 0 8px 0", fontSize: "0.72rem", color: "#64748b", lineHeight: 1.3 }}>
              Add directly to home screen via Chrome or Safari without downloading APK.
            </p>
            <button
              onClick={handlePwaInstall}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                backgroundColor: "#ffffff",
                color: "#334155",
                border: "1px solid #cbd5e1",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              <Smartphone size={14} />
              <span>Install Web App</span>
            </button>
          </div>

          {/* Trust Badge */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", marginTop: "12px", fontSize: "0.7rem", color: "#94a3b8" }}>
            <ShieldCheck size={13} color="#10b981" />
            <span>Verified Secure & Connected to Railway</span>
          </div>
        </div>
      )}
    </div>
  );
}
