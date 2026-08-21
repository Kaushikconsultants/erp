"use client";

import React, { useState, useEffect, useRef } from "react";
import { logCall } from "@/app/actions/callActions";
import { getCompanySettings } from "@/app/actions/companyActions";
import AddCustomerModal from "./AddCustomerModal";
import "@/components/ui/modal.css";

interface LogCallModalProps {
  onClose: () => void;
  customers: { id: string; companyName: string; contactPerson: string }[];
}

export default function LogCallModal({ onClose, customers: initialCustomers }: LogCallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>(["Interested / Follow-up Needed", "Not Interested", "No Answer / Voicemail", "Order Placed", "Complaint / Support"]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customers, setCustomers] = useState(initialCustomers);

  // Searchable customer picker state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchOutcomes() {
      const res = await getCompanySettings();
      if (res.success && res.settings?.callOutcomes) {
        setOutcomes(res.settings.callOutcomes);
      }
    }
    fetchOutcomes();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) => {
    const q = customerSearch.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q)
    );
  });

  const handleSelectCustomer = (id: string, label: string) => {
    setSelectedCustomerId(id);
    setSelectedCustomerLabel(label);
    setCustomerSearch("");
    setDropdownOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      setError("Please select a customer.");
      return;
    }
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    // Ensure hidden customerId is in the form
    formData.set("customerId", selectedCustomerId);
    const result = await logCall(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
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

          {/* Hidden field carries the real customer ID */}
          <input type="hidden" name="customerId" value={selectedCustomerId} />

          {/* Searchable Customer Picker */}
          <div className="form-group">
            <label>Customer</label>
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.8)",
                  padding: "0 10px",
                  cursor: "text",
                  minHeight: "40px",
                  gap: "8px"
                }}
                onClick={() => setDropdownOpen(true)}
              >
                {selectedCustomerId && !dropdownOpen ? (
                  <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary)", padding: "8px 0" }}>
                    {selectedCustomerLabel}
                  </span>
                ) : (
                  <input
                    autoFocus={dropdownOpen}
                    type="text"
                    placeholder={selectedCustomerId ? selectedCustomerLabel : "Search customer by name..."}
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    style={{
                      flex: 1,
                      border: "none",
                      outline: "none",
                      background: "transparent",
                      fontSize: "0.875rem",
                      color: "var(--text-primary)",
                      padding: "8px 0"
                    }}
                  />
                )}
                {selectedCustomerId && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(""); setSelectedCustomerLabel(""); setCustomerSearch(""); setDropdownOpen(true); }}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem", lineHeight: 1 }}
                    title="Clear selection"
                  >×</button>
                )}
              </div>

              {dropdownOpen && (
                <div style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                  zIndex: 9999,
                  maxHeight: "220px",
                  overflowY: "auto"
                }}>
                  <div
                    onClick={() => { setShowAddCustomer(true); setDropdownOpen(false); }}
                    style={{ padding: "10px 14px", cursor: "pointer", fontWeight: 700, color: "#10b981", borderBottom: "1px solid #f1f5f9", fontSize: "0.875rem" }}
                  >
                    + Add New Customer...
                  </div>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.85rem" }}>No customers found</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => handleSelectCustomer(c.id, `${c.companyName} (${c.contactPerson})`)}
                        style={{
                          padding: "10px 14px",
                          cursor: "pointer",
                          fontSize: "0.875rem",
                          background: selectedCustomerId === c.id ? "#eff6ff" : "transparent",
                          color: selectedCustomerId === c.id ? "#1d4ed8" : "var(--text-primary)"
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedCustomerId === c.id ? "#eff6ff" : "transparent")}
                      >
                        <span style={{ fontWeight: 600 }}>{c.companyName}</span>
                        <span style={{ color: "#64748b", marginLeft: "6px", fontSize: "0.8rem" }}>({c.contactPerson})</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
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
