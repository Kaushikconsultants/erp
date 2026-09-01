"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useEffect, useRef } from "react";
import { createTask } from "@/app/actions/taskActions";
import AddCustomerModal from "./AddCustomerModal";
import { Plus } from "lucide-react";
import "@/components/ui/modal.css";

interface CreateTaskModalProps {
  onClose: () => void;
  employees: { id: string; name: string }[];
  customers: { id: string; name: string }[];
}

export default function CreateTaskModal({ onClose, employees, customers: initialCustomers }: CreateTaskModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customerList, setCustomerList] = useState(initialCustomers);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Keep in sync with initialCustomers
  useEffect(() => {
    if (initialCustomers && initialCustomers.length > 0) {
      setCustomerList(prev => {
        const existingIds = new Set(initialCustomers.map(c => c.id));
        const newlyAdded = prev.filter(c => !existingIds.has(c.id));
        return [...newlyAdded, ...initialCustomers];
      });
    }
  }, [initialCustomers]);

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

  const filteredCustomers = customerList.filter((c) => c.name.toLowerCase().includes(customerSearch.toLowerCase()));

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
    <>
      <div className="modal-backdrop" style={{ display: showAddCustomer ? 'none' : 'flex' }}>
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

            <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
              <label style={{ width: "150px", paddingTop: "10px", flexShrink: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>Related Customer <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>(Optional)</span></label>
              <input type="hidden" name="customerId" value={selectedCustomerId} />
              <div ref={dropdownRef} style={{ position: "relative", flex: 1, width: "100%" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    border: dropdownOpen ? "1px solid var(--accent-primary, #4f46e5)" : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    backgroundColor: dropdownOpen ? "#ffffff" : "#f8fafc",
                    boxShadow: dropdownOpen ? "0 0 0 3px rgba(79, 70, 229, 0.15)" : "inset 0 1px 2px rgba(0,0,0,0.02)",
                    padding: "0 12px",
                    cursor: "text",
                    minHeight: "42px",
                    height: "42px",
                    gap: "8px",
                    width: "100%",
                    boxSizing: "border-box",
                    transition: "all 0.2s ease"
                  }}
                  onClick={() => setDropdownOpen(true)}
                >
                  <span style={{ color: "#94a3b8", fontSize: "0.85rem", display: "flex", alignItems: "center" }}>🔍</span>
                  {selectedCustomerId && !dropdownOpen ? (
                    <span style={{ flex: 1, fontSize: "0.875rem", color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{selectedCustomerLabel}</span>
                  ) : (
                    <input
                      type="text"
                      placeholder={selectedCustomerId ? selectedCustomerLabel : "Search customer (optional)..."}
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setDropdownOpen(true); }}
                      onFocus={() => setDropdownOpen(true)}
                      style={{ flex: 1, border: "none", outline: "none", background: "transparent", fontSize: "0.875rem", color: "#1e293b", padding: "0", height: "100%", width: "100%", boxShadow: "none" }}
                    />
                  )}
                  {selectedCustomerId && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(""); setSelectedCustomerLabel(""); setDropdownOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", padding: "0 4px" }}>×</button>
                  )}
                </div>
                {dropdownOpen && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "8px", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.15)", zIndex: 9999, maxHeight: "200px", overflowY: "auto" }}>
                    <div
                      onClick={() => { setShowAddCustomer(true); setDropdownOpen(false); }}
                      style={{ padding: "10px 14px", cursor: "pointer", fontWeight: 700, color: "#10b981", borderBottom: "1px solid #f1f5f9", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                      <Plus size={15} /> Add New Customer...
                    </div>
                    <div onClick={() => { setSelectedCustomerId(""); setSelectedCustomerLabel(""); setDropdownOpen(false); }} style={{ padding: "10px 14px", cursor: "pointer", color: "#94a3b8", fontSize: "0.85rem", borderBottom: "1px solid #f1f5f9" }}>None</div>
                    {filteredCustomers.length === 0 ? (
                      <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>No customers found</div>
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
              <DatePicker  name="dueDate" />
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

      {showAddCustomer && (
        <AddCustomerModal
          onClose={(newCust) => {
            setShowAddCustomer(false);
            if (newCust && newCust.id) {
              const cName = newCust.businessName || newCust.companyName || newCust.name || "New Customer";
              const formatted = { id: newCust.id, name: cName };
              setCustomerList((prev) => [formatted, ...prev.filter(c => c.id !== newCust.id)]);
              setSelectedCustomerId(formatted.id);
              setSelectedCustomerLabel(formatted.name);
              setCustomerSearch("");
              setDropdownOpen(false);
            }
          }}
          employees={employees}
        />
      )}
    </>
  );
}
