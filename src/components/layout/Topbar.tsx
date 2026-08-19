"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, User, LogOut, Settings, Menu, Palette } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import NotificationBell from './NotificationBell';
import GlobalSearch from './GlobalSearch';
import ThemeSettingsModal from '@/components/ui/ThemeSettingsModal';
import './Topbar.css';

interface TopbarProps {
  onMenuClick?: () => void;
}

const Topbar = ({ onMenuClick }: TopbarProps) => {
  const { data: session } = useSession();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
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
      <div className="topbar-left">
        <button className="mobile-menu-btn" onClick={onMenuClick}>
          <Menu size={24} />
        </button>
        <GlobalSearch />
      </div>

      <div className="topbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        
        {/* QUICK THEME & APPEARANCE BUTTON */}
        <button
          onClick={() => setIsThemeModalOpen(true)}
          title="Appearance & Theme Settings"
          style={{
            background: 'var(--accent-light, #e0e7ff)',
            border: '1px solid var(--border, #e2e8f0)',
            color: 'var(--accent-primary, #4f46e5)',
            cursor: 'pointer',
            padding: '8px 12px',
            borderRadius: 'var(--radius-md, 8px)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            fontWeight: 600
          }}
        >
          <Palette size={16} />
          <span>Theme</span>
        </button>

        <NotificationBell />
        
        <div className="user-profile-container" ref={dropdownRef}>
          <div 
            className="user-profile hover-lift" 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          >
            <div className="avatar">
              <User size={20} />
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
              </div>
              <div className="dropdown-divider"></div>
              <button 
                className="dropdown-item" 
                onClick={() => { setIsDropdownOpen(false); setIsThemeModalOpen(true); }}
              >
                <Palette size={16} />
                <span>Appearance & Theme</span>
              </button>
              <Link href="/profile" className="dropdown-item" onClick={() => setIsDropdownOpen(false)}>
                <Settings size={16} />
                <span>My Profile</span>
              </Link>
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

      {isThemeModalOpen && (
        <ThemeSettingsModal onClose={() => setIsThemeModalOpen(false)} />
      )}
    </header>
  );
};

export default Topbar;
