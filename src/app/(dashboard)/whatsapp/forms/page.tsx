"use client";

import React, { useState, useEffect } from "react";
import { FileText, Plus, CheckCircle, Database, X, Check } from "lucide-react";
import { getWhatsAppForms } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppFormsPage() {
  const [forms, setForms] = useState<any[]>([
    {
      id: "form-default-lead",
      title: "Wholesale Buyer Registration Form",
      description: "Collects business name, GST number, annual turnover slab, and target product category.",
      fieldsJson: JSON.stringify([
        { label: "Business Name", name: "businessName", type: "text" },
        { label: "GSTIN Number", name: "gstNumber", type: "text" },
        { label: "Contact Person", name: "contactPerson", type: "text" },
        { label: "City / State", name: "city", type: "text" }
      ])
    },
    {
      id: "form-sample-req",
      title: "Sample Swatch & Fabric Request Form",
      description: "Collects shipping address, courier preference, and fabric selection.",
      fieldsJson: JSON.stringify([
        { label: "Fabric Category", name: "preferences", type: "select" },
        { label: "Courier Address", name: "shippingAddress", type: "text" },
        { label: "Required Quantity", name: "notes", type: "text" }
      ])
    }
  ]);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [newFieldName, setNewFieldName] = useState("");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [fields, setFields] = useState<Array<{ label: string; name: string }>>([
    { label: "Contact Name", name: "contactPerson" },
    { label: "Business Name", name: "businessName" }
  ]);

  useEffect(() => {
    getWhatsAppForms().then((res) => {
      if (res.success && res.forms && res.forms.length > 0) {
        setForms(res.forms);
      }
    });
  }, []);

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    setFields(prev => [...prev, { label: newFieldLabel.trim(), name: newFieldName.trim() || newFieldLabel.toLowerCase().replace(/\s+/g, '') }]);
    setNewFieldLabel("");
    setNewFieldName("");
  };

  const handleSaveForm = () => {
    if (!formTitle.trim()) return;
    const newForm = {
      id: `form-${Date.now()}`,
      title: formTitle,
      description: formDesc || "Custom WhatsApp lead capture form",
      fieldsJson: JSON.stringify(fields)
    };
    setForms(prev => [newForm, ...prev]);
    setShowCreateModal(false);
    setFormTitle("");
    setFormDesc("");
  };

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>WhatsApp Dynamic Interactive Forms</h2>
          <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Collect structured customer details in-chat & automatically create/update CRM contacts & leads.</p>
        </div>
        <button 
          type="button"
          onClick={() => setShowCreateModal(true)}
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}
        >
          <Plus size={16} /> Create Form
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "14px" }}>
        {forms.map((f) => {
          let parsedFields = [];
          try {
            parsedFields = JSON.parse(f.fieldsJson || "[]");
          } catch {
            parsedFields = [];
          }

          return (
            <div key={f.id} style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "18px", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>Active Form</span>
                <span style={{ fontSize: "11px", color: "#6b7280" }}>{parsedFields.length} Fields</span>
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 4px 0" }}>{f.title}</h4>
              <p style={{ fontSize: "12.5px", color: "#6b7280", margin: "0 0 12px 0" }}>{f.description}</p>

              <div style={{ background: "#fafafa", padding: "10px", borderRadius: "6px", border: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: "11px", fontWeight: 700, color: "#4b5563", textTransform: "uppercase" }}>CRM Field Mapping</span>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", fontSize: "12px", color: "#374151" }}>
                  {parsedFields.map((field: any, idx: number) => (
                    <li key={idx}><strong>{field.label}</strong> → CRM Field: <code>{field.name}</code></li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Form Modal */}
      {showCreateModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            backgroundColor: "rgba(15, 23, 42, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              width: "100%",
              maxWidth: "520px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                Create WhatsApp Interactive Form
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Form Title</label>
              <input
                type="text"
                placeholder="e.g. Retailer Registration Form"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "4px" }}>Description</label>
              <input
                type="text"
                placeholder="Brief purpose shown to buyer on WhatsApp"
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>Form Fields ({fields.length})</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "140px", overflowY: "auto", marginBottom: "8px" }}>
                {fields.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", backgroundColor: "#f8fafc", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                    <span><strong>{f.label}</strong> (<code>{f.name}</code>)</span>
                    <button
                      type="button"
                      onClick={() => setFields(fields.filter((_, idx) => idx !== i))}
                      style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  type="text"
                  placeholder="Field label (e.g. Pin Code)"
                  value={newFieldLabel}
                  onChange={e => setNewFieldLabel(e.target.value)}
                  style={{ flex: 1, padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.8rem" }}
                />
                <button
                  type="button"
                  onClick={handleAddField}
                  style={{ padding: "6px 12px", borderRadius: "6px", backgroundColor: "#0f172a", color: "#ffffff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer" }}
                >
                  Add Field
                </button>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveForm}
                disabled={!formTitle.trim()}
                style={{ padding: "8px 16px", borderRadius: "6px", border: "none", backgroundColor: "#10b981", color: "#ffffff", fontSize: "0.85rem", fontWeight: 600, cursor: formTitle.trim() ? "pointer" : "not-allowed" }}
              >
                Save Form
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
