import React from 'react';

export default function CustomersLoading() {
  return (
    <div className="page-container" style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ width: '160px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '400px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '150px', height: '42px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Filter / Search Bar */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '220px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
        <div style={{ width: '160px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
        <div style={{ width: '160px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Customer Table Skeleton */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ height: '48px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '24px', padding: '0 12px' }}>
          {[160, 140, 120, 110, 100, 80].map((w, i) => (
            <div key={i} style={{ width: `${w}px`, height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div key={row} style={{ height: '62px', borderBottom: row === 7 ? 'none' : '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '24px', padding: '0 12px' }}>
            <div style={{ width: '160px', height: '18px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '140px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '120px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '100px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '80px', height: '22px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'custPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '70px', height: '28px', backgroundColor: '#f1f5f9', borderRadius: '6px', marginLeft: 'auto', animation: 'custPulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes custPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
