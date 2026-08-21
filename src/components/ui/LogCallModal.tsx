"use client";

import React, { useState, useEffect, useRef } from "react";
import { logCall } from "@/app/actions/callActions";
import { getCompanySettings, updateCallOutcomes, updateCallTypes } from "@/app/actions/companyActions";
import AddCustomerModal from "./AddCustomerModal";
import { Search, ChevronDown, Settings2, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import "@/components/ui/modal.css";

interface LogCallModalProps {
  onClose: () => void;
  customers: { id: string; companyName: string; contactPerson: string }[];
}

export default function LogCallModal({ onClose, customers: initialCustomers }: LogCallModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcomes, setOutcomes] = useState<string[]>([
    "Interested / Follow-up Needed",
    "Not Interested",
    "No Answer / Voicemail",
    "Order Placed",
    "Complaint / Support",
    "Call Back Later"
  ]);
  const [callTypes, setCallTypes] = useState<string[]>([
    "Outbound Call (Made by us)",
    "Inbound Call (Received from customer)",
    "In-person Meeting",
    "WhatsApp Chat"
  ]);
  const [selectedCallType, setSelectedCallType] = useState<string>("");
  const [selectedOutcome, setSelectedOutcome] = useState<string>("");

  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [customers] = useState(initialCustomers);

  // Searchable customer picker state
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Admin options manager modal state
  const [manageModal, setManageModal] = useState<"outcome" | "callType" | null>(null);
  const [editableList, setEditableList] = useState<string[]>([]);
  const [newItemInput, setNewItemInput] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingOptions, setSavingOptions] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const res = await getCompanySettings();
      if (res.success && res.settings) {
        if (res.settings.callOutcomes && res.settings.callOutcomes.length > 0) {
          setOutcomes(res.settings.callOutcomes);
          setSelectedOutcome(res.settings.callOutcomes[0]);
        }
        if (res.settings.callTypes && res.settings.callTypes.length > 0) {
          setCallTypes(res.settings.callTypes);
          setSelectedCallType(res.settings.callTypes[0]);
        }
      }
    }
    fetchSettings();
  }, []);

  // Sync initial selections if empty
  useEffect(() => {
    if (!selectedCallType && callTypes.length > 0) {
      setSelectedCallType(callTypes[0]);
    }
  }, [callTypes, selectedCallType]);

  useEffect(() => {
    if (!selectedOutcome && outcomes.length > 0) {
      setSelectedOutcome(outcomes[0]);
    }
  }, [outcomes, selectedOutcome]);

  // Open Manager helper
  const openManager = (type: "outcome" | "callType") => {
    setManageModal(type);
    setEditableList(type === "outcome" ? [...outcomes] : [...callTypes]);
    setNewItemInput("");
    setEditingIndex(null);
    setEditingValue("");
  };

  // Save updated options to database
  const handleSaveOptions = async () => {
    if (manageModal === "outcome") {
      setSavingOptions(true);
      const res = await updateCallOutcomes(editableList);
      setSavingOptions(false);
      if (res.success && res.callOutcomes) {
        setOutcomes(res.callOutcomes);
        if (!res.callOutcomes.includes(selectedOutcome)) {
          setSelectedOutcome(res.callOutcomes[0] || "");
        }
        setManageModal(null);
      }
    } else if (manageModal === "callType") {
      setSavingOptions(true);
      const res = await updateCallTypes(editableList);
      setSavingOptions(false);
      if (res.success && res.callTypes) {
        setCallTypes(res.callTypes);
        if (!res.callTypes.includes(selectedCallType)) {
          setSelectedCallType(res.callTypes[0] || "");
        }
        setManageModal(null);
      }
    }
  };

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
      (c.companyName && c.companyName.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q))
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
    formData.set("customerId", selectedCustomerId);
    formData.set("type", selectedCallType);
    formData.set("outcome", selectedOutcome);

    const result = await logCall(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="modal-backdrop">
        <div className="modal-content glass-panel animate-in" style={{ width: "100%", maxWidth: "560px" }}>
          <div className="modal-header">
            <h2>Log a Call</h2>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: "75vh", overflowY: "auto" }}>
            {error && <div className="error-message">{error}</div>}

            {/* Hidden field carries the real customer ID */}
            <input type="hidden" name="customerId" value={selectedCustomerId} />

            {/* Searchable Customer Picker */}
            <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
              <label style={{ width: "140px", paddingTop: "10px", flexShrink: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>
                Customer
              </label>
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
                  <Search size={15} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  {selectedCustomerId && !dropdownOpen ? (
                    <span style={{ flex: 1, fontSize: "0.875rem", color: "#1e293b", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {selectedCustomerLabel}
                    </span>
                  ) : (
                    <input
                      autoFocus={dropdownOpen}
                      type="text"
                      placeholder={selectedCustomerId ? selectedCustomerLabel : "Search customer by name or contact person..."}
                      value={customerSearch}
                      onChange={(e) => { setCustomerSearch(e.target.value); setDropdownOpen(true); }}
                      onFocus={() => setDropdownOpen(true)}
                      style={{
                        flex: 1,
                        border: "none",
                        outline: "none",
                        background: "transparent",
                        fontSize: "0.875rem",
                        color: "#1e293b",
                        padding: "0",
                        height: "100%",
                        width: "100%",
                        boxShadow: "none"
                      }}
                    />
                  )}
                  {selectedCustomerId && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCustomerId("");
                        setSelectedCustomerLabel("");
                        setCustomerSearch("");
                        setDropdownOpen(true);
                      }}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94a3b8",
                        fontSize: "1.2rem",
                        lineHeight: 1,
                        padding: "0 4px",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title="Clear selection"
                    >
                      ×
                    </button>
                  )}
                  <ChevronDown size={15} style={{ color: "#94a3b8", flexShrink: 0, transition: "transform 0.2s", transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                </div>

                {dropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "8px",
                      boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                      zIndex: 9999,
                      maxHeight: "230px",
                      overflowY: "auto"
                    }}
                  >
                    <div
                      onClick={() => { setShowAddCustomer(true); setDropdownOpen(false); }}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontWeight: 700,
                        color: "#10b981",
                        borderBottom: "1px solid #f1f5f9",
                        fontSize: "0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <Plus size={15} /> Add New Customer...
                    </div>
                    {filteredCustomers.length === 0 ? (
                      <div style={{ padding: "14px", color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>
                        No customers found matching &quot;{customerSearch}&quot;
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => handleSelectCustomer(c.id, `${c.companyName} (${c.contactPerson})`)}
                          style={{
                            padding: "10px 14px",
                            cursor: "pointer",
                            fontSize: "0.875rem",
                            borderBottom: "1px solid #f8fafc",
                            backgroundColor: selectedCustomerId === c.id ? "#eff6ff" : "transparent",
                            color: selectedCustomerId === c.id ? "#1d4ed8" : "#1e293b",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = selectedCustomerId === c.id ? "#eff6ff" : "transparent")}
                        >
                          <span style={{ fontWeight: 600 }}>{c.companyName}</span>
                          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>{c.contactPerson}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Call Type with Edit/Manage Button */}
            <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
              <div style={{ width: "140px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px" }}>
                <label style={{ width: "auto", padding: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>
                  Call Type
                </label>
                <button
                  type="button"
                  onClick={() => openManager("callType")}
                  title="Add, edit, or remove Call Types"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "0.72rem",
                    color: "#4f46e5",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontWeight: 600,
                    width: "fit-content"
                  }}
                >
                  <Settings2 size={12} /> Edit Options
                </button>
              </div>
              <select
                name="type"
                required
                value={selectedCallType}
                onChange={(e) => {
                  if (e.target.value === "__MANAGE_TYPES__") {
                    openManager("callType");
                  } else {
                    setSelectedCallType(e.target.value);
                  }
                }}
                style={{ flex: 1, minHeight: "42px", height: "42px" }}
              >
                {callTypes.map((type, idx) => (
                  <option key={idx} value={type}>{type}</option>
                ))}
                <option value="__MANAGE_TYPES__" style={{ fontWeight: "bold", color: "#4f46e5" }}>
                  ⚙️ + Edit / Remove Call Types...
                </option>
              </select>
            </div>

            {/* Outcome with Edit/Manage Button */}
            <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
              <div style={{ width: "140px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "4px", paddingTop: "4px" }}>
                <label style={{ width: "auto", padding: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>
                  Outcome
                </label>
                <button
                  type="button"
                  onClick={() => openManager("outcome")}
                  title="Add, edit, or remove Outcomes"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "0.72rem",
                    color: "#4f46e5",
                    background: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: "4px",
                    padding: "2px 6px",
                    cursor: "pointer",
                    fontWeight: 600,
                    width: "fit-content"
                  }}
                >
                  <Settings2 size={12} /> Edit Options
                </button>
              </div>
              <select
                name="outcome"
                required
                value={selectedOutcome}
                onChange={(e) => {
                  if (e.target.value === "__MANAGE_OUTCOMES__") {
                    openManager("outcome");
                  } else {
                    setSelectedOutcome(e.target.value);
                  }
                }}
                style={{ flex: 1, minHeight: "42px", height: "42px" }}
              >
                {outcomes.map((outcome, idx) => (
                  <option key={idx} value={outcome}>{outcome}</option>
                ))}
                <option value="__MANAGE_OUTCOMES__" style={{ fontWeight: "bold", color: "#4f46e5" }}>
                  ⚙️ + Edit / Remove Outcomes...
                </option>
              </select>
            </div>

            <div className="form-group" style={{ display: "flex", alignItems: "center", width: "100%" }}>
              <label style={{ width: "140px", flexShrink: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>
                Follow-up Date <span style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block" }}>(Optional)</span>
              </label>
              <input type="datetime-local" name="followUpDate" style={{ flex: 1, minHeight: "42px", height: "42px" }} />
            </div>

            <div className="form-group" style={{ display: "flex", alignItems: "flex-start", width: "100%" }}>
              <label style={{ width: "140px", paddingTop: "10px", flexShrink: 0, fontWeight: 500, fontSize: "0.875rem", color: "#475569" }}>
                Notes
              </label>
              <textarea
                name="notes"
                rows={4}
                placeholder="Summarize the conversation..."
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  backgroundColor: "#f8fafc",
                  fontSize: "0.875rem",
                  color: "#1e293b",
                  outline: "none",
                  resize: "vertical"
                }}
              ></textarea>
            </div>

            <div className="modal-footer" style={{ margin: "8px -24px -24px -24px" }}>
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="primary-btn" disabled={loading} style={{ padding: "10px 24px" }}>
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

      {/* ADMIN OPTIONS MANAGEMENT MODAL */}
      {manageModal && (
        <div className="modal-backdrop" style={{ zIndex: 1050 }}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: "480px", width: "95%", backgroundColor: "#ffffff" }}>
            <div className="modal-header" style={{ backgroundColor: "#4f46e5", color: "#ffffff", padding: "14px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Settings2 size={18} />
                <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#ffffff" }}>
                  Manage {manageModal === "outcome" ? "Call Outcomes" : "Call Types"}
                </h3>
              </div>
              <button onClick={() => setManageModal(null)} style={{ background: "none", border: "none", color: "#ffffff", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "65vh", overflowY: "auto" }}>
              <p style={{ fontSize: "0.85rem", color: "#64748b", margin: 0 }}>
                Add new options, edit names, or remove options. Changes are saved for all users in the system.
              </p>

              {/* Current List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {editableList.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      gap: "8px"
                    }}
                  >
                    {editingIndex === idx ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", width: "100%" }}>
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            padding: "6px 8px",
                            border: "1px solid #4f46e5",
                            borderRadius: "4px",
                            fontSize: "0.85rem"
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingValue.trim()) {
                                const next = [...editableList];
                                next[idx] = editingValue.trim();
                                setEditableList(next);
                                setEditingIndex(null);
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editingValue.trim()) {
                              const next = [...editableList];
                              next[idx] = editingValue.trim();
                              setEditableList(next);
                              setEditingIndex(null);
                            }
                          }}
                          style={{ background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", padding: "6px", cursor: "pointer" }}
                          title="Save Rename"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          style={{ background: "#e2e8f0", color: "#475569", border: "none", borderRadius: "4px", padding: "6px", cursor: "pointer" }}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#1e293b" }}>{item}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingIndex(idx);
                              setEditingValue(item);
                            }}
                            style={{
                              background: "#f1f5f9",
                              border: "1px solid #cbd5e1",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              color: "#475569",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Edit / Rename"
                          >
                            <Edit2 size={12} /> Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (editableList.length <= 1) {
                                alert("You must have at least one option.");
                                return;
                              }
                              setEditableList(editableList.filter((_, i) => i !== idx));
                            }}
                            style={{
                              background: "#fee2e2",
                              border: "1px solid #fecaca",
                              borderRadius: "4px",
                              padding: "4px 8px",
                              cursor: "pointer",
                              color: "#dc2626",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                            title="Remove"
                          >
                            <Trash2 size={12} /> Remove
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Add New Item Input */}
              <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
                <input
                  type="text"
                  placeholder={manageModal === "outcome" ? "Add new outcome (e.g. Call Back Tomorrow)..." : "Add new call type (e.g. Video Call)..."}
                  value={newItemInput}
                  onChange={(e) => setNewItemInput(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: "6px",
                    fontSize: "0.875rem"
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      if (newItemInput.trim() && !editableList.includes(newItemInput.trim())) {
                        setEditableList([...editableList, newItemInput.trim()]);
                        setNewItemInput("");
                      }
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newItemInput.trim() && !editableList.includes(newItemInput.trim())) {
                      setEditableList([...editableList, newItemInput.trim()]);
                      setNewItemInput("");
                    }
                  }}
                  className="primary-btn"
                  style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.85rem" }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: "14px 20px" }}>
              <button type="button" className="btn-secondary" onClick={() => setManageModal(null)}>Cancel</button>
              <button
                type="button"
                className="primary-btn"
                disabled={savingOptions}
                onClick={handleSaveOptions}
                style={{ padding: "8px 20px" }}
              >
                {savingOptions ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
