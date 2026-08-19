"use client";

import React from 'react';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
  style?: React.CSSProperties;
}

export function Skeleton({ 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px',
  className = '',
  style = {}
}: SkeletonProps) {
  return (
    <div 
      className={`skeleton-pulse ${className}`} 
      style={{
        width,
        height,
        borderRadius,
        backgroundColor: '#e2e8f0',
        backgroundImage: 'linear-gradient(90deg, #e2e8f0 0%, #f1f5f9 50%, #e2e8f0 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-loading 1.5s infinite ease-in-out',
        ...style
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="zoho-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <Skeleton width="44px" height="44px" borderRadius="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <Skeleton width="60%" height="16px" />
          <Skeleton width="40%" height="12px" />
        </div>
      </div>
      <Skeleton width="100%" height="14px" />
      <Skeleton width="80%" height="14px" />
    </div>
  );
}

export function SkeletonKpiGrid() {
  return (
    <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '8px' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{ minWidth: '140px', padding: '14px', borderRadius: '12px', backgroundColor: 'white', border: '1px solid #cbd5e1', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton width="40%" height="12px" />
          <Skeleton width="80%" height="22px" />
          <Skeleton width="60%" height="10px" />
        </div>
      ))}
    </div>
  );
}
