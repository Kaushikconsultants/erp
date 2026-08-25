"use client";
import React, { useState } from "react";
import { createVendor } from "@/app/actions/vendorActions";
import { lookupGstin } from "@/app/actions/customerActions";
import { Sparkles, Loader2 } from "lucide-react";

export default function AddVendorButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingGst, setFetchingGst] = useState(false);
  const [error, setError] = useState("");
  const [gstSuccessMsg, setGstSuccessMsg] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [pan, setPan] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");

  const handleGstLookup = async (inputGstin?: string) => {
    const raw = (inputGstin !== undefined ? inputGstin : gstNumber).trim().toUpperCase();
    if (!raw || raw.length < 2) return;

    setFetchingGst(true);
    setError("");

    try {
      const res = await lookupGstin(raw);
      if (res && res.success) {
        if (res.companyName) setCompanyName(res.companyName);
        if (res.contactPerson) setContactPerson(res.contactPerson);
        if (res.address) setAddress(res.address);
        if (res.city) setCity(res.city);
        if (res.state) setState(res.state);
        if (res.pincode) setPincode(res.pincode);
        if (res.pan) setPan(res.pan);
        setGstSuccessMsg(`✓ Auto-filled: ${res.companyName || raw} (${res.state || ''})`);
      } else if (res && res.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error("Vendor GST lookup error:", err);
    } finally {
      setFetchingGst(false);
    }
  };

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstNumber(val);
    if (val.length >= 10 && !pan) {
      setPan(val.slice(2, 12));
    }
    if (val.length === 15) {
      handleGstLookup(val);
    }
  };

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
    setCompanyName("");
    setContactPerson("");
    setMobile("");
    setEmail("");
    setGstNumber("");
    setPan("");
    setAddress("");
    setCity("");
    setState("");
    setPincode("");
    setGstSuccessMsg("");
  }

  return (
    <>
      <button className="primary-btn" onClick={() => setOpen(true)}>+ Add Vendor</button>
      {open && (
        <div className="modal-overlay" onClick={() => setOpen(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 650 }}>
            <div className="modal-header">
              <h2>Add New Vendor</h2>
              <button className="modal-close" onClick={() => setOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              {gstSuccessMsg && (
                <div style={{ backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0", color: "#065f46", padding: "8px 12px", borderRadius: "6px", fontSize: "0.8rem", marginBottom: "14px", fontWeight: 600 }}>
                  {gstSuccessMsg}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>GST Number (Enter 15-digit GSTIN to auto-fill)</label>
                    {gstNumber.length >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleGstLookup(gstNumber)}
                        disabled={fetchingGst}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '4px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        {fetchingGst ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                        {fetchingGst ? "Fetching..." : "⚡ Auto-Fill"}
                      </button>
                    )}
                  </div>
                  <input 
                    name="gstNumber" 
                    value={gstNumber}
                    onChange={handleGstChange}
                    onBlur={() => { if (gstNumber.length >= 2) handleGstLookup(); }}
                    className="form-input" 
                    placeholder="e.g. 21DTSPS0817P1Z1" 
                    maxLength={15}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Company Name *</label>
                  <input 
                    name="companyName" 
                    value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    className="form-input" 
                    required 
                    placeholder="e.g. Textile Suppliers Pvt Ltd" 
                  />
                </div>
                <div className="form-group">
                  <label>Contact Person</label>
                  <input 
                    name="contactPerson" 
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    className="form-input" 
                    placeholder="Full name" 
                  />
                </div>
                <div className="form-group">
                  <label>Mobile</label>
                  <input 
                    name="mobile" 
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    className="form-input" 
                    placeholder="10-digit number" 
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="form-input" 
                    placeholder="vendor@email.com" 
                  />
                </div>
                <div className="form-group">
                  <label>PAN</label>
                  <input 
                    name="pan" 
                    value={pan}
                    onChange={e => setPan(e.target.value.toUpperCase())}
                    className="form-input" 
                    placeholder="ABCDE1234F" 
                    maxLength={10}
                    style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Payment Terms</label>
                  <select name="paymentTerms" value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} className="form-input">
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
                  <input 
                    name="address" 
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="form-input" 
                    placeholder="Street address" 
                  />
                </div>
                <div className="form-group">
                  <label>City</label>
                  <input 
                    name="city" 
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    className="form-input" 
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input 
                    name="state" 
                    value={state}
                    onChange={e => setState(e.target.value)}
                    className="form-input" 
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Pincode</label>
                  <input 
                    name="pincode" 
                    value={pincode}
                    onChange={e => setPincode(e.target.value)}
                    className="form-input" 
                    maxLength={6}
                  />
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
