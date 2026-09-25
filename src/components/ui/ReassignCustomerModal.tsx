"use client";

import React, { useState } from "react";
import { reassignCustomer } from "@/app/actions/customerActions";
import { RefreshCw } from "lucide-react";
import "@/components/ui/modal.css"; 

interface ReassignCustomerModalProps {
  customerId: string;
  currentAgent: string | null;
  employees: { id: string; name: string }[];
  onClose: (assignedAgentId?: string) => void;
}

export default function ReassignCustomerModal({ customerId, currentAgent, employees, onClose }: ReassignCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedAgent, setSelectedAgent] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!selectedAgent) {
      setError("Please select an agent to reassign.");
      setLoading(false);
      return;
    }

    const result = await reassignCustomer(customerId, selectedAgent);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(selectedAgent);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={20} className="text-warning" />
            Reassign Customer
          </h2>
          <button className="close-btn" onClick={() => onClose()}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {error && <div className="error-message">{error}</div>}
          
          <div style={{ marginBottom: '16px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
            Current Agent: <strong>{currentAgent || 'Unassigned'}</strong>
          </div>

          <div className="form-group">
            <label>Select New Agent</label>
            <select 
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid var(--border)' }}
            >
              <option value="">Choose an agent...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px' }}>
            <button type="button" className="btn-secondary" onClick={() => onClose()}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: '#f59e0b', borderColor: '#f59e0b' }}>
              {loading ? "Reassigning..." : "Reassign Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
