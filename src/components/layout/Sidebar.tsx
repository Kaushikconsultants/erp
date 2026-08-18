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
  ShieldCheck
} from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import './Sidebar.css';

interface SidebarProps {
  showSettings?: boolean;
  showAnalytics?: boolean;
  showProcurement?: boolean;
  userRole?: string;
  onClose?: () => void;
}

const Sidebar = ({ showSettings = false, showAnalytics = true, showProcurement = false, userRole, onClose }: SidebarProps) => {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/' && pathname !== '/') return false;
    return pathname.startsWith(path);
  };
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <Link href="/" style={{ textDecoration: 'none' }}>
          <BrandLogo size="md" showSubtitle={true} />
        </Link>
        <button className="mobile-close-btn" onClick={onClose}>×</button>
      </div>
      
      {userRole === 'DISPATCH' ? (
        <nav className="sidebar-nav">
          <div className="nav-section">
            <p className="nav-section-title">DISPATCH PIPELINE</p>
            <Link href="/dispatches" className={`nav-item ${isActive('/dispatches') ? 'active' : ''}`}>
              <Truck size={20} />
              <span>Dispatches Board</span>
            </Link>
          </div>
        </nav>
      ) : (
        <nav className="sidebar-nav">
          <div className="nav-section">
          <p className="nav-section-title">MAIN</p>
          <Link href="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
        </div>

        <div className="nav-section">
          <p className="nav-section-title">CRM</p>
          <Link href="/customers" className={`nav-item ${isActive('/customers') ? 'active' : ''}`}>
            <Users size={20} />
            <span>Customers</span>
          </Link>
          <Link href="/calls" className={`nav-item ${isActive('/calls') ? 'active' : ''}`}>
            <PhoneCall size={20} />
            <span>Calls & Follow-ups</span>
          </Link>
          <Link href="/tasks" className={`nav-item ${isActive('/tasks') ? 'active' : ''}`}>
            <CheckSquare size={20} />
            <span>Tasks</span>
          </Link>
        </div>

        <div className="nav-section">
          <p className="nav-section-title">SALES</p>
          <Link href="/orders" className={`nav-item ${isActive('/orders') ? 'active' : ''}`}>
            <ShoppingCart size={20} />
            <span>Orders</span>
          </Link>
          <Link href="/quotations" className={`nav-item ${isActive('/quotations') ? 'active' : ''}`}>
            <FileSpreadsheet size={20} />
            <span>Quotations</span>
          </Link>
          <Link href="/invoices" className={`nav-item ${isActive('/invoices') ? 'active' : ''}`}>
            <Receipt size={20} />
            <span>Invoices</span>
          </Link>
          <Link href="/payments" className={`nav-item ${isActive('/payments') ? 'active' : ''}`}>
            <Wallet size={20} />
            <span>Payments</span>
          </Link>
          <Link href="/products" className={`nav-item ${isActive('/products') ? 'active' : ''}`}>
            <Package size={20} />
            <span>Products</span>
          </Link>
          <Link href="/dispatches" className={`nav-item ${isActive('/dispatches') ? 'active' : ''}`}>
            <Truck size={20} />
            <span>Dispatches</span>
          </Link>
        </div>

        {showProcurement && (
          <div className="nav-section">
            <p className="nav-section-title">PROCUREMENT</p>
            <Link href="/vendors" className={`nav-item ${isActive('/vendors') ? 'active' : ''}`}>
              <Building2 size={20} />
              <span>Vendors</span>
            </Link>
            <Link href="/purchases" className={`nav-item ${isActive('/purchases') ? 'active' : ''}`}>
              <ShoppingBag size={20} />
              <span>Purchase Orders</span>
            </Link>
            <Link href="/warehouses" className={`nav-item ${isActive('/warehouses') ? 'active' : ''}`}>
              <Warehouse size={20} />
              <span>Warehouses</span>
            </Link>
          </div>
        )}

        <div className="nav-section">
          <p className="nav-section-title">HRMS</p>
          <Link href="/payroll" className={`nav-item ${isActive('/payroll') ? 'active' : ''}`}>
            <Banknote size={20} />
            <span>Payroll</span>
          </Link>
          <Link href="/attendance" className={`nav-item ${isActive('/attendance') ? 'active' : ''}`}>
            <CalendarDays size={20} />
            <span>Attendance</span>
          </Link>
          <Link href="/expenses" className={`nav-item ${isActive('/expenses') ? 'active' : ''}`}>
            <ClipboardList size={20} />
            <span>Expenses</span>
          </Link>
          <Link href="/leaves" className={`nav-item ${isActive('/leaves') ? 'active' : ''}`}>
            <CheckSquare size={20} />
            <span>Leaves</span>
          </Link>
        </div>

        <div className={`nav-section ${userRole === 'DISPATCH' ? 'hidden' : ''}`}>
          <p className="nav-section-title">REPORTS</p>
          {showAnalytics && (
            <Link href="/analytics" className={`nav-item ${isActive('/analytics') ? 'active' : ''}`}>
              <BarChart3 size={20} />
              <span>Analytics</span>
            </Link>
          )}
          <Link href="/reports" className={`nav-item ${isActive('/reports') ? 'active' : ''}`}>
            <FileSpreadsheet size={20} />
            <span>Reports Center</span>
          </Link>
          <Link href="/settings/audit-logs" className={`nav-item ${isActive('/settings/audit-logs') ? 'active' : ''}`}>
            <ShieldCheck size={20} />
            <span>Audit Logs</span>
          </Link>
        </div>
      </nav>
      )}

      {showSettings && userRole !== 'DISPATCH' && (
        <div className="sidebar-footer">
          <Link href="/settings" className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <Settings size={20} />
            <span>Settings</span>
          </Link>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
