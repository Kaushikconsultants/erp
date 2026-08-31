"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Calendar, 
  Edit, 
  FileText, 
  Trash2, 
  Copy, 
  Search, 
  ChevronDown, 
  CheckCircle2, 
  Truck, 
  X, 
  RotateCcw, 
  UserCheck, 
  ShoppingBag, 
  Eye, 
  ExternalLink 
} from 'lucide-react';
import OrderTrackingModal from '@/components/orders/OrderTrackingModal';

type DocumentType = 'Order' | 'Quotation';

export interface UnifiedDocument {
  id: string;
  type: DocumentType;
  date: string;
  customerName: string;
  customerSub: string;
  agentName: string;
  totalAmount: number;
  taxableAmount: number;
  paymentType: string;
  discountBadge: string;
  discountColor: string;
  commissionValue: number;
  commissionAvg: string;
  documentNumber: string;
  status: string;
  statusColor: string;
  statusBg: string;
  awbNumber: string | null;
  notes: string | null;
  isCreditCustomer: boolean;
}

interface OrderListClientProps {
  documents: UnifiedDocument[];
  agents: { id: string; name: string }[];
  isAdmin?: boolean;
  currentUserEmployeeId?: string;
  currentUserName?: string;
}

const TABS = ['All', 'Printed', 'AWB Assigned', 'In Transit', 'OFD', 'Delivered', 'Quotations'];

export default function OrderListClient({ 
  documents, 
  agents, 
  isAdmin = true, 
  currentUserEmployeeId, 
  currentUserName 
}: OrderListClientProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  const [selectedAgent, setSelectedAgent] = useState('All Agents');
  const [selectedPayment, setSelectedPayment] = useState('All Payment Types');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const [commissionModal, setCommissionModal] = useState<UnifiedDocument | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<UnifiedDocument | null>(null);

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) {
      setSearchQuery(s);
    }
  }, [searchParams]);

  // Tab Count Computation
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All': documents.length,
      'Printed': 0,
      'AWB Assigned': 0,
      'In Transit': 0,
      'OFD': 0,
      'Delivered': 0,
      'Quotations': 0
    };

    documents.forEach(doc => {
      if (doc.type === 'Quotation') {
        counts['Quotations'] = (counts['Quotations'] || 0) + 1;
        return;
      }
      const s = (doc.status || '').toLowerCase();
      if (s.includes('printed') || s.includes('processing')) counts['Printed'] = (counts['Printed'] || 0) + 1;
      if (doc.awbNumber) counts['AWB Assigned'] = (counts['AWB Assigned'] || 0) + 1;
      if (s.includes('transit')) counts['In Transit'] = (counts['In Transit'] || 0) + 1;
      if (s.includes('out for delivery') || s.includes('ofd')) counts['OFD'] = (counts['OFD'] || 0) + 1;
      if (s.includes('delivered') || s.includes('converted')) counts['Delivered'] = (counts['Delivered'] || 0) + 1;
    });

    return counts;
  }, [documents]);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      // 1. Tab filter
      if (activeTab === 'Quotations' && doc.type !== 'Quotation') return false;
      if (activeTab !== 'All' && activeTab !== 'Quotations') {
        if (doc.type === 'Quotation') return false;
        
        let tabMatch = false;
        const statusLower = (doc.status || '').toLowerCase();
        if (activeTab === 'Printed' && (statusLower.includes('printed') || statusLower.includes('processing'))) tabMatch = true;
        else if (activeTab === 'AWB Assigned' && doc.awbNumber) tabMatch = true;
        else if (activeTab === 'In Transit' && statusLower.includes('transit')) tabMatch = true;
        else if (activeTab === 'OFD' && (statusLower.includes('out for delivery') || statusLower.includes('ofd'))) tabMatch = true;
        else if (activeTab === 'Delivered' && (statusLower.includes('delivered') || statusLower.includes('converted'))) tabMatch = true;
        else if (statusLower === activeTab.toLowerCase()) tabMatch = true;
        
        if (!tabMatch) return false;
      }

      // 2. Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchCust = doc.customerName.toLowerCase().includes(q);
        const matchSub = (doc.customerSub || '').toLowerCase().includes(q);
        const matchDoc = doc.documentNumber.toLowerCase().includes(q);
        const matchAgent = doc.agentName.toLowerCase().includes(q);
        const matchAwb = (doc.awbNumber || '').toLowerCase().includes(q);
        const matchNotes = (doc.notes || '').toLowerCase().includes(q);
        const matchAmount = doc.totalAmount.toString().includes(q);

        if (!matchCust && !matchSub && !matchDoc && !matchAgent && !matchAwb && !matchNotes && !matchAmount) {
          return false;
        }
      }

      // 3. Agent filter (only for admins)
      if (isAdmin && selectedAgent !== 'All Agents' && doc.agentName !== selectedAgent) {
        return false;
      }

      // 4. Payment filter
      if (selectedPayment !== 'All Payment Types' && doc.paymentType !== selectedPayment) {
        return false;
      }

      // 5. Date filter
      if (startDate || endDate) {
        const docDate = new Date(doc.date);
        if (startDate && docDate < new Date(startDate)) return false;
        if (endDate) {
          const eDate = new Date(endDate);
          eDate.setHours(23, 59, 59, 999);
          if (docDate > eDate) return false;
        }
      }

      return true;
    });
  }, [documents, activeTab, searchQuery, selectedAgent, selectedPayment, startDate, endDate, isAdmin]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(text);
    setTimeout(() => setCopiedAwb(null), 2000);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedAgent('All Agents');
    setSelectedPayment('All Payment Types');
    setStartDate('');
    setEndDate('');
    setActiveTab('All');
  };

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.03)', overflow: 'hidden' }}>
      
      {/* ─── 1. MODERN THEME TABS ─── */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '8px', 
        padding: '12px 18px', 
        borderBottom: '1px solid #f1f5f9', 
        backgroundColor: '#f8fafc',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {TABS.map(tab => {
          const isSelected = activeTab === tab;
          const count = tabCounts[tab] || 0;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '7px',
                padding: '6px 14px',
                borderRadius: '9999px',
                fontSize: '0.8125rem',
                fontWeight: isSelected ? 550 : 500,
                border: isSelected ? 'none' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? 'var(--accent-primary, #4f46e5)' : '#ffffff',
                color: isSelected ? '#ffffff' : '#475569',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 5px rgba(79, 70, 229, 0.2)' : '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
            >
              <span>{tab}</span>
              <span style={{
                padding: '1px 6px',
                borderRadius: '9999px',
                fontSize: '0.72rem',
                fontWeight: 500,
                backgroundColor: isSelected ? 'rgba(255,255,255,0.22)' : '#f1f5f9',
                color: isSelected ? '#ffffff' : '#64748b'
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ─── 2. MODERN FILTERS & THEMED SEARCH BAR ─── */}
      <div style={{ 
        padding: '14px 18px', 
        borderBottom: '1px solid #f1f5f9', 
        display: 'flex', 
        gap: '12px', 
        flexWrap: 'wrap', 
        alignItems: 'center',
        backgroundColor: '#ffffff'
      }}>
        
        {/* Themed Pill Search Box */}
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            backgroundColor: '#f8fafc', 
            border: '1px solid #cbd5e1', 
            borderRadius: '9999px', 
            padding: '7px 14px', 
            flex: '1', 
            minWidth: '240px',
            maxWidth: '360px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
            transition: 'all 0.2s ease'
          }}
          onFocusCapture={(e) => {
            e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
            e.currentTarget.style.backgroundColor = "#ffffff";
          }}
          onBlurCapture={(e) => {
            e.currentTarget.style.borderColor = "#cbd5e1";
            e.currentTarget.style.boxShadow = "0 1px 2px rgba(0,0,0,0.03)";
            e.currentTarget.style.backgroundColor = "#f8fafc";
          }}
        >
          <Search size={14} style={{ color: '#94a3b8', marginRight: '8px', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search customer, order #, AWB..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ 
              width: '100%', 
              border: 'none', 
              background: 'transparent', 
              outline: 'none', 
              fontSize: '0.85rem', 
              color: '#0f172a',
              fontFamily: 'inherit'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', padding: '0 2px' }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Agent Dropdown (Admin Only) or Scoped Badge */}
        {isAdmin ? (
          <div style={{ position: 'relative', width: '180px' }}>
            <select 
              value={selectedAgent} 
              onChange={e => setSelectedAgent(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '7px 32px 7px 12px', 
                borderRadius: '8px', 
                border: '1px solid #cbd5e1', 
                fontSize: '0.8125rem', 
                fontWeight: 500,
                appearance: 'none', 
                backgroundColor: '#ffffff', 
                color: '#334155',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All Agents">All Sales Agents</option>
              {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
            </select>
            <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 12px',
            borderRadius: '8px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            color: '#475569',
            fontSize: '0.8125rem',
            fontWeight: 500
          }}>
            <UserCheck size={13} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
            <span>Rep: {currentUserName || 'You'}</span>
          </div>
        )}

        {/* Payment Dropdown */}
        <div style={{ position: 'relative', width: '170px' }}>
          <select 
            value={selectedPayment} 
            onChange={e => setSelectedPayment(e.target.value)}
            style={{ 
              width: '100%', 
              padding: '7px 32px 7px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              fontSize: '0.8125rem', 
              fontWeight: 500,
              appearance: 'none', 
              backgroundColor: '#ffffff', 
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="All Payment Types">All Payments</option>
            <option value="Prepaid">Prepaid</option>
            <option value="COD">COD</option>
            <option value="Credit">Credit Terms</option>
            <option value="Quotation">Quotation</option>
          </select>
          <ChevronDown size={14} color="#94a3b8" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Interactive Date Range Filter */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <Calendar size={13} style={{ color: '#94a3b8' }} />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Start Date"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '0.78rem',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
          <span style={{ color: '#cbd5e1' }}>-</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="End Date"
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              fontSize: '0.78rem',
              color: '#334155',
              outline: 'none',
              cursor: 'pointer'
            }}
          />
        </div>

        {/* Reset Filter Button */}
        {(searchQuery || selectedAgent !== 'All Agents' || selectedPayment !== 'All Payment Types' || startDate || endDate || activeTab !== 'All') && (
          <button 
            type="button"
            onClick={handleReset}
            style={{ 
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 12px', 
              borderRadius: '8px', 
              border: '1px solid #cbd5e1', 
              backgroundColor: '#ffffff', 
              fontSize: '0.8125rem', 
              cursor: 'pointer', 
              fontWeight: 500, 
              color: '#475569',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f1f5f9';
              e.currentTarget.style.color = '#0f172a';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* ─── 3. MOBILE ORDER CARDS VIEW (HIDDEN ON DESKTOP) ─── */}
      <div className="mobile-order-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px', padding: '16px' }}>
        {filteredDocs.map((doc) => (
          <div 
            key={doc.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 550, color: 'var(--accent-primary, #4f46e5)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                  <FileText size={13} /> {doc.documentNumber} • {doc.date}
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}>
                  {doc.customerName}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                  {doc.customerSub} • Rep: {doc.agentName}
                </p>
              </div>

              <span style={{ 
                backgroundColor: doc.statusBg, 
                color: doc.statusColor, 
                padding: '3px 8px', 
                borderRadius: '9999px', 
                fontSize: '0.72rem', 
                fontWeight: 500 
              }}>
                {doc.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Amount</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', fontVariantNumeric: 'tabular-nums' }}>₹{doc.totalAmount.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Payment</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#475569' }}>{doc.paymentType}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Commission</span>
                <button 
                  onClick={() => setCommissionModal(doc)}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', padding: 0 }}
                >
                  ₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
            </div>

            {doc.awbNumber && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: '#475569', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span>AWB: <span style={{ fontWeight: 550 }}>{doc.awbNumber}</span></span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => copyToClipboard(doc.awbNumber!)} style={{ background: 'none', border: 'none', color: 'var(--accent-primary, #4f46e5)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500 }}>
                    {copiedAwb === doc.awbNumber ? 'Copied!' : 'Copy'}
                  </button>
                  <button onClick={() => setTrackingOrder(doc)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Truck size={13} /> Track
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
              <a 
                href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  fontSize: '0.8125rem', 
                  fontWeight: 500,
                  padding: '7px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155'
                }}
              >
                View Details
              </a>
              <a 
                href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}/invoice`} 
                target="_blank" 
                rel="noopener noreferrer" 
                style={{ 
                  flex: 1, 
                  textAlign: 'center', 
                  textDecoration: 'none', 
                  fontSize: '0.8125rem', 
                  fontWeight: 500,
                  padding: '7px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--accent-primary, #4f46e5)', 
                  color: '#ffffff'
                }}
              >
                Tax Invoice PDF
              </a>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px' }}>
            No records found matching your filters.
          </div>
        )}
      </div>

      {/* ─── 4. MODERN DESKTOP DATA TABLE ─── */}
      <div className="desktop-order-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Date</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Customer</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Agent</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Amount</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Payment</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Discount</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Commission</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Doc # / Status</th>
              <th style={{ padding: '10px 14px', fontWeight: 550 }}>Notes</th>
              <th style={{ padding: '10px 14px', fontWeight: 550, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc, idx) => (
              <tr 
                key={doc.id} 
                style={{ 
                  borderBottom: '1px solid #f1f5f9', 
                  backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa',
                  transition: 'background-color 0.15s ease' 
                }} 
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-light, #f8faff)'} 
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#fafafa'}
              >
                {/* Date */}
                <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap', verticalAlign: 'middle', fontSize: '0.8125rem' }}>
                  {doc.date}
                </td>
                
                {/* Customer */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <a 
                    href={`/customers`} 
                    style={{ 
                      color: 'var(--accent-primary, #4f46e5)', 
                      fontWeight: 550, 
                      fontSize: '0.875rem', 
                      textDecoration: 'none',
                      display: 'block'
                    }}
                  >
                    {doc.customerName}
                  </a>
                  {doc.customerSub && (
                    <div style={{ color: '#64748b', fontSize: '0.75rem', marginTop: '2px' }}>
                      {doc.customerSub}
                    </div>
                  )}
                </td>
                
                {/* Agent */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ 
                      width: '24px', 
                      height: '24px', 
                      borderRadius: '50%', 
                      backgroundColor: 'var(--accent-light, #eff6ff)', 
                      color: 'var(--accent-primary, #4f46e5)', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      fontSize: '0.72rem', 
                      fontWeight: 600 
                    }}>
                      {doc.agentName.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>{doc.agentName}</span>
                  </div>
                </td>
                
                {/* Amount */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>
                    ₹{doc.totalAmount.toLocaleString()}
                  </div>
                  <div style={{ color: '#64748b', fontSize: '0.72rem', marginTop: '1px' }}>
                    Taxable: ₹{doc.taxableAmount.toLocaleString()}
                  </div>
                </td>
                
                {/* Payment */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    backgroundColor: '#f1f5f9', 
                    color: '#475569', 
                    padding: '3px 8px', 
                    borderRadius: '9999px', 
                    fontSize: '0.72rem', 
                    fontWeight: 500,
                    border: '1px solid #e2e8f0',
                    display: 'inline-block'
                  }}>
                    {doc.paymentType}
                  </span>
                </td>

                {/* Discount */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <span style={{ 
                    backgroundColor: 'var(--accent-light, #eff6ff)', 
                    color: 'var(--accent-primary, #4f46e5)', 
                    padding: '3px 8px', 
                    borderRadius: '9999px', 
                    border: '1px solid rgba(79, 70, 229, 0.2)',
                    fontSize: '0.72rem', 
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    display: 'inline-block'
                  }}>
                    {doc.discountBadge}
                  </span>
                </td>

                {/* Commission */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <button 
                    type="button"
                    onClick={() => setCommissionModal(doc)}
                    style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      backgroundColor: '#f8fafc', 
                      color: '#0f172a', 
                      padding: '3px 8px', 
                      borderRadius: '6px', 
                      fontWeight: 500, 
                      fontSize: '0.78rem', 
                      gap: '4px', 
                      border: '1px solid #e2e8f0', 
                      cursor: 'pointer', 
                      outline: 'none',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent-primary, #4f46e5)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                  >
                    <span>₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    <div style={{ opacity: 0.4 }}><FileText size={12} /></div>
                  </button>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', marginTop: '2px', fontWeight: 400 }}>
                    {doc.commissionAvg}
                  </div>
                </td>

                {/* Doc # / Status */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent-primary, #4f46e5)', fontWeight: 550, fontSize: '0.8125rem', fontFamily: 'monospace', marginBottom: '4px' }}>
                    <FileText size={13} />
                    <span>{doc.documentNumber}</span>
                  </div>
                  
                  <span style={{ 
                    backgroundColor: doc.statusBg, 
                    color: doc.statusColor, 
                    padding: '2px 8px', 
                    borderRadius: '9999px', 
                    fontSize: '0.72rem', 
                    fontWeight: 500,
                    display: 'inline-block'
                  }}>
                    {doc.status}
                  </span>

                  {doc.awbNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748b', fontSize: '0.75rem', marginTop: '4px' }}>
                      <span>AWB: {doc.awbNumber}</span>
                      <button 
                        type="button"
                        onClick={() => copyToClipboard(doc.awbNumber!)}
                        title="Copy AWB"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: 'var(--accent-primary, #4f46e5)', display: 'flex', alignItems: 'center' }}
                      >
                        {copiedAwb === doc.awbNumber ? <CheckCircle2 size={13} color="#10b981" /> : <Copy size={13} />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTrackingOrder(doc);
                        }}
                        title="Track Shipment Live"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#10b981', display: 'flex', alignItems: 'center' }}
                      >
                        <Truck size={13} />
                      </button>
                    </div>
                  )}
                </td>

                {/* Notes */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', color: '#64748b', fontSize: '0.8125rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 400 }}>
                  {doc.notes || '-'}
                </td>

                {/* Actions */}
                <td style={{ padding: '12px 14px', verticalAlign: 'middle', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', justifyContent: 'flex-end' }}>
                    
                    {/* View Details */}
                    <a 
                      href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        width: '30px', 
                        height: '30px', 
                        backgroundColor: '#ffffff', 
                        color: '#475569', 
                        borderRadius: '8px', 
                        textDecoration: 'none', 
                        border: '1px solid #cbd5e1',
                        transition: 'all 0.15s ease'
                      }} 
                      title="View Order Details"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.color = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.backgroundColor = "var(--accent-light, #eff6ff)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.color = "#475569";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                      }}
                    >
                      <Eye size={14} />
                    </a>

                    {/* Tax Invoice Action Button */}
                    <a 
                      href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}/invoice`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        padding: '5px 11px', 
                        gap: '5px', 
                        height: '30px', 
                        backgroundColor: 'var(--accent-primary, #4f46e5)', 
                        border: 'none', 
                        color: '#ffffff', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem', 
                        fontWeight: 500, 
                        textDecoration: 'none',
                        boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)',
                        transition: 'all 0.15s ease'
                      }} 
                      title="View & Print Tax Invoice"
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <FileText size={13} />
                      <span>Invoice</span>
                    </a>

                  </div>
                </td>
              </tr>
            ))}
            
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                      <ShoppingBag size={24} />
                    </div>
                    <div style={{ fontWeight: 600, color: '#1e293b' }}>No orders found</div>
                    <p style={{ margin: 0, fontSize: '0.8125rem', color: '#94a3b8' }}>
                      {searchQuery || selectedAgent !== 'All Agents' || selectedPayment !== 'All Payment Types' || startDate || endDate || activeTab !== 'All'
                        ? "Try adjusting or clearing your filters to see more results."
                        : !isAdmin 
                          ? "No orders have been recorded for your assigned customers yet."
                          : "Create your first sales order using the + Create Order button above."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 5. COMMISSION CALCULATION MODAL ─── */}
      {commissionModal && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.6)', 
            backdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999,
            padding: '16px'
          }}
          onClick={() => setCommissionModal(null)}
        >
          <div 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '16px', 
              padding: '24px', 
              width: '100%', 
              maxWidth: '420px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Commission Breakdown</h2>
              <button 
                type="button"
                onClick={() => setCommissionModal(null)} 
                style={{ 
                  background: '#f1f5f9', 
                  border: 'none', 
                  borderRadius: '50%',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer', 
                  color: '#64748b' 
                }}
              >
                <X size={15} />
              </button>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Order / Document:</span>
                <span style={{ fontWeight: 550, color: 'var(--accent-primary, #4f46e5)', fontFamily: 'monospace' }}>{commissionModal.documentNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Taxable Amount:</span>
                <span style={{ fontWeight: 550, color: '#0f172a' }}>₹{commissionModal.taxableAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Discount Profile:</span>
                <span style={{ fontWeight: 550, color: commissionModal.discountColor }}>{commissionModal.discountBadge}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '0.8125rem' }}>
                <span style={{ color: '#64748b' }}>Commission Slab:</span>
                <span style={{ fontWeight: 550, color: 'var(--accent-primary, #4f46e5)' }}>{commissionModal.commissionAvg}</span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: 600, fontSize: '0.875rem' }}>Calculated Commission:</span>
                <span style={{ fontWeight: 600, color: '#10b981', fontSize: '1.2rem', fontVariantNumeric: 'tabular-nums' }}>₹{commissionModal.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              Calculated based on {commissionModal.isCreditCustomer ? 'credit terms and discount slabs' : 'standard discount incentive rules'}.
            </p>
          </div>
        </div>
      )}

      {/* ─── 6. TRACKING MODAL ─── */}
      {trackingOrder && (
        <OrderTrackingModal
          orderId={trackingOrder.id}
          orderNumber={trackingOrder.documentNumber}
          awbNumber={trackingOrder.awbNumber}
          onClose={() => setTrackingOrder(null)}
        />
      )}
    </div>
  );
}
