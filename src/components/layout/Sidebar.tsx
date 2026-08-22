"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  PhoneCall, 
  ShoppingCart, 
  Package, 
  BarChart3, 
  Settings,
  CheckSquare,
  Banknote,
  Truck,
  FileSpreadsheet,
  ShoppingBag,
  Warehouse,
  Building2,
  Receipt,
  Wallet,
  ClipboardList,
  CalendarDays,
  ShieldCheck,
  Zap,
  MessageSquare,
  Megaphone,
  FileMinus,
  ScrollText
} from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import './Sidebar.css';

interface SidebarProps {
  showSettings?: boolean;
  showAnalytics?: boolean;
  showProcurement?: boolean;
  userRole?: string;
  allowedSections?: string[] | null;
  onClose?: () => void;
}

const Sidebar = ({ 
  showSettings = false, 
  showAnalytics = true, 
  showProcurement = false, 
  userRole, 
  allowedSections = null,
  onClose 
}: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };

  const isSuperOrAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const canAccess = (sectionKey: string): boolean => {
    if (isSuperOrAdmin) return true;
    if (!allowedSections || allowedSections.length === 0) {
      // Default Role Fallbacks if no custom allowedSections specified
      if (userRole === 'DISPATCH') return ['dispatches'].includes(sectionKey);
      if (userRole === 'SALES') return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products'].includes(sectionKey);
      if (userRole === 'HR') return ['dashboard', 'hrms'].includes(sectionKey);
      if (userRole === 'ACCOUNTS') return ['dashboard', 'invoices', 'payments', 'orders', 'hrms'].includes(sectionKey);
      if (userRole === 'WAREHOUSE') return ['dashboard', 'products', 'procurement', 'dispatches'].includes(sectionKey);
      if (userRole === 'PURCHASE') return ['dashboard', 'procurement', 'products'].includes(sectionKey);
      if (userRole === 'SUPPORT') return ['dashboard', 'customers', 'calls_tasks'].includes(sectionKey);
      return true;
    }
    return allowedSections.includes(sectionKey);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" onClick={onClose} style={{ textDecoration: 'none' }}>
          <BrandLogo size="md" showSubtitle={true} />
        </Link>
        <button className="mobile-close-btn" onClick={onClose}>×</button>
      </div>
      
      <nav className="sidebar-nav">
        {/* MAIN SECTION */}
        {canAccess('dashboard') && (
          <div className="nav-section">
            <p className="nav-section-title">MAIN</p>
            <Link href="/" onClick={onClose} className={`nav-item ${isActive('/') ? 'active' : ''}`}>
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </Link>
            <Link href="/broadcasts" onClick={onClose} className={`nav-item ${isActive('/broadcasts') ? 'active' : ''}`}>
              <Megaphone size={20} style={{ color: '#4f46e5' }} />
              <span>Team Notices</span>
              <span style={{ marginLeft: 'auto', background: '#4f46e5', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '10px' }}>NEW</span>
            </Link>
          </div>
        )}

        {/* WHATSAPP PLATFORM SECTION */}
        <div className="nav-section">
          <p className="nav-section-title">WHATSAPP AUTOMATION</p>
          <Link href="/whatsapp/inbox" onClick={onClose} className={`nav-item ${isActive('/whatsapp') ? 'active' : ''}`}>
            <MessageSquare size={20} style={{ color: '#10b981' }} />
            <span>WhatsApp Inbox</span>
            <span style={{ marginLeft: 'auto', background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 600, padding: '2px 6px', borderRadius: '10px' }}>CRM</span>
          </Link>
        </div>

        {/* CRM SECTION */}
        {(canAccess('customers') || canAccess('calls_tasks')) && (
          <div className="nav-section">
            <p className="nav-section-title">CRM & CLIENTS</p>
            {canAccess('customers') && (
              <Link href="/customers" onClick={onClose} className={`nav-item ${isActive('/customers') ? 'active' : ''}`}>
                <Users size={20} />
                <span>Customers</span>
              </Link>
            )}
            {canAccess('calls_tasks') && (
              <>
                <Link href="/calls" onClick={onClose} className={`nav-item ${isActive('/calls') ? 'active' : ''}`}>
                  <PhoneCall size={20} />
                  <span>Calls & Follow-ups</span>
                </Link>
                <Link href="/tasks" onClick={onClose} className={`nav-item ${isActive('/tasks') ? 'active' : ''}`}>
                  <CheckSquare size={20} />
                  <span>Tasks</span>
                </Link>
              </>
            )}
          </div>
        )}

        {/* SALES SECTION */}
        {(canAccess('orders') || canAccess('quotations') || canAccess('invoices') || canAccess('payments') || canAccess('products') || canAccess('dispatches')) && (
          <div className="nav-section">
            <p className="nav-section-title">SALES & DISPATCH</p>
            {canAccess('orders') && (
              <Link href="/orders" onClick={onClose} className={`nav-item ${isActive('/orders') ? 'active' : ''}`}>
                <ShoppingCart size={20} />
                <span>Orders</span>
              </Link>
            )}
            {canAccess('quotations') && (
              <Link href="/quotations" onClick={onClose} className={`nav-item ${isActive('/quotations') ? 'active' : ''}`}>
                <FileSpreadsheet size={20} />
                <span>Quotations</span>
              </Link>
            )}
            {canAccess('invoices') && (
              <Link href="/invoices" onClick={onClose} className={`nav-item ${isActive('/invoices') ? 'active' : ''}`}>
                <Receipt size={20} />
                <span>Invoices</span>
              </Link>
            )}
            {(canAccess('credit_notes') || canAccess('invoices') || canAccess('orders')) && (
              <Link href="/credit-notes" onClick={onClose} className={`nav-item ${isActive('/credit-notes') ? 'active' : ''}`}>
                <FileMinus size={20} style={{ color: '#e11d48' }} />
                <span>Credit Notes</span>
              </Link>
            )}
            {canAccess('payments') && (
              <Link href="/payments" onClick={onClose} className={`nav-item ${isActive('/payments') ? 'active' : ''}`}>
                <Wallet size={20} />
                <span>Payments</span>
              </Link>
            )}
            {canAccess('products') && (
              <Link href="/products" onClick={onClose} className={`nav-item ${isActive('/products') ? 'active' : ''}`}>
                <Package size={20} />
                <span>Products</span>
              </Link>
            )}
            {canAccess('dispatches') && (
              <Link href="/dispatches" onClick={onClose} className={`nav-item ${isActive('/dispatches') ? 'active' : ''}`}>
                <Truck size={20} />
                <span>Dispatches</span>
              </Link>
            )}
            {(canAccess('eway_bills') || canAccess('dispatches') || canAccess('orders')) && (
              <Link href="/eway-bills" onClick={onClose} className={`nav-item ${isActive('/eway-bills') ? 'active' : ''}`}>
                <ScrollText size={20} style={{ color: '#0d9488' }} />
                <span>E-Way Bills</span>
              </Link>
            )}
          </div>
        )}

        {/* PROCUREMENT SECTION */}
        {(showProcurement || canAccess('procurement')) && canAccess('procurement') && (
          <div className="nav-section">
            <p className="nav-section-title">PROCUREMENT</p>
            <Link href="/vendors" onClick={onClose} className={`nav-item ${isActive('/vendors') ? 'active' : ''}`}>
              <Building2 size={20} />
              <span>Vendors</span>
            </Link>
            <Link href="/purchases" onClick={onClose} className={`nav-item ${isActive('/purchases') ? 'active' : ''}`}>
              <ShoppingBag size={20} />
              <span>Purchase Orders</span>
            </Link>
            <Link href="/warehouses" onClick={onClose} className={`nav-item ${isActive('/warehouses') ? 'active' : ''}`}>
              <Warehouse size={20} />
              <span>Warehouses</span>
            </Link>
          </div>
        )}

        {/* HRMS SECTION */}
        {canAccess('hrms') && (
          <div className="nav-section">
            <p className="nav-section-title">HRMS</p>
            <Link href="/payroll" onClick={onClose} className={`nav-item ${isActive('/payroll') ? 'active' : ''}`}>
              <Banknote size={20} />
              <span>Payroll</span>
            </Link>
            <Link href="/attendance" onClick={onClose} className={`nav-item ${isActive('/attendance') ? 'active' : ''}`}>
              <CalendarDays size={20} />
              <span>Attendance</span>
            </Link>
            <Link href="/expenses" onClick={onClose} className={`nav-item ${isActive('/expenses') ? 'active' : ''}`}>
              <ClipboardList size={20} />
              <span>Expenses</span>
            </Link>
            <Link href="/leaves" onClick={onClose} className={`nav-item ${isActive('/leaves') ? 'active' : ''}`}>
              <CheckSquare size={20} />
              <span>Leaves</span>
            </Link>
            <Link href="/hiring" onClick={onClose} className={`nav-item ${isActive('/hiring') ? 'active' : ''}`}>
              <Users size={20} />
              <span>Hiring & Interviews</span>
            </Link>
          </div>
        )}

        {/* REPORTS & ANALYTICS SECTION */}
        {canAccess('reports') && (
          <div className="nav-section">
            <p className="nav-section-title">REPORTS & INTELLIGENCE</p>
            {showAnalytics && (
              <Link href="/analytics" onClick={onClose} className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
                <BarChart3 size={20} />
                <span>Analytics</span>
              </Link>
            )}
            <Link href="/reports" onClick={onClose} className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
              <FileSpreadsheet size={20} />
              <span>Reports Center</span>
            </Link>
            <Link href="/settings/workflows" onClick={onClose} className={`nav-item ${isActive('/settings/workflows') ? 'active' : ''}`}>
              <Zap size={20} />
              <span>AI Workflows</span>
            </Link>
            <Link href="/settings/audit-logs" onClick={onClose} className={`nav-item ${isActive('/settings/audit-logs') ? 'active' : ''}`}>
              <ShieldCheck size={20} />
              <span>Audit Logs</span>
            </Link>
          </div>
        )}
      </nav>

      {/* SETTINGS FOOTER */}
      {(showSettings || canAccess('settings')) && canAccess('settings') && (
        <div className="sidebar-footer">
          <Link href="/settings" onClick={onClose} className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings & Admin</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
