"use client";

import React, { useState, useEffect } from "react";
import { updateCustomer } from "@/app/actions/customerActions";
import { UserCheck } from "lucide-react";
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
  onClose: () => void;
}

export default function EditCustomerModal({ customer, employees = [], onClose }: EditCustomerModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetchingPin, setFetchingPin] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(customer.preferredPaymentMethod || "None");
  
  const [addressData, setAddressData] = useState({
    pincode: customer.pincode || "",
    city: customer.city || "",
    state: customer.state || ""
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
    const result = await updateCustomer(customer.id, formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-panel animate-in" style={{ maxWidth: '650px' }}>
        <div className="modal-header-blue">
          <div>
            <h2><UserCheck size={20} /> Edit Customer</h2>
            <p>Update customer information below</p>
          </div>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto', padding: '24px 32px' }}>
          {error && <div className="error-message">{error}</div>}
          
          <div className="section-header" style={{ marginTop: 0 }}>
            <div className="section-badge">1</div>
            <h3>BASIC DETAILS</h3>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>Company Name</label>
              <input type="text" name="companyName" defaultValue={customer.businessName} required />
            </div>
            <div className="vertical-group">
              <label>Contact Person</label>
              <input type="text" name="contactPerson" defaultValue={customer.contactPerson} required />
            </div>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>Email Address</label>
              <input type="email" name="email" defaultValue={customer.email || ""} />
            </div>
            <div className="vertical-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" defaultValue={customer.mobile} />
            </div>
          </div>

          <div className="section-header">
            <div className="section-badge">2</div>
            <h3>TAX & COMPLIANCE</h3>
          </div>
          <div className="vertical-group">
            <label>GST Number</label>
            <input type="text" name="gstNumber" defaultValue={customer.gstNumber || ""} placeholder="e.g. 22AAAAA0000A1Z5" />
          </div>

          <div className="section-header">
            <div className="section-badge">3</div>
            <h3>ADDRESS DETAILS</h3>
          </div>

          <div className="grid-row">
            <div className="vertical-group">
              <label>Pincode {fetchingPin && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(Fetching...)</span>}</label>
              <input 
                type="text" 
                name="pincode" 
                value={addressData.pincode}
                onChange={handlePincodeChange}
                maxLength={6}
              />
            </div>
            <div className="vertical-group">
              <label>State</label>
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
              <label>City / Area</label>
              <input 
                type="text" 
                name="city" 
                value={addressData.city}
                onChange={(e) => setAddressData(prev => ({...prev, city: e.target.value}))}
              />
            </div>
            <div className="vertical-group">
              <label>Landmark</label>
              <input type="text" name="landmark" defaultValue={customer.landmark || ""} placeholder="Near..." />
            </div>
          </div>

          <div className="vertical-group">
            <label>Street / House No.</label>
            <input type="text" name="address" defaultValue={customer.billingAddress || ""} placeholder="Full address or street info..." />
          </div>

          <div className="section-header">
            <div className="section-badge" style={{ background: '#059669' }}>4</div>
            <h3>PREFERENCES</h3>
          </div>
          
          <div className="grid-row">
            <div className="vertical-group">
              <label>Regular Discount</label>
              <input type="text" name="regularDiscount" defaultValue={customer.regularDiscount || ""} placeholder="e.g. 5%, flat ₹50, seasonal..." />
              <div className="sub-label">Free note — e.g. 10%, flat ₹100, trade discount</div>
            </div>
            <div className="vertical-group">
              <label>Preferred Payment Method</label>
              <div className="payment-pills">
                {['None', 'COD', 'UPI', 'Credit', 'Bank', 'Cheque'].map(method => (
                  <div 
                    key={method} 
                    className={`payment-pill ${paymentMethod === method ? 'active' : ''}`}
                    onClick={() => setPaymentMethod(method)}
                  >
                    {method === 'COD' && '📦'}
                    {method === 'UPI' && '📱'}
                    {method === 'Credit' && '📋'}
                    {method === 'Bank' && '🏦'}
                    {method === 'Cheque' && '📝'}
                    {method}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="section-header">
            <div className="section-badge purple">5</div>
            <h3>ASSIGNED AGENT</h3>
          </div>

          <div className="vertical-group">
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>Assigned Sales Representative / Agent</label>
            <select 
              name="assignedSalespersonId" 
              defaultValue={customer.assignedSalespersonId || customer.assignedSalesperson?.id || ""}
              style={{ width: '100%', padding: '10px 14px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.9rem', backgroundColor: '#ffffff', color: '#0f172a', fontWeight: 500 }}
            >
              <option value="">Unassigned</option>
              {employees && employees.length > 0 ? (
                employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))
              ) : (
                customer.assignedSalesperson?.user?.name && (
                  <option value={customer.assignedSalespersonId || customer.assignedSalesperson?.id || ""}>{customer.assignedSalesperson.user.name}</option>
                )
              )}
            </select>
            <div className="sub-label">Select an agent to assign or transfer this customer's account.</div>
          </div>

          <div className="modal-footer" style={{ marginTop: '24px', background: 'transparent', padding: '0', border: 'none' }}>
            <button type="button" className="btn-secondary" onClick={onClose} style={{ border: 'none', background: '#f8fafc' }}>Cancel</button>
            <button type="submit" className="primary-btn" disabled={loading} style={{ background: '#3b82f6', borderColor: '#3b82f6', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={16} /> {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
