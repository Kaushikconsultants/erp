"use client";

import React, { useState, useEffect, useRef } from "react";
import { createTask } from "@/app/actions/taskActions";
import "@/components/ui/modal.css";

interface CreateTaskModalProps {
  onClose: () => void;
  employees: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}

export default function CreateTaskModal({ onClose, employees, customers }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Searchable customer picker
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredCustomers = customers.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()));

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    if (selectedCustomerId) formData.set("customerId", selectedCustomerId);
    const result = await createTask(formData);

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
          <h2>Create New Task</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label>Task Title</label>
            <input type="text" name="title" required placeholder="Follow up with XYZ Corp..." />
          </div>

          <div className="form-group">
            <label>Assign To</label>
            <select name="assigneeId" required>
              <option value="">Select an employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Related Customer (Optional)</label>
            <input type="hidden" name="customerId" value={selectedCustomerId} />
            <div ref={dropdownRef} style={{ position: "relative" }}>
              <div
                style={{ display: "flex", alignItems: "center", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "rgba(255,255,255,0.8)", padding: "0 10px", cursor: "text", minHeight: "40px", gap: "8px" }}
                onClick={() => setDropdownOpen(true)}
              >
                {selectedCustomerId && !dropdownOpen ? (
                  <span style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary)", padding: "8px 0" }}>{selectedCustomerLabel}</span>
                ) : (
                  <input
                    type="text"
                    placeholder={selectedCustomerId ? selectedCustomerLabel : "Search customer (optional)..."}
                    value={customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "var(--text-primary)", padding: "8px 0" }}
                  />
                )}
                {selectedCustomerId && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(""); setSelectedCustomerLabel(""); setDropdownOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.1rem" }}>×</button>
                )}
              </div>
              {dropdownOpen && (
                <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 9999, maxHeight: "200px", overflowY: "auto" }}>
                  <div onClick={() => { setSelectedCustomerId(""); setSelectedCustomerLabel(""); setDropdownOpen(false); }} style={{ padding: "10px 14px", cursor: "pointer", color: "#94a3b8", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" }}>None</div>
                  {filteredCustomers.length === 0 ? (
                    <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.85rem" }}>No customers found</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <div key={c.id} onClick={() => { setSelectedCustomerId(c.id); setSelectedCustomerLabel(c.name); setCustomerSearch(""); setDropdownOpen(false); }}
                        style={{ padding: "10px 14px", cursor: "pointer", fontSize: "0.875rem", background: selectedCustomerId === c.id ? "#eff6ff" : "transparent" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = selectedCustomerId === c.id ? "#eff6ff" : "transparent")}
                      >
                        {c.name}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label>Priority</label>
            <select name="priority" required defaultValue="Medium">
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
          
          <div className="form-group">
            <label>Due Date</label>
            <input type="date" name="dueDate" />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea name="description" rows={3} placeholder="Task details..." style={{
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
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
