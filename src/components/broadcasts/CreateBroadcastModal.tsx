"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useRef } from "react";
import { createBroadcast, AttachmentItem } from "@/app/actions/broadcastActions";
import { 
  Megaphone, 
  Tag, 
  Palmtree, 
  AlertTriangle, 
  Calendar, 
  Info, 
  Upload, 
  X, 
  FileText, 
  Image as ImageIcon, 
  Pin, 
  Users, 
  UserCheck, 
  Check 
} from "lucide-react";
import "@/components/ui/modal.css";

interface CreateBroadcastModalProps {
  onClose: () => void;
  employees: Array<{
    id: string;
    department?: string | null;
    designation?: string | null;
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
    };
  }>;
}

const CATEGORIES = [
  { key: "OFFER", label: "Offer of the Day", icon: Tag, color: "#10b981", bg: "#ecfdf5", border: "#a7f3d0" },
  { key: "HOLIDAY", label: "Holiday Notice", icon: Palmtree, color: "#06b6d4", bg: "#ecfeff", border: "#a5f3fc" },
  { key: "ANNOUNCEMENT", label: "Announcement", icon: Megaphone, color: "#4f46e5", bg: "#eef2ff", border: "#c7d2fe" },
  { key: "URGENT", label: "Urgent Notice", icon: AlertTriangle, color: "#ef4444", bg: "#fef2f2", border: "#fca5a5" },
  { key: "MEETING", label: "Meeting / Event", icon: Calendar, color: "#8b5cf6", bg: "#f5f3ff", border: "#ddd6fe" },
  { key: "GENERAL", label: "General Update", icon: Info, color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
];

const ROLES_LIST = [
  { key: "SALES", label: "Sales Team" },
  { key: "HR", label: "HR Team" },
  { key: "ACCOUNTS", label: "Accounts Team" },
  { key: "DISPATCH", label: "Dispatch Team" },
  { key: "WAREHOUSE", label: "Warehouse Team" },
  { key: "PURCHASE", label: "Purchase Team" },
  { key: "SUPPORT", label: "Support Team" },
];

export default function CreateBroadcastModal({ onClose, employees }: CreateBroadcastModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("OFFER");
  const [priority, setPriority] = useState("NORMAL");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");

  // Audience targeting state
  const [targetAudience, setTargetAudience] = useState<"ALL" | "SELECTED">("ALL");
  const [targetType, setTargetType] = useState<"ROLES" | "INDIVIDUAL">("ROLES");
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");

  // Attachments state
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} is too large (max 5MB)`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            url: result,
            type: file.type.startsWith("image/") ? "image" : "document",
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleRole = (roleKey: string) => {
    setSelectedRoles((prev) =>
      prev.includes(roleKey) ? prev.filter((r) => r !== roleKey) : [...prev, roleKey]
    );
  };

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase();
    return (
      emp.user.name.toLowerCase().includes(q) ||
      emp.user.email.toLowerCase().includes(q) ||
      (emp.department && emp.department.toLowerCase().includes(q)) ||
      (emp.designation && emp.designation.toLowerCase().includes(q))
    );
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("Please provide a title and notice message.");
      return;
    }

    if (targetAudience === "SELECTED") {
      if (targetType === "ROLES" && selectedRoles.length === 0) {
        setError("Please select at least one role / team.");
        return;
      }
      if (targetType === "INDIVIDUAL" && selectedUserIds.length === 0) {
        setError("Please select at least one team member.");
        return;
      }
    }

    setLoading(true);
    setError("");

    const res = await createBroadcast({
      title,
      content,
      category,
      priority,
      attachments,
      targetAudience,
      targetRoles: targetAudience === "SELECTED" && targetType === "ROLES" ? selectedRoles : [],
      targetUserIds: targetAudience === "SELECTED" && targetType === "INDIVIDUAL" ? selectedUserIds : [],
      isPinned,
      expiresAt: expiresAt || null,
    });

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content glass-panel animate-in"
        style={{ width: "100%", maxWidth: "680px", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #e2e8f0", backgroundColor: "#f8fafc", borderRadius: "12px 12px 0 0" }}>
          <div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, color: "#0f172a", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <Megaphone size={20} color="#4f46e5" /> Create Team Broadcast
            </h2>
            <p style={{ margin: "4px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              Publish offers of the day, holiday notices, or team announcements
            </p>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: "1.5rem", lineHeight: 1 }}>
            ×
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div style={{ backgroundColor: "#fef2f2", color: "#b91c1c", padding: "10px 14px", borderRadius: "6px", fontSize: "0.85rem", border: "1px solid #fca5a5" }}>
              {error}
            </div>
          )}

          {/* 1. Category Selection Pills */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Notice Category
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: "8px" }}>
              {CATEGORIES.map((cat) => {
                const IconComponent = cat.icon;
                const isSelected = category === cat.key;
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setCategory(cat.key)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      border: isSelected ? `2px solid ${cat.color}` : "1px solid #cbd5e1",
                      backgroundColor: isSelected ? cat.bg : "#ffffff",
                      color: isSelected ? cat.color : "#475569",
                      fontWeight: isSelected ? 700 : 500,
                      fontSize: "0.82rem",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "left",
                    }}
                  >
                    <IconComponent size={16} color={cat.color} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Title & Priority */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Title / Headline <span style={{ color: "#ef4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Special 15% Festive Offer / Diwali Holiday Notice"
                style={{ width: "100%", padding: "9px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none" }}
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="URGENT">🚨 Urgent</option>
              </select>
            </div>
          </div>

          {/* 3. Message Content */}
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
              Message / Notice Details <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Provide complete details, instructions, pricing, holiday dates, or guidelines for the team..."
              style={{ width: "100%", padding: "10px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.875rem", backgroundColor: "#f8fafc", outline: "none", resize: "vertical" }}
            />
          </div>

          {/* 4. Target Audience */}
          <div style={{ backgroundColor: "#f8fafc", padding: "14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 700, color: "#334155", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Target Audience
            </label>
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="audience"
                  checked={targetAudience === "ALL"}
                  onChange={() => setTargetAudience("ALL")}
                />
                <Users size={15} color="#4f46e5" /> Broadcast to All Team Members
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
                <input
                  type="radio"
                  name="audience"
                  checked={targetAudience === "SELECTED"}
                  onChange={() => setTargetAudience("SELECTED")}
                />
                <UserCheck size={15} color="#059669" /> Select Specific Roles / Members
              </label>
            </div>

            {targetAudience === "SELECTED" && (
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px dashed #cbd5e1" }}>
                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <button
                    type="button"
                    onClick={() => setTargetType("ROLES")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "none",
                      backgroundColor: targetType === "ROLES" ? "#4f46e5" : "#e2e8f0",
                      color: targetType === "ROLES" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Select by Role / Department
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetType("INDIVIDUAL")}
                    style={{
                      padding: "5px 12px",
                      borderRadius: "6px",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      border: "none",
                      backgroundColor: targetType === "INDIVIDUAL" ? "#4f46e5" : "#e2e8f0",
                      color: targetType === "INDIVIDUAL" ? "#ffffff" : "#475569",
                      cursor: "pointer",
                    }}
                  >
                    Select Individual Members ({selectedUserIds.length})
                  </button>
                </div>

                {targetType === "ROLES" ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {ROLES_LIST.map((role) => {
                      const active = selectedRoles.includes(role.key);
                      return (
                        <button
                          key={role.key}
                          type="button"
                          onClick={() => toggleRole(role.key)}
                          style={{
                            padding: "6px 12px",
                            borderRadius: "16px",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            border: active ? "1px solid #4f46e5" : "1px solid #cbd5e1",
                            backgroundColor: active ? "#eef2ff" : "#ffffff",
                            color: active ? "#4f46e5" : "#475569",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {active && <Check size={12} />} {role.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div>
                    <input
                      type="text"
                      placeholder="Search team member by name, department..."
                      value={employeeSearch}
                      onChange={(e) => setEmployeeSearch(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem", marginBottom: "8px", backgroundColor: "#ffffff" }}
                    />
                    <div style={{ maxHeight: "150px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px", backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "6px" }}>
                      {filteredEmployees.map((emp) => {
                        const isChecked = selectedUserIds.includes(emp.user.id);
                        return (
                          <div
                            key={emp.id}
                            onClick={() => toggleUser(emp.user.id)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "6px 10px",
                              borderRadius: "4px",
                              cursor: "pointer",
                              backgroundColor: isChecked ? "#eff6ff" : "transparent",
                              fontSize: "0.82rem",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {}}
                                style={{ cursor: "pointer" }}
                              />
                              <span style={{ fontWeight: 600, color: "#1e293b" }}>{emp.user.name}</span>
                              <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                                ({emp.department || emp.user.role})
                              </span>
                            </div>
                            <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>{emp.designation || ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 5. Attachments (Images, PDFs, Documents) */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Attachments & Media ({attachments.length})
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.78rem",
                  color: "#4f46e5",
                  background: "#eef2ff",
                  border: "1px solid #c7d2fe",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                <Upload size={13} /> Add Attachment / Image
              </button>
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>

            {attachments.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px", marginTop: "8px" }}>
                {attachments.map((att, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: "relative",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      overflow: "hidden",
                      backgroundColor: "#f8fafc",
                      padding: "6px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => removeAttachment(idx)}
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: "3px",
                        background: "rgba(239, 68, 68, 0.9)",
                        color: "#fff",
                        border: "none",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: "11px",
                        zIndex: 2,
                      }}
                    >
                      ×
                    </button>
                    {att.type === "image" ? (
                      <img
                        src={att.url}
                        alt={att.name}
                        style={{ width: "100%", height: "70px", objectFit: "cover", borderRadius: "4px" }}
                      />
                    ) : (
                      <div style={{ height: "70px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <FileText size={30} color="#4f46e5" />
                      </div>
                    )}
                    <span style={{ fontSize: "0.72rem", color: "#334155", marginTop: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", width: "100%", textAlign: "center" }}>
                      {att.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 6. Settings: Pin to Top & Expiry */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderTop: "1px solid #e2e8f0", paddingTop: "12px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.82rem", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              <Pin size={14} color="#f59e0b" /> Pin this notice to the top of the board
            </label>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <label style={{ fontSize: "0.78rem", color: "#64748b" }}>Expires (Optional):</label>
              <DatePicker
                
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                style={{ padding: "4px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: "9px 18px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "9px 22px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "#4f46e5",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              {loading ? "Publishing..." : "📢 Publish Broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
