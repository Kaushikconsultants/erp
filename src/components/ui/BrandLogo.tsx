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
  const iconSize = size === "sm" ? 30 : size === "lg" ? 48 : 38;
  const titleSize = size === "sm" ? "1.15rem" : size === "lg" ? "1.75rem" : "1.42rem";
  const signatureSize = size === "sm" ? "0.85rem" : size === "lg" ? "1.15rem" : "0.98rem";

  return (
    <div
      className={`brand-identity ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: collapsed ? "0" : "14px",
        textDecoration: "none",
        userSelect: "none",
        position: "relative"
      }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600;700&family=Caveat:wght@600;700&family=Playfair+Display:ital,wght@1,500;1,600&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');

          @keyframes heartbeatPulse {
            0% { transform: scale(1); }
            14% { transform: scale(1.12); }
            28% { transform: scale(1); }
            42% { transform: scale(1.12); }
            70% { transform: scale(1); }
            100% { transform: scale(1); }
          }
          @keyframes softGlow {
            0%, 100% { filter: drop-shadow(0 3px 8px rgba(239, 68, 68, 0.4)); }
            50% { filter: drop-shadow(0 5px 16px rgba(239, 68, 68, 0.65)); }
          }
          @keyframes gradientShift {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .brand-identity {
            transition: all 0.3s ease;
          }
          .brand-identity:hover .brand-heart-svg {
            animation: none;
            transform: scale(1.12) rotate(-3deg);
            filter: drop-shadow(0 6px 18px rgba(239, 68, 68, 0.75));
            transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), filter 0.4s ease;
          }
          .brand-identity:hover .signature-accent-line {
            width: 28px !important;
            background: linear-gradient(90deg, #ef4444, #f43f5e) !important;
          }
          .brand-identity:hover .signature-author {
            color: #1e293b !important;
            transform: translateX(2px);
          }
          .brand-heart-svg {
            animation: heartbeatPulse 2.8s infinite cubic-bezier(0.215, 0.61, 0.355, 1), softGlow 3s infinite ease-in-out;
            transform-origin: center;
          }
        `}
      </style>

      {/* Luminous Red Heart Icon */}
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
          className="brand-heart-svg"
          style={{ 
            width: "100%", 
            height: "100%", 
            overflow: "visible"
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="heartGradientVibrant" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#ff4d6d" />
              <stop offset="45%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#c1121f" />
            </linearGradient>
            <radialGradient id="heartHighlight" cx="35%" cy="30%" r="40%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Heart Body */}
          <path
            d="M 50 85 C 50 85, 15 55, 18 28 C 20 12, 42 12, 50 32 C 58 12, 80 12, 82 28 C 85 55, 50 85, 50 85 Z"
            fill="url(#heartGradientVibrant)"
          />

          {/* Subtle 3D Glass Light Reflection */}
          <path
            d="M 50 85 C 50 85, 15 55, 18 28 C 20 12, 42 12, 50 32 C 58 12, 80 12, 82 28 C 85 55, 50 85, 50 85 Z"
            fill="url(#heartHighlight)"
          />
        </svg>
      </div>

      {/* Modern & Stylish Typography */}
      {!collapsed && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: "0px",
            lineHeight: 1
          }}
        >
          {/* Main Brand Title */}
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "5px",
              lineHeight: 1.15,
              whiteSpace: "nowrap"
            }}
          >
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.6px",
                fontFamily: "'Plus Jakarta Sans', var(--font-inter), -apple-system, sans-serif"
              }}
            >
              Heart
            </span>
            <span
              style={{
                fontSize: `calc(${titleSize} * 0.8)`,
                fontWeight: 500,
                color: "#94a3b8",
                fontStyle: "italic",
                fontFamily: "'Playfair Display', Georgia, serif",
                margin: "0 1px"
              }}
            >
              of
            </span>
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: "-0.6px",
                background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #06b6d4 100%)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "'Plus Jakarta Sans', var(--font-inter), -apple-system, sans-serif",
                animation: "gradientShift 4s ease infinite"
              }}
            >
              Business
            </span>
          </div>

          {/* Signature Tagline: By Ashish Goyal */}
          {showSubtitle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "7px",
                marginTop: "3px"
              }}
            >
              <div
                className="signature-accent-line"
                style={{
                  width: "16px",
                  height: "2px",
                  background: "linear-gradient(90deg, #ef4444, #f43f5e)",
                  borderRadius: "999px",
                  transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)"
                }}
              />
              <span
                className="signature-author"
                style={{
                  fontSize: signatureSize,
                  fontWeight: 700,
                  color: "#475569",
                  fontFamily: "'Dancing Script', 'Caveat', cursive, sans-serif",
                  letterSpacing: "0.4px",
                  transition: "all 0.3s ease",
                  display: "inline-block"
                }}
              >
                By Ashish Goyal
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
