"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Search, 
  Pencil, 
  Trash2, 
  BarChart3, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  X, 
  Filter,
  Layers,
  ArrowRight
} from 'lucide-react';
import ConvertQuotationBtn from '@/components/quotations/ConvertQuotationBtn';
import ConvertToInvoiceBtn from '@/components/quotations/ConvertToInvoiceBtn';
import EditQuotationModal from '@/components/quotations/EditQuotationModal';
import EditTokenAmountModal from '@/components/quotations/EditTokenAmountModal';
import { deleteQuotation } from '@/app/actions/quotationActions';
import { Coins } from 'lucide-react';

export default function QuotationTableClient({ initialQuotations = [] }: { initialQuotations: any[] }) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [quotations, setQuotations] = useState<any[]>(initialQuotations || []);

  // Active KPI Card Filter: 'ALL' | 'ACCEPTED_CONVERTED' | 'DRAFT' | 'ANALYTICS'
  const [activeKpiFilter, setActiveKpiFilter] = useState<'ALL' | 'ACCEPTED_CONVERTED' | 'DRAFT' | 'ANALYTICS'>('ALL');
  
  // Analytics Modal
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false);

  const [editingQuotation, setEditingQuotation] = useState<any | null>(null);
  const [tokenModalQuote, setTokenModalQuote] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    setQuotations(initialQuotations || []);
  }, [initialQuotations]);

  useEffect(() => {
    const s = searchParams?.get('search');
    setSearchTerm(s || '');
  }, [searchParams]);

  // Calculate Metrics
  const totalQuotes = quotations.length;
  const draftQuotesList = quotations.filter(q => q.status === 'Draft');
  const draftCount = draftQuotesList.length;
  
  // "Confirmed" = customer committed (token/credit/full) — counts as a matured/confirmed sale
  const acceptedQuotesList = quotations.filter(q =>
    q.status === 'Accepted' || q.status === 'Converted' || q.status === 'Confirmed'
  );
  const acceptedCount = acceptedQuotesList.length;
  
  const totalPipelineValue = quotations.reduce((sum, q) => sum + (q.totalValue || 0), 0);
  const acceptedPipelineValue = acceptedQuotesList.reduce((sum, q) => sum + (q.totalValue || 0), 0);
  const draftPipelineValue = draftQuotesList.reduce((sum, q) => sum + (q.totalValue || 0), 0);

  const conversionRate = totalQuotes > 0 ? Math.round((acceptedCount / totalQuotes) * 100) : 0;

  const handleDelete = async (id: string, quotationNumber: string) => {
    if (confirm(`Are you sure you want to delete Quotation #${quotationNumber}? This action cannot be undone.`)) {
      setDeletingId(id);
      const res = await deleteQuotation(id);
      setDeletingId(null);
      if (res?.error) {
        alert(`Error deleting quotation: ${res.error}`);
      } else {
        setQuotations(prev => prev.filter(q => q.id !== id));
      }
    }
  };

  const handleKpiCardClick = (filterType: 'ALL' | 'ACCEPTED_CONVERTED' | 'DRAFT' | 'ANALYTICS') => {
    if (filterType === 'ANALYTICS') {
      setIsAnalyticsModalOpen(true);
      return;
    }
    setActiveKpiFilter(filterType);
  };

  // Filter Quotations by search query AND active KPI card filter
  const filteredQuotations = (quotations || []).filter(q => {
    // 1. KPI Card Status Filter
    if (activeKpiFilter === 'ACCEPTED_CONVERTED') {
      if (q.status !== 'Converted' && q.status !== 'Accepted' && q.status !== 'Confirmed') return false;
    } else if (activeKpiFilter === 'DRAFT') {
      if (q.status !== 'Draft') return false;
    }

    // 2. Search query filter
    const query = searchTerm.toLowerCase().trim();
    if (!query) return true;
    const qNum = (q.quotationNumber || '').toLowerCase();
    const cName = (q.customer?.businessName || q.customer?.contactPerson || '').toLowerCase();
    const sName = (q.salesperson?.user?.name || '').toLowerCase();
    return qNum.includes(query) || cName.includes(query) || sName.includes(query);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ─── 4 CLICKABLE INTERACTIVE KPI CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        
        {/* CARD 1: Total Pipeline Value */}
        <div 
          onClick={() => handleKpiCardClick('ALL')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg, 12px)',
            backgroundColor: '#ffffff',
            border: activeKpiFilter === 'ALL' ? '2px solid var(--accent-primary, #4f46e5)' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: activeKpiFilter === 'ALL' ? '0 4px 12px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title="Click to view all quotation pipeline details"
        >
          <div style={{ backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ color: 'var(--accent-primary, #4f46e5)' }} size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
              Total Pipeline Value
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              ₹{totalPipelineValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary, #4f46e5)', fontWeight: 600, marginTop: '2px' }}>
              {activeKpiFilter === 'ALL' ? '● Showing All' : 'Click to view details →'}
            </div>
          </div>
        </div>
        
        {/* CARD 2: Accepted / Converted */}
        <div 
          onClick={() => handleKpiCardClick('ACCEPTED_CONVERTED')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg, 12px)',
            backgroundColor: activeKpiFilter === 'ACCEPTED_CONVERTED' ? '#f0fdf4' : '#ffffff',
            border: activeKpiFilter === 'ACCEPTED_CONVERTED' ? '2px solid #16a34a' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: activeKpiFilter === 'ACCEPTED_CONVERTED' ? '0 4px 12px rgba(22,163,74,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title="Click to filter accepted & converted quotations"
        >
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 color="#16a34a" size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
              Accepted / Converted
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              ₹{acceptedPipelineValue.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: '2px' }}>
              {activeKpiFilter === 'ACCEPTED_CONVERTED' ? '● Active Filter' : `${acceptedCount} quotes converted →`}
            </div>
          </div>
        </div>

        {/* CARD 3: Pending Drafts */}
        <div 
          onClick={() => handleKpiCardClick('DRAFT')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg, 12px)',
            backgroundColor: activeKpiFilter === 'DRAFT' ? '#fffbeb' : '#ffffff',
            border: activeKpiFilter === 'DRAFT' ? '2px solid #d97706' : '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: activeKpiFilter === 'DRAFT' ? '0 4px 12px rgba(217,119,6,0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title="Click to filter pending draft quotations"
        >
          <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock color="#d97706" size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
              Pending Drafts
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              {draftCount} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>quotes</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#d97706', fontWeight: 600, marginTop: '2px' }}>
              {activeKpiFilter === 'DRAFT' ? '● Active Filter' : `₹${draftPipelineValue.toLocaleString('en-IN')} pending →`}
            </div>
          </div>
        </div>

        {/* CARD 4: Conversion Rate */}
        <div 
          onClick={() => handleKpiCardClick('ANALYTICS')}
          style={{
            padding: '20px',
            borderRadius: 'var(--radius-lg, 12px)',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            position: 'relative'
          }}
          title="Click to view detailed conversion analytics breakdown"
        >
          <div style={{ backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp style={{ color: 'var(--accent-primary, #4f46e5)' }} size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>
              Conversion Rate
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>
              {conversionRate}%
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary, #4f46e5)', fontWeight: 600, marginTop: '2px' }}>
              View Analytics Breakdown →
            </div>
          </div>
        </div>

      </div>

      {/* ─── TABLE PANEL & FILTER BADGES ─── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        
        {/* HEADER & SEARCH BAR & ACTIVE FILTER PILL */}
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              {activeKpiFilter === 'ACCEPTED_CONVERTED' ? 'Accepted & Converted Quotations' : activeKpiFilter === 'DRAFT' ? 'Pending Draft Quotations' : 'All Quotations'}
            </h2>
            
            {activeKpiFilter !== 'ALL' && (
              <button
                onClick={() => setActiveKpiFilter('ALL')}
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  backgroundColor: 'var(--accent-light, #e0e7ff)',
                  color: 'var(--accent-primary, #4f46e5)',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Clear Filter <X size={13} />
              </button>
            )}
          </div>

          <div style={{ position: 'relative', width: '300px' }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input 
              type="text" 
              placeholder="Search Quotes by #, customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '8px 12px 8px 36px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #cbd5e1', fontSize: '0.85rem', outline: 'none' }} 
            />
          </div>
        </div>
        
        {/* ─── MOBILE QUOTATION CARDS VIEW (HIDDEN ON DESKTOP) ─── */}
        <div className="mobile-quotation-cards" style={{ display: 'none', flexDirection: 'column', gap: '10px', padding: '12px' }}>
          {filteredQuotations.map((q) => (
            <div 
              key={q.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                padding: '14px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-primary, #4f46e5)', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'monospace' }}>
                    <FileText size={13} /> {q.quotationNumber} • {new Date(q.date).toLocaleDateString('en-IN')}
                  </span>
                  <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
                    {q.customer?.businessName || q.customer?.contactPerson || 'Unknown Customer'}
                  </h4>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                    Rep: {q.salesperson?.user?.name || 'Unassigned'}
                  </p>
                </div>

                <span 
                  onClick={() => {
                    if (q.status === 'Confirmed') setTokenModalQuote(q);
                  }}
                  style={{ 
                    backgroundColor: q.status === 'Converted' || q.status === 'Accepted' ? '#dcfce7' : q.status === 'Confirmed' ? '#dbeafe' : q.status === 'Sent' ? 'var(--accent-light, #e0e7ff)' : '#f1f5f9',
                    color: q.status === 'Converted' || q.status === 'Accepted' ? '#166534' : q.status === 'Confirmed' ? '#1d4ed8' : q.status === 'Sent' ? 'var(--accent-primary, #3730a3)' : '#475569',
                    padding: '3px 8px', 
                    borderRadius: '9999px', 
                    fontSize: '0.72rem', 
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  {q.status === 'Confirmed' && q.receivedAmount > 0 ? `Confirmed (₹${q.receivedAmount.toLocaleString('en-IN')})` : q.status}
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>Amount</span>
                  <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>₹{(q.totalValue || 0).toLocaleString('en-IN')}</span>
                </div>
                {q.receivedAmount > 0 && (
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.7rem', color: '#059669', display: 'block', textTransform: 'uppercase' }}>Paid</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669' }}>₹{q.receivedAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '6px', paddingTop: '8px', borderTop: '1px solid #f1f5f9', alignItems: 'center', flexWrap: 'wrap' }}>
                <Link 
                  href={`/quotations/${q.id}`} 
                  style={{ 
                    flex: 1, 
                    textAlign: 'center', 
                    textDecoration: 'none', 
                    fontSize: '0.78rem', 
                    fontWeight: 600,
                    padding: '7px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155'
                  }}
                >
                  View
                </Link>
                <Link 
                  href={`/quotations/${q.id}/edit`}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #93c5fd',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Pencil size={13} /> Edit
                </Link>
                {q.status === 'Confirmed' && (
                  <button
                    type="button"
                    onClick={() => setTokenModalQuote(q)}
                    style={{
                      padding: '7px 10px',
                      border: '1px solid #86efac',
                      backgroundColor: '#f0fdf4',
                      borderRadius: '6px',
                      color: '#15803d',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    <Coins size={13} /> Token
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => handleDelete(q.id, q.quotationNumber)} 
                  disabled={deletingId === q.id}
                  style={{
                    padding: '7px 10px',
                    borderRadius: '6px',
                    border: '1px solid #fecaca',
                    backgroundColor: '#fef2f2',
                    color: '#dc2626',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: deletingId === q.id ? 'not-allowed' : 'pointer',
                    opacity: deletingId === q.id ? 0.6 : 1
                  }}
                >
                  <Trash2 size={13} />
                </button>
                {q.status === 'Confirmed' && (
                  <ConvertToInvoiceBtn quotationId={q.id} />
                )}
                {q.status !== 'Converted' && q.status !== 'Confirmed' && (
                  <ConvertQuotationBtn quotationId={q.id} />
                )}
              </div>
            </div>
          ))}

          {filteredQuotations.length === 0 && (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b', backgroundColor: '#ffffff', borderRadius: '12px' }}>
              No quotations found for this filter.
            </div>
          )}
        </div>

        {/* ─── DESKTOP TABLE ─── */}
        <div className="desktop-quotation-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Quote #</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Customer Name</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Salesperson</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '14px 20px', fontSize: '0.78rem', color: '#475569', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <FileText size={42} color="#cbd5e1" />
                      <div>No quotations found for this filter.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map(q => (
                  <tr key={q.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 20px', fontWeight: 700 }}>
                      <Link href={`/quotations/${q.id}`} style={{ textDecoration: 'none', color: 'var(--accent-primary, #4f46e5)' }}>
                        {q.quotationNumber}
                      </Link>
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>
                      {new Date(q.date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 600, color: '#1e293b' }}>
                      {q.customer?.businessName || q.customer?.contactPerson || 'Unknown Customer'}
                    </td>
                    <td style={{ padding: '14px 20px', color: '#64748b', fontSize: '0.85rem' }}>
                      {q.salesperson?.user?.name || 'Unassigned'}
                    </td>
                    <td style={{ padding: '14px 20px', fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                      <div>₹{(q.totalValue || 0).toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500, marginTop: '2px' }}>
                        Taxable: ₹{((q.taxableAmount && q.taxableAmount > 0 ? q.taxableAmount : (q.subtotal - (q.itemDiscount || 0) - (q.additionalDiscount || 0))) || q.totalValue || 0).toLocaleString('en-IN')}
                      </div>
                      {q.receivedAmount > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600, marginTop: '2px' }}>
                          ₹{q.receivedAmount.toLocaleString('en-IN')} Paid
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 20px', whiteSpace: 'nowrap' }}>
                      <span 
                        onClick={() => {
                          if (q.status === 'Confirmed') {
                            setTokenModalQuote(q);
                          }
                        }}
                        style={{ 
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px', 
                          borderRadius: 'var(--radius-sm, 6px)', 
                          fontSize: '0.75rem', 
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          backgroundColor: q.status === 'Converted' || q.status === 'Accepted' ? '#dcfce7' : q.status === 'Confirmed' ? '#dbeafe' : q.status === 'Sent' ? 'var(--accent-light, #e0e7ff)' : '#f1f5f9',
                          color: q.status === 'Converted' || q.status === 'Accepted' ? '#166534' : q.status === 'Confirmed' ? '#1d4ed8' : q.status === 'Sent' ? 'var(--accent-primary, #3730a3)' : '#475569',
                          cursor: q.status === 'Confirmed' ? 'pointer' : 'default',
                          border: q.status === 'Confirmed' ? '1px dashed #93c5fd' : 'none'
                        }}
                        title={q.status === 'Confirmed' ? "Click to edit token amount" : undefined}
                      >
                        {q.status === 'Confirmed' && q.receivedAmount > 0 ? `Confirmed (₹${q.receivedAmount.toLocaleString('en-IN')})` : q.status}
                        {q.status === 'Confirmed' && <Pencil size={10} style={{ marginLeft: '2px', opacity: 0.8 }} />}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <Link href={`/quotations/${q.id}`} style={{ padding: '5px 10px', border: '1px solid #cbd5e1', borderRadius: 'var(--radius-sm, 6px)', color: '#334155', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, backgroundColor: '#ffffff' }}>
                          View
                        </Link>

                        <Link 
                          href={`/quotations/${q.id}/edit`}
                          style={{ padding: '5px 10px', border: '1px solid #93c5fd', backgroundColor: '#eff6ff', borderRadius: 'var(--radius-sm, 6px)', color: '#1d4ed8', textDecoration: 'none', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Full Edit Quotation"
                        >
                          <Pencil size={13} /> Edit
                        </Link>

                        {q.status === 'Confirmed' && (
                          <button
                            type="button"
                            onClick={() => setTokenModalQuote(q)}
                            style={{
                              padding: '5px 10px',
                              border: '1px solid #86efac',
                              backgroundColor: '#f0fdf4',
                              borderRadius: 'var(--radius-sm, 6px)',
                              color: '#15803d',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            title="Edit Token / Advance Payment Amount"
                          >
                            <Coins size={13} /> Token
                          </button>
                        )}

                        <button 
                          onClick={() => handleDelete(q.id, q.quotationNumber)} 
                          disabled={deletingId === q.id}
                          style={{ padding: '5px 10px', border: '1px solid #fca5a5', backgroundColor: '#fef2f2', borderRadius: 'var(--radius-sm, 6px)', color: '#dc2626', fontSize: '0.78rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', opacity: deletingId === q.id ? 0.6 : 1 }}
                          title="Delete Quotation"
                        >
                          <Trash2 size={13} /> {deletingId === q.id ? '...' : 'Delete'}
                        </button>

                        {q.status === 'Confirmed' && (
                          <ConvertToInvoiceBtn quotationId={q.id} />
                        )}

                        {q.status !== 'Converted' && q.status !== 'Confirmed' && (
                          <ConvertQuotationBtn quotationId={q.id} />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ─── EDIT TOKEN / ADVANCE AMOUNT MODAL ─── */}
      {tokenModalQuote && (
        <EditTokenAmountModal
          isOpen={!!tokenModalQuote}
          quotationId={tokenModalQuote.id}
          quotationNumber={tokenModalQuote.quotationNumber}
          customerName={tokenModalQuote.customer?.businessName || tokenModalQuote.customer?.contactPerson}
          totalValue={Number(tokenModalQuote.totalValue || 0)}
          currentReceivedAmount={Number(tokenModalQuote.receivedAmount || 0)}
          discountSlab={tokenModalQuote.discountSlab || '1-15'}
          onClose={() => setTokenModalQuote(null)}
          onSuccess={(newAmt, newSlab) => {
            setQuotations(prev => prev.map(item => 
              item.id === tokenModalQuote.id 
                ? { ...item, receivedAmount: newAmt, discountSlab: newSlab || item.discountSlab }
                : item
            ));
          }}
        />
      )}

      {/* ─── CARD 4 ANALYTICS BREAKDOWN MODAL ─── */}
      {isAnalyticsModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }} onClick={() => setIsAnalyticsModalOpen(false)}>
          <div style={{
            backgroundColor: '#ffffff',
            width: '100%',
            maxWidth: '540px',
            borderRadius: 'var(--radius-lg, 16px)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
            overflow: 'hidden',
            border: '1px solid #e2e8f0'
          }} onClick={(e) => e.stopPropagation()}>
            
            <div style={{ backgroundColor: '#ffffff', padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'var(--accent-light, #e0e7ff)' }}>
                  <TrendingUp size={20} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                    Conversion Rate Analytics
                  </h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                    Detailed pipeline conversion performance details
                  </p>
                </div>
              </div>
              <button onClick={() => setIsAnalyticsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.25rem' }}>×</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div style={{ padding: '16px', borderRadius: '12px', backgroundColor: 'var(--accent-light, #e0e7ff)', border: '1px solid var(--accent-primary, #cbd5e1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>Overall Conversion Rate</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary, #4f46e5)' }}>{conversionRate}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16a34a' }}>{acceptedCount} Converted</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>out of {totalQuotes} total quotes</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: '#334155' }}>Total Pipeline Value:</span>
                  <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{totalPipelineValue.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: '#166534' }}>Converted Value:</span>
                  <span style={{ fontWeight: 700, color: '#15803d' }}>₹{acceptedPipelineValue.toLocaleString('en-IN')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', backgroundColor: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.85rem' }}>
                  <span style={{ fontWeight: 600, color: '#92400e' }}>Pending Draft Value:</span>
                  <span style={{ fontWeight: 700, color: '#b45309' }}>₹{draftPipelineValue.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={() => setIsAnalyticsModalOpen(false)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 'var(--radius-md, 8px)',
                    backgroundColor: 'var(--accent-primary, #4f46e5)',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer'
                  }}
                >
                  Close
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {editingQuotation && (
        <EditQuotationModal 
          quotation={editingQuotation} 
          onClose={() => setEditingQuotation(null)} 
        />
      )}
    </div>
  );
}
