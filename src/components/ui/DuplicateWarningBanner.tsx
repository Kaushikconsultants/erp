"use client";

import React from 'react';
import { AlertTriangle, ExternalLink, ArrowRight, X, ShieldAlert, GitMerge } from 'lucide-react';
import Link from 'next/link';

export interface DuplicateEntityInfo {
  id: string;
  type: 'CUSTOMER' | 'LEAD';
  name: string;
  phone: string;
  email?: string | null;
  stage?: string;
  assignedAgent?: string | null;
  businessName?: string | null;
  createdAt: Date | string;
}

interface DuplicateWarningBannerProps {
  matchType?: 'PHONE' | 'EMAIL' | 'NAME';
  confidence?: number;
  entity: DuplicateEntityInfo;
  onDismiss?: () => void;
  onSelectExisting?: (entity: DuplicateEntityInfo) => void;
}

export default function DuplicateWarningBanner({
  matchType = 'PHONE',
  confidence = 100,
  entity,
  onDismiss,
  onSelectExisting
}: DuplicateWarningBannerProps) {
  const matchReasonText = 
    matchType === 'PHONE' ? `Matching Phone (${entity.phone})` :
    matchType === 'EMAIL' ? `Matching Email (${entity.email})` :
    `Similar Name ("${entity.name}")`;

  const profileUrl = entity.type === 'CUSTOMER' 
    ? `/customers/${entity.id}` 
    : `/leads?highlight=${entity.id}`;

  return (
    <div style={{
      backgroundColor: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: '12px',
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      boxShadow: '0 2px 6px rgba(245, 158, 11, 0.08)',
      animation: 'fadeIn 0.2s ease-in-out'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            color: '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={14} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#92400e' }}>
            Possible Duplicate {entity.type === 'CUSTOMER' ? 'Customer' : 'Lead'} Detected
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: '#fef3c7',
            color: '#b45309',
            fontWeight: 600
          }}>
            {confidence}% Match ({matchReasonText})
          </span>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss warning"
            style={{
              background: 'none',
              border: 'none',
              color: '#b45309',
              cursor: 'pointer',
              padding: '2px'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Entity Details Card */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #fef3c7',
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            backgroundColor: entity.type === 'CUSTOMER' ? '#e0e7ff' : '#ecfdf5',
            color: entity.type === 'CUSTOMER' ? '#4f46e5' : '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {entity.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{entity.name}</span>
              <span style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                padding: '1px 6px',
                borderRadius: '4px',
                backgroundColor: entity.type === 'CUSTOMER' ? '#e0e7ff' : '#ecfdf5',
                color: entity.type === 'CUSTOMER' ? '#4f46e5' : '#047857'
              }}>
                {entity.type}
              </span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {entity.phone} • Rep: {entity.assignedAgent || 'Unassigned'} • Stage: {entity.stage || 'Active'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Link
            href={profileUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '5px 10px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none'
            }}
          >
            <span>View Record</span>
            <ExternalLink size={12} />
          </Link>

          {onSelectExisting && (
            <button
              type="button"
              onClick={() => onSelectExisting(entity)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                backgroundColor: '#d97706',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.76rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <GitMerge size={12} />
              <span>Use Existing</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
