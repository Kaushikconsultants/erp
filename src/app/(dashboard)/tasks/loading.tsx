import React from 'react';

export default function TasksLoading() {
  return (
    <div style={{ padding: '24px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Header Card */}
      <div style={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ width: '48px', height: '48px', backgroundColor: '#e2e8f0', borderRadius: '10px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
          <div>
            <div style={{ width: '220px', height: '26px', backgroundColor: '#e2e8f0', borderRadius: '6px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
            <div style={{ width: '360px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', marginTop: '6px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
          </div>
        </div>
        <div style={{ width: '130px', height: '40px', backgroundColor: '#e2e8f0', borderRadius: '8px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {['All Tasks', 'Pending', 'In Progress', 'Completed'].map((tab, i) => (
          <div key={i} style={{ width: '100px', height: '36px', backgroundColor: i === 0 ? '#e0e7ff' : '#f1f5f9', borderRadius: '8px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
        ))}
      </div>

      {/* Task List Skeleton */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[1, 2, 3, 4, 5].map((item) => (
          <div
            key={item}
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '20px', height: '20px', backgroundColor: '#e2e8f0', borderRadius: '4px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
              <div>
                <div style={{ width: '240px', height: '16px', backgroundColor: '#e2e8f0', borderRadius: '4px', marginBottom: '6px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
                <div style={{ width: '160px', height: '12px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '80px', height: '24px', backgroundColor: '#f1f5f9', borderRadius: '12px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
              <div style={{ width: '90px', height: '14px', backgroundColor: '#f1f5f9', borderRadius: '4px', animation: 'taskPulse 1.5s infinite ease-in-out' }} />
            </div>
          </div>
        ))}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes taskPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      ` }} />
    </div>
  );
}
