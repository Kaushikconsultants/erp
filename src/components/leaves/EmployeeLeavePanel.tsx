"use client";

import React, { useState } from 'react';
import { CalendarRange, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { submitLeaveRequest } from '@/app/actions/leaveActions';

interface EmployeeLeavePanelProps {
  employeeId: string;
  leaves: any[];
}

export default function EmployeeLeavePanel({ employeeId, leaves }: EmployeeLeavePanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage('');
    
    const formData = new FormData(e.currentTarget);
    const data = {
      employeeId,
      leaveType: formData.get('leaveType') as string,
      startDate: formData.get('startDate') as string,
      endDate: formData.get('endDate') as string,
      numberOfDays: Number(formData.get('numberOfDays')),
      reason: formData.get('reason') as string,
    };

    const res = await submitLeaveRequest(data);
    if (res.success) {
      setMessage('Leave request submitted successfully!');
      (e.target as HTMLFormElement).reset();
    } else {
      setMessage(`Error: ${res.error}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Leave Management 🌴</h1>
          <p className="page-subtitle">Request time off and track your leaves.</p>
        </div>
      </div>

      <div className="dashboard-details-grid" style={{ gridTemplateColumns: '1fr 2fr' }}>
        
        {/* Request Form */}
        <div className="zoho-form-card">
          <div className="zoho-form-header" style={{ marginBottom: '20px', paddingBottom: '12px' }}>
            <h2 className="zoho-form-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1.1rem' }}>
              <CalendarRange size={18} className="text-primary"/> New Request
            </h2>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="zoho-field-group">
              <label className="zoho-field-label zoho-field-required">Leave Type</label>
              <select name="leaveType" required className="zoho-select-field">
                <option value="Casual Leave">Casual Leave</option>
                <option value="Sick Leave">Sick Leave</option>
                <option value="Earned Leave">Earned Leave</option>
                <option value="Unpaid Leave">Unpaid Leave</option>
              </select>
            </div>
            
            <div className="zoho-form-grid-2" style={{ marginBottom: '0' }}>
              <div className="zoho-field-group">
                <label className="zoho-field-label zoho-field-required">Start Date</label>
                <input type="date" name="startDate" required className="zoho-input-field" />
              </div>
              <div className="zoho-field-group">
                <label className="zoho-field-label zoho-field-required">End Date</label>
                <input type="date" name="endDate" required className="zoho-input-field" />
              </div>
            </div>

            <div className="zoho-field-group">
              <label className="zoho-field-label zoho-field-required">Number of Days</label>
              <input type="number" step="0.5" min="0.5" name="numberOfDays" required className="zoho-input-field" />
            </div>

            <div className="zoho-field-group">
              <label className="zoho-field-label zoho-field-required">Reason</label>
              <textarea name="reason" required className="zoho-textarea-field" rows={3}></textarea>
            </div>

            {message && <div className={`message ${message.startsWith('Error') ? 'text-danger' : 'text-success'}`}>{message}</div>}

            <button type="submit" disabled={isSubmitting} className="primary-btn flex items-center justify-center gap-2">
              {isSubmitting ? 'Submitting...' : <><Send size={16} /> Submit Request</>}
            </button>
          </form>
        </div>

        {/* Leave History */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className="detail-header" style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>History & Status</h3>
          </div>
          <div className="table-responsive">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Dates</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Days</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Reason</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length > 0 ? leaves.map((leave) => (
                  <tr key={leave.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '16px', fontWeight: 500 }}>{leave.leaveType}</td>
                    <td style={{ padding: '16px' }}>{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</td>
                    <td style={{ padding: '16px' }}>{leave.numberOfDays}</td>
                    <td style={{ padding: '16px', color: '#64748b' }}>{leave.reason}</td>
                    <td style={{ padding: '16px' }}>
                      {leave.status === 'Pending' && <span className="badge badge-warning flex gap-1 items-center" style={{ padding: '4px 8px', borderRadius: '4px' }}><Clock size={12}/> Pending</span>}
                      {leave.status === 'Approved' && <span className="badge badge-success flex gap-1 items-center" style={{ padding: '4px 8px', borderRadius: '4px' }}><CheckCircle size={12}/> Approved</span>}
                      {leave.status === 'Rejected' && <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}><XCircle size={12}/> Rejected</span>}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="text-center text-muted py-4">No leave history found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
