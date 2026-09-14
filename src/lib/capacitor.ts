"use client";

import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { Device } from '@capacitor/device';

/**
 * Check if running inside native Android or iOS Capacitor wrapper
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Get current platform ('android' | 'ios' | 'web')
 */
export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Trigger native tactile feedback
 */
export const triggerHaptic = async (
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light'
) => {
  if (!isNativePlatform()) return;

  try {
    if (type === 'light') {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else if (type === 'medium') {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } else if (type === 'heavy') {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else if (type === 'success') {
      await Haptics.notification({ type: NotificationType.Success });
    } else if (type === 'warning') {
      await Haptics.notification({ type: NotificationType.Warning });
    } else if (type === 'error') {
      await Haptics.notification({ type: NotificationType.Error });
    }
  } catch (err) {
    console.debug('Haptics not available:', err);
  }
};

let lastBackPressTime = 0;

/**
 * Initialize native status bar, splash screen, and Android hardware back button listener
 */
export const initNativeMobileShell = (onNavigateBack?: () => void) => {
  if (!isNativePlatform()) return;

  // 1. Configure Native Status Bar (Style.Light for dark/black icons on white status bar)
  try {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    if (Capacitor.getPlatform() === 'android') {
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
      StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    }
  } catch (e) {}

  // 2. Hide Native Splash Screen after web shell is rendered
  try {
    SplashScreen.hide().catch(() => {});
  } catch (e) {}

  // 3. Android Hardware Back Button Handler with Modal Interception & Double-Tap Exit
  try {
    CapApp.removeAllListeners().then(() => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        // A. If app lock is enabled and session is not unlocked, exit app on back press
        try {
          const isPinEnabled = localStorage.getItem('app_mpin_enabled') === 'true';
          const isSessionUnlocked = sessionStorage.getItem('app_session_unlocked') === 'true';
          const savedPin = localStorage.getItem('app_mpin_code');
          if (isPinEnabled && savedPin && !isSessionUnlocked) {
            CapApp.exitApp();
            return;
          }
        } catch (e) {}

        // B. Dispatch cancelable custom event for active modals, drawers, or sheets
        const backEvent = new CustomEvent('app-back-button', { cancelable: true });
        const wasHandled = !window.dispatchEvent(backEvent);
        if (wasHandled) {
          // An active modal / sheet intercepted the back press and closed itself!
          return;
        }

        // C. Check if at root dashboard or home page
        const currentPath = window.location.pathname;
        const isRoot = currentPath === '/' || currentPath === '/dashboard';

        if (isRoot) {
          const now = Date.now();
          if (now - lastBackPressTime < 2000) {
            CapApp.exitApp();
          } else {
            lastBackPressTime = now;
            triggerHaptic('light').catch(() => {});
            window.dispatchEvent(new CustomEvent('app-exit-prompt'));
          }
          return;
        }

        // D. Navigate back in history
        if (onNavigateBack) {
          onNavigateBack();
        } else if (canGoBack || window.history.length > 1) {
          window.history.back();
        } else {
          CapApp.exitApp();
        }
      });
    }).catch(() => {});
  } catch (e) {}
};

/**
 * Get real-time device information
 */
export const getDeviceInfo = async () => {
  if (!isNativePlatform()) {
    return {
      platform: 'web',
      model: 'Browser',
      osVersion: navigator.userAgent,
      manufacturer: 'Web Client',
      isVirtual: false
    };
  }

  try {
    const info = await Device.getInfo();
    const id = await Device.getId();
    return {
      ...info,
      uuid: id.identifier
    };
  } catch (e) {
    return { platform: getPlatform() };
  }
};

/**
 * Check network connection status
 */
export const getNetworkStatus = async () => {
  try {
    return await Network.getStatus();
  } catch (e) {
    return { connected: navigator.onLine, connectionType: 'unknown' };
  }
};

/**
 * Check if running inside Android Native wrapper with AndroidNative bridge
 */
export const isAndroidNativeApp = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).AndroidNative;
};

/**
 * Open Android system settings for this app
 */
export const openNativeAppSettings = () => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.openAppNotificationSettings();
    } catch (e) {}
  }
};

/**
 * Post a native Android OS notification to status bar and tray
 */
export const postNativeAndroidNotification = (title: string, body: string, url: string = '') => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.postNativeNotification(title, body, url);
    } catch (e) {}
  }
};

/**
 * Register user session with native Android background notification sync
 */
export const syncNativeUserSession = (userId: string, serverUrl?: string) => {
  if (isAndroidNativeApp() && userId) {
    try {
      const origin = serverUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://erp.esponsports.com');
      (window as any).AndroidNative.setUserSession(userId, origin);
    } catch (e) {}
  }
};

/**
 * Prompt Android OS to ignore battery optimizations for reliable 24/7 background alerts
 */
export const requestIgnoreBatteryOptimizations = () => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestIgnoreBatteryOptimizations();
    } catch (e) {}
  }
};

/**
 * Request Camera Permission
 */
export const requestCameraPermission = async (): Promise<{ success: boolean; error?: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestCameraPermission();
    } catch (e) {}
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { success: false, error: 'Camera API not supported on this browser/device.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    stream.getTracks().forEach((track) => track.stop());
    triggerHaptic('success').catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.debug('Camera permission request error:', err);
    return { success: false, error: err?.message || 'Camera permission was denied.' };
  }
};

/**
 * Request Microphone Permission
 */
export const requestMicrophonePermission = async (): Promise<{ success: boolean; error?: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestMicrophonePermission();
    } catch (e) {}
  }
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    return { success: false, error: 'Microphone API not supported on this browser/device.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    triggerHaptic('success').catch(() => {});
    return { success: true };
  } catch (err: any) {
    console.debug('Microphone permission request error:', err);
    return { success: false, error: err?.message || 'Microphone permission was denied.' };
  }
};

/**
 * Request Notification Permission
 */
export const requestNotificationPermission = async (): Promise<{ success: boolean; permission: string }> => {
  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestNotificationPermission();
      return { success: true, permission: 'granted' };
    } catch (e) {}
  }
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const perm = await Notification.requestPermission();
      triggerHaptic('success').catch(() => {});
      return { success: perm === 'granted', permission: perm };
    } catch (e) {
      return { success: false, permission: 'denied' };
    }
  }
  return { success: true, permission: 'granted' };
};

/**
 * Request all essential runtime permissions (Camera, Microphone, Notifications)
 * Works seamlessly in native Android / iOS Capacitor WebViews and desktop browsers
 */
export const requestAllNativePermissions = async () => {
  const results: { camera?: boolean; mic?: boolean; notifications?: string } = {};

  if (isAndroidNativeApp()) {
    try {
      (window as any).AndroidNative.requestAllPermissions();
    } catch (e) {}
  }

  // 1. Request Microphone
  try {
    const micRes = await requestMicrophonePermission();
    results.mic = micRes.success;
  } catch (e) {
    results.mic = false;
  }

  // 2. Request Camera
  try {
    const camRes = await requestCameraPermission();
    results.camera = camRes.success;
  } catch (e) {
    results.camera = false;
  }

  // 3. Request Notifications
  try {
    const notifRes = await requestNotificationPermission();
    results.notifications = notifRes.permission;
  } catch (e) {
    results.notifications = 'default';
  }

  triggerHaptic('success').catch(() => {});
  return results;
};
export interface NativeSimInfo {
  subscriptionId: number;
  slotIndex: number;
  slotLabel: string;
  displayName: string;
  carrierName: string;
  number?: string;
  isDefault?: boolean;
}

export interface RecordingCapabilityInfo {
  level: "SUPPORTED_TWO_WAY" | "PARTIALLY_SUPPORTED_MIC_ONLY" | "RESTRICTED_BY_OS" | "PERMISSION_REQUIRED" | "DEFAULT_DIALER_REQUIRED";
  title: string;
  description: string;
  canRecordBothSides: boolean;
  sourceName: string;
  oemVendor: string;
  androidVersion: string;
}

/**
 * Get active SIM subscriptions (Dual SIM / eSIM)
 */
export const getNativeSims = (): NativeSimInfo[] => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.getAvailableSims === 'function') {
      const json = (window as any).AndroidNative.getAvailableSims();
      if (!json || typeof json !== 'string') return [];
      const parsed = JSON.parse(json);
      return Array.isArray(parsed) ? parsed.filter(s => s && typeof s === 'object') : [];
    }
  } catch (e) {
    console.warn("Failed to get native SIMs:", e);
  }
  return [];
};

/**
 * Place a cellular call with a specific SIM subscription and slot
 */
export const makeDirectCellularCall = (phoneNumber: string, subscriptionId: number = -1, contactName: string = "", slotIndex: number = -1) => {
  try {
    const clean = String(phoneNumber || '').replace(/[^0-9+]/g, '');
    if (!clean) return;

    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.directPhoneCallWithContactAndSlot === 'function') {
      (window as any).AndroidNative.directPhoneCallWithContactAndSlot(clean, contactName, subscriptionId, slotIndex);
    } else if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.directPhoneCallWithContact === 'function') {
      (window as any).AndroidNative.directPhoneCallWithContact(clean, contactName, subscriptionId);
    } else if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.directPhoneCallWithSim === 'function') {
      (window as any).AndroidNative.directPhoneCallWithSim(clean, subscriptionId);
    } else if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.directPhoneCall === 'function') {
      (window as any).AndroidNative.directPhoneCall(clean);
    } else if (typeof window !== 'undefined') {
      window.location.href = `tel:${clean}`;
    }
  } catch (e) {
    console.warn("Failed to make cellular call:", e);
  }
};

/**
 * Check call audio capture & transcription capability
 */
export const getCallRecordingCapability = (): RecordingCapabilityInfo | null => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.getCallRecordingCapability === 'function') {
      const json = (window as any).AndroidNative.getCallRecordingCapability();
      if (!json || typeof json !== 'string') return null;
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object' && parsed.level) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed to get recording capability:", e);
  }
  return null;
};

/**
 * Check if app is default phone/dialer
 */
export const isDefaultDialer = (): boolean => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.isDefaultDialer === 'function') {
      return Boolean((window as any).AndroidNative.isDefaultDialer());
    }
  } catch (e) {
    return false;
  }
  return false;
};

/**
 * Request default dialer role prompt
 */
export const requestDefaultDialer = () => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.requestDefaultDialer === 'function') {
      (window as any).AndroidNative.requestDefaultDialer();
    }
  } catch (e) {
    console.warn("Failed to request default dialer:", e);
  }
};

/**
 * Start native two-way call recording (Android ROLE_PHONE_CALL_SCREENING builds only).
 * Returns true if native recording started, false on web / unsupported devices.
 * On web, the MediaRecorder mic-only path is used instead.
 */
export const startNativeCallRecording = (callId: string = ''): boolean => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.startCallRecording === 'function') {
      const result = (window as any).AndroidNative.startCallRecording(callId);
      return Boolean(result);
    }
  } catch (e) {
    console.warn('startNativeCallRecording: not available', e);
  }
  return false;
};

/**
 * Stop native call recording and return the local file path (if any).
 * On web / unsupported devices, returns { success: false }.
 */
export const stopNativeCallRecording = (): { success: boolean; filePath?: string } => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.stopCallRecording === 'function') {
      const json = (window as any).AndroidNative.stopCallRecording();
      if (json && typeof json === 'string') {
        const parsed = JSON.parse(json);
        return { success: true, filePath: parsed?.filePath };
      }
    }
  } catch (e) {
    console.warn('stopNativeCallRecording: not available', e);
  }
  return { success: false };
};

/**
 * Get notification link URL if app was launched from a push alert
 */
export const getNativeLaunchNotificationUrl = (): string => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.getLaunchNotificationUrl === 'function') {
      return (window as any).AndroidNative.getLaunchNotificationUrl() || '';
    }
  } catch (e) {}
  return '';
};

/**
 * Clear notification link URL after navigating
 */
export const clearNativeLaunchNotificationUrl = () => {
  try {
    if (isAndroidNativeApp() && typeof (window as any).AndroidNative?.clearLaunchNotificationUrl === 'function') {
      (window as any).AndroidNative.clearLaunchNotificationUrl();
    }
  } catch (e) {}
};
