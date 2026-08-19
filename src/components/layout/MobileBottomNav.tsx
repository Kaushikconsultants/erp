"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  FileSpreadsheet, 
  Settings 
} from 'lucide-react';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  userRole?: string;
  allowedSections?: string[] | null;
}

export default function MobileBottomNav({ userRole, allowedSections }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const canAccess = (sectionKey: string): boolean => {
    if (isSuperOrAdmin) return true;
    if (!allowedSections || allowedSections.length === 0) return true;
    return allowedSections.includes(sectionKey);
  };

  return (
    <nav className="mobile-bottom-nav">
      {canAccess('dashboard') && (
        <Link href="/" className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}>
          <div className="bottom-nav-icon">
            <LayoutDashboard size={20} />
          </div>
          <span className="bottom-nav-label">Home</span>
        </Link>
      )}

      {canAccess('customers') && (
        <Link href="/customers" className={`bottom-nav-item ${isActive('/customers') ? 'active' : ''}`}>
          <div className="bottom-nav-icon">
            <Users size={20} />
          </div>
          <span className="bottom-nav-label">CRM</span>
        </Link>
      )}

      {canAccess('orders') && (
        <Link href="/orders" className={`bottom-nav-item ${isActive('/orders') ? 'active' : ''}`}>
          <div className="bottom-nav-icon">
            <ShoppingCart size={20} />
          </div>
          <span className="bottom-nav-label">Orders</span>
        </Link>
      )}

      {canAccess('quotations') && (
        <Link href="/quotations" className={`bottom-nav-item ${isActive('/quotations') ? 'active' : ''}`}>
          <div className="bottom-nav-icon">
            <FileSpreadsheet size={20} />
          </div>
          <span className="bottom-nav-label">Quotes</span>
        </Link>
      )}

      {canAccess('settings') && (
        <Link href="/settings" className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}>
          <div className="bottom-nav-icon">
            <Settings size={20} />
          </div>
          <span className="bottom-nav-label">Settings</span>
        </Link>
      )}
    </nav>
  );
}
