"use client";

import React, { useState } from 'react';
import { CalendarRange, Check, X, Clock, RefreshCw } from 'lucide-react';
import { updateLeaveStatus } from '@/app/actions/leaveActions';

interface AdminLeavePanelProps {
  leaves: any[];
}

export default function AdminLeavePanel({ leaves }: AdminLeavePanelProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const handleStatusUpdate = async (leaveId: string, status: "Approved" | "Rejected" | "Pending") => {
    setIsUpdating(leaveId);
    await updateLeaveStatus(leaveId, status);
    setIsUpdating(null);
  };

  const pendingLeaves = leaves.filter(l => l.status === 'Pending');
  const pastLeaves = leaves.filter(l => l.status !== 'Pending');

  return (
    <div className="dashboard-container admin-dashboard">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Leave Approvals 📋</h1>
          <p className="page-subtitle">Review and manage employee leave requests.</p>
        </div>
      </div>

      <div className="dashboard-details-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* Pending Requests */}
        <div className="detail-card glass-panel" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="detail-header">
            <h3><Clock size={18} className="text-warning"/> Pending Requests ({pendingLeaves.length})</h3>
          </div>
          <div className="table-responsive" style={{ marginTop: '15px' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingLeaves.length > 0 ? pendingLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="font-medium">{leave.employee?.user?.name || 'Unknown'}</td>
                    <td>{leave.leaveType}</td>
                    <td>{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</td>
                    <td>{leave.numberOfDays}</td>
                    <td>{leave.reason}</td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleStatusUpdate(leave.id, 'Approved')}
                          disabled={isUpdating === leave.id}
                          className="action-btn outline-success flex gap-1"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <Check size={14}/> Approve
                        </button>
                        <button 
                          onClick={() => handleStatusUpdate(leave.id, 'Rejected')}
                          disabled={isUpdating === leave.id}
                          className="action-btn outline-danger flex gap-1"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                        >
                          <X size={14}/> Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">No pending leave requests. 🎉</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Past Requests */}
        <div className="detail-card glass-panel">
          <div className="detail-header">
            <h3><CalendarRange size={18}/> Past Requests</h3>
          </div>
          <div className="table-responsive" style={{ marginTop: '15px' }}>
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>Leave Type</th>
                  <th>Dates</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pastLeaves.length > 0 ? pastLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td className="font-medium">{leave.employee?.user?.name || 'Unknown'}</td>
                    <td>{leave.leaveType}</td>
                    <td>{new Date(leave.startDate).toLocaleDateString()} to {new Date(leave.endDate).toLocaleDateString()}</td>
                    <td>{leave.numberOfDays}</td>
                    <td>
                      <span className={`badge ${leave.status === 'Approved' ? 'badge-success' : 'badge-danger'}`}>
                        {leave.status}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => handleStatusUpdate(leave.id, 'Pending')}
                        disabled={isUpdating === leave.id}
                        className="action-btn outline-warning flex gap-1"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                      >
                        <RefreshCw size={14}/> Revert
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="text-center text-muted py-4">No history available.</td>
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
