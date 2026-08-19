"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Calendar, Edit, FileText, Trash2, Copy, Search, ChevronDown, CheckCircle2, Truck } from 'lucide-react';
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
  discountColor: string; // e.g. '#22c55e'
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
}

const TABS = ['All', 'Printed', 'AWB Assigned', 'In Transit', 'OFD', 'Delivered', 'Quotations'];

export default function OrderListClient({ documents, agents }: OrderListClientProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) {
      setSearchQuery(s);
    }
  }, [searchParams]);
  const [selectedAgent, setSelectedAgent] = useState('All Agents');
  const [selectedPayment, setSelectedPayment] = useState('All Payment Types');
  const [copiedAwb, setCopiedAwb] = useState<string | null>(null);
  const [commissionModal, setCommissionModal] = useState<UnifiedDocument | null>(null);
  const [trackingOrder, setTrackingOrder] = useState<UnifiedDocument | null>(null);

  const filteredDocs = useMemo(() => {
    return documents.filter(doc => {
      // Tab filter
      if (activeTab === 'Quotations' && doc.type !== 'Quotation') return false;
      if (activeTab !== 'All' && activeTab !== 'Quotations') {
        if (doc.type === 'Quotation') return false; // Hide quotations in order-specific tabs
        
        // Map tab to status
        let tabMatch = false;
        const statusLower = (doc.status || '').toLowerCase();
        if (activeTab === 'Printed' && statusLower.includes('printed')) tabMatch = true;
        else if (activeTab === 'AWB Assigned' && doc.awbNumber) tabMatch = true;
        else if (activeTab === 'In Transit' && statusLower.includes('transit')) tabMatch = true;
        else if (activeTab === 'OFD' && (statusLower.includes('out for delivery') || statusLower.includes('ofd'))) tabMatch = true;
        else if (activeTab === 'Delivered' && statusLower.includes('delivered')) tabMatch = true;
        // fallback matching
        else if (statusLower === activeTab.toLowerCase()) tabMatch = true;
        
        if (!tabMatch) return false;
      }

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!doc.customerName.toLowerCase().includes(q) && 
            !doc.documentNumber.toLowerCase().includes(q) &&
            !(doc.customerSub || '').toLowerCase().includes(q)) {
          return false;
        }
      }

      // Agent filter
      if (selectedAgent !== 'All Agents' && doc.agentName !== selectedAgent) {
        return false;
      }

      // Payment filter
      if (selectedPayment !== 'All Payment Types' && doc.paymentType !== selectedPayment) {
        return false;
      }

      return true;
    });
  }, [documents, activeTab, searchQuery, selectedAgent, selectedPayment]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAwb(text);
    setTimeout(() => setCopiedAwb(null), 2000);
  };

  const handleReset = () => {
    setSearchQuery('');
    setSelectedAgent('All Agents');
    setSelectedPayment('All Payment Types');
    setActiveTab('All');
  };

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* ─── TABS ─── */}
      <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '2px solid #3b82f6', backgroundColor: '#f8fafc' }}>
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '16px 24px',
              border: 'none',
              background: 'transparent',
              fontWeight: 600,
              fontSize: '0.95rem',
              color: activeTab === tab ? '#1e293b' : '#3b82f6',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              position: 'relative',
              outline: 'none'
            }}
          >
            {tab}
            {activeTab === tab && (
              <div style={{ position: 'absolute', bottom: '-2px', left: 0, right: 0, height: '3px', backgroundColor: '#1e293b', borderRadius: '3px 3px 0 0' }} />
            )}
          </button>
        ))}
      </div>

      {/* ─── FILTERS ─── */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '250px' }}>
          <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search customer name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>

        {/* Agent Dropdown */}
        <div style={{ position: 'relative', width: '200px' }}>
          <select 
            value={selectedAgent} 
            onChange={e => setSelectedAgent(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', appearance: 'none', backgroundColor: '#fff', outline: 'none' }}
          >
            <option value="All Agents">All Agents</option>
            {agents.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
          </select>
          <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Payment Dropdown */}
        <div style={{ position: 'relative', width: '200px' }}>
          <select 
            value={selectedPayment} 
            onChange={e => setSelectedPayment(e.target.value)}
            style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', appearance: 'none', backgroundColor: '#fff', outline: 'none' }}
          >
            <option value="All Payment Types">All Payment Types</option>
            <option value="COD">COD</option>
            <option value="Prepaid">Prepaid</option>
            <option value="Credit">Credit</option>
          </select>
          <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
        </div>

        {/* Date Range Placeholder */}
        <div style={{ position: 'relative', width: '200px' }}>
          <input
            type="text"
            placeholder="--------, ----"
            style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none', textAlign: 'center' }}
            readOnly
          />
          <Calendar size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>

        <button 
          onClick={handleReset}
          style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500, color: '#475569' }}
        >
          Reset
        </button>
      </div>

      {/* ─── MOBILE ORDER CARDS VIEW (HIDDEN ON DESKTOP) ─── */}
      <div className="mobile-order-cards" style={{ display: 'none', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {filteredDocs.map((doc) => (
          <div 
            key={doc.id}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              padding: '14px',
              border: '1px solid #cbd5e1',
              boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <FileText size={13} /> {doc.documentNumber} • {doc.date}
                </span>
                <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary, #2563eb)' }}>
                  {doc.customerName}
                </h4>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                  {doc.customerSub} • Rep: {doc.agentName}
                </p>
              </div>

              <span style={{ 
                backgroundColor: doc.statusBg, 
                color: doc.statusColor, 
                padding: '4px 10px', 
                borderRadius: '12px', 
                fontSize: '0.75rem', 
                fontWeight: 700 
              }}>
                {doc.status}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '10px' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Total Amount</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>₹{doc.totalAmount.toLocaleString()}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Payment Method</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>{doc.paymentType}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block' }}>Commission</span>
                <button 
                  onClick={() => setCommissionModal(doc)}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  ₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </button>
              </div>
            </div>

            {doc.awbNumber && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569', backgroundColor: '#f0fdf4', padding: '6px 10px', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                <span>AWB: <strong>{doc.awbNumber}</strong></span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => copyToClipboard(doc.awbNumber!)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                    Copy
                  </button>
                  <button onClick={() => setTrackingOrder(doc)} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <Truck size={13} /> Track
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
              <a 
                href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                className="action-btn outline-primary" 
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', justifyContent: 'center', fontSize: '0.78rem' }}
              >
                View Order
              </a>
              <a 
                href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}/invoice`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="action-btn" 
                style={{ flex: 1, textAlign: 'center', textDecoration: 'none', justifyContent: 'center', fontSize: '0.78rem', backgroundColor: '#4f46e5', color: '#fff' }}
              >
                Invoice PDF
              </a>
            </div>
          </div>
        ))}

        {filteredDocs.length === 0 && (
          <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px' }}>
            No records found matching your filters.
          </div>
        )}
      </div>

      {/* ─── DESKTOP TABLE ─── */}
      <div className="desktop-order-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Date</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Customer</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Agent</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Amount</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Payment</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Discount</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Commission</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>QT No. / Status</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Notes</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => (
              <tr key={doc.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                {/* Date */}
                <td style={{ padding: '20px', fontSize: '0.9rem', color: '#475569', verticalAlign: 'top' }}>
                  {doc.date}
                </td>
                
                {/* Customer */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <div style={{ color: 'var(--accent-primary, #2563eb)', fontWeight: 600, fontSize: '0.95rem', marginBottom: '4px' }}>{doc.customerName}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem' }}>{doc.customerSub}</div>
                </td>
                
                {/* Agent */}
                <td style={{ padding: '20px', fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', verticalAlign: 'top' }}>
                  {doc.agentName}
                </td>
                
                {/* Amount */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <div style={{ color: '#0f172a', fontWeight: 700, fontSize: '1rem', marginBottom: '4px' }}>₹{doc.totalAmount.toLocaleString()}</div>
                  <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>Taxable: ₹{doc.taxableAmount.toLocaleString()}</div>
                </td>
                
                {/* Payment */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <span style={{ 
                    backgroundColor: '#f1f5f9', 
                    color: '#475569', 
                    padding: '4px 10px', 
                    borderRadius: 'var(--radius-sm, 4px)', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    border: '1px solid #e2e8f0'
                  }}>
                    {doc.paymentType}
                  </span>
                </td>

                {/* Discount */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <span style={{ 
                    backgroundColor: 'var(--accent-light, #ede9fe)', 
                    color: 'var(--accent-primary, #6d28d9)', 
                    padding: '4px 10px', 
                    borderRadius: 'var(--radius-sm, 4px)', 
                    border: '1px solid var(--accent-light, #ddd6fe)',
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {doc.discountBadge}
                  </span>
                </td>

                {/* Commission */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <button 
                    onClick={() => setCommissionModal(doc)}
                    style={{ display: 'inline-flex', alignItems: 'center', backgroundColor: '#f8fafc', color: '#334155', padding: '4px 10px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem', gap: '4px', marginBottom: '4px', border: '1px solid #e2e8f0', cursor: 'pointer', outline: 'none' }}
                  >
                    ₹{doc.commissionValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    <div style={{ opacity: 0.5 }}><FileText size={13} /></div>
                  </button>
                  <div style={{ color: '#94a3b8', fontSize: '0.72rem', textAlign: 'center', fontWeight: 500 }}>{doc.commissionAvg}</div>
                </td>

                {/* QT No. / Status */}
                <td style={{ padding: '20px', verticalAlign: 'top' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px' }}>
                    <FileText size={16} /> {doc.documentNumber}
                  </div>
                  <span style={{ 
                    backgroundColor: doc.statusBg, 
                    color: doc.statusColor, 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '0.75rem', 
                    fontWeight: 700,
                    display: 'inline-block',
                    marginBottom: doc.awbNumber ? '8px' : '0'
                  }}>
                    {doc.status}
                  </span>
                  {doc.awbNumber && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem' }}>
                      {doc.awbNumber} 
                      <button 
                        onClick={() => copyToClipboard(doc.awbNumber!)}
                        title="Copy AWB"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        {copiedAwb === doc.awbNumber ? <CheckCircle2 size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTrackingOrder(doc);
                        }}
                        title="Track Live"
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: '4px' }}
                      >
                        <Truck size={14} />
                      </button>
                    </div>
                  )}
                </td>

                {/* Notes */}
                <td style={{ padding: '20px', verticalAlign: 'top', color: doc.notes === 'NEW' ? '#94a3b8' : '#475569', fontSize: '0.85rem', fontWeight: 500 }}>
                  {doc.notes || '-'}
                </td>

                {/* Actions */}
                <td style={{ padding: '20px', verticalAlign: 'top', textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                    <a 
                      href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}`} 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', backgroundColor: '#f1f5f9', color: '#475569', borderRadius: '6px', textDecoration: 'none', border: '1px solid #e2e8f0' }} 
                      title="View Details"
                    >
                      <Edit size={14} />
                    </a>
                    <a 
                      href={`/${doc.type === 'Order' ? 'orders' : 'quotations'}/${doc.id}/invoice`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', gap: '3px', height: '30px', backgroundColor: '#4f46e5', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none' }} 
                      title="View Invoice"
                    >
                      <span style={{ fontSize: '11px' }}>$</span> INV
                    </a>
                    <button 
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '30px', height: '30px', backgroundColor: '#f1f5f9', color: '#94a3b8', borderRadius: '6px', cursor: 'pointer', border: '1px solid #e2e8f0' }} 
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            
            {filteredDocs.length === 0 && (
              <tr>
                <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No records found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* COMMISSION CALCULATION MODAL */}
      {commissionModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#fff', borderRadius: '12px', padding: '24px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>Commission Breakdown</h2>
              <button onClick={() => setCommissionModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>
            
            <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Taxable Amount:</span>
                <span style={{ fontWeight: 600, color: '#0f172a' }}>₹{commissionModal.taxableAmount.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Discount Profile:</span>
                <span style={{ fontWeight: 600, color: commissionModal.discountColor }}>{commissionModal.discountBadge}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Commission Slab:</span>
                <span style={{ fontWeight: 600, color: '#3b82f6' }}>{commissionModal.commissionAvg}</span>
              </div>
              <div style={{ borderTop: '1px dashed #cbd5e1', margin: '12px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#0f172a', fontWeight: 700, fontSize: '1rem' }}>Final Commission:</span>
                <span style={{ fontWeight: 700, color: '#10b981', fontSize: '1.1rem' }}>₹{commissionModal.commissionValue.toLocaleString()}</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center', margin: 0 }}>
              Calculated based on {commissionModal.isCreditCustomer ? 'credit terms and discount slabs' : 'standard discount slabs'}.
            </p>
          </div>
        </div>
      )}

      {/* TRACKING MODAL */}
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
