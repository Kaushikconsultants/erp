import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { ShoppingBag, FileText, FileCheck, LogOut, LayoutDashboard, UserCheck } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: "'Inter', -apple-system, sans-serif", display: 'flex', flexDirection: 'column' }}>
      {/* Top Header Navbar */}
      <header style={{ backgroundColor: '#0f172a', borderBottom: '1px solid #1e293b', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '0 24px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
            {/* Logo */}
            <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
              <div style={{ backgroundColor: '#ffffff', padding: '6px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', boxShadow: '0 2px 8px rgba(255,255,255,0.1)' }}>
                <BrandLogo size="sm" showSubtitle={false} />
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', padding: '3px 10px', backgroundColor: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Client Portal
              </span>
            </Link>

            {/* Nav Links */}
            <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', color: '#f8fafc', fontSize: '0.875rem', fontWeight: '600', textDecoration: 'none', transition: 'all 0.2s', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                <LayoutDashboard size={17} style={{ color: '#38bdf8' }} /> Overview
              </Link>
              <Link href="/portal/orders" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none', transition: 'all 0.2s' }}>
                <ShoppingBag size={17} style={{ color: '#818cf8' }} /> My Orders
              </Link>
              <Link href="/portal/invoices" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none', transition: 'all 0.2s' }}>
                <FileText size={17} style={{ color: '#fbbf24' }} /> Invoices & Dues
              </Link>
              <Link href="/portal/quotations" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500', textDecoration: 'none', transition: 'all 0.2s' }}>
                <FileCheck size={17} style={{ color: '#34d399' }} /> Quotes & Proposals
              </Link>
            </nav>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Link 
              href="/api/auth/signout" 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s'
              }}
            >
              <LogOut size={14} /> Exit Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Area */}
      <main style={{ flex: 1, maxWidth: '1280px', width: '100%', margin: '0 auto', padding: '32px 24px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: '#ffffff', borderTop: '1px solid #e2e8f0', padding: '24px 0', textAlign: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        &copy; {new Date().getFullYear()} Heart of Business &bull; Client Self-Service Portal. All rights reserved.
      </footer>
    </div>
  );
}
