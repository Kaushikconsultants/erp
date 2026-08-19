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
  const iconSize = size === "sm" ? 32 : size === "lg" ? 48 : 40;
  const titleSize = size === "sm" ? "1.1rem" : size === "lg" ? "1.65rem" : "1.4rem";
  const subtitleSize = size === "sm" ? "0.6rem" : size === "lg" ? "0.72rem" : "0.65rem";

  return (
    <div
      className={`brand-identity ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: collapsed ? "0" : "16px",
        textDecoration: "none",
        userSelect: "none",
        position: "relative"
      }}
    >
      <style>
        {`
          @keyframes heartbeat {
            0% { transform: scale(1); }
            14% { transform: scale(1.1); }
            28% { transform: scale(1); }
            42% { transform: scale(1.1); }
            70% { transform: scale(1); }
            100% { transform: scale(1); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            80% { transform: scale(1.4); opacity: 0; }
            100% { transform: scale(0.8); opacity: 0; }
          }
          @keyframes gradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .brand-identity:hover .heart-icon {
            animation: none;
            transform: scale(1.1) rotate(5deg);
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          }
          .brand-identity:hover .pulse-ring-circle {
            animation: pulse-ring 1s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
          }
          .brand-identity:hover .subtitle-line {
            width: 32px !important;
            background: #ef4444 !important;
          }
          .heart-icon {
            animation: heartbeat 2.5s infinite cubic-bezier(0.215, 0.61, 0.355, 1);
            transform-origin: center;
          }
          .pulse-ring-circle {
            transform-origin: center;
            opacity: 0;
          }
        `}
      </style>

      {/* Animated Red Heart Brand Icon */}
      <div
        className="brand-icon-wrapper"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ 
            width: "100%", 
            height: "100%", 
            filter: "drop-shadow(0 4px 8px rgba(239, 68, 68, 0.45))",
            overflow: "visible"
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="redHeartGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="50%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#dc2626" />
            </linearGradient>
            <linearGradient id="redRingGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fca5a5" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Background Pulse Ring */}
          <circle 
            cx="50" cy="50" r="35" 
            fill="none" 
            stroke="url(#redRingGrad)" 
            strokeWidth="3" 
            className="pulse-ring-circle" 
          />

          {/* Clean Red Heart Path (NO Checkmark) */}
          <g className="heart-icon">
            <path
              d="M 50 85 C 50 85, 15 55, 18 28 C 20 12, 42 12, 50 32 C 58 12, 80 12, 82 28 C 85 55, 50 85, 50 85 Z"
              fill="url(#redHeartGrad)"
              opacity="1"
            />
          </g>
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
          {/* Main Title: Heart of Business */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "6px",
              lineHeight: 1.1,
              whiteSpace: "nowrap"
            }}
          >
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                fontFamily: "var(--font-family, -apple-system, sans-serif)",
                transition: "color 0.3s ease"
              }}
            >
              Heart
            </span>
            <span
              style={{
                fontSize: `calc(${titleSize} * 0.75)`,
                fontWeight: 500,
                color: "#64748b",
                fontStyle: "italic",
                fontFamily: "var(--font-family, -apple-system, sans-serif)",
                opacity: 0.8
              }}
            >
              of
            </span>
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary, #0ea5e9) 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "var(--font-family, -apple-system, sans-serif)",
                animation: "gradientFlow 3s ease infinite"
              }}
            >
              Business
            </span>
          </div>

          {/* Subtitle */}
          {showSubtitle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "4px"
              }}
            >
              <div
                className="subtitle-line"
                style={{
                  width: "16px",
                  height: "2px",
                  background: "#ef4444",
                  borderRadius: "2px",
                  transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}
              />
              <span
                style={{
                  fontSize: subtitleSize,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "1.5px",
                  textTransform: "uppercase",
                  fontFamily: "var(--font-family, sans-serif)",
                  opacity: 0.85
                }}
              >
                MADE BY ASHISH AGGARWAL
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
