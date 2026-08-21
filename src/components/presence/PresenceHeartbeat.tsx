"use client";

import { useEffect, useRef } from "react";
import { updatePresenceHeartbeat } from "@/app/actions/presenceActions";

export default function PresenceHeartbeat() {
  const lastPingRef = useRef<number>(0);
  const currentStatusRef = useRef<"ONLINE" | "IDLE" | "OFFLINE">("ONLINE");

  useEffect(() => {
    const safeUpdate = (status: "ONLINE" | "IDLE" | "OFFLINE", force = false) => {
      const now = Date.now();
      // Throttle: don't ping more than once every 45s unless forced (e.g. tab visibility changed)
      if (!force && now - lastPingRef.current < 45000) return;
      
      lastPingRef.current = now;
      try {
        updatePresenceHeartbeat(status).catch(() => {});
      } catch (e) {}
    };

    // Initial online ping on mount
    safeUpdate("ONLINE", true);

    const onVisibilityChange = () => {
      if (document.hidden) {
        currentStatusRef.current = "IDLE";
        safeUpdate("IDLE", true);
      } else {
        currentStatusRef.current = "ONLINE";
        safeUpdate("ONLINE", true);
      }
    };

    const onBeforeUnload = () => {
      safeUpdate("OFFLINE", true);
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    // Heartbeat every 60 seconds (only if tab is visible)
    const interval = setInterval(() => {
      if (!document.hidden) {
        safeUpdate("ONLINE");
      }
    }, 60000);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
