import React from 'react';

export default function QuotationDetailLoading() {
  return (
    <div style={{ backgroundColor: '#f1f5f9', minHeight: '100vh', padding: '20px 12px 100px 12px' }}>
      <style>{`
        @keyframes detailPulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.4; }
        }
        .detail-skeleton {
          background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
          background-size: 200% 100%;
          animation: detailPulse 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      {/* Top Floating Action Bar */}
      <div style={{ maxWidth: '900px', margin: '0 auto 14px auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div className="detail-skeleton" style={{ width: '140px', height: '18px' }} />
          <div className="detail-skeleton" style={{ width: '100px', height: '18px' }} />
        </div>

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div className="detail-skeleton" style={{ width: '70px', height: '32px', borderRadius: '6px' }} />
          <div className="detail-skeleton" style={{ width: '120px', height: '32px', borderRadius: '6px' }} />
          <div className="detail-skeleton" style={{ width: '150px', height: '32px', borderRadius: '6px' }} />
          <div className="detail-skeleton" style={{ width: '110px', height: '32px', borderRadius: '6px' }} />
          <div className="detail-skeleton" style={{ width: '80px', height: '32px', borderRadius: '6px' }} />
        </div>
      </div>

      {/* Quotation Document Paper Skeleton */}
      <div style={{ maxWidth: '900px', margin: '0 auto', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)' }}>
        <div 
          style={{
            maxWidth: '820px',
            margin: '0 auto',
            backgroundColor: '#ffffff',
            padding: '36px',
            border: '1px solid #e2e8f0',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}
        >
          {/* Header Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div className="detail-skeleton" style={{ width: '64px', height: '64px', borderRadius: '8px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div className="detail-skeleton" style={{ width: '220px', height: '22px' }} />
                <div className="detail-skeleton" style={{ width: '160px', height: '14px' }} />
                <div className="detail-skeleton" style={{ width: '130px', height: '14px' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div className="detail-skeleton" style={{ width: '140px', height: '28px' }} />
              <div className="detail-skeleton" style={{ width: '110px', height: '16px' }} />
              <div className="detail-skeleton" style={{ width: '90px', height: '14px' }} />
            </div>
          </div>

          {/* Customer & Quote Meta Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="detail-skeleton" style={{ width: '80px', height: '14px' }} />
              <div className="detail-skeleton" style={{ width: '180px', height: '18px' }} />
              <div className="detail-skeleton" style={{ width: '140px', height: '14px' }} />
              <div className="detail-skeleton" style={{ width: '120px', height: '14px' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
              <div className="detail-skeleton" style={{ width: '120px', height: '14px' }} />
              <div className="detail-skeleton" style={{ width: '100px', height: '14px' }} />
              <div className="detail-skeleton" style={{ width: '140px', height: '14px' }} />
            </div>
          </div>

          {/* Items Table Skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
            <div className="detail-skeleton" style={{ width: '100%', height: '32px' }} />
            {[1, 2, 3, 4].map(r => (
              <div key={r} style={{ display: 'grid', gridTemplateColumns: '40px 3fr 1fr 1fr 1fr 1.2fr', gap: '12px', alignItems: 'center', padding: '8px 0' }}>
                <div className="detail-skeleton" style={{ height: '16px' }} />
                <div className="detail-skeleton" style={{ height: '16px' }} />
                <div className="detail-skeleton" style={{ height: '16px' }} />
                <div className="detail-skeleton" style={{ height: '16px' }} />
                <div className="detail-skeleton" style={{ height: '16px' }} />
                <div className="detail-skeleton" style={{ height: '16px' }} />
              </div>
            ))}
          </div>

          {/* Totals Summary Skeleton */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
            <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="detail-skeleton" style={{ width: '70px', height: '14px' }} />
                <div className="detail-skeleton" style={{ width: '90px', height: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className="detail-skeleton" style={{ width: '60px', height: '14px' }} />
                <div className="detail-skeleton" style={{ width: '70px', height: '14px' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                <div className="detail-skeleton" style={{ width: '80px', height: '22px' }} />
                <div className="detail-skeleton" style={{ width: '110px', height: '22px' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
