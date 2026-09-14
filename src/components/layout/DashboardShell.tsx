"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { usePathname, useRouter } from 'next/navigation';
import { initNativeMobileShell } from '@/lib/capacitor';
import AppLockGuard from '@/components/security/AppLockGuard';
import CallReminderNotifier from '@/components/notifications/CallReminderNotifier';
import PushNotificationManager from '@/components/notifications/PushNotificationManager';
import AppSplashScreen from '../ui/AppSplashScreen';
import GlobalDialerProvider from '@/components/providers/GlobalDialerProvider';
import OnboardingBanner from '@/components/onboarding/OnboardingBanner';

interface DashboardShellProps {
  children: React.ReactNode;
  showSettings: boolean;
  showAnalytics?: boolean;
  showProcurement?: boolean;
  userRole?: string;
  isPlatformOwner?: boolean;
  allowedSections?: string[] | null;
}

export default function DashboardShell({ 
  children, 
  showSettings, 
  showAnalytics = true, 
  showProcurement = false, 
  userRole, 
  isPlatformOwner = false,
  allowedSections = null
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 1. Initialize native Capacitor listeners (Android back button, status bar, splash screen)
  useEffect(() => {
    initNativeMobileShell(() => {
      router.back();
    });
  }, [router]);

  // 2. Hardware back button closes open mobile sidebar
  useEffect(() => {
    if (!isSidebarOpen) return;
    const handleBack = (e: Event) => {
      e.preventDefault();
      setIsSidebarOpen(false);
    };
    window.addEventListener('app-back-button', handleBack);
    return () => window.removeEventListener('app-back-button', handleBack);
  }, [isSidebarOpen]);

  // 3. Floating Android Exit Toast prompt ("Press back again to exit")
  useEffect(() => {
    const handleExitPrompt = () => {
      setShowExitToast(true);
      setTimeout(() => setShowExitToast(false), 2000);
    };
    window.addEventListener('app-exit-prompt', handleExitPrompt);
    return () => window.removeEventListener('app-exit-prompt', handleExitPrompt);
  }, []);

  // 4. Native Notification click deep linking
  useEffect(() => {
    const handleNotifOpen = (e: any) => {
      const url = e.detail?.url;
      if (url) {
        router.push(url);
      }
    };
    window.addEventListener('native-notification-open', handleNotifOpen);

    // Check cold-start launch notification URL
    if (typeof window !== 'undefined' && (window as any).AndroidNative?.getLaunchNotificationUrl) {
      try {
        const launchUrl = (window as any).AndroidNative.getLaunchNotificationUrl();
        if (launchUrl) {
          (window as any).AndroidNative.clearLaunchNotificationUrl?.();
          router.push(launchUrl);
        }
      } catch (e) {}
    }

    return () => window.removeEventListener('native-notification-open', handleNotifOpen);
  }, [router]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <AppLockGuard>
      <GlobalDialerProvider>
        <AppSplashScreen />
        <div className={`app-container ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          {/* Mobile overlay */}
          {isSidebarOpen && (
            <div
              className="sidebar-overlay"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            ></div>
          )}

          <Sidebar
            showSettings={showSettings}
            showAnalytics={showAnalytics}
            showProcurement={showProcurement}
            userRole={userRole}
            isPlatformOwner={isPlatformOwner}
            allowedSections={allowedSections}
            onClose={() => setIsSidebarOpen(false)}
          />

          <div className="main-wrapper">
            <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
            <main className="main-content">
              <OnboardingBanner />
              {children}
            </main>
          </div>

          {/* Native App-Style Bottom Navigation Bar & Action Sheet */}
          <MobileBottomNav
            userRole={userRole}
            allowedSections={allowedSections}
            onMenuClick={() => setIsSidebarOpen(true)}
          />

          {/* Real-time Call Reminders & Notifications Engine */}
          <CallReminderNotifier />
          <PushNotificationManager />

          {/* Android Back-Double-Tap Toast */}
          {showExitToast && (
            <div
              style={{
                position: 'fixed',
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: 'rgba(15, 23, 42, 0.92)',
                color: '#ffffff',
                padding: '8px 18px',
                borderRadius: '20px',
                fontSize: '0.82rem',
                fontWeight: 600,
                zIndex: 999999,
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                pointerEvents: 'none',
                backdropFilter: 'blur(6px)',
                letterSpacing: '0.2px'
              }}
            >
              Press back again to exit
            </div>
          )}
        </div>
      </GlobalDialerProvider>
    </AppLockGuard>
  );
}
