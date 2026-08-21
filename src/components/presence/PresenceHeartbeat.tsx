"use client";

import { useEffect, useRef } from "react";
import { updatePresenceHeartbeat } from "@/app/actions/presenceActions";

export default function PresenceHeartbeat() {
  const lastActivityRef = useRef<number>(Date.now());
  const currentStatusRef = useRef<"ONLINE" | "IDLE" | "OFFLINE">("ONLINE");

  useEffect(() => {
    // Initial online ping
    updatePresenceHeartbeat("ONLINE");

    const onUserActivity = () => {
      lastActivityRef.current = Date.now();
      if (currentStatusRef.current !== "ONLINE" && !document.hidden) {
        currentStatusRef.current = "ONLINE";
        updatePresenceHeartbeat("ONLINE");
      }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        currentStatusRef.current = "IDLE";
        updatePresenceHeartbeat("IDLE");
      } else {
        lastActivityRef.current = Date.now();
        currentStatusRef.current = "ONLINE";
        updatePresenceHeartbeat("ONLINE");
      }
    };

    const onBeforeUnload = () => {
      // Best-effort offline notification
      updatePresenceHeartbeat("OFFLINE");
    };

    // User activity listeners
    window.addEventListener("mousemove", onUserActivity, { passive: true });
    window.addEventListener("keydown", onUserActivity, { passive: true });
    window.addEventListener("touchstart", onUserActivity, { passive: true });
    window.addEventListener("scroll", onUserActivity, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    // Heartbeat interval every 25 seconds
    const interval = setInterval(() => {
      const inactiveSeconds = (Date.now() - lastActivityRef.current) / 1000;
      let nextStatus: "ONLINE" | "IDLE" = "ONLINE";

      if (document.hidden || inactiveSeconds > 90) {
        nextStatus = "IDLE";
      }

      currentStatusRef.current = nextStatus;
      updatePresenceHeartbeat(nextStatus);
    }, 25000);

    return () => {
      clearInterval(interval);
      window.removeEventListener("mousemove", onUserActivity);
      window.removeEventListener("keydown", onUserActivity);
      window.removeEventListener("touchstart", onUserActivity);
      window.removeEventListener("scroll", onUserActivity);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, []);

  return null;
}
