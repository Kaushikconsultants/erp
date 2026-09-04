"use client";
import React from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { PhoneCall, CheckSquare, CalendarRange, Sparkles, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface TelecallerDashboardProps {
  employee: any;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  todayTasks: any[];
  missedCalls: any[];
  todayCallsCount: number;
  recommendations?: any;
}

export default function TelecallerDashboard({ 
  employee, 
  isCheckedIn, 
  isCheckedOut, 
  checkInTime,
  checkOutTime,
  todayTasks,
  missedCalls,
  todayCallsCount,
  recommendations
}: TelecallerDashboardProps) {

  const dailyTarget = 50; // Hardcoded default, could be dynamic
  const targetPercent = Math.min(100, Math.round((todayCallsCount / dailyTarget) * 100));

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Welcome back, {employee?.user?.name || 'Telecaller'}! 🎧</h1>
          <p className="page-subtitle">Let's hit your call targets today.</p>
        </div>
      </div>

      <div className="zoho-card">
        <div className="zoho-header">
          <div className="zoho-title-group">
            <div className="zoho-title-icon">
              <PhoneCall size={20} />
            </div>
            <div>
              <h2 className="zoho-title">Daily Call Target</h2>
              <p className="zoho-subtitle">Your progress for today</p>
            </div>
          </div>
          <div className="zoho-payout-box">
            <span className="zoho-payout-label">Calls Made</span>
            <span className="zoho-payout-amount">{todayCallsCount} / {dailyTarget}</span>
          </div>
        </div>

        <div className="zoho-progress-section">
          <div className="zoho-progress-header">
            <span>Target Achievement</span>
            <span>{targetPercent}%</span>
          </div>
          <div className="zoho-progress-track">
            <div 
              className="zoho-progress-fill" 
              style={{ width: `${targetPercent}%`, background: targetPercent >= 100 ? 'var(--success)' : 'var(--accent-primary)' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        
        {/* Today's Tasks */}
        <div className="zoho-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CheckSquare size={18} style={{ color: 'var(--accent-primary)' }} /> Today's Follow-up Tasks
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {todayTasks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No tasks scheduled for today. Great job!</p>
            ) : (
              todayTasks.map(task => (
                <div key={task.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', background: '#fafafa' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '4px' }}>{task.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{task.description}</div>
                  {task.customerId && (
                    <Link href={`/customers/${task.customerId}`} style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '8px', display: 'inline-block', fontWeight: 500 }}>
                      View Customer →
                    </Link>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Missed Calls */}
        <div className="zoho-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <AlertCircle size={18} style={{ color: 'var(--danger)' }} /> Re-engagement List
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Recent unanswered or missed calls to try again.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {missedCalls.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No missed calls to retry.</p>
            ) : (
              missedCalls.map(call => {
                const name = call.customer?.businessName || call.lead?.shopName || call.lead?.name || 'Customer';
                const targetLink = call.customerId ? `/customers/${call.customerId}` : call.leadId ? `/leads/${call.leadId}` : '/calls';
                return (
                  <div key={call.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Outcome: {call.outcome}</div>
                    </div>
                    <Link href={targetLink} className="action-btn outline-primary" style={{ padding: '6px 12px', fontSize: '0.8rem', border: '1px solid var(--border)', borderRadius: '6px', textDecoration: 'none' }}>
                      Call Now
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* AI Smart Recommendations */}
      {recommendations && (
        <div className="zoho-card" style={{ marginTop: '24px' }}>
          <h3 className="section-title">
            <Sparkles size={18} style={{ color: 'var(--warning)' }} /> AI Sales Follow-Up Engine
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ border: '1px solid #fee2e2', background: '#fef2f2', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 600, color: '#991b1b', marginBottom: '12px' }}>Overdue Follow-ups</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recommendations.overdue?.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#991b1b' }}>All caught up!</p>
                ) : (
                  recommendations.overdue?.slice(0, 5).map((f: any) => (
                    <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{f.customer?.businessName} - {new Date(f.date).toLocaleDateString()}</span>
                      <Link href={`/customers/${f.customerId}`} className="action-btn outline-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>View</Link>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div style={{ border: '1px solid #dcfce7', background: '#f0fdf4', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ fontWeight: 600, color: '#166534', marginBottom: '12px' }}>Reorder Opportunities</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {recommendations.reorderDue?.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: '#166534' }}>No immediate reorders predicted.</p>
                ) : (
                  recommendations.reorderDue?.map((c: any) => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '4px' }}>
                      <span style={{ fontSize: '0.85rem' }}>{c.businessName} (Last active {new Date(c.lastContactDate).toLocaleDateString()})</span>
                      <Link href={`/customers/${c.id}`} className="action-btn outline-primary" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>Contact</Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Attendance */}
      <div className="zoho-card">
        <h3 className="section-title">
          <CalendarRange size={18} /> Attendance
        </h3>
        <div className="attendance-content">
          <CheckInButton 
            isCheckedIn={isCheckedIn} 
            isCheckedOut={isCheckedOut} 
            checkInTime={checkInTime}
            checkOutTime={checkOutTime}
          />
        </div>
      </div>

    </div>
  );
}
