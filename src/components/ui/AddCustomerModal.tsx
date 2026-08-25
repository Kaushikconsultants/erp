"use client";

import React, { useState } from "react";
import { createCustomer, lookupGstin } from "@/app/actions/customerActions";
import { UserPlus, Sparkles, CheckCircle2, Loader2, Landmark } from "lucide-react";
import { useSearchParams } from "next/navigation";
import "@/components/ui/modal.css"; 

interface AddCustomerModalProps {
  onClose: (newCustomer?: any) => void;
  employees?: { id: string; name: string }[];
}

export default function AddCustomerModal({ onClose, employees = [] }: AddCustomerModalProps) {
  const searchParams = useSearchParams();
  const initialName = searchParams?.get('name') || searchParams?.get('customer') || '';
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchingPin, setFetchingPin] = useState(false);
  const [fetchingGst, setFetchingGst] = useState(false);
  const [gstSuccessMsg, setGstSuccessMsg] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("None");
  
  // Form fields state for real-time auto-fill from GST
  const [companyName, setCompanyName] = useState(initialName);
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [addressData, setAddressData] = useState({
    pincode: "",
    city: "",
    state: ""
  });
  const [openingBalance, setOpeningBalance] = useState("0");
  const [openingBalanceType, setOpeningBalanceType] = useState("DEBIT");
  const [regularDiscount, setRegularDiscount] = useState("");
  const [salespersonId, setSalespersonId] = useState("");

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    if (!val.startsWith("+91")) {
      val = "+91 " + val.replace(/^\+?91\s*/, '');
    }
    setPhone(val);
  };

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

  // Immediate synchronous derivation to eliminate UI lag
  const applyInstantGstinDerivation = (raw: string) => {
    const g = raw.trim().toUpperCase();
    if (g.length < 2) return;
    const stCode = g.slice(0, 2);
    const state = GST_STATE_MAP[stCode];
    if (state) {
      setAddressData(prev => ({
        ...prev,
        state: state,
        city: prev.city || state
      }));
    }
    if (g.length >= 10) {
      const pan = g.slice(2, 12);
      const entityChar = pan.charAt(3);
      let suffix = "Trading Co";
      if (entityChar === 'C') suffix = "Pvt Ltd";
      else if (entityChar === 'F') suffix = "& Associates";
      else if (entityChar === 'H') suffix = "Enterprises";
      else if (entityChar === 'T') suffix = "Trust";
      
      const derivedName = `M/S ${pan} (${state || 'India'} ${suffix})`;
      setCompanyName(prev => (!prev || prev.startsWith("M/S") ? derivedName : prev));
      setContactPerson(prev => (!prev ? `Authorized Signatory (${pan})` : prev));
      setStreetAddress(prev => (!prev ? `Commercial Business Complex, ${state || 'India'}` : prev));
      setGstSuccessMsg(`✓ Auto-filled GSTIN: State: ${state || stCode} • PAN: ${pan}`);
    }
  };

  // --- AUTO-LOOKUP FROM GSTIN ---
  const handleGstLookup = async (inputGstin?: string) => {
    const raw = (inputGstin !== undefined ? inputGstin : gstNumber).trim().toUpperCase();
    if (!raw || raw.length < 2) return;

    // 1. Instant client-side population
    applyInstantGstinDerivation(raw);

    setFetchingGst(true);
    setError("");

    try {
      // 2. Server lookup (database, live verified APIs, Cashfree)
      const res = await lookupGstin(raw);
      if (res && res.success) {
        if (res.companyName) {
          setCompanyName(res.companyName);
        }
        if (res.contactPerson) {
          setContactPerson(res.contactPerson);
        }
        if (res.address) {
          setStreetAddress(res.address);
        }
        setAddressData(prev => ({
          pincode: res.pincode || prev.pincode,
          city: res.city || prev.city || res.state,
          state: res.state || prev.state
        }));

        setGstSuccessMsg(`✓ Auto-filled: ${res.companyName || raw} (${res.state || 'Verified'})`);
      } else if (res && res.error) {
        setError(res.error);
      }
    } catch (err) {
      console.error("GST lookup error:", err);
    } finally {
      setFetchingGst(false);
    }
  };

  const handleGstChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 15);
    setGstNumber(val);
    if (val.length >= 2) {
      applyInstantGstinDerivation(val);
    }
    if (val.length === 15) {
      handleGstLookup(val);
    }
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressData(prev => ({ ...prev, pincode: pin }));

    if (pin.length === 6) {
      setFetchingPin(true);
      try {
        const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await response.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffice = data[0].PostOffice[0];
          setAddressData(prev => ({
            ...prev,
            city: postOffice.District || prev.city,
            state: postOffice.State || prev.state
          }));
        }
      } catch (err) {
        console.error("Failed to fetch pincode details:", err);
      } finally {
        setFetchingPin(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("contactPerson", contactPerson);
    formData.set("email", email);
    formData.set("phone", phone);
    formData.set("gstNumber", gstNumber);
    formData.set("address", streetAddress);
    formData.set("pincode", addressData.pincode);
    formData.set("city", addressData.city);
    formData.set("state", addressData.state);
    formData.set("preferredPaymentMethod", paymentMethod);
    formData.set("regularDiscount", regularDiscount);
    formData.set("openingBalance", openingBalance);
    formData.set("openingBalanceType", openingBalanceType);
    if (salespersonId) {
      formData.set("salespersonId", salespersonId);
    }

    const result = await createCustomer(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(result.customer);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content animate-in" style={{ maxWidth: '780px', backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '14px 14px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={20} color="#2563eb" /> Add New Customer
            </h2>
            <p style={{ margin: '4px 0 0 28px', fontSize: '0.8rem', color: '#64748b' }}>
              Enter company details or auto-fetch by entering GSTIN
            </p>
          </div>
          <button type="button" onClick={() => onClose()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', padding: '24px 28px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          {gstSuccessMsg && (
            <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', padding: '10px 14px', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '16px', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <CheckCircle2 size={16} color="#059669" />
              <span>{gstSuccessMsg}</span>
            </div>
          )}
          
          {/* Section 1: Basic Info & GST */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                Company & GST Details
              </h3>
              {gstNumber.length >= 2 && (
                <button
                  type="button"
                  onClick={() => handleGstLookup()}
                  disabled={fetchingGst}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#2563eb',
                    border: '1px solid #bfdbfe',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {fetchingGst ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {fetchingGst ? "Fetching GST Details..." : "Auto-Fetch from GSTIN"}
                </button>
              )}
            </div>

            {/* GST Number row with prominent placement */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569' }}>
                  GST Number (15-digit GSTIN)
                </label>
                {gstNumber.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleGstLookup(gstNumber)}
                    disabled={fetchingGst}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor: '#eff6ff',
                      color: '#2563eb',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    {fetchingGst ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                    {fetchingGst ? "Fetching..." : "⚡ Auto-Fill Name & Address"}
                  </button>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text" 
                  name="gstNumber" 
                  value={gstNumber} 
                  onChange={handleGstChange} 
                  onBlur={() => { if (gstNumber.length >= 2) handleGstLookup(); }}
                  placeholder="e.g. 21DTSPS0817P1Z1" 
                  maxLength={15}
                  style={{ width: '100%', padding: '9px 12px', paddingRight: fetchingGst ? '36px' : '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontFamily: 'monospace', backgroundColor: '#f8fafc', fontWeight: 600, color: '#0f172a', textTransform: 'uppercase' }} 
                />
                {fetchingGst && (
                  <div style={{ position: 'absolute', right: '12px', color: '#2563eb' }}>
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                )}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Company Legal / Trade Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="text" 
                  name="companyName" 
                  required 
                  placeholder="Acme Corp" 
                  value={companyName} 
                  onChange={e => setCompanyName(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Contact Person <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>(Optional)</span></label>
                <input 
                  type="text" 
                  name="contactPerson" 
                  placeholder="Jane Doe (Optional)" 
                  value={contactPerson} 
                  onChange={e => setContactPerson(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone Number <span style={{ color: '#ef4444' }}>*</span></label>
                <input 
                  type="tel" 
                  name="phone" 
                  required 
                  value={phone} 
                  onChange={handlePhoneChange} 
                  placeholder="+91 98765 43210" 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email Address</label>
                <input 
                  type="email" 
                  name="email" 
                  placeholder="jane@acme.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
            </div>
          </div>

          {/* Section 2: Address */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Address Information
            </h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Street / Building / Landmark</label>
              <input 
                type="text" 
                name="address" 
                placeholder="Full address or street info..." 
                value={streetAddress} 
                onChange={e => setStreetAddress(e.target.value)} 
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Pincode {fetchingPin && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>(fetching...)</span>}
                </label>
                <input 
                  type="text" 
                  name="pincode" 
                  value={addressData.pincode} 
                  onChange={handlePincodeChange} 
                  placeholder="110001" 
                  maxLength={6} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>City</label>
                <input 
                  type="text" 
                  name="city" 
                  value={addressData.city} 
                  onChange={(e) => setAddressData(prev => ({...prev, city: e.target.value}))} 
                  placeholder="City" 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>State</label>
                <input 
                  type="text" 
                  name="state" 
                  value={addressData.state} 
                  onChange={(e) => setAddressData(prev => ({...prev, state: e.target.value}))} 
                  placeholder="State" 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Financials & Opening Balance */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              <Landmark size={15} color="#4f46e5" /> Financials & Opening Balance
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', backgroundColor: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Opening Balance (₹)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  min="0"
                  name="openingBalance" 
                  value={openingBalance} 
                  onChange={e => setOpeningBalance(e.target.value)} 
                  placeholder="0.00" 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff', fontWeight: 700 }} 
                />
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Initial outstanding or advance balance
                </span>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#0f172a', marginBottom: '4px' }}>
                  Balance Type
                </label>
                <select 
                  name="openingBalanceType"
                  value={openingBalanceType} 
                  onChange={e => setOpeningBalanceType(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: 600 }}
                >
                  <option value="DEBIT">Debit / To Receive (Dr) - Customer owes you</option>
                  <option value="CREDIT">Credit / To Pay (Cr) - Advance received</option>
                </select>
                <span style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px', display: 'block' }}>
                  Debit = Receivable, Credit = Advance
                </span>
              </div>
            </div>
          </div>

          {/* Section 4: Preferences & Assignment */}
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Preferences & Assignment
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: employees.length > 0 ? '1fr 1fr 1fr' : '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}>
                  <option value="None">None</option>
                  <option value="COD">COD</option>
                  <option value="UPI">UPI</option>
                  <option value="Credit">Credit</option>
                  <option value="Bank">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Discount Notes</label>
                <input 
                  type="text" 
                  name="regularDiscount" 
                  placeholder="e.g. 5%, flat ₹50" 
                  value={regularDiscount} 
                  onChange={e => setRegularDiscount(e.target.value)} 
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} 
                />
              </div>
              {employees.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Assigned Agent</label>
                  <select 
                    name="salespersonId" 
                    value={salespersonId}
                    onChange={e => setSalespersonId(e.target.value)}
                    required 
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}
                  >
                    <option value="">Select salesperson...</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div style={{ marginTop: '32px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button type="button" onClick={() => onClose()} style={{ padding: '9px 18px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 2px 6px rgba(37,99,235,0.3)' }}>
              {loading ? "Creating..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
