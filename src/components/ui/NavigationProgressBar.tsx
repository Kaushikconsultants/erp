"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export default function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  // When pathname or searchParams change, navigation has completed
  useEffect(() => {
    setProgress(100);
    const timer = setTimeout(() => {
      setLoading(false);
      setProgress(0);
    }, 200);
    return () => clearTimeout(timer);
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleAnchorClick = (event: MouseEvent) => {
      const target = (event.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:") || target.target === "_blank") {
        return;
      }

      // Check if it's an internal navigation to a different path
      const currentUrl = new URL(window.location.href);
      const destinationUrl = new URL(href, window.location.href);

      if (
        destinationUrl.origin === currentUrl.origin &&
        (destinationUrl.pathname !== currentUrl.pathname || destinationUrl.search !== currentUrl.search)
      ) {
        setLoading(true);
        setProgress(30);

        // Incrementally simulate progress
        const t1 = setTimeout(() => setProgress(60), 100);
        const t2 = setTimeout(() => setProgress(80), 300);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
    };
  }, []);

  if (!loading && progress === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: "3px",
        zIndex: 99999,
        pointerEvents: "none",
        backgroundColor: "transparent"
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress}%`,
          background: "linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)",
          boxShadow: "0 0 10px rgba(99, 102, 241, 0.7)",
          transition: progress === 100 ? "width 150ms ease-out, opacity 150ms ease" : "width 250ms cubic-bezier(0.4, 0, 0.2, 1)",
          opacity: progress === 100 ? 0 : 1
        }}
      />
    </div>
  );
}
