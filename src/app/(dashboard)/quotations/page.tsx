import React from 'react';
import { getQuotations } from '@/app/actions/quotationActions';
import Link from 'next/link';
import { FileSpreadsheet, Plus } from 'lucide-react';
import QuotationTableClient from '@/components/quotations/QuotationTableClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QuotationsPage() {
  const res = await getQuotations();
  const quotations = res.success ? (res.quotations as any[]) : [];

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* STANDARD SOFTWARE HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
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

      {/* ─── CLICKABLE KPI CARDS & TABLE ─── */}
      <QuotationTableClient initialQuotations={quotations} />
      
    </div>
  );
}
