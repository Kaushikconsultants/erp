import React from 'react';

export default function DashboardLoading() {
  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
      {/* Header Skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <div style={{ width: '220px', height: '32px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          <div style={{ width: '340px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        </div>
        <div style={{ width: '140px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Filter / Search Bar Skeleton */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <div style={{ flex: 1, height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ width: '160px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
        <div style={{ width: '160px', height: '44px', backgroundColor: '#f1f5f9', borderRadius: '8px', animation: 'pulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Content Table Skeleton */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ height: '48px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 12px' }}>
          {[120, 180, 140, 100, 80].map((w, i) => (
            <div key={i} style={{ width: `${w}px`, height: '14px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6, 7].map((row) => (
          <div key={row} style={{ height: '60px', borderBottom: row === 7 ? 'none' : '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: '16px', padding: '0 12px' }}>
            <div style={{ width: '120px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '180px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '140px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '100px', height: '22px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'pulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '80px', height: '16px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginLeft: 'auto', animation: 'pulse 1.5s infinite ease-in-out' }} />
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
