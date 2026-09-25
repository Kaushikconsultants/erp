import React from 'react';

export default function FollowUpsLoading() {
  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ width: '220px', height: '30px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '320px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '6px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '160px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3].map((i) => (
          <div key={i} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '80px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '10px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '50px', height: '28px', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      {/* Follow-up Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
        {[1, 2, 3, 4, 5, 6].map((card) => (
          <div key={card} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ width: '140px', height: '18px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
              <div style={{ width: '80px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
            </div>
            <div style={{ width: '180px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '16px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
            <div style={{ display: 'flex', gap: '8px', paddingTop: '10px', borderTop: '1px solid #f8fafc' }}>
              <div style={{ flex: 1, height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
              <div style={{ width: '40px', height: '32px', backgroundColor: '#f1f5f9', borderRadius: '6px', animation: 'fuPulse 1.5s infinite ease-in-out' }} />
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fuPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
