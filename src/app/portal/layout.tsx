import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";
import { ShoppingBag, FileText, FileCheck, LogOut, LayoutDashboard } from "lucide-react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/portal" className="flex items-center gap-2">
              <BrandLogo size="sm" showSubtitle={false} />
              <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md">
                Client Portal
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/portal" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5">
                <LayoutDashboard size={16} /> Overview
              </Link>
              <Link href="/portal/orders" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5">
                <ShoppingBag size={16} /> My Orders
              </Link>
              <Link href="/portal/invoices" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5">
                <FileText size={16} /> Invoices & Dues
              </Link>
              <Link href="/portal/quotations" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition flex items-center gap-1.5">
                <FileCheck size={16} /> Quotes & Proposals
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <Link 
              href="/api/auth/signout" 
              className="text-xs font-semibold text-slate-600 hover:text-red-600 flex items-center gap-1 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition"
            >
              <LogOut size={14} /> Sign Out
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Client Self-Service Portal. All rights reserved.
      </footer>
    </div>
  );
}
