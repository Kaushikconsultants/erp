"use client";

import React, { useState, useEffect } from "react";
import { updateVendor } from "@/app/actions/vendorActions";
import { lookupGstin } from "@/app/actions/customerActions";
import { Sparkles, Loader2, Building2, X, CheckCircle2, AlertCircle } from "lucide-react";
import "@/components/ui/modal.css";

const GST_STATE_MAP: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh",
  "05": "Uttarakhand", "06": "Haryana", "07": "Delhi", "08": "Rajasthan",
  "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
  "13": "Nagaland", "14": "Manipur", "15": "Mizoram", "16": "Tripura",
  "17": "Meghalaya", "18": "Assam", "19": "West Bengal", "20": "Jharkhand",
  "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu", "27": "Maharashtra",
  "28": "Andhra Pradesh", "29": "Karnataka", "30": "Goa", "31": "Lakshadweep",
  "32": "Kerala", "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman and Nicobar Islands",
  "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh"
};

export interface VendorData {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  status?: string | null;
}

interface EditVendorModalProps {
  vendor: VendorData;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function EditVendorModal({
  vendor,
  isOpen,
  onClose,
  onSuccess,
}: EditVendorModalProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingGst, setFetchingGst] = useState(false);
  const [error, setError] = useState("");
  const [gstSuccessMsg, setGstSuccessMsg] = useState("");

  const [companyName, setCompanyName] = useState(vendor.companyName || "");
  const [contactPerson, setContactPerson] = useState(vendor.contactPerson || "");
  const [mobile, setMobile] = useState(vendor.mobile || "");
  const [email, setEmail] = useState(vendor.email || "");
  const [gstNumber, setGstNumber] = useState(vendor.gstNumber || "");
  const [pan, setPan] = useState(vendor.pan || "");
  const [paymentTerms, setPaymentTerms] = useState(vendor.paymentTerms || "");
  const [status, setStatus] = useState(vendor.status || "Active");
  const [address, setAddress] = useState(vendor.address || "");
  const [city, setCity] = useState(vendor.city || "");
  const [state, setState] = useState(vendor.state || "");
  const [pincode, setPincode] = useState(vendor.pincode || "");

  // Update form fields when incoming vendor changes
  useEffect(() => {
    if (vendor) {
      setCompanyName(vendor.companyName || "");
      setContactPerson(vendor.contactPerson || "");
      setMobile(vendor.mobile || "");
      setEmail(vendor.email || "");
      setGstNumber(vendor.gstNumber || "");
      setPan(vendor.pan || "");
      setPaymentTerms(vendor.paymentTerms || "");
      setStatus(vendor.status || "Active");
      setAddress(vendor.address || "");
      setCity(vendor.city || "");
      setState(vendor.state || "");
      setPincode(vendor.pincode || "");
      setError("");
      setGstSuccessMsg("");
    }
  }, [vendor, isOpen]);

  // Lock body scroll and listen for Escape key when open
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const applyInstantDerivation = (raw: string) => {
    const clean = raw.trim().toUpperCase();
    if (clean.length >= 2) {
      const stCode = clean.slice(0, 2);
      const stName = GST_STATE_MAP[stCode];
      if (stName && !state) {
        setState(stName);
      }
    }
    if (clean.length >= 10 && !pan) {
      setPan(clean.slice(2, 12));
    }
  };

  const handleGstLookup = async (inputGstin?: string) => {
    const raw = (inputGstin !== undefined ? inputGstin : gstNumber).trim().toUpperCase();
    if (!raw || raw.length < 2) return;

    applyInstantDerivation(raw);
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
        setGstSuccessMsg(`✓ Auto-filled: ${res.companyName || raw} (${res.state || state || ""})`);
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
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 15);
    setGstNumber(val);
    applyInstantDerivation(val);
    if (val.length === 15) {
      handleGstLookup(val);
    }
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    fd.set("companyName", companyName);
    fd.set("contactPerson", contactPerson);
    fd.set("mobile", mobile);
    fd.set("email", email);
    fd.set("gstNumber", gstNumber);
    fd.set("pan", pan);
    fd.set("paymentTerms", paymentTerms);
    fd.set("status", status);
    fd.set("address", address);
    fd.set("city", city);
    fd.set("state", state);
    fd.set("pincode", pincode);

    const res = await updateVendor(vendor.id, fd);
    setLoading(false);
    if (res?.error) {
      setError(res.error);
      return;
    }
    if (onSuccess) onSuccess();
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content animate-in"
        style={{ maxWidth: "640px", width: "95%" }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: "rgba(79, 70, 229, 0.1)",
                color: "var(--accent-primary, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
            <div>
              <h2 className="modal-title">Edit Vendor Profile</h2>
              <p className="modal-subtitle">Update supplier contact, tax, and billing terms</p>
            </div>
          </div>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="modal-body" style={{ maxHeight: "calc(88vh - 135px)", padding: "20px 24px", overflowY: "auto" }}>
            {/* GST Auto-Fill Banner */}
            {gstSuccessMsg && (
              <div
                style={{
                  backgroundColor: "#ecfdf5",
                  border: "1px solid #a7f3d0",
                  color: "#065f46",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <CheckCircle2 size={16} color="#059669" />
                <span>{gstSuccessMsg}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div
                style={{
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fca5a5",
                  color: "#b91c1c",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "14px",
                }}
              >
                <AlertCircle size={16} color="#dc2626" />
                <span>{error}</span>
              </div>
            )}

            {/* GST Number Field */}
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "4px",
                }}
              >
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  GST Number (15-digit GSTIN)
                </label>
                {gstNumber.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleGstLookup(gstNumber)}
                    disabled={fetchingGst}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "3px 9px",
                      borderRadius: "5px",
                      backgroundColor: "#eff6ff",
                      color: "#2563eb",
                      border: "1px solid #bfdbfe",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    {fetchingGst ? (
                      <Loader2 size={11} className="animate-spin" />
                    ) : (
                      <Sparkles size={11} />
                    )}
                    {fetchingGst ? "Fetching..." : "⚡ Auto-Fill Details"}
                  </button>
                )}
              </div>
              <input
                name="gstNumber"
                value={gstNumber}
                onChange={handleGstChange}
                onBlur={() => {
                  if (gstNumber.length >= 2) handleGstLookup();
                }}
                className="form-input"
                placeholder="e.g. 06ABJHS2211P1ZV"
                maxLength={15}
                style={{
                  textTransform: "uppercase",
                  fontFamily: "monospace",
                  fontWeight: 600,
                }}
              />
            </div>

            {/* Company Name & Status */}
            <div className="grid-row" style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Company Legal Name <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <input
                  name="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="form-input"
                  required
                  placeholder="e.g. APS SPORTS INDIA"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Status
                </label>
                <select
                  name="status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="form-input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Contact Person & Mobile */}
            <div className="grid-row" style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Contact Person
                </label>
                <input
                  name="contactPerson"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="form-input"
                  placeholder="Full name"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Mobile Number
                </label>
                <input
                  name="mobile"
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="form-input"
                  placeholder="10-digit number"
                />
              </div>
            </div>

            {/* Email & PAN */}
            <div className="grid-row" style={{ marginBottom: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="vendor@company.com"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  PAN Number
                </label>
                <input
                  name="pan"
                  value={pan}
                  onChange={(e) => setPan(e.target.value.toUpperCase())}
                  className="form-input"
                  placeholder="ABCDE1234F"
                  maxLength={10}
                  style={{
                    textTransform: "uppercase",
                    fontFamily: "monospace",
                    fontWeight: 600,
                  }}
                />
              </div>
            </div>

            {/* Payment Terms */}
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                Payment Terms
              </label>
              <select
                name="paymentTerms"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                className="form-input"
              >
                <option value="">Select payment terms</option>
                <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                <option value="Immediate Payment">Immediate Payment</option>
                <option value="Net 15 Days">Net 15 Days</option>
                <option value="Net 20 Days">Net 20 Days</option>
                <option value="Net 30 Days">Net 30 Days</option>
                <option value="Net 45 Days">Net 45 Days</option>
                <option value="Net 60 Days">Net 60 Days</option>
                <option value="Net 90 Days">Net 90 Days</option>
                <option value="Advance Payment">Advance Payment</option>
              </select>
            </div>

            {/* Address */}
            <div className="form-group" style={{ marginBottom: "12px" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                Street Address / Premises
              </label>
              <input
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input"
                placeholder="Street address, building, industrial area..."
              />
            </div>

            {/* City, State, Pincode */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  City
                </label>
                <input
                  name="city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="form-input"
                  placeholder="City"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  State
                </label>
                <input
                  name="state"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="form-input"
                  placeholder="State"
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                  Pincode
                </label>
                <input
                  name="pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  className="form-input"
                  placeholder="6 digits"
                  maxLength={6}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={loading}
            >
              {loading && <Loader2 size={15} className="animate-spin" />}
              {loading ? "Updating Vendor..." : "Update Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
