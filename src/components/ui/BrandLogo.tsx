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
  const iconSize = size === "sm" ? 32 : size === "lg" ? 48 : 38;
  const titleSize = size === "sm" ? "1.1rem" : size === "lg" ? "1.65rem" : "1.35rem";
  const subtitleSize = size === "sm" ? "0.6rem" : size === "lg" ? "0.72rem" : "0.65rem";

  return (
    <div
      className={`brand-identity ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: collapsed ? "0" : "14px",
        textDecoration: "none",
        userSelect: "none"
      }}
    >
      {/* Sleek Minimalist Geometric Heart Vector */}
      <div
        className="brand-icon-wrapper"
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)"
        }}
      >
        <svg
          viewBox="0 0 100 100"
          style={{ 
            width: "100%", 
            height: "100%", 
            filter: "drop-shadow(0 6px 10px rgba(79, 70, 229, 0.25))" 
          }}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="gradLeft" x1="20" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="gradRight" x1="80" y1="20" x2="50" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0ea5e9" />
              <stop offset="100%" stopColor="#4f46e5" />
            </linearGradient>
            <linearGradient id="gradCenter" x1="50" y1="15" x2="50" y2="60" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
          </defs>

          {/* Left Heart Lobe */}
          <path
            d="M 50 90 C 50 90, 10 55, 12 30 C 14 12, 35 10, 50 30 Z"
            fill="url(#gradLeft)"
            opacity="0.9"
          />
          {/* Right Heart Lobe */}
          <path
            d="M 50 90 C 50 90, 90 55, 88 30 C 86 12, 65 10, 50 30 Z"
            fill="url(#gradRight)"
            opacity="0.9"
            style={{ mixBlendMode: "multiply" }}
          />
          {/* Center Upward Growth Prism (Business Growth) */}
          <path
            d="M 50 22 L 64 45 L 50 85 L 36 45 Z"
            fill="url(#gradCenter)"
            opacity="0.95"
          />
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
          {/* Main Title: Sleek and Minimal */}
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
                fontWeight: 900,
                color: "#0f172a",
                letterSpacing: "-0.5px",
                fontFamily: "var(--font-inter, -apple-system, sans-serif)"
              }}
            >
              Heart
            </span>
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 300,
                color: "#64748b",
                fontStyle: "italic",
                fontFamily: "var(--font-inter, -apple-system, sans-serif)"
              }}
            >
              of
            </span>
            <span
              style={{
                fontSize: titleSize,
                fontWeight: 900,
                letterSpacing: "-0.5px",
                background: "linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "var(--font-inter, -apple-system, sans-serif)"
              }}
            >
              Business
            </span>
          </div>

          {/* Minimalist Subtitle */}
          {showSubtitle && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginTop: "2px"
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "2px",
                  background: "linear-gradient(90deg, #818cf8, transparent)",
                  borderRadius: "2px"
                }}
              />
              <span
                style={{
                  fontSize: subtitleSize,
                  fontWeight: 700,
                  color: "#64748b",
                  letterSpacing: "1.2px",
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
