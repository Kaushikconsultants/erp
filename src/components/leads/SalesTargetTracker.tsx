"use client";

import React, { useState, useEffect } from 'react';
import { getSalesTargetLeaderboard, RepSalesTargetPerformance } from '@/app/actions/salesTargetActions';
import { Target, Trophy, TrendingUp, Award, DollarSign, Phone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SalesTargetTracker() {
  const [data, setData] = useState<{
    monthName?: string;
    totalTarget?: number;
    totalAchieved?: number;
    teamPercent?: number;
    leaderboard?: RepSalesTargetPerformance[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSalesTargetLeaderboard().then(res => {
      if (res.success) {
        setData(res);
      }
      setLoading(false);
    });
  }, []);

  const fmt = (n: number) => {
    if (!n || n === 0) return '₹0';
    if (n >= 100000) return `₹${(n / 100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
    return `₹${n.toLocaleString('en-IN')}`;
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>
        Loading sales targets and performance leaderboard...
      </div>
    );
  }

  if (!data || !data.leaderboard || data.leaderboard.length === 0) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
        <Target size={40} color="#94a3b8" style={{ margin: '0 auto 12px auto' }} />
        <h4 style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>No Sales Representatives Found</h4>
        <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
          Assign employees to the sales team in Settings &gt; Users to track their revenue targets.
        </p>
      </div>
    );
  }

  const teamTarget = data.totalTarget || 1;
  const teamAchieved = data.totalAchieved || 0;
  const teamPercent = data.teamPercent || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "var(--font-inter), 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}>
      
      {/* ─── TEAM SUMMARY PROGRESS CARD ─── */}
      <div style={{
        backgroundColor: '#ffffff',
        padding: '22px 26px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #dbeafe' }}>
              <Target size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 750, color: '#0f172a', letterSpacing: '-0.01em' }}>
                {data.monthName || 'Current Month'} Sales Target
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Team Goal: <strong style={{ color: '#0f172a' }}>{fmt(teamTarget)}</strong> • Achieved: <strong style={{ color: '#059669' }}>{fmt(teamAchieved)}</strong>
              </p>
            </div>
          </div>

          <div>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              padding: '5px 14px',
              borderRadius: '20px',
              backgroundColor: teamPercent >= 100 ? '#ecfdf5' : teamPercent >= 60 ? '#eff6ff' : '#fffbeb',
              color: teamPercent >= 100 ? '#059669' : teamPercent >= 60 ? '#2563eb' : '#d97706',
              border: `1px solid ${teamPercent >= 100 ? '#a7f3d0' : teamPercent >= 60 ? '#bfdbfe' : '#fde68a'}`
            }}>
              {teamPercent >= 100 ? '🎉 Target Exceeded!' : `${teamPercent}% Achieved`}
            </span>
          </div>
        </div>

        {/* Team Progress Bar */}
        <div style={{ width: '100%', height: '10px', backgroundColor: '#f1f5f9', borderRadius: '6px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min(100, teamPercent)}%`,
            height: '100%',
            background: teamPercent >= 100 ? 'linear-gradient(90deg, #10b981 0%, #059669 100%)' : teamPercent >= 60 ? 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)' : 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
            borderRadius: '6px',
            transition: 'width 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
          }} />
        </div>
      </div>

      {/* ─── SALES REP PERFORMANCE LEADERBOARD TABLE ─── */}
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Trophy size={18} color="#eab308" /> Sales Rep Leaderboard & Incentives
          </h4>
          <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
            Commission Rate: ~2.5% on Closed Deals
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '12px 18px', fontWeight: 700 }}>Rank & Representative</th>
                <th style={{ padding: '12px 14px', fontWeight: 700, minWidth: '160px' }}>Target Progress</th>
                <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700 }}>Closed Revenue</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Deals Won</th>
                <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>Calls Logged</th>
                <th style={{ padding: '12px 18px', textAlign: 'right', fontWeight: 700 }}>Est. Commission</th>
              </tr>
            </thead>
            <tbody>
              {data.leaderboard.map((rep, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                const rankEmoji = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`;

                return (
                  <tr key={rep.employeeId} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: idx % 2 === 0 ? '#ffffff' : '#fafafa', transition: 'background 0.15s ease' }}>
                    
                    {/* Rank & Rep Info */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: isTop3 ? '1.2rem' : '0.85rem', fontWeight: 700, minWidth: '24px' }}>
                          {rankEmoji}
                        </span>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.88rem' }}>
                            {rep.name}
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '1px' }}>
                            {rep.designation} {rep.email ? `• ${rep.email}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Progress Bar & Percentage */}
                    <td style={{ padding: '14px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: '#64748b', marginBottom: '5px' }}>
                        <span>Target: <strong>{fmt(rep.monthlyTarget)}</strong></span>
                        <strong style={{ color: rep.percentAchieved >= 100 ? '#059669' : '#0f172a' }}>
                          {rep.percentAchieved}%
                        </strong>
                      </div>
                      <div style={{ width: '100%', height: '7px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, rep.percentAchieved)}%`,
                          height: '100%',
                          backgroundColor: rep.percentAchieved >= 100 ? '#10b981' : rep.percentAchieved >= 60 ? '#4f46e5' : '#f59e0b',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </td>

                    {/* Closed Revenue */}
                    <td style={{ padding: '14px 14px', textAlign: 'right', fontWeight: 750, color: '#0f172a' }}>
                      {fmt(rep.achievedSales)}
                    </td>

                    {/* Won Deals */}
                    <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '12px',
                        backgroundColor: rep.dealsWonCount > 0 ? '#ecfdf5' : '#f1f5f9',
                        color: rep.dealsWonCount > 0 ? '#059669' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        border: rep.dealsWonCount > 0 ? '1px solid #a7f3d0' : '1px solid #e2e8f0'
                      }}>
                        {rep.dealsWonCount} won
                      </span>
                    </td>

                    {/* Calls Logged */}
                    <td style={{ padding: '14px 14px', textAlign: 'center', color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
                      {rep.totalCallsCount} calls
                    </td>

                    {/* Estimated Commission */}
                    <td style={{ padding: '14px 18px', textAlign: 'right', fontWeight: 750, color: '#059669', fontSize: '0.88rem' }}>
                      ₹{rep.estimatedCommission.toLocaleString('en-IN')}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
