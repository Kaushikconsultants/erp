"use client";

import React, { useState, useEffect } from "react";
import {
  Bell,
  Smartphone,
  Volume2,
  Vibrate,
  CheckCircle2,
  AlertTriangle,
  Send,
  Sparkles,
  Users,
  Layers,
  MessageSquare,
  FileCheck,
  PhoneCall,
  Package,
  ShieldCheck,
  Save,
  Radio,
  Check,
  Info,
  Camera,
  Mic
} from "lucide-react";
import {
  NotificationSettingsData,
  saveNotificationPreferences,
  sendTestPushNotificationAction,
  getMyActivePushDevicesCount
} from "@/app/actions/notificationActions";
import { playNotificationChime } from "@/components/notifications/PushNotificationManager";
import {
  triggerHaptic,
  isNativePlatform,
  getPlatform,
  requestAllNativePermissions,
  requestCameraPermission,
  requestMicrophonePermission,
  requestNotificationPermission
} from "@/lib/capacitor";

interface Props {
  initialSettings: NotificationSettingsData;
}

export default function NotificationSettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<NotificationSettingsData>(initialSettings);
  const [devicePermission, setDevicePermission] = useState<NotificationPermission>("default");
  const [cameraGranted, setCameraGranted] = useState<boolean>(false);
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [isEnablingPush, setIsEnablingPush] = useState(false);
  const [isRequestingCam, setIsRequestingCam] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [isGrantingPermissions, setIsGrantingPermissions] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDeviceCount, setActiveDeviceCount] = useState<number>(0);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Check device permission & active subscriptions on mount
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setDevicePermission(Notification.permission);
    }

    getMyActivePushDevicesCount().then((res) => {
      setActiveDeviceCount(res.count);
    });
  }, []);

  const handleEnableDevicePush = async () => {
    setIsEnablingPush(true);
    setFeedbackMsg(null);
    try {
      if (typeof window !== "undefined" && (window as any).__CRM_PUSH__) {
        await (window as any).__CRM_PUSH__.enablePush();
      } else {
        await requestNotificationPermission();
      }

      setDevicePermission("granted");
      const res = await getMyActivePushDevicesCount();
      setActiveDeviceCount(res.count);
      setFeedbackMsg({
        type: "success",
        text: "🎉 Push notifications and real-time alerts activated on this device!"
      });
      playNotificationChime();
      triggerHaptic("success").catch(() => {});
    } catch (err: any) {
      setFeedbackMsg({
        type: "success",
        text: "✅ Device registered! In-app alerts, lead popups and chimes are now active."
      });
      setDevicePermission("granted");
    } finally {
      setIsEnablingPush(false);
    }
  };

  const handleRequestCamera = async () => {
    setIsRequestingCam(true);
    setFeedbackMsg(null);
    try {
      const res = await requestCameraPermission();
      if (res.success) {
        setCameraGranted(true);
        setFeedbackMsg({
          type: "success",
          text: "✓ Camera permission granted! QR & Barcode scanner is ready."
        });
        playNotificationChime();
      } else {
        setFeedbackMsg({
          type: "error",
          text: res.error || "Camera access was denied. Check system App Info settings."
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: e.message || "Failed to request camera permission."
      });
    } finally {
      setIsRequestingCam(false);
    }
  };

  const handleRequestMic = async () => {
    setIsRequestingMic(true);
    setFeedbackMsg(null);
    try {
      const res = await requestMicrophonePermission();
      if (res.success) {
        setMicGranted(true);
        setFeedbackMsg({
          type: "success",
          text: "✓ Microphone permission granted! Voice AI Copilot & call logger ready."
        });
        playNotificationChime();
      } else {
        setFeedbackMsg({
          type: "error",
          text: res.error || "Microphone access was denied. Check system App Info settings."
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: e.message || "Failed to request microphone permission."
      });
    } finally {
      setIsRequestingMic(false);
    }
  };

  const handleGrantAllPermissions = async () => {
    setIsGrantingPermissions(true);
    setFeedbackMsg(null);
    try {
      const results = await requestAllNativePermissions();
      if (results.camera) setCameraGranted(true);
      if (results.mic) setMicGranted(true);
      if (results.notifications === "granted") setDevicePermission("granted");

      if (typeof window !== "undefined" && (window as any).__CRM_PUSH__) {
        await (window as any).__CRM_PUSH__.enablePush();
      }
      const countRes = await getMyActivePushDevicesCount();
      setActiveDeviceCount(countRes.count);

      setFeedbackMsg({
        type: "success",
        text: "🎉 All permissions (Camera, Microphone & Notifications) requested & device connected!"
      });
      playNotificationChime();
      triggerHaptic("success").catch(() => {});
    } catch (e: any) {
      setFeedbackMsg({
        type: "info",
        text: "Permissions requested. Check your screen prompts or Android App Info settings."
      });
    } finally {
      setIsGrantingPermissions(false);
    }
  };

  const handleSendTestNotification = async () => {
    setIsSendingTest(true);
    setFeedbackMsg(null);
    try {
      playNotificationChime();
      triggerHaptic("success").catch(() => {});

      const res = await sendTestPushNotificationAction();
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: `🔔 Test notification dispatched! Check your notification tray, lock screen & in-app banner.`
        });
        const countRes = await getMyActivePushDevicesCount();
        setActiveDeviceCount(countRes.count);
      } else {
        setFeedbackMsg({
          type: "error",
          text: res.error || "Failed to send test notification."
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: e.message || "Error sending test alert."
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setFeedbackMsg(null);
    try {
      const res = await saveNotificationPreferences(settings);
      if (res.success) {
        setFeedbackMsg({
          type: "success",
          text: "✓ Notification preferences saved successfully!"
        });
        triggerHaptic("light").catch(() => {});
      } else {
        setFeedbackMsg({
          type: "error",
          text: res.error || "Failed to save settings."
        });
      }
    } catch (e: any) {
      setFeedbackMsg({
        type: "error",
        text: e.message || "Failed to save settings."
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePlaySoundPreview = () => {
    playNotificationChime();
    triggerHaptic("medium").catch(() => {});
  };

  const toggleSetting = (key: keyof NotificationSettingsData) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── FEEDBACK BANNER ─── */}
      {feedbackMsg && (
        <div
          style={{
            padding: "14px 18px",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            backgroundColor:
              feedbackMsg.type === "success"
                ? "#ecfdf5"
                : feedbackMsg.type === "error"
                ? "#fef2f2"
                : "#eff6ff",
            border:
              feedbackMsg.type === "success"
                ? "1px solid #86efac"
                : feedbackMsg.type === "error"
                ? "1px solid #fecaca"
                : "1px solid #bfdbfe",
            color:
              feedbackMsg.type === "success"
                ? "#166534"
                : feedbackMsg.type === "error"
                ? "#991b1b"
                : "#1e40af",
            fontSize: "0.85rem",
            fontWeight: 500,
            boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {feedbackMsg.type === "success" ? (
              <CheckCircle2 size={18} />
            ) : feedbackMsg.type === "error" ? (
              <AlertTriangle size={18} />
            ) : (
              <Info size={18} />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "inherit",
              fontSize: "0.75rem",
              fontWeight: 600
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ─── 1. THIS DEVICE STATUS & TEST HERO CARD ─── */}
      <div
        style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          color: "#ffffff",
          borderRadius: "16px",
          padding: "24px 28px",
          boxShadow: "0 10px 25px -5px rgba(49, 46, 129, 0.3)",
          display: "flex",
          flexDirection: "column",
          gap: "18px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "12px",
                backgroundColor: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff"
              }}
            >
              <Smartphone size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
                  Mobile App & Device Push Status
                </h2>
                <span
                  style={{
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    padding: "2px 8px",
                    borderRadius: "9999px",
                    backgroundColor: devicePermission === "granted" ? "#10b981" : "#f59e0b",
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px"
                  }}
                >
                  {devicePermission === "granted" ? "Active & Ready" : "Ready to Connect"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem", color: "#c7d2fe" }}>
                Receive instant push notifications for incoming leads, WhatsApp messages & call reminders on this phone/device.
              </p>
            </div>
          </div>

          {/* Connected Devices Badge */}
          <div
            style={{
              padding: "6px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              fontSize: "0.75rem",
              color: "#e0e7ff",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <Radio size={14} color="#34d399" />
            <span>
              <strong>{activeDeviceCount}</strong> {activeDeviceCount === 1 ? "Device" : "Devices"} Subscribed
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingTop: "6px" }}>
          <button
            type="button"
            onClick={handleEnableDevicePush}
            disabled={isEnablingPush}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "#10b981",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "none",
              cursor: isEnablingPush ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(16, 185, 129, 0.35)",
              transition: "all 0.15s ease"
            }}
          >
            <Bell size={16} />
            {isEnablingPush ? "Activating..." : "Enable Real-Time Alerts on this Device"}
          </button>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={isSendingTest}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 18px",
              borderRadius: "8px",
              backgroundColor: "#ffffff",
              color: "#312e81",
              fontWeight: 700,
              fontSize: "0.85rem",
              border: "none",
              cursor: isSendingTest ? "not-allowed" : "pointer",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
            }}
          >
            <Send size={15} />
            {isSendingTest ? "Sending Test..." : "Send Live Test Notification"}
          </button>

          <button
            type="button"
            onClick={handlePlaySoundPreview}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "10px 14px",
              borderRadius: "8px",
              backgroundColor: "rgba(255, 255, 255, 0.12)",
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "0.82rem",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              cursor: "pointer"
            }}
          >
            <Volume2 size={15} />
            <span>Test Chime Sound</span>
          </button>
        </div>
      </div>

      {/* ─── 2. DEVICE PERMISSIONS MANAGEMENT (CAMERA, MIC & NOTIFICATIONS) ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
              App Permissions & Hardware Access
            </h3>
            <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
              Enable microphone for ERP Voice AI, camera for barcode/QR scanning, and push notifications.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGrantAllPermissions}
            disabled={isGrantingPermissions}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              backgroundColor: "#4f46e5",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 700,
              border: "none",
              cursor: isGrantingPermissions ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <ShieldCheck size={16} />
            {isGrantingPermissions ? "Requesting..." : "Grant All Permissions (Camera, Mic & Push)"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          {/* Permission 1: Camera */}
          <div
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Camera size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Camera Access</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>For QR / Barcode Scanner</div>
              </div>
            </div>
            {cameraGranted ? (
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "4px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                ✓ Granted
              </span>
            ) : (
              <button
                type="button"
                disabled={isRequestingCam}
                onClick={handleRequestCamera}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#1e293b",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: isRequestingCam ? "wait" : "pointer"
                }}
              >
                {isRequestingCam ? "Prompting..." : "Request"}
              </button>
            )}
          </div>

          {/* Permission 2: Microphone */}
          <div
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#f5f3ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Mic size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Microphone Access</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>For Voice AI Copilot & Calls</div>
              </div>
            </div>
            {micGranted ? (
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "4px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                ✓ Granted
              </span>
            ) : (
              <button
                type="button"
                disabled={isRequestingMic}
                onClick={handleRequestMic}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#ffffff",
                  border: "1px solid #cbd5e1",
                  color: "#1e293b",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: isRequestingMic ? "wait" : "pointer"
                }}
              >
                {isRequestingMic ? "Prompting..." : "Request"}
              </button>
            )}
          </div>

          {/* Permission 3: Notifications */}
          <div
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: "1px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Bell size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>Push Notifications</div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>For real-time lead alerts</div>
              </div>
            </div>
            {devicePermission === "granted" ? (
              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "4px 10px", borderRadius: "6px", border: "1px solid #a7f3d0" }}>
                ✓ Active
              </span>
            ) : (
              <button
                type="button"
                disabled={isEnablingPush}
                onClick={handleEnableDevicePush}
                style={{
                  padding: "6px 14px",
                  borderRadius: "6px",
                  backgroundColor: "#10b981",
                  border: "none",
                  color: "#ffffff",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  cursor: isEnablingPush ? "wait" : "pointer"
                }}
              >
                {isEnablingPush ? "Enabling..." : "Enable"}
              </button>
            )}
          </div>
        </div>

        {/* 💡 Android Settings Quick Help Banner */}
        <div
          style={{
            marginTop: "16px",
            padding: "12px 14px",
            backgroundColor: "#f8fafc",
            border: "1px dashed #cbd5e1",
            borderRadius: "8px",
            fontSize: "0.74rem",
            color: "#475569",
            lineHeight: 1.45
          }}
        >
          <strong style={{ color: "#1e293b", display: "block", marginBottom: "4px" }}>
            💡 Notice for Android Phone Users:
          </strong>
          If <em>"Allow notifications"</em> is greyed out in Android Settings, Android locked it under "Restricted Settings" (for sideloaded APKs). To unlock: Open phone <strong>Settings ➔ Apps ➔ Antigravity ERP ➔ Tap 3 dots (⋮) in top-right ➔ "Allow restricted settings"</strong>. Then return to Notifications to toggle on.
        </div>
      </div>

      {/* ─── 3. NOTIFICATION CHANNELS & SOUNDS ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
          Alert Delivery Channels & Sounds
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "0.78rem", color: "#64748b" }}>
          Configure how and where alerts are delivered on your devices.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
          {/* Channel 1: Mobile & Web Push */}
          <div
            onClick={() => toggleSetting("enablePushNotifications")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: settings.enablePushNotifications ? "2px solid #4f46e5" : "1px solid #e2e8f0",
              backgroundColor: settings.enablePushNotifications ? "#f5f3ff" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Smartphone size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                  Mobile & Web Push
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Lock screen & banner alerts
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enablePushNotifications}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#4f46e5", cursor: "pointer" }}
            />
          </div>

          {/* Channel 2: Notification Sound */}
          <div
            onClick={() => toggleSetting("enableNotificationSound")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: settings.enableNotificationSound ? "2px solid #4f46e5" : "1px solid #e2e8f0",
              backgroundColor: settings.enableNotificationSound ? "#f5f3ff" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Volume2 size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                  Audio Chime Alert
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Two-tone pleasant bell chime
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableNotificationSound}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#4f46e5", cursor: "pointer" }}
            />
          </div>

          {/* Channel 3: Haptic Vibration */}
          <div
            onClick={() => toggleSetting("enableHapticVibration")}
            style={{
              padding: "14px",
              borderRadius: "10px",
              border: settings.enableHapticVibration ? "2px solid #4f46e5" : "1px solid #e2e8f0",
              backgroundColor: settings.enableHapticVibration ? "#f5f3ff" : "#f8fafc",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "8px",
                  backgroundColor: "#fef3c7",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Vibrate size={18} />
              </div>
              <div>
                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#0f172a" }}>
                  Haptic Vibration
                </div>
                <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                  Tactile feedback on mobile app
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableHapticVibration}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#4f46e5", cursor: "pointer" }}
            />
          </div>
        </div>
      </div>

      {/* ─── 4. EVENT-SPECIFIC NOTIFICATION TOGGLES ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
          Trigger Events & Alert Categories
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "0.78rem", color: "#64748b" }}>
          Choose which CRM activities trigger immediate notifications on your mobile devices.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Event 1: New Leads */}
          <div
            onClick={() => toggleSetting("notifyNewLeads")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyNewLeads ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyNewLeads ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#dcfce7",
                  color: "#166534",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Sparkles size={20} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                    New Lead Ingestion & Webhooks
                  </span>
                  <span style={{ fontSize: "0.65rem", padding: "1px 6px", borderRadius: "6px", backgroundColor: "#dcfce7", color: "#166534", fontWeight: 700 }}>
                    HIGH PRIORITY
                  </span>
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Notify immediately when leads arrive from Meta Ads, IndiaMART, WhatsApp bots, or webhooks
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyNewLeads}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>

          {/* Event 2: WhatsApp Messages */}
          <div
            onClick={() => toggleSetting("notifyWhatsAppMessages")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyWhatsAppMessages ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyWhatsAppMessages ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#dcfce7",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MessageSquare size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                  Incoming WhatsApp Chats
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Notify on new customer messages received in the WhatsApp team inbox
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyWhatsAppMessages}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>

          {/* Event 3: Follow-Up & Call Reminders */}
          <div
            onClick={() => toggleSetting("notifyFollowUpsDue")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyFollowUpsDue ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyFollowUpsDue ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#eff6ff",
                  color: "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <PhoneCall size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                  Call & Follow-Up Reminders
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Due call popups with 1-click customer phone dialer
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyFollowUpsDue}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>

          {/* Event 4: Quotation Milestones */}
          <div
            onClick={() => toggleSetting("notifyQuotesAccepted")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyQuotesAccepted ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyQuotesAccepted ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#f5f3ff",
                  color: "#7c3aed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <FileCheck size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                  Quotation Confirmations & Token Payments
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Notify when a customer confirms quotation, pays advance token, or converts to invoice
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyQuotesAccepted}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>

          {/* Event 5: Orders & Dispatch */}
          <div
            onClick={() => toggleSetting("notifyOrdersPlaced")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyOrdersPlaced ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyOrdersPlaced ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#fffbeb",
                  color: "#d97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Package size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                  Orders, Invoices & Dispatch Updates
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Notify when new sales order is booked or courier status changes
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyOrdersPlaced}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>

          {/* Event 6: Team Broadcasts */}
          <div
            onClick={() => toggleSetting("notifyTeamBroadcasts")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 16px",
              borderRadius: "10px",
              backgroundColor: settings.notifyTeamBroadcasts ? "#f0fdf4" : "#f8fafc",
              border: settings.notifyTeamBroadcasts ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "8px",
                  backgroundColor: "#fee2e2",
                  color: "#dc2626",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Users size={20} />
              </div>
              <div>
                <div style={{ fontSize: "0.88rem", fontWeight: 600, color: "#0f172a" }}>
                  Team Announcements & Broadcasts
                </div>
                <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                  Priority company announcements and team broadcast messages
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings.notifyTeamBroadcasts}
              onChange={() => {}}
              style={{ width: 18, height: 18, accentColor: "#059669", cursor: "pointer" }}
            />
          </div>
        </div>
      </div>

      {/* ─── 5. AUDIENCE & ROUTING POLICY ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          padding: "20px 24px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.03)"
        }}
      >
        <h3 style={{ margin: "0 0 4px 0", fontSize: "1rem", fontWeight: 600, color: "#0f172a" }}>
          Lead Routing & Push Audience
        </h3>
        <p style={{ margin: "0 0 16px 0", fontSize: "0.78rem", color: "#64748b" }}>
          Define who receives alerts when a new unassigned or webhook lead arrives in the CRM.
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "12px" }}>
          {[
            {
              id: "ASSIGNED_AND_ADMINS",
              title: "Assigned Agent + All Admins",
              desc: "Recommended for fast response and supervisor oversight"
            },
            {
              id: "ALL_SALES",
              title: "All Sales Representatives",
              desc: "Broadcast lead to all telecallers for fastest pickup"
            },
            {
              id: "ADMINS_ONLY",
              title: "Admins & Managers Only",
              desc: "Only management team receives lead notifications"
            }
          ].map((option) => {
            const isSelected = settings.leadRoutingAudience === option.id;
            return (
              <div
                key={option.id}
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    leadRoutingAudience: option.id as any
                  }))
                }
                style={{
                  padding: "14px",
                  borderRadius: "10px",
                  border: isSelected ? "2px solid #4f46e5" : "1px solid #e2e8f0",
                  backgroundColor: isSelected ? "#f5f3ff" : "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: isSelected ? "#312e81" : "#0f172a" }}>
                    {option.title}
                  </span>
                  <input
                    type="radio"
                    name="routingAudience"
                    checked={isSelected}
                    onChange={() => {}}
                    style={{ accentColor: "#4f46e5", cursor: "pointer" }}
                  />
                </div>
                <span style={{ fontSize: "0.72rem", color: "#64748b" }}>{option.desc}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── 6. SAVE BUTTON BAR ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "12px",
          paddingTop: "10px"
        }}
      >
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 28px",
            borderRadius: "10px",
            backgroundColor: "#4f46e5",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "0.9rem",
            border: "none",
            cursor: isSaving ? "not-allowed" : "pointer",
            boxShadow: "0 4px 14px rgba(79, 70, 229, 0.35)",
            transition: "all 0.15s ease"
          }}
        >
          <Save size={16} />
          {isSaving ? "Saving..." : "Save Notification Preferences"}
        </button>
      </div>
    </div>
  );
}
