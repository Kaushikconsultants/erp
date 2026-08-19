import React from 'react';
import { getQuotations } from '@/app/actions/quotationActions';
import Link from 'next/link';
import { FileSpreadsheet, Plus, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import QuotationTableClient from '@/components/quotations/QuotationTableClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QuotationsPage() {
  const res = await getQuotations();
  const quotations = res.success ? (res.quotations as any[]) : [];

  // Calculate Dashboard Metrics
  const totalQuotes = quotations.length;
  const draftQuotes = quotations.filter(q => q.status === 'Draft').length;
  const acceptedQuotes = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;
  
  const totalValue = quotations.reduce((sum, q) => sum + q.totalValue, 0);
  const acceptedValue = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').reduce((sum, q) => sum + q.totalValue, 0);
  
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* STANDARD SOFTWARE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a', fontFamily: 'inherit' }}>
            <FileSpreadsheet style={{ color: 'var(--accent-primary, #4f46e5)' }} size={28} /> 
            Quotation Dashboard
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Manage your estimates, track conversion pipelines, and issue sales orders.
          </p>
        </div>
        <Link 
          href="/quotations/new" 
          style={{ 
            backgroundColor: 'var(--accent-primary, #4f46e5)', 
            color: '#ffffff', 
            padding: '10px 20px', 
            borderRadius: 'var(--radius-md, 8px)', 
            textDecoration: 'none', 
            fontWeight: 600, 
            fontSize: '0.875rem',
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.15s ease'
          }}
        >
          <Plus size={18} /> Create New Quote
        </Link>
      </div>

      {/* ─── ANALYTICS KPI CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        
        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg, 12px)', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ color: 'var(--accent-primary, #4f46e5)' }} size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>Total Pipeline Value</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>₹{totalValue.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg, 12px)', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#dcfce7', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 color="#16a34a" size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>Accepted / Converted</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>₹{acceptedValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg, 12px)', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock color="#d97706" size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>Pending Drafts</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{draftQuotes} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: '#64748b' }}>quotes</span></div>
          </div>
        </div>

        <div style={{ padding: '20px', borderRadius: 'var(--radius-lg, 12px)', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '12px', borderRadius: 'var(--radius-md, 10px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 style={{ color: 'var(--accent-primary, #4f46e5)' }} size={22} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginBottom: '2px' }}>Conversion Rate</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, color: '#0f172a' }}>{conversionRate}%</div>
          </div>
        </div>

      </div>

      {/* ─── QUOTATIONS LIST TABLE ─── */}
      <QuotationTableClient initialQuotations={quotations} />
      
    </div>
  );
}
