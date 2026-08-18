"use client";

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  collapsed?: boolean;
  className?: string;
}

export default function BrandLogo({
  size = "md",
  showSubtitle = true,
  collapsed = false,
  className = ""
}: BrandLogoProps) {
  // Dimensions based on size
  const iconSize = size === "sm" ? 34 : size === "lg" ? 54 : 42;
  const titleSize = size === "sm" ? "1.05rem" : size === "lg" ? "1.65rem" : "1.28rem";
  const subtitleSize = size === "sm" ? "0.62rem" : size === "lg" ? "0.72rem" : "0.65rem";

  return (
    <div
      className={`brand-identity ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: collapsed ? "0" : "12px",
        textDecoration: "none",
        userSelect: "none"
      }}
    >
      {/* Dynamic Geometric Heart & Business Growth SVG Emblem */}
      <div
        className="brand-icon-wrapper hover-glow"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: size === "sm" ? "10px" : size === "lg" ? "16px" : "13px",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #0f172a 100%)",
          boxShadow: "0 6px 18px -2px rgba(79, 70, 229, 0.35), 0 2px 6px -1px rgba(0, 0, 0, 0.2)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          flexShrink: 0,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
        }}
      >
        {/* Ambient Glow Backdrop */}
        <div
          style={{
            position: "absolute",
            inset: "2px",
            borderRadius: size === "sm" ? "8px" : size === "lg" ? "14px" : "11px",
            background: "radial-gradient(circle at 30% 20%, rgba(129, 140, 248, 0.4), transparent 70%)",
            pointerEvents: "none"
          }}
        />

        {/* Vector SVG Heart + Surge Pulse */}
        <svg
          viewBox="0 0 100 100"
          style={{
            width: "68%",
            height: "68%",
            filter: "drop-shadow(0 2px 6px rgba(99, 102, 241, 0.5))"
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Multi-tone Cyber Gradient */}
            <linearGradient id="heartGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ec4899" />
              <stop offset="35%" stopColor="#8b5cf6" />
              <stop offset="70%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>

            {/* Glowing Accent Gradient */}
            <linearGradient id="pulseGradient" x1="0" y1="50" x2="100" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#4ade80" />
            </linearGradient>

            <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Geometric Faceted Heart Path */}
          <path
            d="M50 85 C20 60 5 42 5 26 C5 12 16 5 28 5 C38 5 46 11 50 19 C54 11 62 5 72 5 C84 5 95 12 95 26 C95 42 80 60 50 85 Z"
            fill="url(#heartGradient)"
            opacity="0.95"
          />

          {/* Inner Facet Overlay / Prism Cuts */}
          <path
            d="M50 19 L28 5 L15 26 L50 85 L85 26 L72 5 Z"
            fill="white"
            fillOpacity="0.08"
          />
          <path
            d="M50 19 L50 85 L28 45 Z"
            fill="black"
            fillOpacity="0.12"
          />
          <path
            d="M50 19 L50 85 L72 45 Z"
            fill="white"
            fillOpacity="0.15"
          />

          {/* Upward Business Pulse & Growth Arrow */}
          <path
            d="M18 45 L34 45 L43 28 L53 62 L62 38 L70 48 L82 48"
            stroke="url(#pulseGradient)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#neonGlow)"
          />

          {/* Peak Growth Sparkle Dot */}
          <circle cx="82" cy="48" r="3.5" fill="#ffffff" filter="url(#neonGlow)" />
        </svg>
      </div>

      {/* Typography Column */}
      {!collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "2px"
          }}
        >
          {/* Main Title: "Heart Of Business" with Creative Typographic Treatment */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "4px",
              lineHeight: 1.15,
              whiteSpace: "nowrap"
            }}
          >
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: "-0.6px",
                background: "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "var(--font-inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)"
              }}
            >
              Heart
            </span>

            {/* Stylized 'Of' Badge */}
            <span
              style={{
                fontSize: `calc(${titleSize} * 0.72)`,
                fontWeight: 800,
                fontStyle: "italic",
                padding: "1px 5px",
                borderRadius: "6px",
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                color: "#ffffff",
                lineHeight: 1,
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                letterSpacing: "0.2px"
              }}
            >
              of
            </span>

            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: "-0.6px",
                background: "linear-gradient(135deg, #059669 0%, #0284c7 50%, #4f46e5 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "var(--font-inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)"
              }}
            >
              Business
            </span>
          </div>

          {/* Creative Author Pill Badge */}
          {showSubtitle && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "2px 7px",
                borderRadius: "12px",
                background: "linear-gradient(90deg, rgba(238, 242, 255, 0.9) 0%, rgba(243, 232, 255, 0.9) 100%)",
                border: "1px solid rgba(165, 180, 252, 0.4)",
                marginTop: "2px",
                boxShadow: "0 1px 3px rgba(79, 70, 229, 0.05)"
              }}
            >
              <span
                style={{
                  width: "5px",
                  height: "5px",
                  borderRadius: "50%",
                  background: "#10b981",
                  display: "inline-block",
                  boxShadow: "0 0 6px #10b981"
                }}
              />
              <span
                style={{
                  fontSize: subtitleSize,
                  fontWeight: 700,
                  color: "#4338ca",
                  letterSpacing: "0.6px",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-inter, sans-serif)"
                }}
              >
                Made by Ashish Aggarwal
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
