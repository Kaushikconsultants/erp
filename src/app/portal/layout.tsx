import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { ShoppingBag, FileText, FileCheck, LogOut, LayoutDashboard } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
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
              <Link href="/portal" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', backgroundColor: '#4f46e5', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', textDecoration: 'none', boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)' }}>
                <LayoutDashboard size={16} /> Overview
              </Link>
              <Link href="/portal/orders" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', color: '#475569', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', transition: 'background-color 0.15s' }}>
                <ShoppingBag size={16} style={{ color: '#6366f1' }} /> My Orders
              </Link>
              <Link href="/portal/invoices" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', color: '#475569', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', transition: 'background-color 0.15s' }}>
                <FileText size={16} style={{ color: '#d97706' }} /> Invoices & Dues
              </Link>
              <Link href="/portal/quotations" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '10px', color: '#475569', fontSize: '0.85rem', fontWeight: '600', textDecoration: 'none', transition: 'background-color 0.15s' }}>
                <FileCheck size={16} style={{ color: '#059669' }} /> Quotes & Proposals
              </Link>
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
        &copy; {new Date().getFullYear()} Heart of Business &bull; Client Self-Service Portal. All rights reserved.
      </footer>
    </div>
  );
}
