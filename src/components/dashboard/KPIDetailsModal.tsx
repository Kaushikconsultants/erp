"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Filter, 
  TrendingUp, 
  Package, 
  Users, 
  CalendarClock, 
  Search,
  User,
  Phone,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  FileText
} from 'lucide-react';
import { getKPIDetails } from '@/app/actions/adminActions';
import './kpi-details-modal.css';

interface KPIDetailsModalProps {
  type: 'revenue' | 'orders' | 'customers' | 'calls' | null;
  onClose: () => void;
}

export default function KPIDetailsModal({ type, onClose }: KPIDetailsModalProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!type) return;
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getKPIDetails(type, timeRange);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setData([]);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [type, timeRange]);

  // Lock background scroll when modal is open
  useEffect(() => {
    if (type) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [type]);

  // Filtered dataset by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase().trim();

    if (type === 'customers') {
      return data.filter(c => 
        (c.businessName || '').toLowerCase().includes(q) ||
        (c.contactPerson || '').toLowerCase().includes(q) ||
        (c.mobile || '').includes(q) ||
        (c.status || '').toLowerCase().includes(q)
      );
    }

    if (type === 'orders' || type === 'revenue') {
      return data.filter(o => 
        (o.orderNumber || '').toLowerCase().includes(q) ||
        (o.customer?.businessName || '').toLowerCase().includes(q) ||
        (o.customer?.contactPerson || '').toLowerCase().includes(q) ||
        (o.salesperson?.user?.name || o.salesperson?.name || '').toLowerCase().includes(q)
      );
    }

    if (type === 'calls') {
      return data.filter(c => {
        const name = (c.customer?.businessName || c.lead?.shopName || c.lead?.name || '').toLowerCase();
        const rep = (c.employee?.user?.name || '').toLowerCase();
        const outcome = (c.outcome || '').toLowerCase();
        return name.includes(q) || rep.includes(q) || outcome.includes(q);
      });
    }

    return data;
  }, [data, searchQuery, type]);

  if (!type) return null;

  // Header configuration based on the 4 dashboard KPI sections
  const getHeaderConfig = () => {
    switch (type) {
      case 'revenue':
        return {
          title: 'Revenue MTD Details',
          subtitle: 'Live sales revenue, fulfilled orders & confirmed quotations',
          icon: <TrendingUp size={20} color="#059669" />,
          pillBg: '#ecfdf5',
          bannerTheme: 'emerald'
        };
      case 'orders':
        return {
          title: 'Order & Deal Details',
          subtitle: 'All processed sales orders & active confirmed quotes',
          icon: <Package size={20} color="#2563eb" />,
          pillBg: '#eff6ff',
          bannerTheme: 'blue'
        };
      case 'customers':
        return {
          title: 'B2B Client Details',
          subtitle: 'Customer accounts directory, relationship tier & statuses',
          icon: <Users size={20} color="#7c3aed" />,
          pillBg: '#f5f3ff',
          bannerTheme: 'purple'
        };
      case 'calls':
        return {
          title: 'Pending Follow-ups Details',
          subtitle: 'Scheduled telecalling client touchpoints & follow-up queue',
          icon: <CalendarClock size={20} color="#dc2626" />,
          pillBg: '#fef2f2',
          bannerTheme: 'rose'
        };
    }
  };

  const config = getHeaderConfig();

  // Summary Banner Calculation
  const renderSummaryBanner = () => {
    if (type === 'revenue' || type === 'orders') {
      const totalVal = data.reduce((sum, o) => sum + Number(o.totalValue || 0), 0);
      const roundedVal = Math.round(totalVal);
      const avgDeal = data.length > 0 ? Math.round(totalVal / data.length) : 0;

      return (
        <div className={`kpi-summary-banner ${config.bannerTheme}`}>
          <div className="kpi-summary-item">
            <span className="kpi-summary-title">
              {type === 'revenue' ? 'Total Inflow Revenue' : 'Total Order Volume'}
            </span>
            <span className={`kpi-summary-val ${type === 'revenue' ? 'emerald' : 'blue'}`}>
              ₹{roundedVal.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="kpi-summary-item" style={{ textAlign: 'right' }}>
            <span className="kpi-summary-title">Total Deals / Orders</span>
            <span className="kpi-summary-val" style={{ color: '#0f172a' }}>
              {data.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>({avgDeal > 0 ? `Avg ₹${avgDeal.toLocaleString('en-IN')}` : 'records'})</span>
            </span>
          </div>
        </div>
      );
    }

    if (type === 'customers') {
      const activeCount = data.filter(c => (c.status || '').toLowerCase() === 'active').length;
      const newCount = data.filter(c => (c.status || '').toLowerCase() === 'new').length;

      return (
        <div className={`kpi-summary-banner ${config.bannerTheme}`}>
          <div className="kpi-summary-item">
            <span className="kpi-summary-title">Total B2B Accounts</span>
            <span className="kpi-summary-val" style={{ color: '#7c3aed' }}>
              {data.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Clients</span>
            </span>
          </div>
          <div className="kpi-summary-item" style={{ textAlign: 'right' }}>
            <span className="kpi-summary-title">Account Breakdown</span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <span className="kpi-badge active">{activeCount} Active</span>
              <span className="kpi-badge lead">{newCount} New</span>
            </div>
          </div>
        </div>
      );
    }

    if (type === 'calls') {
      return (
        <div className={`kpi-summary-banner ${config.bannerTheme}`}>
          <div className="kpi-summary-item">
            <span className="kpi-summary-title">Pending Follow-ups Queue</span>
            <span className="kpi-summary-val" style={{ color: data.length > 0 ? '#dc2626' : '#059669' }}>
              {data.length} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>Calls Due</span>
            </span>
          </div>
          <div className="kpi-summary-item" style={{ textAlign: 'right' }}>
            <span className="kpi-summary-title">Status</span>
            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: data.length > 0 ? '#dc2626' : '#059669', marginTop: '3px' }}>
              {data.length > 0 ? '⚠️ Action Required' : '✅ Queue Cleared'}
            </span>
          </div>
        </div>
      );
    }

    return null;
  };

  // Helper for status badge styling
  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'active') return <span className="kpi-badge active">Active</span>;
    if (s === 'new') return <span className="kpi-badge new">New</span>;
    if (s === 'opportunity') return <span className="kpi-badge opportunity">Opportunity</span>;
    return <span className="kpi-badge lead">{status || 'Contact'}</span>;
  };

  // Helper for outcome badge styling
  const getOutcomeBadge = (outcome: string) => {
    const o = (outcome || '').toLowerCase();
    if (o.includes('interested') || o.includes('follow-up') || o.includes('needed')) {
      return <span className="kpi-badge outcome-amber">Interested / Follow-up</span>;
    }
    if (o.includes('busy') || o.includes('no answer') || o.includes('declined') || o.includes('not connected')) {
      return <span className="kpi-badge outcome-rose">{outcome}</span>;
    }
    return <span className="kpi-badge outcome-slate">{outcome || 'Pending'}</span>;
  };

  // Render Content List / Table
  const renderDataContent = () => {
    if (isLoading) {
      return (
        <div className="kpi-empty-box">
          <Clock size={28} className="animate-spin" color="#64748b" />
          <p>Loading real-time records...</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="kpi-empty-box">
          <FileText size={32} color="#94a3b8" />
          <p>{searchQuery ? 'No matching records found for this query.' : 'No records found for this time range.'}</p>
        </div>
      );
    }

    // ─────────────────────────────────────────────────────────
    // SECTION 1 & 2: REVENUE MTD & ORDERS
    // ─────────────────────────────────────────────────────────
    if (type === 'revenue' || type === 'orders') {
      return (
        <>
          {/* Mobile Card Layout: 100% Screen-Aligned, No Text Truncation */}
          <div className="kpi-mobile-list">
            {filteredData.map(o => {
              const repName = o.salesperson?.user?.name || o.salesperson?.name || o.customer?.assignedSalesperson?.user?.name || 'Unassigned';
              const dateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';
              const val = Math.round(Number(o.totalValue || 0));

              return (
                <div key={o.id} className="kpi-mobile-card">
                  <div className="kpi-card-row-top">
                    <div className="kpi-card-main-title">
                      <span>{o.orderNumber}</span>
                      {o.isQuotation && <span className="kpi-badge quote">Quote</span>}
                    </div>
                    <span className="kpi-card-right-val" style={{ color: '#059669' }}>
                      ₹{val.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="kpi-card-row-bottom">
                    <span className="kpi-card-meta-text">
                      <User size={13} color="#94a3b8" />
                      <strong>{o.customer?.businessName || o.customer?.contactPerson || 'Customer'}</strong>
                    </span>
                    <span className="kpi-card-right-date">
                      {repName} • {dateStr}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View: Wide & Roomy */}
          <div className="kpi-desktop-table-container">
            <table className="kpi-data-table">
              <thead>
                <tr>
                  <th>Order / Deal #</th>
                  <th>Customer</th>
                  <th>Assigned Sales Rep</th>
                  <th style={{ textAlign: 'right' }}>Total Value</th>
                  <th style={{ textAlign: 'right' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(o => {
                  const repName = o.salesperson?.user?.name || o.salesperson?.name || o.customer?.assignedSalesperson?.user?.name || 'Unassigned';
                  const dateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                  const val = Math.round(Number(o.totalValue || 0));

                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>
                        {o.orderNumber}
                        {o.isQuotation && <span className="kpi-badge quote" style={{ marginLeft: '6px' }}>Quote</span>}
                      </td>
                      <td style={{ fontWeight: 500 }}>{o.customer?.businessName || o.customer?.contactPerson || 'Unknown'}</td>
                      <td style={{ color: '#64748b' }}>{repName}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#059669' }}>
                        ₹{val.toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'right', color: '#64748b' }}>{dateStr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    // ─────────────────────────────────────────────────────────
    // SECTION 3: B2B CLIENTS / CUSTOMERS
    // ─────────────────────────────────────────────────────────
    if (type === 'customers') {
      return (
        <>
          {/* Mobile Card Layout */}
          <div className="kpi-mobile-list">
            {filteredData.map(c => {
              const name = c.businessName || c.contactPerson || 'Client Account';
              const contactInfo = c.contactPerson ? `${c.contactPerson} (${c.mobile || '-'})` : (c.mobile || '-');
              const dateStr = c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '-';

              return (
                <div key={c.id} className="kpi-mobile-card">
                  <div className="kpi-card-row-top">
                    <span className="kpi-card-main-title">{name}</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <div className="kpi-card-row-bottom">
                    <span className="kpi-card-meta-text">
                      <Phone size={12} color="#94a3b8" />
                      <span>{contactInfo}</span>
                    </span>
                    <span className="kpi-card-right-date">Added {dateStr}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="kpi-desktop-table-container">
            <table className="kpi-data-table">
              <thead>
                <tr>
                  <th>Company / Business</th>
                  <th>Primary Contact</th>
                  <th>Relationship Status</th>
                  <th style={{ textAlign: 'right' }}>Joined Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredData.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.businessName || 'Unnamed'}</td>
                    <td>{c.contactPerson || '-'} {c.mobile ? `(${c.mobile})` : ''}</td>
                    <td>{getStatusBadge(c.status)}</td>
                    <td style={{ textAlign: 'right', color: '#64748b' }}>
                      {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    // ─────────────────────────────────────────────────────────
    // SECTION 4: PENDING FOLLOW-UPS
    // ─────────────────────────────────────────────────────────
    if (type === 'calls') {
      const validCalls = filteredData.filter(
        c => (c.customer && c.customer.businessName) || (c.lead && (c.lead.shopName || c.lead.name))
      );

      return (
        <>
          {/* Mobile Card Layout */}
          <div className="kpi-mobile-list">
            {validCalls.map(c => {
              const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || 'Customer';
              const rep = c.employee?.user?.name || 'Unassigned';
              const dueDate = c.followUpDate 
                ? new Date(c.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) 
                : 'Overdue';

              return (
                <div key={c.id} className="kpi-mobile-card">
                  <div className="kpi-card-row-top">
                    <div className="kpi-card-main-title">
                      <span>{name}</span>
                      {c.lead && !c.customer && <span className="kpi-badge lead">Lead</span>}
                    </div>
                    {getOutcomeBadge(c.outcome)}
                  </div>
                  <div className="kpi-card-row-bottom">
                    <span className="kpi-card-meta-text">
                      <User size={13} color="#94a3b8" />
                      <span>Rep: <strong>{rep}</strong></span>
                    </span>
                    <span className="kpi-card-right-date" style={{ color: '#059669', fontWeight: 600 }}>
                      Due: {dueDate}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="kpi-desktop-table-container">
            <table className="kpi-data-table">
              <thead>
                <tr>
                  <th>Client / Lead Account</th>
                  <th>Assigned Sales Rep</th>
                  <th>Call Outcome & Status</th>
                  <th style={{ textAlign: 'right' }}>Follow-up Due</th>
                </tr>
              </thead>
              <tbody>
                {validCalls.map(c => {
                  const name = c.customer?.businessName || c.lead?.shopName || c.lead?.name || 'Customer';
                  return (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600 }}>
                        {name}
                        {c.lead && !c.customer && <span className="kpi-badge lead" style={{ marginLeft: '6px' }}>Lead</span>}
                      </td>
                      <td style={{ color: '#64748b' }}>{c.employee?.user?.name || 'Unassigned'}</td>
                      <td>{getOutcomeBadge(c.outcome)}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, color: '#059669' }}>
                        {c.followUpDate ? new Date(c.followUpDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Pending'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <div className="kpi-modal-backdrop" onClick={onClose}>
      <div className="kpi-modal-card" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="kpi-modal-header">
          <div className="kpi-modal-title-group">
            <div className="kpi-modal-icon-pill" style={{ backgroundColor: config.pillBg }}>
              {config.icon}
            </div>
            <div>
              <h2>{config.title}</h2>
              <div className="kpi-modal-subtitle">{config.subtitle}</div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose} 
            className="kpi-modal-close-btn"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Timeframe Filter Bar */}
        <div className="kpi-filter-strip">
          <div className="kpi-filter-label">
            <Filter size={15} />
            <span>Time Filter:</span>
          </div>

          <div className="kpi-pill-group">
            {(['today', 'week', 'month', 'all'] as const).map(tf => {
              const label = tf === 'today' ? 'Today' : tf === 'week' ? 'This Week' : tf === 'month' ? 'This Month' : 'All Time';
              const isActive = timeRange === tf;
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setTimeRange(tf)}
                  className={`kpi-time-pill ${isActive ? 'active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="kpi-modal-body">
          {renderSummaryBanner()}
          {renderDataContent()}
        </div>

      </div>
    </div>
  );
}
