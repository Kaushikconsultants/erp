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

  // Dynamic state for custom statuses
  const [customStatuses, setCustomStatuses] = useState<string[]>(["Active", "Inactive", "New Lead", "Client", "Negotiation"]);
  const [newStatusInput, setNewStatusInput] = useState("");

  // Dynamic state for teams
  const [teams, setTeams] = useState<string[]>(["Central Sales Hub", "Field Sales Division", "Dispatch & Logistics", "Accounts & Finance"]);
  const [newTeamInput, setNewTeamInput] = useState("");

  // State for backup
  const [backupGenerated, setBackupGenerated] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(onClose, 1000);
    }, 600);
  };

  const handleAddStatus = () => {
    if (!newStatusInput.trim()) return;
    if (!customStatuses.includes(newStatusInput.trim())) {
      setCustomStatuses(prev => [...prev, newStatusInput.trim()]);
    }
    setNewStatusInput("");
  };

  const handleAddTeam = () => {
    if (!newTeamInput.trim()) return;
    if (!teams.includes(newTeamInput.trim())) {
      setTeams(prev => [...prev, newTeamInput.trim()]);
    }
    setNewTeamInput("");
  };

  const handleGenerateBackup = () => {
    setLoading(true);
    setTimeout(() => {
      const backupData = {
        exportedAt: new Date().toISOString(),
        version: "2.0",
        system: "Enterprise Apparel CRM & ERP",
        status: "SUCCESS",
        metadata: {
          teams,
          customStatuses,
          note: "Offline Database Schema & Snapshot Export"
        }
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `crm-backup-${new Date().toISOString().split("T")[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setLoading(false);
      setBackupGenerated(true);
      setTimeout(() => setBackupGenerated(false), 3000);
    }, 600);
  };

  const renderContent = () => {
    switch (featureName) {
      case "General Configuration":
        return (
          <>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" defaultValue="ESPON CLOTHING PRIVATE LIMITED" />
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
      case "Customer Statuses":
        return (
          <>
            <div className="form-group">
              <label>Available Lead & Customer Statuses</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                {customStatuses.map((st, i) => (
                  <span 
                    key={i} 
                    className="status-badge"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#1e293b', fontSize: '0.8rem', fontWeight: 500 }}
                  >
                    {st}
                    <button
                      type="button"
                      onClick={() => setCustomStatuses(customStatuses.filter((_, idx) => idx !== i))}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, fontSize: '12px' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label>Add Custom Status</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="e.g. Churned, Retargeting" 
                  value={newStatusInput}
                  onChange={e => setNewStatusInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddStatus(); } }}
                  style={{ flex: 1 }} 
                />
                <button type="button" onClick={handleAddStatus} className="btn-secondary">Add</button>
              </div>
            </div>
          </>
        );
      case "Backup Data":
        return (
          <div style={{ textAlign: 'center', padding: '20px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.875rem' }}>
              Download a complete offline snapshot backup of your CRM & ERP records (JSON format).
            </p>
            <button 
              type="button" 
              onClick={handleGenerateBackup}
              disabled={loading}
              className="primary-btn hover-lift"
              style={{ padding: '10px 20px', fontSize: '0.875rem', fontWeight: 600 }}
            >
              {loading ? "Exporting Data..." : backupGenerated ? "Downloaded ✓" : "Generate & Download Backup"}
            </button>
          </div>
        );
      case "Manage Teams":
        return (
          <>
            <div className="form-group">
              <label>Existing Department Units</label>
              <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                {teams.map((t, idx) => (
                  <li key={idx} style={{ padding: '10px 14px', borderBottom: idx < teams.length - 1 ? '1px solid #e2e8f0' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500, color: '#1e293b' }}>{t}</span>
                    <button
                      type="button"
                      onClick={() => setTeams(teams.filter((_, i) => i !== idx))}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="form-group" style={{ marginTop: '14px' }}>
              <label>Create New Department / Team</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  placeholder="Team Name (e.g. North Zone Sales)" 
                  value={newTeamInput}
                  onChange={e => setNewTeamInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTeam(); } }}
                  style={{ flex: 1 }} 
                />
                <button type="button" onClick={handleAddTeam} className="btn-secondary">Create</button>
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
        return <p>Configure preferences below and click Save Settings.</p>;
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
