import React from 'react';

export default function PipelineLoading() {
  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '100%', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ width: '240px', height: '30px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '380px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '6px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '130px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Kanban Board Columns Skeleton */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {['New Lead', 'Contacted', 'Qualified', 'Opportunity', 'Won'].map((col, idx) => (
          <div
            key={idx}
            style={{
              minWidth: '280px',
              maxWidth: '300px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Column Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ width: '100px', height: '18px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
              <div style={{ width: '28px', height: '18px', backgroundColor: '#e2e8f0', borderRadius: '10px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
            </div>

            {/* Column Cards */}
            {[1, 2, 3].slice(0, 4 - idx % 2).map((card) => (
              <div
                key={card}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '12px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ width: '70%', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
                <div style={{ width: '90%', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                  <div style={{ width: '50px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
                  <div style={{ width: '60px', height: '18px', backgroundColor: '#e0e7ff', borderRadius: '8px', animation: 'pipePulse 1.5s infinite ease-in-out' }} />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pipePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
