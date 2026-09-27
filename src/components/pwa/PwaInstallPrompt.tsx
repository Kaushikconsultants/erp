"use client";

import React, { useState, useEffect } from "react";
import { Download, Smartphone, X, CheckCircle2, Share, PlusSquare } from "lucide-react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [showIosModal, setShowIosModal] = useState(false);
  const [installedSuccess, setInstalledSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone PWA window or native wrapper
    const isRunningStandalone =
      (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) ||
      (typeof window !== "undefined" && (window.navigator as any).standalone === true) ||
      (typeof document !== "undefined" && document.referrer.includes("android-app://"));

    setIsStandalone(isRunningStandalone);
    if (isRunningStandalone) return;

    // 2. Check if iOS device
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent.toLowerCase() : "";
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIos(isIosDevice);

    // Check if dismissed before
    const dismissedAt = typeof localStorage !== "undefined" ? localStorage.getItem("pwa_prompt_dismissed") : null;
    const isRecentlyDismissed = dismissedAt && Date.now() - parseInt(dismissedAt, 10) < 24 * 60 * 60 * 1000;

    // 3. Listen for browser native beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      if (!isRecentlyDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // 4. Register Service Worker for offline PWA capabilities
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.warn("PWA Service Worker registration notice:", err);
      });
    }

    // 5. App installed listener
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
      setShowBanner(false);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 4000);
    };
    window.addEventListener("appinstalled", handleAppInstalled);

    // 6. If iOS and not standalone, show install hint after 3 seconds
    if (isIosDevice && !isRunningStandalone && !isRecentlyDismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.removeEventListener("appinstalled", handleAppInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert("To install R3 Exports ERP, open your browser menu (⋮) and tap 'Install App' or 'Add to Home Screen'.");
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
        setInstalledSuccess(true);
        setTimeout(() => setInstalledSuccess(false), 4000);
      }
      setDeferredPrompt(null);
    } catch (e) {
      console.warn("PWA prompt error:", e);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    try {
      localStorage.setItem("pwa_prompt_dismissed", String(Date.now()));
    } catch {}
  };

  if (isStandalone) return null;

  return (
    <>
      {/* ─── SUCCESS TOAST ─── */}
      {installedSuccess && (
        <div style={{
          position: "fixed",
          bottom: "80px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100000,
          backgroundColor: "#065f46",
          color: "#ffffff",
          padding: "12px 20px",
          borderRadius: "12px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          fontSize: "0.9rem",
          fontWeight: 600,
          animation: "slideUp 0.3s ease"
        }}>
          <CheckCircle2 size={20} color="#34d399" />
          <span>R3 Exports App Installed! Check your Home Screen.</span>
        </div>
      )}

      {/* ─── FLOATING MOBILE / BROWSER PWA INSTALL BANNER ─── */}
      {showBanner && (
        <div
          className="pwa-install-banner"
          style={{
            position: "fixed",
            bottom: "76px",
            left: "14px",
            right: "14px",
            maxWidth: "520px",
            margin: "0 auto",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            borderRadius: "14px",
            padding: "12px 14px",
            boxShadow: "0 12px 30px rgba(15, 23, 42, 0.4), 0 2px 8px rgba(0,0,0,0.15)",
            zIndex: 99990,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            border: "1px solid rgba(255, 255, 255, 0.12)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: 0 }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              overflow: "hidden"
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="R3 Exports" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <strong style={{ fontSize: "0.88rem", color: "#f8fafc", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Install R3 Exports App
                </strong>
                <span style={{ fontSize: "0.62rem", backgroundColor: "rgba(99, 102, 241, 0.25)", color: "#a5b4fc", border: "1px solid rgba(99, 102, 241, 0.4)", padding: "1px 5px", borderRadius: "4px", fontWeight: 700 }}>
                  FAST PWA
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                1-tap home screen launch • Offline fast access
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <button
              type="button"
              onClick={handleInstallClick}
              style={{
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                border: "none",
                borderRadius: "8px",
                padding: "8px 14px",
                fontSize: "0.8rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.4)",
                transition: "all 0.15s ease"
              }}
            >
              <Download size={14} />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                padding: "6px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── iOS SAFARI "ADD TO HOME SCREEN" MODAL ─── */}
      {showIosModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 100010,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "18px",
            padding: "24px",
            maxWidth: "380px",
            width: "100%",
            color: "#0f172a",
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Smartphone size={20} style={{ color: "#4f46e5" }} />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Install on iPhone / iPad</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: "0.84rem", color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              To install <strong>R3 Exports ERP</strong> on your Apple device for full-screen native experience:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                  1
                </div>
                <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                  Tap the <strong>Share button <Share size={14} style={{ display: "inline", verticalAlign: "middle" }} /></strong> at the bottom of Safari.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                  2
                </div>
                <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                  Scroll down and tap <strong>&apos;Add to Home Screen&apos; <PlusSquare size={14} style={{ display: "inline", verticalAlign: "middle" }} /></strong>.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem" }}>
                  3
                </div>
                <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                  Tap <strong>&apos;Add&apos;</strong> in the top right corner. Done!
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosModal(false)}
              style={{
                width: "100%",
                marginTop: "16px",
                padding: "10px",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontWeight: 600,
                fontSize: "0.88rem",
                cursor: "pointer"
              }}
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
