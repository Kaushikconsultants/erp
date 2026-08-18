import React from 'react';
import { getQuotations } from '@/app/actions/quotationActions';
import Link from 'next/link';
import { FileSpreadsheet, Plus, FileText, ArrowRight, BarChart3, Clock, CheckCircle, XCircle } from 'lucide-react';
import ConvertQuotationBtn from '@/components/quotations/ConvertQuotationBtn';
import QuotationTableClient from '@/components/quotations/QuotationTableClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function QuotationsPage() {
  const res = await getQuotations();
  const quotations = res.success ? (res.quotations as any[]) : [];

  // Calculate Dashboard Metrics
  const totalQuotes = quotations.length;
  const draftQuotes = quotations.filter(q => q.status === 'Draft').length;
  const sentQuotes = quotations.filter(q => q.status === 'Sent' || q.status === 'Viewed').length;
  const acceptedQuotes = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').length;
  
  const totalValue = quotations.reduce((sum, q) => sum + q.totalValue, 0);
  const acceptedValue = quotations.filter(q => q.status === 'Accepted' || q.status === 'Converted').reduce((sum, q) => sum + q.totalValue, 0);
  
  const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', fontFamily: '"Inter", sans-serif' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px', color: '#1e293b' }}>
            <FileSpreadsheet color="#4f46e5" size={32} /> Quotation Dashboard
          </h1>
          <p style={{ margin: 0, color: '#64748b' }}>Manage your estimates, track conversions, and convert to sales orders.</p>
        </div>
        <Link href="/quotations/new" style={{ backgroundColor: '#4f46e5', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>
          <Plus size={20} /> Create New Quote
        </Link>
      </div>

      {/* ─── ANALYTICS CARDS ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '32px' }}>
        
        <div className="zoho-form-card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#eef2ff', padding: '12px', borderRadius: '12px' }}>
            <BarChart3 color="#4f46e5" size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>Total Pipeline Value</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>₹{totalValue.toLocaleString('en-IN')}</div>
          </div>
        </div>
        
        <div className="zoho-form-card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#ecfdf5', padding: '12px', borderRadius: '12px' }}>
            <CheckCircle color="#10b981" size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>Accepted / Converted</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>₹{acceptedValue.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <div className="zoho-form-card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#fef3c7', padding: '12px', borderRadius: '12px' }}>
            <Clock color="#d97706" size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>Pending Drafts</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>{draftQuotes} <span style={{fontSize:'0.9rem', fontWeight:400, color:'#64748b'}}>quotes</span></div>
          </div>
        </div>

        <div className="zoho-form-card" style={{ padding: '20px', borderRadius: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ backgroundColor: '#f3e8ff', padding: '12px', borderRadius: '12px' }}>
            <BarChart3 color="#9333ea" size={24} />
          </div>
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500, marginBottom: '4px' }}>Conversion Rate</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#1e293b' }}>{conversionRate}%</div>
          </div>
        </div>

      </div>

      {/* ─── QUOTATIONS LIST ─── */}
      <QuotationTableClient initialQuotations={quotations} />
      
    </div>
  );
}
