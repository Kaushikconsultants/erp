import React from 'react';

export default function CallsLoading() {
  return (
    <div className="page-container" style={{ padding: "16px 12px", maxWidth: '1440px', margin: '0 auto' }}>
      {/* Top Header & Action Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ width: '180px', height: '28px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '280px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '6px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ width: '120px', height: '38px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '130px', height: '38px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
        {['Analytics', 'Call Queue', 'Call History', 'Playbook'].map((tab, i) => (
          <div key={i} style={{ width: '110px', height: '36px', backgroundColor: i === 0 ? '#e0e7ff' : '#f1f5f9', borderRadius: '8px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
        ))}
      </div>

      {/* KPI Cards Grid Skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map((c) => (
          <div key={c} style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '100px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginBottom: '10px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '60px', height: '28px', backgroundColor: '#e2e8f0', borderRadius: '6px', marginBottom: '8px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '120px', height: '12px', backgroundColor: '#f8fafc', borderRadius: '4px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      {/* Main Panel Skeleton */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ width: '200px', height: '20px', backgroundColor: '#e2e8f0', borderRadius: '6px', marginBottom: '16px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
        {[1, 2, 3, 4].map((item) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 0', borderBottom: item === 4 ? 'none' : '1px solid #f1f5f9' }}>
            <div style={{ width: '40px', height: '40px', backgroundColor: '#f1f5f9', borderRadius: '50%', animation: 'callPulse 1.5s infinite ease-in-out' }} />
            <div style={{ flex: 1 }}>
              <div style={{ width: '160px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '6px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
              <div style={{ width: '240px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
            </div>
            <div style={{ width: '90px', height: '24px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'callPulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes callPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
