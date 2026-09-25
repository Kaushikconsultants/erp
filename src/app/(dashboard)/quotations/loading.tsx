import React from 'react';
import { FileSpreadsheet, Plus } from 'lucide-react';

export default function QuotationsLoading() {
  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <style>{`
        @keyframes quotePulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.45; }
        }
        .quote-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: quotePulse 1.5s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px', color: '#0f172a' }}>
            <FileSpreadsheet style={{ color: 'var(--accent-primary, #4f46e5)' }} size={28} /> 
            Quotation Dashboard
          </h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Manage your estimates, track conversion pipelines, and issue sales orders.
          </p>
        </div>
        <div 
          style={{ 
            backgroundColor: 'var(--accent-primary, #4f46e5)', 
            color: '#ffffff', 
            padding: '10px 20px', 
            borderRadius: 'var(--radius-md, 8px)', 
            fontWeight: 600, 
            fontSize: '0.875rem',
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            opacity: 0.8
          }}
        >
          <Plus size={18} /> Create New Quote
        </div>
      </div>

      {/* 4 KPI CARDS SKELETON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            style={{ 
              backgroundColor: '#ffffff', 
              borderRadius: '12px', 
              padding: '18px 20px', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
            }}
          >
            <div className="quote-skeleton" style={{ width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="quote-skeleton" style={{ width: '60%', height: '14px' }} />
              <div className="quote-skeleton" style={{ width: '85%', height: '24px' }} />
              <div className="quote-skeleton" style={{ width: '45%', height: '12px' }} />
            </div>
          </div>
        ))}
      </div>

      {/* TABLE PANEL SKELETON */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
        {/* Table Toolbar Skeleton */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="quote-skeleton" style={{ width: '120px', height: '22px' }} />
            <div className="quote-skeleton" style={{ width: '32px', height: '20px', borderRadius: '12px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className="quote-skeleton" style={{ width: '140px', height: '36px' }} />
            <div className="quote-skeleton" style={{ width: '220px', height: '36px' }} />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 2fr 1.2fr 1.2fr 1fr 2fr', gap: '16px', alignItems: 'center', padding: '12px 0', borderBottom: row === 6 ? 'none' : '1px solid #f8fafc' }}>
              <div className="quote-skeleton" style={{ height: '18px', width: '70%' }} />
              <div className="quote-skeleton" style={{ height: '16px', width: '80%' }} />
              <div className="quote-skeleton" style={{ height: '18px', width: '85%' }} />
              <div className="quote-skeleton" style={{ height: '16px', width: '75%' }} />
              <div className="quote-skeleton" style={{ height: '18px', width: '90%' }} />
              <div className="quote-skeleton" style={{ height: '22px', width: '60px', borderRadius: '6px' }} />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <div className="quote-skeleton" style={{ width: '50px', height: '28px', borderRadius: '6px' }} />
                <div className="quote-skeleton" style={{ width: '50px', height: '28px', borderRadius: '6px' }} />
                <div className="quote-skeleton" style={{ width: '90px', height: '28px', borderRadius: '6px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
