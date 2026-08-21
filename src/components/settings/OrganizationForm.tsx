"use client";

import React, { useState } from 'react';
import { updateCompanySettings } from '@/app/actions/companyActions';
import { Building, Upload, Save, CheckCircle, FileCheck2, UserCheck } from 'lucide-react';

interface OrganizationFormProps {
  initialData: any;
}

export default function OrganizationForm({ initialData }: OrganizationFormProps) {
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [logoUrl, setLogoUrl] = useState(initialData?.logoUrl || '');
  const [signatoryUrl, setSignatoryUrl] = useState(initialData?.signatoryUrl || '');
  const [signatoryName, setSignatoryName] = useState(initialData?.signatoryName || 'Ashish Aggarwal');
  const [signatoryDesignation, setSignatoryDesignation] = useState(initialData?.signatoryDesignation || 'Authorized Signatory');

  const [callOutcomes, setCallOutcomes] = useState<string[]>(initialData?.callOutcomes || ["Interested / Follow-up Needed", "Not Interested", "No Answer / Voicemail", "Order Placed", "Complaint / Support"]);
  const [newOutcome, setNewOutcome] = useState('');

  const [callTypes, setCallTypes] = useState<string[]>(initialData?.callTypes || ["Outbound Call (Made by us)", "Inbound Call (Received from customer)", "In-person Meeting", "WhatsApp Chat"]);
  const [newCallType, setNewCallType] = useState('');

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSignatoryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSignatoryUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');

    const formData = new FormData(e.currentTarget);
    formData.set('logoUrl', logoUrl);
    formData.set('signatoryUrl', signatoryUrl);
    formData.set('signatoryName', signatoryName);
    formData.set('signatoryDesignation', signatoryDesignation);
    formData.set('callOutcomes', JSON.stringify(callOutcomes));
    formData.set('callTypes', JSON.stringify(callTypes));

    const res = await updateCompanySettings(formData);
    setLoading(false);

    if (res.success) {
      setSuccessMsg("Organization profile & Authorized Signatory settings updated successfully!");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="zoho-form-card">
      {successMsg && (
        <div style={{ padding: '12px 16px', backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#065f46', borderRadius: '6px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <CheckCircle size={18} /> {successMsg}
        </div>
      )}

      {/* Logo Section */}
      <div className="zoho-section-box">
        <h3 className="zoho-section-title">Company Logo (Displayed on Invoices/Quotes)</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ width: '90px', height: '90px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', overflow: 'hidden' }}>
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }} />
            ) : (
              <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                <Upload size={22} style={{ margin: '0 auto 4px auto' }} />
                <span style={{ fontSize: '10px' }}>Upload</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleLogoUpload}
              style={{ fontSize: '12px', color: '#64748b' }}
            />
            <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Recommended: Transparent PNG or JPG logo.</p>
            <input 
              type="text" 
              placeholder="Or paste Image URL (https://...)" 
              value={logoUrl} 
              onChange={e => setLogoUrl(e.target.value)}
              className="zoho-input-field"
              style={{ maxWidth: '400px' }}
            />
          </div>
        </div>
      </div>

      {/* ─── AUTHORIZED SIGNATORY & STAMP SECTION ─── */}
      <div className="zoho-section-box" style={{ backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '20px', borderRadius: '10px' }}>
        <h3 className="zoho-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#0f172a' }}>
          <UserCheck size={20} style={{ color: 'var(--accent-primary, #4f46e5)' }} /> Authorized Signatory & Digital Signature
        </h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>
          Upload signature image and signatory details. This will automatically appear on all Quotations and Invoices.
        </p>

        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          
          {/* Signature Preview Box */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Signature Image
            </label>
            <div style={{ width: '180px', height: '90px', border: '2px dashed #cbd5e1', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', overflow: 'hidden', position: 'relative' }}>
              {signatoryUrl ? (
                <img src={signatoryUrl} alt="Authorized Signature" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: '6px' }} />
              ) : (
                <div style={{ textAlign: 'center', color: '#94a3b8', padding: '10px' }}>
                  <Upload size={20} style={{ margin: '0 auto 4px auto' }} />
                  <span style={{ fontSize: '11px', fontWeight: 500 }}>Upload Signature</span>
                </div>
              )}
            </div>
            {signatoryUrl && (
              <button type="button" onClick={() => setSignatoryUrl('')} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}>
                Remove Signature
              </button>
            )}
          </div>

          {/* Upload Inputs & Signatory Details */}
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Upload Signature Image (PNG/JPG)
              </label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleSignatoryUpload}
                style={{ fontSize: '12px', color: '#64748b' }}
              />
              <p style={{ fontSize: '11px', color: '#64748b', margin: '4px 0 0 0' }}>Or paste image link / Base64 below:</p>
              <input 
                type="text" 
                placeholder="https://... signature image URL" 
                value={signatoryUrl} 
                onChange={e => setSignatoryUrl(e.target.value)}
                className="zoho-input-field"
                style={{ marginTop: '4px' }}
              />
            </div>

            <div className="zoho-form-grid-2" style={{ margin: 0, gap: '12px' }}>
              <div className="zoho-field-group">
                <label className="zoho-field-label">Signatory Name</label>
                <input 
                  type="text" 
                  name="signatoryName" 
                  value={signatoryName} 
                  onChange={e => setSignatoryName(e.target.value)}
                  placeholder="e.g. Ashish Aggarwal" 
                  className="zoho-input-field"
                />
              </div>

              <div className="zoho-field-group">
                <label className="zoho-field-label">Designation / Title</label>
                <input 
                  type="text" 
                  name="signatoryDesignation" 
                  value={signatoryDesignation} 
                  onChange={e => setSignatoryDesignation(e.target.value)}
                  placeholder="e.g. Authorized Signatory / Managing Director" 
                  className="zoho-input-field"
                />
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Basic Organization Details */}
      <div className="zoho-form-grid-2">
        <div className="zoho-field-group">
          <label className="zoho-field-label zoho-field-required">Company / Organization Name</label>
          <input 
            type="text" 
            name="companyName" 
            defaultValue={initialData?.companyName || "Espon Clothing Private Limited"} 
            className="zoho-input-field"
            required
          />
        </div>
        <div className="zoho-field-group">
          <label className="zoho-field-label zoho-field-required">GSTIN</label>
          <input 
            type="text" 
            name="gstin" 
            defaultValue={initialData?.gstin || "06AAHCE7721Q1Z4"} 
            className="zoho-input-field zoho-input-mono"
            required
          />
        </div>
      </div>

      <div className="zoho-form-grid-2">
        <div className="zoho-field-group">
          <label className="zoho-field-label zoho-field-required">Address</label>
          <input 
            type="text" 
            name="address" 
            defaultValue={initialData?.address || "Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road"} 
            className="zoho-input-field"
            required
          />
        </div>
        <div className="zoho-form-grid-3" style={{ margin: 0 }}>
          <div className="zoho-field-group">
            <label className="zoho-field-label">City</label>
            <input type="text" name="city" defaultValue={initialData?.city || "Rohtak"} className="zoho-input-field" />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">State</label>
            <input type="text" name="state" defaultValue={initialData?.state || "Haryana"} className="zoho-input-field" />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">Pincode</label>
            <input type="text" name="pincode" defaultValue={initialData?.pincode || "124001"} className="zoho-input-field" />
          </div>
        </div>
      </div>

      <div className="zoho-form-grid-3">
        <div className="zoho-field-group">
          <label className="zoho-field-label">Phone Number</label>
          <input type="text" name="mobile" defaultValue={initialData?.mobile || "7206066678"} className="zoho-input-field" />
        </div>
        <div className="zoho-field-group">
          <label className="zoho-field-label">Email Address</label>
          <input type="email" name="email" defaultValue={initialData?.email || "clothingespon@gmail.com"} className="zoho-input-field" />
        </div>
        <div className="zoho-field-group">
          <label className="zoho-field-label">Website URL</label>
          <input type="text" name="website" defaultValue={initialData?.website || "www.espon.in"} className="zoho-input-field" />
        </div>
      </div>

      {/* Bank & Payment Details */}
      <div className="zoho-section-box">
        <h3 className="zoho-section-title">Bank & Payment Account Details (Appears on Invoices/Quotes)</h3>
        <div className="zoho-form-grid-2">
          <div className="zoho-field-group">
            <label className="zoho-field-label">A/C Name</label>
            <input 
              type="text" 
              name="bankAccountName" 
              defaultValue={initialData?.bankAccountName || "ESPON CLOTHING PRIVATE LIMITED."} 
              className="zoho-input-field"
            />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">Account Number</label>
            <input 
              type="text" 
              name="accountNumber" 
              defaultValue={initialData?.accountNumber || "016805006415"} 
              className="zoho-input-field zoho-input-mono"
            />
          </div>
        </div>

        <div className="zoho-form-grid-3" style={{ margin: 0 }}>
          <div className="zoho-field-group">
            <label className="zoho-field-label">IFSC Code</label>
            <input 
              type="text" 
              name="ifscCode" 
              defaultValue={initialData?.ifscCode || "ICIC0000168"} 
              className="zoho-input-field zoho-input-mono"
            />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">Branch</label>
            <input 
              type="text" 
              name="branch" 
              defaultValue={initialData?.branch || "Rohtak"} 
              className="zoho-input-field"
            />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">UPI ID</label>
            <input 
              type="text" 
              name="upiId" 
              defaultValue={initialData?.upiId || "7206066678@OKBIZAXIS"} 
              className="zoho-input-field zoho-input-mono"
            />
          </div>
        </div>
      </div>

      {/* Document Numbering Preferences */}
      <div className="zoho-section-box">
        <h3 className="zoho-section-title">Default Document Numbering Preferences</h3>
        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '16px' }}>Set your starting or next default Quotation and Invoice number format (e.g. QT-1001, INV-1001).</p>
        <div className="zoho-form-grid-2">
          <div className="zoho-field-group">
            <label className="zoho-field-label">Default / Next Quotation No.</label>
            <input 
              type="text" 
              name="nextQuotationNumber" 
              defaultValue={initialData?.nextQuotationNumber || "QT-1001"} 
              placeholder="e.g. QT-1001"
              className="zoho-input-field zoho-input-mono"
            />
          </div>
          <div className="zoho-field-group">
            <label className="zoho-field-label">Default / Next Invoice No.</label>
            <input 
              type="text" 
              name="nextInvoiceNumber" 
              defaultValue={initialData?.nextInvoiceNumber || "INV-1001"} 
              placeholder="e.g. INV-1001"
              className="zoho-input-field zoho-input-mono"
            />
          </div>
        </div>
      </div>

      {/* CRM Settings */}
      <div className="zoho-section-box">
        <h3 className="zoho-section-title">CRM Settings</h3>
        {/* Call Outcomes */}
        <div className="zoho-field-group" style={{ marginBottom: '24px' }}>
          <label className="zoho-field-label">Call Outcomes</label>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Customize the list of outcomes available when logging a call.</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {callOutcomes.map((outcome, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <span>{outcome}</span>
                <button type="button" onClick={() => setCallOutcomes(callOutcomes.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
            <input 
              type="text" 
              value={newOutcome} 
              onChange={e => setNewOutcome(e.target.value)} 
              placeholder="E.g. Call Back Later" 
              className="zoho-input-field" 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newOutcome.trim()) {
                    setCallOutcomes([...callOutcomes, newOutcome.trim()]);
                    setNewOutcome('');
                  }
                }
              }}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                if (newOutcome.trim()) {
                  setCallOutcomes([...callOutcomes, newOutcome.trim()]);
                  setNewOutcome('');
                }
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* Call Types */}
        <div className="zoho-field-group">
          <label className="zoho-field-label">Call Types</label>
          <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '12px' }}>Customize the interaction types (e.g. Outbound, Inbound, WhatsApp, In-Person Meeting).</p>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {callTypes.map((type, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#f1f5f9', padding: '6px 12px', borderRadius: '20px', fontSize: '13px', border: '1px solid #cbd5e1' }}>
                <span>{type}</span>
                <button type="button" onClick={() => setCallTypes(callTypes.filter((_, i) => i !== idx))} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', fontWeight: 'bold' }}>×</button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px', maxWidth: '400px' }}>
            <input 
              type="text" 
              value={newCallType} 
              onChange={e => setNewCallType(e.target.value)} 
              placeholder="E.g. Video Call" 
              className="zoho-input-field" 
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newCallType.trim()) {
                    setCallTypes([...callTypes, newCallType.trim()]);
                    setNewCallType('');
                  }
                }
              }}
            />
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={() => {
                if (newCallType.trim()) {
                  setCallTypes([...callTypes, newCallType.trim()]);
                  setNewCallType('');
                }
              }}
            >
              Add
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '16px' }}>
        <button 
          type="submit" 
          disabled={loading} 
          className="primary-btn hover-lift"
          style={{ padding: '12px 28px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Save size={16} /> {loading ? "Saving Profile..." : "Save Organization Profile"}
        </button>
      </div>
    </form>
  );
}
