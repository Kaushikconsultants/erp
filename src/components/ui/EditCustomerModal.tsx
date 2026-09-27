"use client";

import React, { useState } from "react";
import { updateCustomer } from "@/app/actions/customerActions";
import { lookupPostalCode } from "@/lib/postalLookup";
import { UserCheck, Globe, Building2, Anchor } from "lucide-react";
import "@/components/ui/modal.css"; 

interface Customer {
  id: string;
  businessName: string;
  contactPerson: string;
  email: string | null;
  mobile: string;
  state: string | null;
  city?: string | null;
  pincode?: string | null;
  billingAddress?: string | null;
  status: string;
  landmark?: string | null;
  gstNumber?: string | null;
  isInternational?: boolean;
  country?: string | null;
  currency?: string | null;
  taxId?: string | null;
  portOfDischarge?: string | null;
  incoterms?: string | null;
  regularDiscount?: string | null;
  preferredPaymentMethod?: string | null;
  assignedSalespersonId?: string | null;
  assignedSalesperson?: {
    id?: string;
    user?: {
      name: string;
    }
  } | null;
}

interface EditCustomerModalProps {
  customer: Customer;
  employees?: { id: string; name: string }[];
  onClose: (saved?: boolean) => void;
}

const EXPORT_COUNTRIES = [
  "United States", "United Kingdom", "Germany", "United Arab Emirates", 
  "France", "Italy", "Australia", "Canada", "Japan", "Singapore", 
  "Saudi Arabia", "Netherlands", "Spain", "Switzerland", "Qatar", 
  "Kuwait", "Oman", "South Africa", "Brazil", "India", "Other"
];

const CURRENCIES = [
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "AED", symbol: "AED", label: "AED (د.إ) - UAE Dirham" },
  { code: "CAD", symbol: "$", label: "CAD ($) - Canadian Dollar" },
  { code: "AUD", symbol: "$", label: "AUD ($) - Australian Dollar" },
  { code: "JPY", symbol: "¥", label: "JPY (¥) - Japanese Yen" },
  { code: "SAR", symbol: "SAR", label: "SAR (﷼) - Saudi Riyal" },
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" }
];

const INCOTERMS_OPTIONS = [
  { code: "FOB", label: "FOB (Free On Board) - Standard Glassware Export" },
  { code: "CIF", label: "CIF (Cost, Insurance and Freight)" },
  { code: "CFR", label: "CFR (Cost and Freight)" },
  { code: "EXW", label: "EXW (Ex Works / Factory Gate)" },
  { code: "DDP", label: "DDP (Delivered Duty Paid)" },
  { code: "DAP", label: "DAP (Delivered At Place)" },
  { code: "FCA", label: "FCA (Free Carrier)" }
];

export default function EditCustomerModal({ customer, employees = [], onClose }: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchingPin, setFetchingPin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(customer.preferredPaymentMethod || "None");
  
  const [isInternational, setIsInternational] = useState(customer.isInternational || false);
  const [country, setCountry] = useState(customer.country || (customer.isInternational ? "United States" : "India"));
  const [currency, setCurrency] = useState(customer.currency || (customer.isInternational ? "USD" : "INR"));
  const [taxId, setTaxId] = useState(customer.taxId || "");
  const [portOfDischarge, setPortOfDischarge] = useState(customer.portOfDischarge || "");
  const [incoterms, setIncoterms] = useState(customer.incoterms || "FOB");

  const [addressData, setAddressData] = useState({
    pincode: customer.pincode || "",
    city: customer.city || "",
    state: customer.state || ""
  });

  const handleToggleInternational = (intl: boolean) => {
    setIsInternational(intl);
    if (intl) {
      if (country === "India") setCountry("United States");
      if (currency === "INR") setCurrency("USD");
    } else {
      setCountry("India");
      setCurrency("INR");
    }
  };

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const pin = isInternational ? e.target.value : e.target.value.replace(/\D/g, '').slice(0, 6);
    setAddressData(prev => ({ ...prev, pincode: pin }));

    const isDomesticValid = !isInternational && pin.length === 6;
    const isInternationalValid = isInternational && pin.trim().length >= 3;

    if (isDomesticValid || isInternationalValid) {
      setFetchingPin(true);
      try {
        const res = await lookupPostalCode(pin, country, isInternational);
        if (res.success) {
          setAddressData(prev => ({
            ...prev,
            city: res.city || prev.city,
            state: res.state || prev.state
          }));
        }
      } catch (err) {
        console.error("Failed to fetch postal code details:", err);
      } finally {
        setFetchingPin(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("isInternational", isInternational ? "true" : "false");
    formData.set("country", country);
    formData.set("currency", currency);
    formData.set("taxId", isInternational ? taxId : "");
    formData.set("portOfDischarge", isInternational ? portOfDischarge : "");
    formData.set("incoterms", isInternational ? incoterms : "");

    const rawGst = (formData.get("gstNumber") as string)?.trim().toUpperCase() || "";
    if (rawGst) {
      formData.set("gstNumber", rawGst);
    }
    formData.append("preferredPaymentMethod", paymentMethod);
    const result = await updateCustomer(customer.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose(true);
    }
  };

  const currSymbol = CURRENCIES.find(c => c.code === currency)?.symbol || (isInternational ? "$" : "₹");

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" style={{ zIndex: 1000000 }}>
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '700px' }}>
        <div className="modal-header-blue">
          <div>
            <h2><UserCheck size={20} /> Edit Customer / Export Client</h2>
            <p>Update client information and international trade terms</p>
          </div>
          <button className="close-btn" onClick={() => onClose()}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px 32px' }}>
          {error && <div className="error-message">{error}</div>}
          
          {/* Client Type Toggle */}
          <div style={{ marginBottom: '20px', backgroundColor: '#f1f5f9', padding: '4px', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
            <button
              type="button"
              onClick={() => handleToggleInternational(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: !isInternational ? '1px solid #cbd5e1' : 'none',
                backgroundColor: !isInternational ? '#ffffff' : 'transparent',
                color: !isInternational ? '#0f172a' : '#64748b',
                fontWeight: !isInternational ? 700 : 500,
                fontSize: '0.84rem',
                boxShadow: !isInternational ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Building2 size={15} color={!isInternational ? "#2563eb" : "#64748b"} />
              <span>🇮🇳 Domestic Client (India / GST)</span>
            </button>

            <button
              type="button"
              onClick={() => handleToggleInternational(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '8px',
                border: isInternational ? '1px solid #93c5fd' : 'none',
                backgroundColor: isInternational ? '#eff6ff' : 'transparent',
                color: isInternational ? '#1d4ed8' : '#64748b',
                fontWeight: isInternational ? 700 : 500,
                fontSize: '0.84rem',
                boxShadow: isInternational ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                cursor: 'pointer'
              }}
            >
              <Globe size={15} color={isInternational ? "#2563eb" : "#64748b"} />
              <span>🌐 International Client (Export Buyer)</span>
            </button>
          </div>

          <div className="section-header" style={{ marginTop: 0 }}>
            <div className="section-badge">1</div>
            <h3>{isInternational ? "INTERNATIONAL BUYER DETAILS" : "BASIC DETAILS"}</h3>
          </div>

          {isInternational && (
            <div className="grid-row" style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
              <div className="vertical-group">
                <label>Country *</label>
                <select 
                  value={country} 
                  onChange={(e) => setCountry(e.target.value)}
                  style={{ backgroundColor: '#ffffff', fontWeight: 600 }}
                >
                  {EXPORT_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="vertical-group">
                <label>Billing Currency *</label>
                <select 
                  value={currency} 
                  onChange={(e) => setCurrency(e.target.value)}
                  style={{ backgroundColor: '#ffffff', fontWeight: 600 }}
                >
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                </select>
              </div>
              <div className="vertical-group">
                <label>Incoterms</label>
                <select 
                  value={incoterms} 
                  onChange={(e) => setIncoterms(e.target.value)}
                  style={{ backgroundColor: '#ffffff', fontWeight: 600 }}
                >
                  {INCOTERMS_OPTIONS.map(i => <option key={i.code} value={i.code}>{i.label}</option>)}
                </select>
              </div>
              <div className="vertical-group">
                <label>Destination Port</label>
                <input 
                  type="text" 
                  value={portOfDischarge} 
                  onChange={(e) => setPortOfDischarge(e.target.value)}
                  placeholder="e.g. Port of Los Angeles, Hamburg" 
                  style={{ backgroundColor: '#ffffff' }}
                />
              </div>
            </div>
          )}

          <div className="grid-row">
            <div className="vertical-group">
              <label>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
              <input type="text" name="companyName" defaultValue={customer.businessName} required />
            </div>
            <div className="vertical-group">
              <label>Contact Person <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span></label>
              <input type="text" name="contactPerson" defaultValue={customer.contactPerson || ""} placeholder="Contact Person (Optional)" />
            </div>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>Email Address</label>
              <input type="email" name="email" defaultValue={customer.email || ""} />
            </div>
            <div className="vertical-group">
              <label>Phone / WhatsApp Number <span style={{ color: '#ef4444' }}>*</span></label>
              <input 
                type="tel" 
                name="phone" 
                defaultValue={customer.mobile || ""} 
                required 
              />
            </div>
          </div>

          <div className="section-header">
            <div className="section-badge">2</div>
            <h3>{isInternational ? "TAX & EXPORT COMPLIANCE" : "TAX & COMPLIANCE"}</h3>
          </div>
          
          {isInternational ? (
            <div className="vertical-group">
              <label>VAT / Tax ID / EORI / EIN</label>
              <input 
                type="text" 
                value={taxId} 
                onChange={(e) => setTaxId(e.target.value)} 
                placeholder="e.g. US123456789, GB987654321" 
              />
            </div>
          ) : (
            <div className="vertical-group">
              <label>GST Number (GSTIN)</label>
              <input type="text" name="gstNumber" defaultValue={customer.gstNumber || ""} placeholder="e.g. 22AAAAA0000A1Z5" style={{ textTransform: 'uppercase' }} />
            </div>
          )}

          <div className="section-header">
            <div className="section-badge">3</div>
            <h3>ADDRESS DETAILS</h3>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>{isInternational ? "Postal / ZIP Code" : "Pincode"} {fetchingPin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Fetching...)</span>}</label>
              <input 
                type="text" 
                name="pincode" 
                value={addressData.pincode}
                onChange={handlePincodeChange}
                maxLength={isInternational ? 12 : 6}
              />
            </div>
            <div className="vertical-group">
              <label>{isInternational ? "State / Province" : "State"}</label>
              <input 
                type="text" 
                name="state" 
                value={addressData.state}
                onChange={(e) => setAddressData(prev => ({...prev, state: e.target.value}))}
              />
            </div>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>City</label>
              <input 
                type="text" 
                name="city" 
                value={addressData.city}
                onChange={(e) => setAddressData(prev => ({...prev, city: e.target.value}))}
              />
            </div>
            <div className="vertical-group">
              <label>Landmark / District</label>
              <input type="text" name="landmark" defaultValue={customer.landmark || ""} placeholder="Area or Landmark..." />
            </div>
          </div>

          <div className="vertical-group">
            <label>Street / Warehouse Address</label>
            <input type="text" name="address" defaultValue={customer.billingAddress || ""} placeholder="Full address or street info..." />
          </div>

          <div className="section-header">
            <div className="section-badge" style={{ background: '#059669' }}>4</div>
            <h3>FINANCIALS & CREDIT TERMS ({currSymbol})</h3>
          </div>

          <div className="grid-row" style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px' }}>
            <div className="vertical-group">
              <label style={{ fontWeight: 700 }}>Opening Balance ({currSymbol})</label>
              <input 
                type="number" 
                step="0.01" 
                min="0"
                name="openingBalance" 
                defaultValue={(customer as any).openingBalance || 0} 
                style={{ backgroundColor: '#ffffff', fontWeight: 700 }}
              />
              <div className="sub-label">Initial balance before ERP onboarding</div>
            </div>
            <div className="vertical-group">
              <label style={{ fontWeight: 700 }}>Balance Type</label>
              <select 
                name="openingBalanceType" 
                defaultValue={(customer as any).openingBalanceType || "DEBIT"}
                style={{ backgroundColor: '#ffffff', fontWeight: 600, padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="DEBIT">Debit / To Receive (Dr) - Customer owes you</option>
                <option value="CREDIT">Credit / To Pay (Cr) - Advance from customer</option>
              </select>
              <div className="sub-label">Debit = Receivable, Credit = Advance</div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-badge" style={{ background: '#6366f1' }}>5</div>
            <h3>PREFERENCES & TERMS</h3>
          </div>
          
          <div className="grid-row">
            <div className="vertical-group">
              <label>Discount / Special Terms</label>
              <input type="text" name="regularDiscount" defaultValue={customer.regularDiscount || ""} placeholder="e.g. 5% FCL volume discount" />
              <div className="sub-label">Free note — e.g. 10%, trade discount, contract rate</div>
            </div>
            <div className="vertical-group">
              <label>Preferred Payment Method</label>
              <div className="payment-pills">
                {['Wire Transfer (T/T)', 'Letter of Credit (L/C)', 'Bank', 'Credit', 'UPI', 'Cheque', 'None'].map(method => (
                  <div 
                    key={method} 
                    className={`payment-pill ${paymentMethod === method ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-badge purple">6</div>
            <h3>ASSIGNED AGENT</h3>
          </div>

          <div className="vertical-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Assigned Sales Representative / Account Manager</label>
            {(() => {
              const resolvedDefaultRepId = 
                customer.assignedSalespersonId || 
                customer.assignedSalesperson?.id || 
                employees.find(e => e.name.toLowerCase() === (customer.assignedSalesperson?.user?.name || '').toLowerCase())?.id || 
                "";

              return (
                <select 
                  name="assignedSalespersonId" 
                  defaultValue={resolvedDefaultRepId}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500 }}
                >
                  <option value="">{resolvedDefaultRepId ? "-- Unassigned --" : "Unassigned"}</option>
                  {employees && employees.length > 0 ? (
                    employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))
                  ) : (
                    customer.assignedSalesperson?.user?.name && (
                      <option value={resolvedDefaultRepId}>{customer.assignedSalesperson.user.name}</option>
                    )
                  )}
                </select>
              );
            })()}
            <div className="sub-label">Select an agent to assign or transfer this customer's account.</div>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px', background: 'transparent', padding: '14px 0 max(36px, env(safe-area-inset-bottom, 36px)) 0', border: 'none' }}>
            <button type="button" className="btn-secondary" onClick={() => onClose(false)} style={{ border: 'none', background: '#f8fafc' }}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} /> {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
