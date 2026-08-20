"use client";

import React, { useState, useEffect } from "react";
import { FileCode, Plus, CheckCircle2, Phone, Copy, Edit, Trash } from "lucide-react";
import { getWhatsAppTemplates, saveWhatsAppTemplateAction } from "@/app/actions/whatsAppPlatformActions";

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  const loadTemplates = async () => {
    const res = await getWhatsAppTemplates();
    if (res.success && res.templates) {
      setTemplates(res.templates);
      if (res.templates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(res.templates[0]);
      }
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return (
    <div style={{ padding: "20px", display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px" }}>
      {/* Left Column: Template Manager Table & Controls */}
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Meta WhatsApp Template Manager</h2>
            <p style={{ fontSize: "13px", color: "#6b7280", margin: "2px 0 0 0" }}>Create & manage pre-approved Meta WhatsApp templates with dynamic CRM variables.</p>
          </div>
          <button style={{ display: "flex", alignItems: "center", gap: "6px", background: "#10b981", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
            <Plus size={16} /> Create Template
          </button>
        </div>

        <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "13px" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", color: "#4b5563", fontWeight: 700 }}>
                <th style={{ padding: "12px 16px" }}>Template Name</th>
                <th style={{ padding: "12px 16px" }}>Category</th>
                <th style={{ padding: "12px 16px" }}>Language</th>
                <th style={{ padding: "12px 16px" }}>Status</th>
                <th style={{ padding: "12px 16px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tpl) => (
                <tr
                  key={tpl.id}
                  onClick={() => setSelectedTemplate(tpl)}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer", background: selectedTemplate?.id === tpl.id ? "#f0fdf4" : "transparent" }}
                >
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: "#111827" }}>{tpl.name}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 600, background: "#e0e7ff", color: "#3730a3", padding: "2px 6px", borderRadius: "4px" }}>
                      {tpl.category}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{tpl.language}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 700, background: "#dcfce7", color: "#166534", padding: "2px 6px", borderRadius: "4px" }}>
                      ● {tpl.status}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer" }} title="Duplicate">
                      <Copy size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Column: Live Interactive Mobile Preview */}
      <div style={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#111827", margin: "0 0 16px 0", alignSelf: "flex-start" }}>Live Mobile WhatsApp Preview</h3>

        {selectedTemplate ? (
          <div style={{ width: "260px", background: "#efeae2", border: "8px solid #111827", borderRadius: "24px", padding: "14px 10px", boxShadow: "0 10px 25px rgba(0,0,0,0.1)" }}>
            <div style={{ background: "#075e54", color: "#fff", padding: "8px 10px", borderRadius: "8px", fontSize: "11px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px" }}>
              <Phone size={12} />
              <span>Espon Business Official</span>
            </div>

            <div style={{ background: "#ffffff", borderRadius: "8px", padding: "10px", fontSize: "12px", color: "#111827", boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }}>
              {selectedTemplate.headerContent && (
                <div style={{ fontWeight: 700, marginBottom: "4px", color: "#075e54" }}>{selectedTemplate.headerContent}</div>
              )}
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.4 }}>{selectedTemplate.bodyText}</div>
              {selectedTemplate.footerText && (
                <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "6px" }}>{selectedTemplate.footerText}</div>
              )}
            </div>
          </div>
        ) : (
          <p style={{ fontSize: "13px", color: "#9ca3af" }}>Select a template to preview</p>
        )}
      </div>
    </div>
  );
}
