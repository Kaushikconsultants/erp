"use client";

import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Menu, PhoneCall, Sparkles, Landmark } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import BranchCompanySwitcher from './BranchCompanySwitcher';
import OnboardingWizardModal from '../onboarding/OnboardingWizardModal';
import { openPhoneDialer } from '@/lib/dialer';
import './Topbar.css';

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || 'Loading...';
  const userRole = (session?.user as any)?.role === 'SUPER_ADMIN' 
    ? 'Super Admin' 
    : (session?.user as any)?.role === 'ADMIN' 
      ? 'Admin' 
      : 'Sales Rep';

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <GlobalSearch />
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Phone Dialer Quick Action */}
        <button
          type="button"
          onClick={() => openPhoneDialer()}
          title="Open Phone Dialer & Lead Tracker"
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: "50%",
            width: "36px",
            height: "36px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(16, 185, 129, 0.35)",
            flexShrink: 0
          }}
        >
          <PhoneCall size={18} color="#fff" />
        </button>

        <NotificationBell />
        
        <div className="user-profile-container" ref={dropdownRef}>
          <div 
            className="user-profile hover-lift" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(session?.user as any)?.avatarUrl || session?.user?.image ? (
                <img
                  src={(session?.user as any)?.avatarUrl || session?.user?.image}
                  alt={userName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <User size={20} />
              )}
            </div>
            <div className="user-info">
              <span className="user-name">{userName}</span>
              <span className="user-role">{userRole}</span>
            </div>
          </div>

          {isDropdownOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <span className="dropdown-name">{userName}</span>
                <span className="dropdown-email">{session?.user?.email}</span>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: '#e0e7ff',
                    color: '#4338ca',
                    display: 'inline-block'
                  }}>
                    {userRole}
                  </span>
                </div>
              </div>

              {/* COMPANY & BRANCH MANAGEMENT SECTION */}
              <BranchCompanySwitcher onCloseDropdown={() => setIsDropdownOpen(false)} />

              <div className="dropdown-divider"></div>

              <Link href="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                <Settings size={16} />
                <span>My Profile</span>
              </Link>
              {session?.user?.email?.toLowerCase() === 'owner@tinkal.in' && (
                <Link 
                  href="/platform-admin" 
                  className="dropdown-item" 
                  onClick={() => setIsDropdownOpen(false)}
                  style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontWeight: 600 }}
                >
                  <Landmark size={16} style={{ color: '#15803d' }} />
                  <span>SaaS Platform Admin (Manage Tenants)</span>
                </Link>
              )}
              {(userRole === 'Super Admin' || userRole === 'Admin') && (
                <button 
                  type="button"
                  className="dropdown-item" 
                  onClick={() => {
                    setIsDropdownOpen(false);
                    setIsOnboardingOpen(true);
                  }}
                  style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', color: '#1e293b' }}
                >
                  <Sparkles size={16} style={{ color: '#4f46e5' }} />
                  <span>ERP Setup Tour</span>
                </button>
              )}
              <button 
                className="dropdown-item text-danger" 
                onClick={() => {
                  setIsDropdownOpen(false);
                  signOut({ callbackUrl: "/login" });
                }}
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isOnboardingOpen && (
        <OnboardingWizardModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
        />
      )}
    </header>
  );
};

export default Topbar;
