"use client";

import React, { useState } from "react";
import { createCustomer } from "@/app/actions/customerActions";
import { UserPlus } from "lucide-react";
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
  const [paymentMethod, setPaymentMethod] = useState("None");
  
  const [addressData, setAddressData] = useState({
    pincode: "",
    city: "",
    state: ""
  });

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
            city: postOffice.District,
            state: postOffice.State
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

    const formData = new FormData(e.currentTarget);
    formData.append("preferredPaymentMethod", paymentMethod);
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
      <div className="modal-content animate-in" style={{ maxWidth: '750px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        
        {/* Header - Themed */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', borderRadius: '12px 12px 0 0' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserPlus size={18} color="#2563eb" /> Add New Customer
            </h2>
            <p style={{ margin: '4px 0 0 26px', fontSize: '0.8rem', color: '#64748b' }}>Enter the customer's information below</p>
          </div>
          <button type="button" onClick={() => onClose()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '4px' }}>
            <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>×</span>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ maxHeight: '80vh', overflowY: 'auto', padding: '24px 28px' }}>
          {error && (
            <div style={{ backgroundColor: '#fef2f2', color: '#b91c1c', padding: '12px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px', border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}
          
          {/* Section 1: Basic Info */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Company Details
            </h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Company Name <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="companyName" required placeholder="Acme Corp" defaultValue={initialName} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Contact Person <span style={{ color: '#ef4444' }}>*</span></label>
                <input type="text" name="contactPerson" required placeholder="Jane Doe" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Phone Number</label>
                <input type="tel" name="phone" placeholder="+91 98765 43210" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Email</label>
                <input type="email" name="email" placeholder="jane@acme.com" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>GST Number</label>
                <input type="text" name="gstNumber" placeholder="22AAAAA0000A1Z5" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontFamily: 'monospace', backgroundColor: '#f8fafc' }} />
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
              <input type="text" name="address" placeholder="Full address or street info..." style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Pincode {fetchingPin && <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>(...)</span>}</label>
                <input type="text" name="pincode" value={addressData.pincode} onChange={handlePincodeChange} placeholder="110001" maxLength={6} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>City</label>
                <input type="text" name="city" value={addressData.city} onChange={(e) => setAddressData(prev => ({...prev, city: e.target.value}))} placeholder="City" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>State</label>
                <input type="text" name="state" value={addressData.state} onChange={(e) => setAddressData(prev => ({...prev, state: e.target.value}))} placeholder="State" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
            </div>
          </div>

          {/* Section 3: Preferences */}
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
              Preferences & Assignment
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}>
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
                <input type="text" name="regularDiscount" placeholder="e.g. 5%, flat ₹50" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }} />
              </div>
              {employees.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Assigned Agent</label>
                  <select name="salespersonId" required style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#f8fafc' }}>
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
            <button type="button" onClick={() => onClose()} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading} style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {loading ? "Creating..." : "Save Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
