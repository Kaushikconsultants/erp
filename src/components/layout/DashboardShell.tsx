"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { usePathname, useRouter } from 'next/navigation';
import { initNativeMobileShell } from '@/lib/capacitor';
import AppLockGuard from '@/components/security/AppLockGuard';
import CallReminderNotifier from '@/components/notifications/CallReminderNotifier';

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
  const pathname = usePathname();
  const router = useRouter();

  // Initialize native Capacitor listeners (Android back button, status bar, splash screen)
  useEffect(() => {
    initNativeMobileShell(() => {
      router.back();
    });
  }, [router]);

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <AppLockGuard>
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
      </div>
    </AppLockGuard>
  );
}
