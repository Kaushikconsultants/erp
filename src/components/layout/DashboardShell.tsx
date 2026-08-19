"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';
import { usePathname } from 'next/navigation';

interface DashboardShellProps {
  children: React.ReactNode;
  showSettings: boolean;
  showAnalytics?: boolean;
  showProcurement?: boolean;
  userRole?: string;
  allowedSections?: string[] | null;
}

export default function DashboardShell({ 
  children, 
  showSettings, 
  showAnalytics = true, 
  showProcurement = false, 
  userRole,
  allowedSections = null
}: DashboardShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Close sidebar on navigation (mobile)
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
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
        allowedSections={allowedSections}
        onClose={() => setIsSidebarOpen(false)} 
      />
      
      <div className="main-wrapper">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
        <main className="main-content">
          {children}
        </main>
      </div>

      {/* Native Android Bottom Navigation Bar */}
      <MobileBottomNav userRole={userRole} allowedSections={allowedSections} />
    </div>
  );
}
