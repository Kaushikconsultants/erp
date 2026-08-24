"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandLogo from "@/components/ui/BrandLogo";
import { ShoppingBag, FileText, FileCheck, LogOut, LayoutDashboard } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/portal", label: "Overview", icon: LayoutDashboard, exact: true },
    { href: "/portal/orders", label: "My Orders", icon: ShoppingBag },
    { href: "/portal/invoices", label: "Invoices & Dues", icon: FileText },
    { href: "/portal/quotations", label: "Quotes & Proposals", icon: FileCheck },
  ];

  const isLinkActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      
      {/* Crisp White Top Navbar - Matched with CRM Software Theme */}
      <header style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '66px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {/* Logo */}
            <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <BrandLogo size="sm" showSubtitle={false} />
              <span style={{ fontSize: '0.7rem', fontWeight: '800', padding: '3px 10px', backgroundColor: '#e0e7ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Client Portal
              </span>
            </Link>

            {/* Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {navLinks.map((item) => {
                const IconComponent = item.icon;
                const active = isLinkActive(item.href, item.exact);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      backgroundColor: active ? '#4f46e5' : 'transparent',
                      color: active ? '#ffffff' : '#475569',
                      fontSize: '0.85rem',
                      fontWeight: active ? '700' : '600',
                      textDecoration: 'none',
                      boxShadow: active ? '0 2px 6px rgba(79, 70, 229, 0.2)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <IconComponent size={16} style={{ color: active ? '#ffffff' : '#64748b' }} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link 
              href="/" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textDecoration: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              <LogOut size={14} /> Exit Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '20px 0', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        &copy; {new Date().getFullYear()} Client Self-Service Portal. All rights reserved.
      </footer>
    </div>
  );
}
