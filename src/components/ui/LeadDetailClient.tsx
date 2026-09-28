"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddCustomerModal from './AddCustomerModal';
import LogCallModal from './LogCallModal';
import { openPhoneDialer } from '@/lib/dialer';
import { updateLead } from '@/actions/leads';
import { deleteCall } from '@/app/actions/callActions';
import CallTranscriptViewer from '@/components/telecalling/CallTranscriptViewer';
import { 
  Phone, 
  PhoneCall, 
  MessageSquare, 
  UserPlus, 
  ArrowLeft, 
  Edit2, 
  Check, 
  X, 
  Calendar, 
  User, 
  Store, 
  Clock, 
  PhoneOutgoing, 
  PhoneIncoming, 
  Volume2, 
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Globe,
  Mail,
  Ship,
  Package,
  FileText,
  Eye,
  Download,
  ExternalLink,
  Upload,
  Maximize2,
  Sparkles,
  Palette,
  Layers,
  Image as ImageIcon
} from 'lucide-react';
import './leadDetail.css';

// Helper to compress uploaded images to Base64
function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve) => {
    if (file.type === "application/pdf") {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || "");
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        } else {
          resolve(e.target?.result as string || "");
        }
      };
      img.onerror = () => resolve(e.target?.result as string || "");
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function parseLeadNotes(notes: string) {
  if (!notes) return { isCustomDesign: false, refNumber: "", reqType: "", refSku: "", expectedQty: "", timeline: "", designDetails: "", pictures: [] as string[], cleanNotes: "" };

  const isCustomDesign = notes.includes("CUSTOM DESIGN REQUEST") || notes.includes("CR-");
  let refNumber = "";
  const refMatch = notes.match(/CUSTOM DESIGN REQUEST\s*#?([A-Z0-9-]+)\]/i);
  if (refMatch) refNumber = refMatch[1];

  let reqType = "";
  const typeMatch = notes.match(/•\s*Type:\s*([^\n]+)/i);
  if (typeMatch) reqType = typeMatch[1].trim();

  let refSku = "";
  const skuMatch = notes.match(/•\s*Reference SKU:\s*([^\n]+)/i);
  if (skuMatch) refSku = skuMatch[1].trim();

  let expectedQty = "";
  const qtyMatch = notes.match(/•\s*Expected Quantity:\s*([^\n]+)/i);
  if (qtyMatch) expectedQty = qtyMatch[1].trim();

  let timeline = "";
  const timeMatch = notes.match(/•\s*Required Timeline:\s*([^\n]+)/i);
  if (timeMatch) timeline = timeMatch[1].trim();

  let designDetails = "";
  const detailsMatch = notes.match(/•\s*Design Details:\s*([\s\S]*?)(?:•\s*Uploaded Reference Pictures|$)/i);
  if (detailsMatch) designDetails = detailsMatch[1].trim();

  const pictures: string[] = [];
  const lines = notes.split('\n');
  lines.forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith("data:image/") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("blob:")) {
      pictures.push(trimmed);
    }
  });

  return {
    isCustomDesign,
    refNumber,
    reqType,
    refSku,
    expectedQty,
    timeline,
    designDetails,
    pictures,
    cleanNotes: notes
  };
}

export default function LeadDetailClient({ lead: initialLead, employees }: { lead: any, employees: any[] }) {
  const router = useRouter();
  const [lead, setLead] = useState<any>(initialLead);
  const [isConverting, setIsConverting] = useState(false);
  const [isLoggingCall, setIsLoggingCall] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  // Inline Lead Name Editing State
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(lead.name || '');
  const [shopValue, setShopValue] = useState(lead.shopName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  const initials = (lead.name || "L").slice(0, 2).toUpperCase();

  const handleSaveLeadName = async () => {
    if (!nameValue.trim()) return;
    setIsSavingName(true);
    try {
      const res = await updateLead(lead.id, {
        name: nameValue.trim(),
        shopName: shopValue.trim() || undefined
      });
      if (res && res.success) {
        setLead((prev: any) => ({
          ...prev,
          name: nameValue.trim(),
          shopName: shopValue.trim()
        }));
        setIsEditingName(false);
        setToastMsg("✅ Lead updated successfully!");
        setTimeout(() => setToastMsg(''), 2500);
      } else {
        alert(res?.error || "Failed to update lead name");
      }
    } catch (err: any) {
      alert("Error updating lead: " + (err?.message || "Unknown error"));
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDeleteLeadCall = async (callId: string) => {
    if (!window.confirm("Are you sure you want to delete this call record and recording?")) return;
    try {
      const res = await deleteCall(callId);
      if (res && res.success) {
        setLead((prev: any) => ({
          ...prev,
          calls: (prev?.calls || []).filter((c: any) => c.id !== callId)
        }));
        setToastMsg("✅ Call record and recording deleted.");
        setTimeout(() => setToastMsg(''), 2500);
        try {
          router.refresh();
        } catch (e) {}
      } else {
        alert(res?.error || "Failed to delete call record");
      }
    } catch (err: any) {
      alert("Error deleting call: " + (err?.message || "Unknown error"));
    }
  };

  const handleAttachPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingPhoto(true);
    try {
      const base64List: string[] = [];
      for (const file of Array.from(files)) {
        const b64 = await compressImageToBase64(file);
        if (b64) base64List.push(b64);
      }
      if (base64List.length > 0) {
        const currentNotes = lead.notes || "";
        const updatedNotes = currentNotes
          ? `${currentNotes}\n• Uploaded Reference Pictures (${base64List.length}):\n${base64List.join('\n')}`
          : `• Uploaded Reference Pictures (${base64List.length}):\n${base64List.join('\n')}`;
        const res = await updateLead(lead.id, { notes: updatedNotes });
        if (res && res.success) {
          setLead((prev: any) => ({ ...prev, notes: updatedNotes }));
          setToastMsg("✅ Reference photo attached!");
          setTimeout(() => setToastMsg(''), 2500);
        } else {
          alert(res?.error || "Failed to attach photo");
        }
      }
    } catch (err: any) {
      alert("Error attaching photo: " + (err?.message || "Unknown error"));
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const parsedDesign = parseLeadNotes(lead.notes);

  return (
    <div className="lead-detail-wrapper">
      {/* ── TOP NAV BAR ── */}
      <div className="lead-detail-top-nav">
        <button 
          type="button" 
          onClick={() => router.push('/leads')}
          className="lead-detail-back-btn"
        >
          <ArrowLeft size={14} /> Back to Leads
        </button>

        {toastMsg && (
          <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669", backgroundColor: "#ecfdf5", padding: "6px 12px", borderRadius: "8px", border: "1px solid #a7f3d0" }}>
            {toastMsg}
          </div>
        )}
      </div>

      {/* ── HERO PROFILE CARD ── */}
      <div className="lead-detail-hero-card">
        <div className="lead-detail-profile-row">
          <div className="lead-detail-avatar">
            {initials}
          </div>

          <div className="lead-detail-title-group">
            {!isEditingName ? (
              <>
                <div className="lead-detail-name-row">
                  <h1 className="lead-detail-name">{lead.name}</h1>
                  <button 
                    type="button"
                    onClick={() => {
                      setNameValue(lead.name);
                      setShopValue(lead.shopName || '');
                      setIsEditingName(true);
                    }}
                    className="lead-detail-edit-name-btn"
                    title="Edit Name & Shop"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>
                {lead.shopName && (
                  <div className="lead-detail-shop">
                    🏪 {lead.shopName}
                  </div>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', maxWidth: '340px' }}>
                <input 
                  type="text"
                  placeholder="Lead Name"
                  value={nameValue}
                  onChange={(e) => setNameValue(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1.5px solid #4f46e5',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                  autoFocus
                />
                <input 
                  type="text"
                  placeholder="Shop / Business Name (Optional)"
                  value={shopValue}
                  onChange={(e) => setShopValue(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    outline: 'none'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                  <button
                    type="button"
                    onClick={handleSaveLeadName}
                    disabled={isSavingName}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      color: '#ffffff',
                      border: 'none',
                      fontSize: '0.76rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Check size={12} /> {isSavingName ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(false)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '6px',
                      backgroundColor: '#f1f5f9',
                      color: '#475569',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="lead-detail-badges-row">
              <span className={`status-badge ${lead.status?.toLowerCase().replace(' ', '-')}`}>
                {lead.status || 'New'}
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>
                Assigned: <strong>{lead.assignedSalesperson?.user?.name || 'Unassigned'}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 1-Tap Action Buttons Grid */}
        <div className="lead-detail-action-grid">
          {lead.whatsappNumber ? (
            <button
              type="button"
              className="lead-detail-act-btn call"
              onClick={() => openPhoneDialer({
                phone: lead.whatsappNumber,
                name: lead.name,
                leadId: lead.id
              })}
              title="Call Lead"
            >
              <PhoneCall size={14} /> Call
            </button>
          ) : (
            <button type="button" disabled className="lead-detail-act-btn" style={{ opacity: 0.5 }}>
              <PhoneCall size={14} /> No Phone
            </button>
          )}

          {lead.whatsappNumber ? (
            <a
              href={`https://wa.me/${lead.whatsappNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noreferrer"
              className="lead-detail-act-btn whatsapp"
              title="Chat on WhatsApp"
            >
              <MessageSquare size={14} /> WhatsApp
            </a>
          ) : (
            <button type="button" disabled className="lead-detail-act-btn" style={{ opacity: 0.5 }}>
              <MessageSquare size={14} /> WhatsApp
            </button>
          )}

          {lead.status !== 'Converted' ? (
            <button
              type="button"
              className="lead-detail-act-btn convert"
              onClick={() => setIsConverting(true)}
              title="Convert Lead to Customer"
            >
              <UserPlus size={14} /> Convert
            </button>
          ) : (
            <div className="lead-detail-act-btn converted">
              ✓ Converted
            </div>
          )}
        </div>
      </div>

      {/* ── STACKED APP VIEW CONTENT (Responsive 1-Col on Mobile, 2-Col on Desktop) ── */}
      <div className="lead-detail-content-layout">
        {/* Left Card: Lead Profile Information */}
        <div className="lead-section-card">
          <div className="lead-section-header">
            <h2 className="lead-section-title">
              <User size={16} color="#4f46e5" /> Lead Information
            </h2>
          </div>

          <div className="lead-info-list">
            <div className="lead-info-row">
              <span className="lead-info-label">
                <Globe size={13} /> Client Type
              </span>
              <span className="lead-info-value">
                {lead.isInternational ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f0fdf4', color: '#15803d', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 700, border: '1px solid #bbf7d0' }}>
                    🌐 Export Buyer ({lead.country || 'International'})
                  </span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', color: '#475569', padding: '2px 8px', borderRadius: '6px', fontSize: '0.74rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                    🇮🇳 Domestic (India)
                  </span>
                )}
              </span>
            </div>

            <div className="lead-info-row">
              <span className="lead-info-label">
                <Phone size={13} /> Mobile / WhatsApp
              </span>
              <span className="lead-info-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                {lead.whatsappNumber || "Not provided"}
              </span>
            </div>

            {lead.email && (
              <div className="lead-info-row">
                <span className="lead-info-label">
                  <Mail size={13} /> Email Address
                </span>
                <span className="lead-info-value">
                  <a href={`mailto:${lead.email}`} style={{ color: '#4f46e5', textDecoration: 'none' }}>
                    {lead.email}
                  </a>
                </span>
              </div>
            )}

            <div className="lead-info-row">
              <span className="lead-info-label">
                <Store size={13} /> Business / Shop
              </span>
              <span className="lead-info-value">
                {lead.shopName || "Inquiry"}
              </span>
            </div>

            {lead.buyerType && (
              <div className="lead-info-row">
                <span className="lead-info-label">
                  <User size={13} /> Buyer Classification
                </span>
                <span className="lead-info-value" style={{ color: '#0369a1', fontWeight: 600 }}>
                  {lead.buyerType}
                </span>
              </div>
            )}

            {lead.currency && lead.currency !== 'INR' && (
              <div className="lead-info-row">
                <span className="lead-info-label">
                  <Globe size={13} /> Target Currency
                </span>
                <span className="lead-info-value" style={{ color: '#059669', fontWeight: 700 }}>
                  {lead.currency}
                </span>
              </div>
            )}

            {lead.destinationPort && (
              <div className="lead-info-row">
                <span className="lead-info-label">
                  <Ship size={13} /> Destination Port
                </span>
                <span className="lead-info-value">
                  {lead.destinationPort}
                </span>
              </div>
            )}

            {lead.targetCapacity && (
              <div className="lead-info-row">
                <span className="lead-info-label">
                  <Package size={13} /> Glassware Requirement
                </span>
                <span className="lead-info-value" style={{ color: '#6d28d9', fontWeight: 600 }}>
                  🍷 {lead.targetCapacity}
                </span>
              </div>
            )}

            {lead.notes && !parsedDesign.isCustomDesign && parsedDesign.pictures.length === 0 && (
              <div className="lead-info-row" style={{ alignItems: 'flex-start' }}>
                <span className="lead-info-label">
                  <FileText size={13} /> Sourcing Notes
                </span>
                <span className="lead-info-value" style={{ fontSize: '0.76rem', color: '#475569', whiteSpace: 'pre-wrap' }}>
                  {lead.notes}
                </span>
              </div>
            )}

            {/* Custom Design / Bespoke Request Highlight Card */}
            {parsedDesign.isCustomDesign && (
              <div className="lead-design-request-card" style={{ marginTop: '8px' }}>
                <div className="lead-design-header">
                  <span className="lead-design-badge">
                    <Sparkles size={12} /> Custom Design {parsedDesign.refNumber ? `#${parsedDesign.refNumber}` : ''}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#86198f', fontWeight: 700 }}>
                    Bespoke Glassware
                  </span>
                </div>

                <div className="lead-design-grid-specs">
                  {parsedDesign.reqType && (
                    <div className="lead-design-spec-pill">
                      <span className="lead-design-spec-label">Request Type</span>
                      <span className="lead-design-spec-val">{parsedDesign.reqType}</span>
                    </div>
                  )}
                  {parsedDesign.expectedQty && (
                    <div className="lead-design-spec-pill">
                      <span className="lead-design-spec-label">Target Qty</span>
                      <span className="lead-design-spec-val">{parsedDesign.expectedQty}</span>
                    </div>
                  )}
                  {parsedDesign.timeline && (
                    <div className="lead-design-spec-pill">
                      <span className="lead-design-spec-label">Timeline</span>
                      <span className="lead-design-spec-val">{parsedDesign.timeline}</span>
                    </div>
                  )}
                  {parsedDesign.refSku && parsedDesign.refSku !== "None" && (
                    <div className="lead-design-spec-pill">
                      <span className="lead-design-spec-label">Reference SKU</span>
                      <span className="lead-design-spec-val">{parsedDesign.refSku}</span>
                    </div>
                  )}
                </div>

                {parsedDesign.designDetails && (
                  <div className="lead-design-desc-box">
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#86198f', textTransform: 'uppercase', marginBottom: '2px' }}>
                      Design Specifications
                    </div>
                    {parsedDesign.designDetails}
                  </div>
                )}
              </div>
            )}

            {/* Reference Photos & Drawings Gallery */}
            {(parsedDesign.pictures.length > 0 || parsedDesign.isCustomDesign) && (
              <div style={{ marginTop: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '12px' }}>
                <div className="lead-photos-gallery-title">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ImageIcon size={14} color="#6366f1" /> Reference Photos ({parsedDesign.pictures.length})
                  </span>

                  <label style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    color: '#4f46e5', 
                    background: '#eef2ff', 
                    border: '1px solid #c7d2fe', 
                    borderRadius: '6px', 
                    padding: '3px 8px', 
                    cursor: 'pointer' 
                  }}>
                    <Upload size={11} /> {isUploadingPhoto ? 'Attaching...' : 'Add Photo'}
                    <input type="file" multiple accept="image/*" onChange={handleAttachPhoto} disabled={isUploadingPhoto} style={{ display: 'none' }} />
                  </label>
                </div>

                {parsedDesign.pictures.some(p => p.startsWith('blob:')) && (
                  <div style={{ marginTop: '8px', padding: '6px 10px', background: '#fff1f2', border: '1px solid #fecdd3', borderRadius: '8px', fontSize: '0.72rem', color: '#9f1239', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span>⚠️ Past test photos were temporary browser session blobs. Tap <strong>Add Photo</strong> to attach the real image files.</span>
                  </div>
                )}

                {parsedDesign.pictures.length > 0 ? (
                  <div className="lead-photos-grid" style={{ marginTop: '8px' }}>
                    {parsedDesign.pictures.map((pic, idx) => {
                      const isBlob = pic.startsWith("blob:");
                      if (isBlob) {
                        return (
                          <div 
                            key={idx} 
                            className="lead-photo-thumb-card"
                            style={{ background: '#fff1f2', borderColor: '#fecdd3', cursor: 'default' }}
                          >
                            <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6px', textAlign: 'center', color: '#be123c' }}>
                              <AlertCircle size={18} color="#e11d48" style={{ marginBottom: '3px' }} />
                              <span style={{ fontSize: '9.5px', fontWeight: 800 }}>Expired Blob</span>
                              <span style={{ fontSize: '8px', color: '#9f1239', marginTop: '1px', lineHeight: 1.2 }}>Past local session</span>
                            </div>
                            <div className="lead-photo-overlay-tag" style={{ background: '#be123c' }}>
                              #{idx + 1}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div 
                          key={idx} 
                          className="lead-photo-thumb-card"
                          onClick={() => setLightboxImage(pic)}
                        >
                          <img 
                            src={pic} 
                            alt={`Reference Photo ${idx + 1}`} 
                            className="lead-photo-thumb-img"
                            onError={(e) => {
                              const imgEl = e.target as HTMLElement;
                              imgEl.style.display = 'none';
                              const parent = imgEl.parentElement;
                              if (parent && !parent.querySelector('.img-error-fallback')) {
                                const fb = document.createElement('div');
                                fb.className = 'img-error-fallback';
                                fb.style.cssText = 'height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:6px; text-align:center; background:#f8fafc; color:#64748b; font-size:9px; font-weight:700;';
                                fb.innerHTML = '<span>Image Unavailable</span>';
                                parent.appendChild(fb);
                              }
                            }}
                          />
                          <div className="lead-photo-overlay-tag">
                            #{idx + 1}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '8px', textAlign: 'center', fontSize: '0.74rem', color: '#94a3b8' }}>
                    No reference pictures uploaded yet. Tap "Add Photo" above to attach sketches, CAD drawings, or client samples.
                  </div>
                )}
              </div>
            )}

            <div className="lead-info-row">
              <span className="lead-info-label">
                <User size={13} /> Assigned Rep
              </span>
              <span className="lead-info-value">
                {lead.assignedSalesperson?.user?.name || "Unassigned"}
              </span>
            </div>

            <div className="lead-info-row">
              <span className="lead-info-label">
                <Calendar size={13} /> Lead Created
              </span>
              <span className="lead-info-value">
                {new Date(lead.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Right Section: Recent Activity & Calls */}
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Recent Calls Card */}
          <div className="lead-section-card">
            <div className="lead-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="lead-section-title">
                  <PhoneCall size={16} color="#10b981" /> Recent Calls
                </h2>
                <span className="lead-section-counter">
                  {lead.calls?.length || 0}
                </span>
              </div>

              <button
                type="button"
                onClick={() => openPhoneDialer({
                  phone: lead.whatsappNumber,
                  name: lead.name,
                  leadId: lead.id,
                  tab: "POST_CALL"
                })}
                style={{
                  padding: "5px 12px",
                  borderRadius: "8px",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  border: "1px solid #c7d2fe",
                  fontSize: "0.76rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px"
                }}
              >
                + Log Call
              </button>
            </div>

            {(!lead.calls || lead.calls.length === 0) ? (
              <div style={{ textAlign: "center", padding: "24px 10px", color: "#94a3b8" }}>
                <Clock size={28} style={{ margin: "0 auto 6px auto", opacity: 0.5 }} />
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600 }}>No calls recorded yet</p>
                <p style={{ margin: "3px 0 0 0", fontSize: "0.74rem" }}>Tap "Call" or "+ Log Call" above to record customer interactions.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {lead.calls.map((call: any) => {
                  const isOutbound = call.callType?.toUpperCase().includes("OUT");
                  return (
                    <div key={call.id} className="lead-call-card">
                      <div className="lead-call-card-top">
                        <div className="lead-call-type-badge">
                          {isOutbound ? (
                            <PhoneOutgoing size={13} color="#2563eb" />
                          ) : (
                            <PhoneIncoming size={13} color="#10b981" />
                          )}
                          <span>{call.callType} Call</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {call.outcome && (
                            <span className="lead-call-outcome-badge">
                              {call.outcome}
                            </span>
                          )}
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
                            {new Date(call.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short"
                            })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteLeadCall(call.id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#ef4444",
                              cursor: "pointer",
                              padding: "2px",
                              display: "flex",
                              alignItems: "center",
                              opacity: 0.8
                            }}
                            title="Delete call & recording"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {/* Call recording audio player if attached */}
                      {call.recordingUrl && (
                        <div style={{ marginTop: "4px" }}>
                          <audio controls src={call.recordingUrl} className="lead-call-audio-player" />
                        </div>
                      )}

                      {/* Notes / Auto Transcript / AI Summary */}
                      {(call.notes || call.summary) && (
                        <CallTranscriptViewer
                          notes={call.notes}
                          summary={call.summary}
                          repName={call.employee?.user?.name || lead.assignedSalesperson?.user?.name || "Ikra"}
                          customerName={lead.name || lead.contactPerson || lead.shopName || "Customer"}
                          callId={call.id}
                          durationSec={call.durationSec}
                          outcome={call.outcome}
                          status={call.status}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Follow-ups Card */}
          <div className="lead-section-card">
            <div className="lead-section-header">
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <h2 className="lead-section-title">
                  <Calendar size={16} color="#d97706" /> Follow-ups & Reminders
                </h2>
                <span className="lead-section-counter">
                  {lead.followUps?.length || 0}
                </span>
              </div>
            </div>

            {(!lead.followUps || lead.followUps.length === 0) ? (
              <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8", padding: "10px 0" }}>
                No follow-ups scheduled.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {lead.followUps.map((fu: any) => {
                  const isDone = fu.status === 'Completed';
                  return (
                    <div key={fu.id} className={`lead-fu-card ${isDone ? 'completed' : ''}`}>
                      <div>
                        <div className="lead-fu-title">{fu.followUpType || "Follow-up"}</div>
                        <div className="lead-fu-date">
                          📅 {new Date(fu.date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </div>
                      <span 
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "6px",
                          backgroundColor: isDone ? "#ecfdf5" : "#fffbeb",
                          color: isDone ? "#059669" : "#d97706",
                          border: `1px solid ${isDone ? '#a7f3d0' : '#fde68a'}`
                        }}
                      >
                        {fu.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      {isConverting && (
        <AddCustomerModal 
          onClose={(newCustomer) => {
            setIsConverting(false);
            if (newCustomer) {
              router.push(`/customers/${newCustomer.id}`);
            }
          }} 
          employees={employees.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }))}
          leadToConvert={lead}
        />
      )}

      {isLoggingCall && (
        <LogCallModal 
          onClose={() => setIsLoggingCall(false)}
          leadId={lead.id}
          leadName={lead.name}
          onCallLogged={() => router.refresh()}
        />
      )}

      {/* ── LIGHTBOX FULLSCREEN IMAGE PREVIEW ── */}
      {lightboxImage && (
        <div className="lead-lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <div className="lead-lightbox-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="lead-lightbox-header">
              <span style={{ fontSize: '0.88rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} /> Reference Picture Preview
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <a 
                  href={lightboxImage} 
                  download="reference-design.jpg" 
                  target="_blank" 
                  rel="noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#ffffff',
                    background: '#334155',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    textDecoration: 'none'
                  }}
                >
                  <Download size={12} /> Download
                </a>
                <button
                  type="button"
                  onClick={() => setLightboxImage(null)}
                  style={{
                    background: '#334155',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="lead-lightbox-img-wrap">
              <img src={lightboxImage} alt="Reference Design Large Preview" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
