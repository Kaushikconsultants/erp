"use client";

import React, { useState, useEffect } from "react";
import BrandLogo from "./BrandLogo";

export default function AppSplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  const dismissImmediately = () => {
    setIsFadingOut(true);
    setIsVisible(false);
  };

  useEffect(() => {
    // Fast, responsive startup fadeout
    const timer1 = setTimeout(() => {
      setIsFadingOut(true);
    }, 600);

    const timer2 = setTimeout(() => {
      setIsVisible(false);
    }, 900);

    // Hard fallback safety: never block the user under any circumstances
    const fallbackTimer = setTimeout(() => {
      setIsVisible(false);
    }, 1200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(fallbackTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      onClick={dismissImmediately}
      onTouchStart={dismissImmediately}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "#ffffff",
        zIndex: 2147483647, /* Maximum CSS z-index — splash must always be topmost on startup */
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        opacity: isFadingOut ? 0 : 1,
        transition: "opacity 0.4s ease-out",
        pointerEvents: isFadingOut ? "none" : "auto",
        userSelect: "none"
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          transform: isFadingOut ? "scale(0.95)" : "scale(1)",
          transition: "transform 0.4s ease-out"
        }}
      >
        {/* ERP Tinkal Welcome Logo */}
        <BrandLogo size="lg" showSubtitle={true} />

        {/* Loading Indicator */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginTop: "20px" }}>
          <div
            style={{
              width: "160px",
              height: "4px",
              backgroundColor: "#f1f5f9",
              borderRadius: "4px",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(90deg, #ef4444 0%, #4f46e5 100%)",
                borderRadius: "4px",
                animation: "splashBar 1.6s ease-in-out forwards"
              }}
            />
          </div>
          <span style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, letterSpacing: "0.3px" }}>
            Connecting Enterprise Services...
          </span>
        </div>
      </div>

      <style>{`
        @keyframes splashBar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(0%); }
        }
      `}</style>
    </div>
  );
}
