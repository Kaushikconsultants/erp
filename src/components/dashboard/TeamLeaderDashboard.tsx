"use client";
import React from 'react';
import { Users, PhoneCall, Clock, BarChart3, TrendingUp } from 'lucide-react';
import Link from 'next/link';

interface TeamLeaderDashboardProps {
  teamMembers: any[];
  teamCallsToday: any[];
}

export default function TeamLeaderDashboard({ teamMembers, teamCallsToday }: TeamLeaderDashboardProps) {

  const totalCalls = teamCallsToday.length;
  
  const connectedCalls = teamCallsToday.filter(c => 
    !["No Answer", "Busy", "Voicemail", "Missed"].includes(c.outcome)
  ).length;

  const connectRate = totalCalls > 0 ? Math.round((connectedCalls / totalCalls) * 100) : 0;

  const totalDuration = teamCallsToday.reduce((sum, call) => sum + (call.durationSec || 0), 0);
  const avgTalkTime = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;

  // Group calls by employee
  const employeeStats = teamMembers.map(emp => {
    const empCalls = teamCallsToday.filter(c => c.employeeId === emp.id);
    const empConnected = empCalls.filter(c => !["No Answer", "Busy", "Voicemail", "Missed"].includes(c.outcome)).length;
    return {
      id: emp.id,
      name: emp.user?.name || "Unknown",
      total: empCalls.length,
      connected: empConnected,
      rate: empCalls.length > 0 ? Math.round((empConnected / empCalls.length) * 100) : 0
    };
  }).sort((a, b) => b.total - a.total);

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Team Leader Dashboard</h1>
          <p className="page-subtitle">Real-time telecalling metrics and team performance.</p>
        </div>
      </div>

      <div className="zoho-kpi-grid">
        <div className="zoho-kpi-item primary-border">
          <div className="zoho-kpi-label">Total Calls Today</div>
          <div className="zoho-kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PhoneCall size={24} style={{ color: 'var(--accent-primary)' }} /> {totalCalls}
          </div>
        </div>
        <div className="zoho-kpi-item success-border">
          <div className="zoho-kpi-label">Connect Rate</div>
          <div className="zoho-kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={24} style={{ color: 'var(--success)' }} /> {connectRate}%
          </div>
        </div>
        <div className="zoho-kpi-item warning-border">
          <div className="zoho-kpi-label">Average Talk Time</div>
          <div className="zoho-kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={24} style={{ color: '#f59e0b' }} /> {avgTalkTime}s
          </div>
        </div>
        <div className="zoho-kpi-item info-border">
          <div className="zoho-kpi-label">Active Agents</div>
          <div className="zoho-kpi-value" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={24} style={{ color: '#0ea5e9' }} /> {employeeStats.filter(e => e.total > 0).length} / {teamMembers.length}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        
        {/* Team Member Leaderboard */}
        <div className="zoho-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <BarChart3 size={18} style={{ color: 'var(--accent-primary)' }} /> Agent Call Activity
          </h3>
          <div className="table-responsive">
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Agent Name</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Total Calls</th>
                  <th style={{ textAlign: 'center', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Connected</th>
                  <th style={{ textAlign: 'right', padding: '12px', color: 'var(--text-muted)', borderBottom: '1px solid var(--border)' }}>Connect %</th>
                </tr>
              </thead>
              <tbody>
                {employeeStats.map(emp => (
                  <tr key={emp.id}>
                    <td style={{ padding: '12px', borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{emp.name}</td>
                    <td style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>{emp.total}</td>
                    <td style={{ textAlign: 'center', padding: '12px', borderBottom: '1px solid var(--border)' }}>{emp.connected}</td>
                    <td style={{ textAlign: 'right', padding: '12px', borderBottom: '1px solid var(--border)', color: emp.rate >= 30 ? 'var(--success)' : 'var(--danger)' }}>
                      {emp.rate}%
                    </td>
                  </tr>
                ))}
                {employeeStats.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No agents found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Pipeline Velocity (Placeholder) */}
        <div className="zoho-card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <TrendingUp size={18} style={{ color: 'var(--success)' }} /> Pipeline Velocity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>New Leads Contacted</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{teamCallsToday.filter(c => c.customer?.status === 'New Lead').length}</div>
            </div>
            <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '4px' }}>Follow-ups Completed</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{teamCallsToday.filter(c => c.callType === 'Follow Up').length}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
