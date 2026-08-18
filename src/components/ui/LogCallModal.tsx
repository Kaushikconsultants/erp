"use client";

import React, { useState, useEffect } from "react";
import { logCall } from "@/app/actions/callActions";
import { getCompanySettings } from "@/app/actions/companyActions";
import AddCustomerModal from "./AddCustomerModal";
import "@/components/ui/modal.css";

interface LogCallModalProps {
  onClose: () => void;
  customers: { id: string; companyName: string; contactPerson: string }[];
}

export default function LogCallModal({ onClose, customers }: LogCallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>(["Interested / Follow-up Needed", "Not Interested", "No Answer / Voicemail", "Order Placed", "Complaint / Support"]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");

  useEffect(() => {
    async function fetchOutcomes() {
      const res = await getCompanySettings();
      if (res.success && res.settings?.callOutcomes) {
        setOutcomes(res.settings.callOutcomes);
      }
    }
    fetchOutcomes();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await logCall(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(); // Close modal on success
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in">
        <div className="modal-header">
          <h2>Log a Call</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Customer</label>
            <select 
              name="customerId" 
              required 
              value={selectedCustomerId}
              onChange={(e) => {
                if (e.target.value === "ADD_NEW") {
                  setShowAddCustomer(true);
                  setSelectedCustomerId("");
                } else {
                  setSelectedCustomerId(e.target.value);
                }
              }}
            >
              <option value="">Select a customer...</option>
              <option value="ADD_NEW" style={{ fontWeight: 'bold', color: '#10b981' }}>+ Add New Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.companyName} ({c.contactPerson})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Call Type</label>
            <select name="type" required defaultValue="OUTBOUND">
              <option value="OUTBOUND">Outbound Call (Made by us)</option>
              <option value="INBOUND">Inbound Call (Received from customer)</option>
              <option value="MEETING">In-person Meeting</option>
            </select>
          </div>

          <div className="form-group">
            <label>Outcome</label>
            <select name="outcome" required defaultValue={outcomes[0] || "INTERESTED"}>
              {outcomes.map((outcome, idx) => (
                <option key={idx} value={outcome}>{outcome}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label>Follow-up Date (Optional)</label>
            <input type="datetime-local" name="followUpDate" />
          </div>

          <div className="form-group">
            <label>Notes</label>
            <textarea name="notes" rows={4} placeholder="Summarize the conversation..." style={{
              padding: '12px 16px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              fontSize: '0.875rem',
              color: 'var(--text-primary)',
              outline: 'none',
              resize: 'vertical'
            }}></textarea>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Saving..." : "Log Call"}
            </button>
          </div>
        </form>
      </div>

      {showAddCustomer && (
        <AddCustomerModal 
          onClose={() => setShowAddCustomer(false)}
          employees={[]} 
        />
      )}
    </div>
  );
}
