"use client";

import { useEffect } from "react";

// Public VAPID key — generate your own with: https://www.npmjs.com/package/web-push
// and set it as NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
  "BIqLUY30-N9qSJrCz4tF1C65XgCRVyr-1TmiCTG2MNFL2_8_EAC4o626ehSdKSM5uUpNPJvpcNCjwOen8evAjRU";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushNotificationInitializer() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    const registerPush = async () => {
      try {
        // 1. Register the service worker
        const registration = await navigator.serviceWorker.register("/sw.js");

        // 2. Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();

        // 3. Subscribe if not yet subscribed
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
          });
        }

        // 4. Send to server to save in DB
        const sub = subscription.toJSON();
        await fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: sub.endpoint,
            p256dh: sub.keys?.p256dh,
            auth: sub.keys?.auth
          })
        });

        console.log("[Push] Successfully registered for WhatsApp notifications");
      } catch (err) {
        console.warn("[Push] Could not register for push notifications:", err);
      }
    };

    // Only auto-register if permission not yet denied
    if (Notification.permission !== "denied") {
      registerPush();
    }
  }, []);

  return null; // Invisible component
}
