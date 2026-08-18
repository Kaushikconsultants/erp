"use client";

import React, { useState } from "react";
import "@/components/ui/modal.css";

interface SettingsModalProps {
  featureName: string;
  onClose: () => void;
}

export default function SettingsModal({ featureName, onClose }: SettingsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(onClose, 1000);
    }, 800);
  };

  const renderContent = () => {
    switch (featureName) {
      case "General Configuration":
        return (
          <>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" defaultValue="B2B Clothing Co." />
            </div>
            <div className="form-group">
              <label>Default Currency</label>
              <select defaultValue="INR">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Timezone</label>
              <select defaultValue="IST">
                <option value="IST">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </>
        );
      case "Incentive Rules":
        return (
          <>
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Discount = 0%</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Bonus Incentive:</span>
                <input type="number" defaultValue="2" min="0" max="100" style={{ width: '80px' }} step="0.1" />
                <span>% (Added to Slab)</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Discount &gt; 15% OR Credit Customer</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Flat Rate Incentive:</span>
                <input type="number" defaultValue="1" min="0" max="100" style={{ width: '80px' }} step="0.1" />
                <span>%</span>
              </div>
            </div>

            <div className="vertical-group">
              <label style={{ marginBottom: '8px' }}>Standard Slabs (1 - 15% Discount)</label>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ width: '130px', fontSize: '14px' }}>Up to ₹2.49 Lakh:</span>
                <input type="number" defaultValue="1" style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} step="0.1" /> <span>%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ width: '130px', fontSize: '14px' }}>₹2.5 - 4.99 Lakh:</span>
                <input type="number" defaultValue="1.75" style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} step="0.1" /> <span>%</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ width: '130px', fontSize: '14px' }}>₹5 - 6.99 Lakh:</span>
                <input type="number" defaultValue="2.5" style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} step="0.1" /> <span>%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <span style={{ width: '130px', fontSize: '14px' }}>₹7 - 8.99 Lakh:</span>
                <input type="number" defaultValue="3.5" style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} step="0.1" /> <span>%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '130px', fontSize: '14px' }}>Above ₹9 Lakh:</span>
                <input type="number" defaultValue="5" style={{ width: '70px', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }} step="0.1" /> <span>%</span>
              </div>
            </div>
          </>
        );
      case "Customer Statuses":
        return (
          <>
            <div className="form-group">
              <label>Available Statuses</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                <span className="status-badge active">Active</span>
                <span className="status-badge inactive">Inactive</span>
                <span className="status-badge">New Lead</span>
                <span className="status-badge warning">Client</span>
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Add Custom Status</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="e.g. Churned" style={{ flex: 1 }} />
                <button type="button" className="btn-secondary">Add</button>
              </div>
            </div>
          </>
        );
      case "Backup Data":
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Download a complete backup of your CRM database (JSON format).
            </p>
            <button type="button" className="primary-btn hover-lift">Generate Full Backup</button>
          </div>
        );
      case "Manage Teams":
        return (
          <>
            <div className="form-group">
              <label>Existing Teams</label>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
                <li style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>North America Sales</li>
                <li style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>EMEA Operations</li>
              </ul>
            </div>
            <div className="form-group">
              <label>Create New Team</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input type="text" placeholder="Team Name" style={{ flex: 1 }} />
                <button type="button" className="btn-secondary">Create</button>
              </div>
            </div>
          </>
        );
      case "Sales Targets":
        return (
          <>
            <div className="form-group">
              <label>Global Monthly Target (₹)</label>
              <input type="number" defaultValue="5000000" />
            </div>
            <div className="form-group">
              <label>Individual Rep Quota (₹)</label>
              <input type="number" defaultValue="500000" />
            </div>
          </>
        );
      case "Attendance Rules":
        return (
          <>
            <div className="form-group">
              <label>Standard Check-in Time</label>
              <input type="time" defaultValue="09:00" />
            </div>
            <div className="form-group">
              <label>Standard Check-out Time</label>
              <input type="time" defaultValue="18:00" />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '16px' }}>
              <input type="checkbox" id="late" defaultChecked />
              <label htmlFor="late" style={{ margin: 0 }}>Enable Late Mark tracking</label>
            </div>
          </>
        );
      default:
        return <p>Settings coming soon.</p>;
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>{featureName}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSave} className="modal-body">
          {renderContent()}

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading || saved} style={{ minWidth: '120px' }}>
              {saved ? "Saved ✓" : loading ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
