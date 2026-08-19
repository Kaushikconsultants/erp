"use client";
import React, { useState } from 'react';
import CheckInButton from '@/components/ui/CheckInButton';
import { IncentiveResult } from '@/lib/incentiveEngine';
import { 
  Users, 
  PhoneCall, 
  ShoppingCart, 
  CalendarRange, 
  Sparkles, 
  Pencil, 
  CheckCircle2, 
  MessageSquare,
  TrendingUp,
  Clock,
  Target,
  ArrowUpRight,
  PhoneForwarded,
  Award
} from 'lucide-react';
import Link from 'next/link';
import { removeFollowUp, rescheduleFollowUp } from '@/app/actions/callActions';

function FollowUpCard({ call }: { call: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

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

  const cleanPhone = (call.customer?.mobile || '').replace(/[^0-9]/g, '');
  const priority = call.priority || (call.customer?.leadStage === 'Negotiation' ? 'HIGH' : 'MEDIUM');

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: '#ffffff', 
      padding: '14px', 
      borderRadius: '12px', 
      border: priority === 'HIGH' ? '1px solid #f87171' : '1px solid #cbd5e1', 
      opacity: isProcessing ? 0.6 : 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>
              {call.customer?.businessName || 'Unknown Customer'}
            </h4>
            <span style={{ 
              fontSize: '10px', 
              fontWeight: 700, 
              padding: '2px 8px', 
              borderRadius: '10px',
              backgroundColor: priority === 'HIGH' ? '#fee2e2' : '#fef3c7',
              color: priority === 'HIGH' ? '#dc2626' : '#d97706'
            }}>
              {priority}
            </span>
          </div>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {call.customer?.contactPerson || 'Contact Person'} • {call.notes || 'Scheduled follow-up call'}
          </p>
        </div>
      </div>
      
      {isEditing ? (
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <input 
            type="date" 
            value={newDate} 
            onChange={(e) => setNewDate(e.target.value)}
            className="zoho-input-field" 
            style={{ padding: '6px 10px', fontSize: '13px' }}
          />
          <button onClick={handleReschedule} disabled={!newDate} className="primary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>Save</button>
          <button onClick={() => setIsEditing(false)} className="secondary-btn" style={{ padding: '6px 12px', fontSize: '13px' }}>Cancel</button>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #f1f5f9' }}>
          {cleanPhone && (
            <>
              <a 
                href={`tel:${cleanPhone}`} 
                className="action-btn outline-success" 
                style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <PhoneCall size={13} /> Call Now
              </a>
              <a 
                href={`https://wa.me/91${cleanPhone}`} 
                target="_blank" 
                rel="noreferrer" 
                className="action-btn" 
                style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#25D366', color: '#fff' }}
              >
                <MessageSquare size={13} /> WhatsApp
              </a>
            </>
          )}
          <Link href={`/calls?customerId=${call.customerId}`} className="action-btn outline-primary" style={{ textDecoration: 'none', padding: '6px 10px', fontSize: '12px' }}>
            Log Call
          </Link>
          <button onClick={() => setIsEditing(true)} className="action-btn" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #cbd5e1', color: '#475569', background: 'transparent' }}>
            <Pencil size={13} /> Reschedule
          </button>
          <button onClick={handleRemove} className="action-btn" style={{ padding: '6px 10px', fontSize: '12px', cursor: 'pointer', border: '1px solid #ef4444', color: '#ef4444', background: 'transparent' }}>
            <CheckCircle2 size={13} /> Done
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
  const todayDateStr = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="dashboard-container employee-dashboard">
      
      {/* ─── MOBILE COMMAND CENTER HEADER ─── */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {todayDateStr} • Today's Shift
          </span>
          <h1 className="page-title" style={{ fontSize: '1.25rem', marginTop: '2px' }}>
            Good Morning, {employee?.user?.name ? employee.user.name.split(' ')[0] : 'Team'}! 👋
          </h1>
        </div>
        <div>
          <CheckInButton isCheckedIn={isCheckedIn} isCheckedOut={isCheckedOut} />
        </div>
      </div>

      {/* ─── HORIZONTALLY SCROLLABLE KPI RAIL ─── */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Today's Performance
          </span>
          <span style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Swipe →</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px', scrollSnapType: 'x mandatory' }}>
          
          <div style={{ minWidth: '135px', padding: '12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', scrollSnapAlign: 'start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Monthly Sales</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
              ₹{(Math.round(incentiveData.eligibleSales + incentiveData.flatSales) / 1000).toFixed(1)}k
            </div>
            <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              <TrendingUp size={11} /> ↑ 18.4%
            </span>
          </div>

          <div style={{ minWidth: '135px', padding: '12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', scrollSnapAlign: 'start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Follow-ups Due</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d97706', margin: '4px 0' }}>
              {todayFollowUps.length}
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
              {todayFollowUps.length > 0 ? 'Pending Today' : 'All Cleared 🎉'}
            </span>
          </div>

          <div style={{ minWidth: '135px', padding: '12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', scrollSnapAlign: 'start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Target Progress</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6366f1', margin: '4px 0' }}>
              {incentiveData.targetAchievementPercentage}%
            </div>
            <span style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>
              Goal: ₹{(employee?.target / 100000 || 5).toFixed(1)}L
            </span>
          </div>

          <div style={{ minWidth: '135px', padding: '12px', borderRadius: '12px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)', scrollSnapAlign: 'start' }}>
            <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600, display: 'block' }}>Est. Total Payout</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
              ₹{(totalPayout / 1000).toFixed(1)}k
            </div>
            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 700 }}>
              Slab: {incentiveData.currentSlab}
            </span>
          </div>

        </div>
      </div>

      {/* ─── TODAY'S FOLLOW-UPS PRIORITY SECTION ─── */}
      <div className="zoho-card" style={{ marginBottom: '20px', borderLeft: todayFollowUps.length > 0 ? '4px solid #ef4444' : '1px solid #cbd5e1' }}>
        <div className="zoho-header" style={{ paddingBottom: '12px' }}>
          <div className="zoho-title-group">
            <div className="zoho-title-icon" style={{ backgroundColor: '#fee2e2', color: '#ef4444' }}>
              <PhoneForwarded size={18} />
            </div>
            <div>
              <h2 className="zoho-title" style={{ fontSize: '1rem' }}>
                Today's Follow-ups ({todayFollowUps.length})
              </h2>
              <p className="zoho-subtitle" style={{ fontSize: '0.75rem' }}>Priority calls scheduled for today</p>
            </div>
          </div>
          <Link href="/follow-ups" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', textDecoration: 'none' }}>
            View All →
          </Link>
        </div>

        <div style={{ padding: '12px 14px' }}>
          {todayFollowUps.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {todayFollowUps.map((call: any) => (
                <FollowUpCard key={call.id} call={call} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 10px', color: '#64748b' }}>
              <CheckCircle2 size={32} style={{ color: '#10b981', margin: '0 auto 8px auto' }} />
              <p style={{ margin: 0, fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>No pending follow-ups today!</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem' }}>You're all caught up. Schedule new leads or log fresh calls.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── INCENTIVE & EARNINGS BREAKDOWN ─── */}
      <div className="zoho-card" style={{ marginBottom: '20px' }}>
        <div className="zoho-header">
          <div className="zoho-title-group">
            <div className="zoho-title-icon">
              <Award size={18} />
            </div>
            <div>
              <h2 className="zoho-title" style={{ fontSize: '1rem' }}>Incentive & Monthly Earnings</h2>
              <p className="zoho-subtitle" style={{ fontSize: '0.75rem' }}>Live performance & commission calculator</p>
            </div>
          </div>
          <div className="zoho-payout-box">
            <span className="zoho-payout-label">Est. Incentive</span>
            <span className="zoho-payout-amount">₹{Math.round(incentiveData.totalIncentive).toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div style={{ padding: '14px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Qualifying Sales:</span>
              <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>₹{Math.round(incentiveData.eligibleSales).toLocaleString('en-IN')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Current Slab:</span>
              <span style={{ background: '#ede9fe', color: '#6d28d9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>
                {incentiveData.currentSlab} ({incentiveData.slabRate}%)
              </span>
            </div>

            {/* Target Progress Bar */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                <span>Target Progress</span>
                <span>{incentiveData.targetAchievementPercentage}%</span>
              </div>
              <div style={{ height: '8px', width: '100%', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    height: '100%', 
                    backgroundColor: '#ef4444', 
                    width: `${Math.min(100, incentiveData.targetAchievementPercentage)}%`,
                    transition: 'width 0.4s ease' 
                  }} 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
