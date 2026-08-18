"use client";
import React, { useState } from "react";
import { createVendor } from "@/app/actions/vendorActions";

export default function AddVendorButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const res = await createVendor(fd);
    setLoading(false);
    if (res.error) { setError(res.error); return; }
    setOpen(false);
    (e.target as HTMLFormElement).reset();
  }

  return (
    <>
      <button className="primary-btn" onClick={() => setOpen(true)}>+ Add Vendor</button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h2>Add New Vendor</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Company Name *</label>
                  <input name="companyName" className="form-input" required placeholder="e.g. Textile Suppliers Pvt Ltd" />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input name="contactPerson" className="form-input" placeholder="Full name" />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input name="mobile" className="form-input" placeholder="10-digit number" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input name="email" type="email" className="form-input" placeholder="vendor@email.com" />
                </div>
                <div className="form-group">
                  <label>GST Number</label>
                  <input name="gstNumber" className="form-input" placeholder="15-digit GSTIN" />
                </div>
                <div className="form-group">
                  <label>PAN</label>
                  <input name="pan" className="form-input" placeholder="ABCDE1234F" />
                </div>
                <div className="form-group">
                  <label>Payment Terms</label>
                  <select name="paymentTerms" className="form-input">
                    <option value="">Select terms</option>
                    <option>Cash on Delivery</option>
                    <option>Net 15</option>
                    <option>Net 30</option>
                    <option>Net 45</option>
                    <option>Net 60</option>
                    <option>Advance Payment</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <input name="address" className="form-input" placeholder="Street address" />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input name="city" className="form-input" />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input name="state" className="form-input" />
                </div>
                <div className="form-group">
                  <label>Pincode</label>
                  <input name="pincode" className="form-input" />
                </div>
              </div>
              {error && <p style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
              <div className="modal-footer" style={{ marginTop: 16 }}>
                <button type="button" className="action-btn" onClick={() => setOpen(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={loading}>
                  {loading ? "Saving..." : "Save Vendor"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
