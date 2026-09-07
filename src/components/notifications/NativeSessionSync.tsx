"use client";

import { useEffect } from "react";
import { syncNativeUserSession } from "@/lib/capacitor";

interface Props {
  userId?: string | null;
  userEmail?: string | null;
}

/**
 * Invisible client component that instantly registers the authenticated user's ID
 * into Android's native SharedPreferences so the native background service and alarm poller
 * can pull alerts 24/7 even when the app is completely closed.
 */
export default function NativeSessionSync({ userId }: Props) {
  useEffect(() => {
    if (typeof window !== "undefined" && userId) {
      syncNativeUserSession(userId, window.location.origin);
    }
  }, [userId]);

  return null;
}
