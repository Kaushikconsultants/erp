"use client";

import React, { useState } from "react";
import { updateQuotationStatus, deleteQuotation } from "@/app/actions/quotationActions";
import { Pencil, Trash2, CheckCircle2, X } from "lucide-react";
import "@/components/ui/modal.css";

interface EditQuotationModalProps {
  quotation: any;
  onClose: () => void;
}

export default function EditQuotationModal({ quotation, onClose }: EditQuotationModalProps) {
  const [status, setStatus] = useState(quotation.status || "Draft");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await updateQuotationStatus(quotation.id, status);
    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '520px', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ backgroundColor: '#4f46e5', color: '#fff', padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Pencil size={20} />
            <h2 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0 }}>Edit Quotation #{quotation.quotationNumber}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          {error && <div className="error-message" style={{ marginBottom: '16px' }}>{error}</div>}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Customer</label>
            <input 
              type="text" 
              disabled 
              value={quotation.customer?.businessName || quotation.customer?.contactPerson || 'Customer'} 
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.9rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Quotation Date</label>
              <input 
                type="text" 
                disabled 
                value={new Date(quotation.date).toLocaleDateString('en-IN')} 
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.9rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Total Amount</label>
              <input 
                type="text" 
                disabled 
                value={`₹${(quotation.totalValue || 0).toLocaleString('en-IN')}`} 
                style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', color: '#0f172a', fontWeight: 700, fontSize: '0.9rem' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>Quotation Status</label>
            <select 
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #6366f1', outline: 'none', fontSize: '0.9rem', fontWeight: 600, color: '#1e1b4b', backgroundColor: '#eef2ff' }}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent to Customer</option>
              <option value="Viewed">Viewed by Customer</option>
              <option value="Accepted">Accepted</option>
              <option value="Declined">Declined</option>
              <option value="Converted">Converted to Order</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
            <button 
              type="button" 
              onClick={onClose} 
              style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', backgroundColor: '#4f46e5', color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? "Saving..." : <><CheckCircle2 size={16} /> Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
