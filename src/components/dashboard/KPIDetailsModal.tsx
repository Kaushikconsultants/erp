"use client";
import React, { useState, useEffect } from 'react';
import { X, Calendar, Filter } from 'lucide-react';
import { getKPIDetails } from '@/app/actions/adminActions';

interface KPIDetailsModalProps {
  type: 'customers' | 'orders' | 'calls' | null;
  onClose: () => void;
}

export default function KPIDetailsModal({ type, onClose }: KPIDetailsModalProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!type) return;
    const fetchData = async () => {
      setIsLoading(true);
      const res = await getKPIDetails(type, timeRange);
      if (res.success && res.data) {
        setData(res.data);
      }
      setIsLoading(false);
    };
    fetchData();
  }, [type, timeRange]);

  if (!type) return null;

  const getTitle = () => {
    if (type === 'customers') return 'Customer Details';
    if (type === 'orders') return 'Order Details';
    if (type === 'calls') return 'Pending Follow-ups Details';
    return '';
  };

  const renderTable = () => {
    if (isLoading) {
      return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
    }

    if (data.length === 0) {
      return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found for this time range.</div>;
    }

    if (type === 'customers') {
      return (
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Company Name</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Added On</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.businessName}</td>
                <td>{c.contactPerson} ({c.mobile})</td>
                <td><span className="badge badge-success">{c.status}</span></td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (type === 'orders') {
      const totalValue = data.reduce((sum, o) => sum + Number(o.totalValue || 0), 0);
      return (
        <>
          <div style={{ padding: '12px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '16px', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#334155' }}>Total Orders / Confirmed Deals: <strong style={{ color: '#0f172a' }}>{data.length}</strong></span>
            <span className="text-success" style={{ fontSize: '1rem' }}>Total Value: ₹{totalValue.toLocaleString('en-IN')}</span>
          </div>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Order / Deal #</th>
                <th>Customer</th>
                <th>Sales Rep</th>
                <th>Value</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.map(o => {
                const repName = o.salesperson?.user?.name || o.salesperson?.name || o.customer?.assignedSalesperson?.user?.name || 'Unassigned';
                const dateStr = o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '-';
                return (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 500 }}>
                      {o.orderNumber}
                      {o.isQuotation && (
                        <span style={{ marginLeft: '6px', fontSize: '0.65rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Quote
                        </span>
                      )}
                    </td>
                    <td>{o.customer?.businessName || 'Unknown'}</td>
                    <td>{repName}</td>
                    <td className="text-success" style={{ fontWeight: 600 }}>₹{Number(o.totalValue || 0).toLocaleString('en-IN')}</td>
                    <td>{dateStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      );
    }

    if (type === 'calls') {
      return (
        <table className="data-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Assigned Rep</th>
              <th>Outcome</th>
              <th>Follow-up Due</th>
            </tr>
          </thead>
          <tbody>
            {data.map(c => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.customer?.businessName || 'Unknown'}</td>
                <td>{c.employee?.user?.name || 'Unassigned'}</td>
                <td>{c.outcome}</td>
                <td className="text-success">{new Date(c.followUpDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {getTitle()}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', gap: '16px', alignItems: 'center', background: '#f8f9fc', borderBottom: '1px solid var(--border)' }}>
          <Filter size={18} className="text-muted" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>Time Filter:</span>
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)', fontSize: '0.875rem', minWidth: '150px' }}
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>

        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {renderTable()}
        </div>
      </div>
    </div>
  );
}
