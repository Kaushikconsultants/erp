"use client";
import React, { useState } from 'react';
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
  ScrollText,
  ChevronRight,
  Landmark,
  TrendingUp,
  Clock,
  Scale,
  FolderTree,
  FileText
} from 'lucide-react';
import BrandLogo from '@/components/ui/BrandLogo';
import './Sidebar.css';

interface SidebarProps {
  showSettings?: boolean;
  showAnalytics?: boolean;
  showProcurement?: boolean;
  userRole?: string;
  isPlatformOwner?: boolean;
  allowedSections?: string[] | null;
  onClose?: () => void;
}

const Sidebar = ({ 
  showSettings = false, 
  showAnalytics = true, 
  showProcurement = false, 
  userRole, 
  isPlatformOwner = false,
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
      if (userRole === 'DISPATCH') return ['dashboard', 'dispatches', 'eway_bills', 'eway-bills'].includes(sectionKey);
      if (userRole === 'SALES') return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products'].includes(sectionKey);
      if (userRole === 'HR') return ['dashboard', 'hrms', 'hiring'].includes(sectionKey);
      if (userRole === 'ACCOUNTS') return ['dashboard', 'accounting', 'invoices', 'payments', 'orders', 'hrms', 'purchases', 'procurement', 'reports', 'sales', 'credit_notes', 'credit-notes', 'gst_filing', 'gst-filing', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
      if (userRole === 'WAREHOUSE') return ['dashboard', 'products', 'purchases', 'procurement', 'dispatches', 'eway_bills', 'eway-bills', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
      if (userRole === 'PURCHASE') return ['dashboard', 'purchases', 'procurement', 'products', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
      if (userRole === 'SUPPORT') return ['dashboard', 'customers', 'calls_tasks'].includes(sectionKey);
      return false;
    }
    return (
      allowedSections.includes(sectionKey) ||
      (sectionKey === 'credit_notes' && allowedSections.includes('credit-notes')) ||
      (sectionKey === 'credit-notes' && allowedSections.includes('credit_notes')) ||
      (sectionKey === 'eway_bills' && (allowedSections.includes('eway-bills') || allowedSections.includes('eway'))) ||
      (sectionKey === 'eway-bills' && (allowedSections.includes('eway_bills') || allowedSections.includes('eway'))) ||
      (sectionKey === 'gst_filing' && (allowedSections.includes('gst-filing') || allowedSections.includes('gst') || allowedSections.includes('gst_filings'))) ||
      (sectionKey === 'gst-filing' && (allowedSections.includes('gst_filing') || allowedSections.includes('gst') || allowedSections.includes('gst_filings'))) ||
      (sectionKey === 'delivery_challans' && (allowedSections.includes('delivery-challans') || allowedSections.includes('dispatches'))) ||
      (sectionKey === 'delivery-challans' && (allowedSections.includes('delivery_challans') || allowedSections.includes('dispatches'))) ||
      (sectionKey === 'accounting' && (allowedSections.includes('invoices') || allowedSections.includes('payments') || allowedSections.includes('accounting'))) ||
      (sectionKey === 'purchases' && allowedSections.includes('procurement')) ||
      (sectionKey === 'procurement' && allowedSections.includes('purchases'))
    );
  };

  // Default state: ALL dropdown categories collapsed by default
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({
    crm: false,
    sales: false,
    purchases: false,
    accounting: false,
    hrms: false,
    reports: false
  });

  const toggleCategory = (categoryKey: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryKey]: !prev[categoryKey]
    }));
  };

  // Active state indicators
  const isCrmActive = pathname.startsWith('/customers') || pathname.startsWith('/calls') || pathname.startsWith('/tasks') || pathname.startsWith('/leads') || pathname.startsWith('/follow-ups') || pathname.startsWith('/whatsapp');
  const isSalesActive = pathname.startsWith('/orders') || pathname.startsWith('/quotations') || pathname.startsWith('/invoices') || pathname.startsWith('/credit-notes') || (pathname.startsWith('/payments') && !pathname.startsWith('/payments-made')) || pathname.startsWith('/products') || pathname.startsWith('/dispatches') || pathname.startsWith('/delivery-challans') || pathname.startsWith('/eway-bills');
  const isPurchasesActive = pathname.startsWith('/vendors') || pathname.startsWith('/purchases') || pathname.startsWith('/bills') || pathname.startsWith('/payments-made') || pathname.startsWith('/vendor-credits') || pathname.startsWith('/warehouses');
  const isAccountingActive = pathname.startsWith('/accounting');
  const isHrmsActive = pathname.startsWith('/payroll') || pathname.startsWith('/attendance') || (pathname.startsWith('/expenses') && !isPurchasesActive) || pathname.startsWith('/leaves') || pathname.startsWith('/hiring');
  const isReportsActive = pathname.startsWith('/analytics') || pathname.startsWith('/reports') || pathname.startsWith('/settings/workflows') || pathname.startsWith('/settings/audit-logs') || pathname.startsWith('/gst-filing');

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <Link href="/" onClick={onClose} style={{ textDecoration: 'none' }}>
          <BrandLogo size="md" showSubtitle={true} />
        </Link>
        <button className="mobile-close-btn" onClick={onClose}>×</button>
      </div>
      
      {/* Navigation */}
      <nav className="sidebar-nav">
        
        {/* MAIN SECTION */}
        {canAccess('dashboard') && (
          <div className="nav-section">
            <p className="nav-section-title">MAIN</p>
            <Link href="/" onClick={onClose} className={`nav-item ${isActive('/') ? 'active' : ''}`}>
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </Link>
            <Link href="/broadcasts" onClick={onClose} className={`nav-item ${isActive('/broadcasts') ? 'active' : ''}`}>
              <Megaphone size={18} style={{ color: '#4f46e5' }} />
              <span>Team Notices</span>
              <span style={{ marginLeft: 'auto', background: '#4f46e5', color: '#fff', fontSize: '9px', fontWeight: 700, padding: '2px 5px', borderRadius: '10px' }}>NEW</span>
            </Link>
          </div>
        )}

        {/* 1. CRM & CLIENTS CATEGORY DROPDOWN */}
        {(canAccess('customers') || canAccess('calls_tasks') || canAccess('leads')) && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('crm')}
              className={`category-dropdown-header ${openCategories.crm ? 'is-open' : ''} ${isCrmActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <Users size={18} style={{ color: isCrmActive ? '#4f46e5' : '#64748b' }} />
                <span>CRM & CLIENTS</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.crm && (
              <div className="category-sub-list">
                <Link href="/whatsapp/inbox" onClick={onClose} className={`category-sub-item ${isActive('/whatsapp') ? 'active' : ''}`}>
                  <MessageSquare size={16} style={{ color: '#10b981' }} />
                  <span>WhatsApp Inbox</span>
                  <span style={{ marginLeft: 'auto', background: '#10b981', color: '#fff', fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '8px' }}>CRM</span>
                </Link>

                {canAccess('customers') && (
                  <>
                    <Link href="/customers" onClick={onClose} className={`category-sub-item ${isActive('/customers') ? 'active' : ''}`}>
                      <Users size={16} />
                      <span>Customers</span>
                    </Link>
                    <Link href="/leads" onClick={onClose} className={`category-sub-item ${isActive('/leads') ? 'active' : ''}`}>
                      <TrendingUp size={16} style={{ color: '#8b5cf6' }} />
                      <span>Sales Pipeline (Leads)</span>
                    </Link>
                  </>
                )}

                {canAccess('calls_tasks') && (
                  <>
                    <Link href="/calls" onClick={onClose} className={`category-sub-item ${isActive('/calls') ? 'active' : ''}`}>
                      <PhoneCall size={16} />
                      <span>Calls</span>
                    </Link>
                    <Link href="/follow-ups" onClick={onClose} className={`category-sub-item ${isActive('/follow-ups') ? 'active' : ''}`}>
                      <Clock size={16} style={{ color: '#f59e0b' }} />
                      <span>Follow-ups</span>
                    </Link>
                    <Link href="/tasks" onClick={onClose} className={`category-sub-item ${isActive('/tasks') ? 'active' : ''}`}>
                      <CheckSquare size={16} />
                      <span>Tasks</span>
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. SALES & DISPATCH CATEGORY DROPDOWN */}
        {(canAccess('orders') || canAccess('quotations') || canAccess('invoices') || canAccess('payments') || canAccess('products') || canAccess('dispatches') || canAccess('credit_notes') || canAccess('eway_bills')) && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('sales')}
              className={`category-dropdown-header ${openCategories.sales ? 'is-open' : ''} ${isSalesActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <ShoppingCart size={18} style={{ color: isSalesActive ? '#4f46e5' : '#64748b' }} />
                <span>SALES & DISPATCH</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.sales && (
              <div className="category-sub-list">
                {canAccess('orders') && (
                  <Link href="/orders" onClick={onClose} className={`category-sub-item ${isActive('/orders') ? 'active' : ''}`}>
                    <ShoppingCart size={16} />
                    <span>Sales Orders</span>
                  </Link>
                )}

                {canAccess('quotations') && (
                  <Link href="/quotations" onClick={onClose} className={`category-sub-item ${isActive('/quotations') ? 'active' : ''}`}>
                    <FileSpreadsheet size={16} />
                    <span>Quotations</span>
                  </Link>
                )}

                {canAccess('invoices') && (
                  <Link href="/invoices" onClick={onClose} className={`category-sub-item ${isActive('/invoices') ? 'active' : ''}`}>
                    <Receipt size={16} />
                    <span>Invoices</span>
                  </Link>
                )}

                {canAccess('credit_notes') && (
                  <Link href="/credit-notes" onClick={onClose} className={`category-sub-item ${isActive('/credit-notes') ? 'active' : ''}`}>
                    <FileMinus size={16} style={{ color: '#e11d48' }} />
                    <span>Credit Notes</span>
                  </Link>
                )}

                {canAccess('payments') && (
                  <Link href="/payments" onClick={onClose} className={`category-sub-item ${isActive('/payments') ? 'active' : ''}`}>
                    <Wallet size={16} />
                    <span>Customer Payments</span>
                  </Link>
                )}

                {canAccess('products') && (
                  <Link href="/products" onClick={onClose} className={`category-sub-item ${isActive('/products') ? 'active' : ''}`}>
                    <Package size={16} />
                    <span>Products Catalog</span>
                  </Link>
                )}

                {canAccess('dispatches') && (
                  <Link href="/dispatches" onClick={onClose} className={`category-sub-item ${isActive('/dispatches') ? 'active' : ''}`}>
                    <Truck size={16} />
                    <span>Dispatches</span>
                  </Link>
                )}

                <Link href="/delivery-challans" onClick={onClose} className={`category-sub-item ${isActive('/delivery-challans') ? 'active' : ''}`}>
                  <Truck size={16} style={{ color: '#0284c7' }} />
                  <span>Delivery Challans</span>
                  <span style={{ marginLeft: 'auto', background: '#e0f2fe', color: '#0369a1', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px' }}>DC</span>
                </Link>

                {canAccess('eway_bills') && (
                  <Link href="/eway-bills" onClick={onClose} className={`category-sub-item ${isActive('/eway-bills') ? 'active' : ''}`}>
                    <ScrollText size={16} style={{ color: '#0d9488' }} />
                    <span>E-Way Bills</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* 3. PURCHASES CATEGORY DROPDOWN */}
        {canAccess('purchases') && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('purchases')}
              className={`category-dropdown-header ${openCategories.purchases ? 'is-open' : ''} ${isPurchasesActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <ShoppingBag size={18} style={{ color: isPurchasesActive ? '#2563eb' : '#64748b' }} />
                <span>PURCHASES</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.purchases && (
              <div className="category-sub-list">
                <Link href="/vendors" onClick={onClose} className={`category-sub-item ${isActive('/vendors') ? 'active' : ''}`}>
                  <Building2 size={16} />
                  <span>Vendors</span>
                </Link>
                
                <Link href="/expenses" onClick={onClose} className={`category-sub-item ${isActive('/expenses') ? 'active' : ''}`}>
                  <ClipboardList size={16} />
                  <span>Expenses</span>
                </Link>

                <Link href="/purchases" onClick={onClose} className={`category-sub-item ${isActive('/purchases') ? 'active' : ''}`}>
                  <ShoppingBag size={16} />
                  <span>Purchase Orders</span>
                </Link>

                <Link 
                  href="/bills" 
                  onClick={onClose} 
                  className={`category-sub-item ${isActive('/bills') ? 'active' : ''}`} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <Receipt size={16} style={{ color: '#2563eb' }} />
                    <span>Bills</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-primary)', opacity: 0.9 }}>+</span>
                </Link>

                <Link href="/payments-made" onClick={onClose} className={`category-sub-item ${isActive('/payments-made') ? 'active' : ''}`}>
                  <Banknote size={16} style={{ color: '#059669' }} />
                  <span>Payments Made</span>
                </Link>

                <Link href="/vendor-credits" onClick={onClose} className={`category-sub-item ${isActive('/vendor-credits') ? 'active' : ''}`}>
                  <FileMinus size={16} style={{ color: '#dc2626' }} />
                  <span>Vendor Credits</span>
                </Link>

                <Link href="/warehouses" onClick={onClose} className={`category-sub-item ${isActive('/warehouses') ? 'active' : ''}`}>
                  <Warehouse size={16} />
                  <span>Warehouses</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 4. ACCOUNTING & LEDGERS CATEGORY DROPDOWN */}
        {(canAccess('accounting') || canAccess('invoices') || canAccess('payments') || isSuperOrAdmin) && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('accounting')}
              className={`category-dropdown-header ${openCategories.accounting ? 'is-open' : ''} ${isAccountingActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <Scale size={18} style={{ color: isAccountingActive ? '#4f46e5' : '#64748b' }} />
                <span>ACCOUNTING & LEDGERS</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.accounting && (
              <div className="category-sub-list">
                <Link href="/accounting" onClick={onClose} className={`category-sub-item ${pathname === '/accounting' ? 'active' : ''}`}>
                  <LayoutDashboard size={16} style={{ color: '#4f46e5' }} />
                  <span>Accounting Overview</span>
                </Link>

                <Link href="/accounting/financial-statements" onClick={onClose} className={`category-sub-item ${isActive('/accounting/financial-statements') ? 'active' : ''}`}>
                  <Scale size={16} style={{ color: '#4f46e5' }} />
                  <span>Financial Statements</span>
                  <span style={{ marginLeft: 'auto', background: '#e0e7ff', color: '#4338ca', fontSize: '9px', fontWeight: 700, padding: '1px 5px', borderRadius: '8px' }}>P&L/BS</span>
                </Link>

                <Link href="/accounting/chart-of-accounts" onClick={onClose} className={`category-sub-item ${isActive('/accounting/chart-of-accounts') ? 'active' : ''}`}>
                  <FolderTree size={16} />
                  <span>Chart of Accounts</span>
                </Link>

                <Link href="/accounting/vouchers" onClick={onClose} className={`category-sub-item ${isActive('/accounting/vouchers') ? 'active' : ''}`}>
                  <FileText size={16} style={{ color: '#8b5cf6' }} />
                  <span>Journal Vouchers (JV)</span>
                </Link>

                <Link href="/accounting/ageing" onClick={onClose} className={`category-sub-item ${isActive('/accounting/ageing') ? 'active' : ''}`}>
                  <Clock size={16} style={{ color: '#ea580c' }} />
                  <span>Ageing Analysis (0-90D)</span>
                </Link>

                <Link href="/accounting/bank-reconciliation" onClick={onClose} className={`category-sub-item ${isActive('/accounting/bank-reconciliation') ? 'active' : ''}`}>
                  <Landmark size={16} style={{ color: '#059669' }} />
                  <span>Bank Reconciliation (BRS)</span>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 5. HRMS CATEGORY DROPDOWN */}
        {canAccess('hrms') && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('hrms')}
              className={`category-dropdown-header ${openCategories.hrms ? 'is-open' : ''} ${isHrmsActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <Banknote size={18} style={{ color: isHrmsActive ? '#4f46e5' : '#64748b' }} />
                <span>HRMS</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.hrms && (
              <div className="category-sub-list">
                <Link href="/payroll" onClick={onClose} className={`category-sub-item ${isActive('/payroll') ? 'active' : ''}`}>
                  <Banknote size={16} />
                  <span>Payroll</span>
                </Link>

                <Link href="/attendance" onClick={onClose} className={`category-sub-item ${isActive('/attendance') ? 'active' : ''}`}>
                  <CalendarDays size={16} />
                  <span>Attendance</span>
                </Link>

                <Link href="/expenses" onClick={onClose} className={`category-sub-item ${isActive('/expenses') ? 'active' : ''}`}>
                  <ClipboardList size={16} />
                  <span>Expenses</span>
                </Link>

                <Link href="/leaves" onClick={onClose} className={`category-sub-item ${isActive('/leaves') ? 'active' : ''}`}>
                  <CheckSquare size={16} />
                  <span>Leaves</span>
                </Link>

                {canAccess('hiring') && (
                  <Link href="/hiring" onClick={onClose} className={`category-sub-item ${isActive('/hiring') ? 'active' : ''}`}>
                    <Users size={16} />
                    <span>Hiring & Interviews</span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* 5. REPORTS & INTELLIGENCE CATEGORY DROPDOWN */}
        {canAccess('reports') && (
          <div className="nav-section">
            <button
              type="button"
              onClick={() => toggleCategory('reports')}
              className={`category-dropdown-header ${openCategories.reports ? 'is-open' : ''} ${isReportsActive ? 'has-active-child' : ''}`}
            >
              <div className="category-header-title">
                <BarChart3 size={18} style={{ color: isReportsActive ? '#4f46e5' : '#64748b' }} />
                <span>REPORTS & INTELLIGENCE</span>
              </div>
              <div className="category-chevron">
                <ChevronRight size={15} />
              </div>
            </button>

            {openCategories.reports && (
              <div className="category-sub-list">
                {showAnalytics && (
                  <Link href="/analytics" onClick={onClose} className={`category-sub-item ${isActive('/analytics') ? 'active' : ''}`}>
                    <BarChart3 size={16} />
                    <span>Analytics</span>
                  </Link>
                )}

                <Link href="/reports" onClick={onClose} className={`category-sub-item ${isActive('/reports') ? 'active' : ''}`}>
                  <FileSpreadsheet size={16} />
                  <span>Reports Center</span>
                </Link>

                {canAccess('gst_filing') && (
                  <Link href="/gst-filing" onClick={onClose} className={`category-sub-item ${isActive('/gst-filing') ? 'active' : ''}`}>
                    <Landmark size={16} style={{ color: '#2563eb' }} />
                    <span>GST Filing & Compliances</span>
                    <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#2563eb', fontSize: '9px', fontWeight: 600, padding: '1px 5px', borderRadius: '8px' }}>GSTN</span>
                  </Link>
                )}

                <Link href="/settings/workflows" onClick={onClose} className={`category-sub-item ${isActive('/settings/workflows') ? 'active' : ''}`}>
                  <Zap size={16} />
                  <span>AI Workflows</span>
                </Link>

                <Link href="/settings/audit-logs" onClick={onClose} className={`category-sub-item ${isActive('/settings/audit-logs') ? 'active' : ''}`}>
                  <ShieldCheck size={16} />
                  <span>Audit Logs</span>
                </Link>
              </div>
            )}
          </div>
        )}

      </nav>

      {/* SETTINGS & BILLING FOOTER */}
      {(showSettings || canAccess('settings')) && (
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <Link href="/settings" onClick={onClose} className={`nav-item ${isActive('/settings') && !isActive('/settings/billing') ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Settings</span>
          </Link>
          <Link href="/settings/billing" onClick={onClose} className={`nav-item ${isActive('/settings/billing') ? 'active' : ''}`}>
            <Receipt size={18} style={{ color: '#059669' }} />
            <span>Subscription & Billing</span>
          </Link>
          {isPlatformOwner && (
            <Link href="/platform-admin" onClick={onClose} className={`nav-item ${isActive('/platform-admin') ? 'active' : ''}`}>
              <Landmark size={18} style={{ color: '#4f46e5' }} />
              <span>SaaS Platform Admin</span>
            </Link>
          )}
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
