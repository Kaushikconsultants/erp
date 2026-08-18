"use client";
import React from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { IncentiveResult } from '@/lib/incentiveEngine';
import { Users, PhoneCall, ShoppingCart, CalendarRange, Sparkles, Pencil, CheckCircle2, X } from 'lucide-react';
import Link from 'next/link';
import { removeFollowUp, rescheduleFollowUp } from '@/app/actions/callActions';

function FollowUpCard({ call }: { call: any }) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [newDate, setNewDate] = React.useState('');
  const [isProcessing, setIsProcessing] = React.useState(false);

  const handleRemove = async () => {
    setIsProcessing(true);
    await removeFollowUp(call.id);
    setIsProcessing(false);
  };

  const handleReschedule = async () => {
    if (!newDate) return;
    setIsProcessing(true);
    await rescheduleFollowUp(call.id, newDate);
    setIsProcessing(false);
    setIsEditing(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', backgroundColor: 'white', padding: '16px', borderRadius: '8px', border: '1px solid #fcd34d', opacity: isProcessing ? 0.6 : 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1e293b' }}>{call.customer?.businessName || 'Unknown Customer'}</h4>
          <p style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' }}>
            Previous Notes: {call.notes || 'No notes'}
          </p>
        </div>
      </div>
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <input 
            type="date" 
            value={newDate} 
            onChange={(e) => setNewDate(e.target.value)}
            className="zoho-input-field" 
            style={{ padding: '6px 10px', fontSize: '14px' }}
          />
          <button onClick={handleReschedule} disabled={!newDate} className="primary-btn" style={{ padding: '6px 12px', fontSize: '14px' }}>Save</button>
          <button onClick={() => setIsEditing(false)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '14px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
          <Link href={`/calls?customerId=${call.customerId}`} className="action-btn outline-success" style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '13px' }}>
            <PhoneCall size={14} /> Log Next Action
          </Link>
          <button onClick={() => setIsEditing(true)} className="action-btn outline-primary" style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer' }}>
            <Pencil size={14} /> Reschedule
          </button>
          <button onClick={handleRemove} className="action-btn" style={{ padding: '6px 12px', fontSize: '13px', cursor: 'pointer', border: '1px solid #ef4444', color: '#ef4444', backgroundColor: 'transparent' }}>
            <CheckCircle2 size={14} /> Mark Done
          </button>
        </div>
      )}
    </div>
  );
}

interface EmployeeDashboardProps {
  employee: any;
  isCheckedIn: boolean;
  isCheckedOut: boolean;
  incentiveData: IncentiveResult;
  todayFollowUps?: any[];
}

export default function EmployeeDashboard({ 
  employee, 
  isCheckedIn, 
  isCheckedOut, 
  incentiveData,
  todayFollowUps = []
}: EmployeeDashboardProps) {

  const totalPayout = (employee?.salary || 0) + incentiveData.totalIncentive;

  return (
    <div className="dashboard-container employee-dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Welcome back, {employee?.user?.name || 'Team Member'}! 👋</h1>
          <p className="page-subtitle">Let's crush those targets today.</p>
        </div>
        <div>
          <CheckInButton isCheckedIn={isCheckedIn} isCheckedOut={isCheckedOut} />
        </div>
      </div>

      {/* TODAY'S FOLLOW-UPS HIGHLIGHT */}
      {todayFollowUps.length > 0 && (
        <div className="zoho-card" style={{ borderLeft: '4px solid #f59e0b', backgroundColor: '#fffbeb' }}>
          <div className="zoho-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
            <div className="zoho-title-group">
              <div className="zoho-title-icon" style={{ backgroundColor: '#fef3c7', color: '#d97706' }}>
                <PhoneCall size={20} />
              </div>
              <div>
                <h2 className="zoho-title" style={{ color: '#92400e' }}>You have {todayFollowUps.length} Follow-ups Today!</h2>
                <p className="zoho-subtitle" style={{ color: '#b45309' }}>Don't forget to call them and log your progress.</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '16px 24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {todayFollowUps.map((call: any) => (
                <FollowUpCard key={call.id} call={call} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Live Earnings Meter (Zoho Style) */}
      <div className="zoho-card">
        <div className="zoho-header">
          <div className="zoho-title-group">
            <div className="zoho-title-icon">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="zoho-title">Earnings & Performance</h2>
              <p className="zoho-subtitle">Track your monthly targets and payouts</p>
            </div>
          </div>
          <div className="zoho-payout-box">
            <span className="zoho-payout-label">Total Est. Payout</span>
            <span className="zoho-payout-amount">₹{totalPayout.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
          </div>
        </div>

        <div className="zoho-kpi-grid">
          <div className="zoho-kpi-item primary-border">
            <div className="zoho-kpi-label">Base Salary</div>
            <div className="zoho-kpi-value">₹{(employee?.salary || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="zoho-kpi-item success-border">
            <div className="zoho-kpi-label">Total Incentive</div>
            <div className="zoho-kpi-value">₹{Math.round(incentiveData.totalIncentive).toLocaleString('en-IN')}</div>
          </div>
          <div className="zoho-kpi-item warning-border">
            <div className="zoho-kpi-label">Monthly Sales</div>
            <div className="zoho-kpi-value">₹{Math.round(incentiveData.eligibleSales + incentiveData.flatSales).toLocaleString('en-IN')}</div>
          </div>
          <div className="zoho-kpi-item info-border">
            <div className="zoho-kpi-label">Target Goal</div>
            <div className="zoho-kpi-value">₹{(employee?.target || 500000).toLocaleString('en-IN')}</div>
          </div>
        </div>

        {/* Incentive Breakdown Card */}
        <div style={{ marginTop: '20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
            Incentive Breakdown
          </div>

          {/* Slab info row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Qualifying Sales (0–15% disc): </span>
              <span style={{ fontWeight: 700, color: '#0f172a' }}>₹{Math.round(incentiveData.eligibleSales).toLocaleString('en-IN')}</span>
            </div>
            <span style={{ 
              background: '#ede9fe', color: '#6d28d9', padding: '3px 10px', 
              borderRadius: '12px', fontSize: '0.8rem', fontWeight: 700 
            }}>
              Slab: {incentiveData.currentSlab}
            </span>
          </div>

          {/* Breakdown rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
              <span style={{ color: '#475569' }}>
                Slab Incentive ({incentiveData.slabRate}% on ₹{Math.round(incentiveData.eligibleSales).toLocaleString('en-IN')}):
              </span>
              <span style={{ fontWeight: 600, color: '#059669' }}>+₹{Math.round(incentiveData.slabIncentive).toLocaleString('en-IN')}</span>
            </div>

            {incentiveData.bonusIncentive > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#475569' }}>
                  0% Discount Bonus (2% on ₹{Math.round(incentiveData.zeroDiscountSales).toLocaleString('en-IN')}):
                </span>
                <span style={{ fontWeight: 600, color: '#059669' }}>+₹{Math.round(incentiveData.bonusIncentive).toLocaleString('en-IN')}</span>
              </div>
            )}

            {incentiveData.flatIncentive > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem' }}>
                <span style={{ color: '#475569' }}>
                  Credit/High-Disc Flat (1% on ₹{Math.round(incentiveData.flatSales).toLocaleString('en-IN')}):
                </span>
                <span style={{ fontWeight: 600, color: '#059669' }}>+₹{Math.round(incentiveData.flatIncentive).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #e2e8f0', paddingTop: '8px', marginTop: '4px', fontSize: '1rem', fontWeight: 800 }}>
              <span style={{ color: '#0f172a' }}>Total Incentive:</span>
              <span style={{ color: '#4f46e5' }}>₹{Math.round(incentiveData.totalIncentive).toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Next slab hint */}
          {incentiveData.nextSlabAt !== null && incentiveData.nextSlabAt > 0 && (
            <div style={{ marginTop: '12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#92400e' }}>
              💡 Sell <strong>₹{Math.round(incentiveData.nextSlabAt).toLocaleString('en-IN')}</strong> more this month to move to the <strong>{incentiveData.nextSlabPercent}%</strong> slab!
            </div>
          )}
          {incentiveData.nextSlabAt === null && (
            <div style={{ marginTop: '12px', background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '10px 14px', fontSize: '0.8rem', color: '#166534' }}>
              🚀 <strong>Maximum slab achieved!</strong> You're in the top 5% incentive bracket.
            </div>
          )}
        </div>

        {/* Target progress bar */}
        <div className="zoho-progress-section" style={{ marginTop: '16px' }}>
          <div className="zoho-progress-header">
            <span>Target Achievement</span>
            <span>{incentiveData.targetAchievementPercentage}%</span>
          </div>
          <div className="zoho-progress-track">
            <div 
              className="zoho-progress-fill" 
              style={{ width: `${Math.min(100, incentiveData.targetAchievementPercentage)}%` }}
            />
          </div>
        </div>
      </div>


      {/* Quick Actions */}
      <div style={{ marginTop: '24px' }}>
        <div className="quick-actions-card">
          <h3 className="section-title">
            <Sparkles size={18} /> Quick Actions
          </h3>
          <div className="quick-actions-row">
            <Link href="/customers" className="action-btn outline-primary">
              <Users size={16} /> View Customers
            </Link>
            <Link href="/calls" className="action-btn outline-success">
              <PhoneCall size={16} /> Log Call
            </Link>
            <Link href="/orders" className="action-btn outline-warning">
              <ShoppingCart size={16} /> Create Order
            </Link>
            <Link href="/leaves" className="action-btn outline-info">
              <CalendarRange size={16} /> Request Leave
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
