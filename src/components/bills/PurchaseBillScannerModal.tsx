"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  RefreshCw,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  UserPlus,
  Check,
  Edit2
} from "lucide-react";
import { scanPurchaseBillWithAI, ExtractedBillData, ExtractedBillItem } from "@/app/actions/billScannerActions";
import { quickCreateVendorFromScan } from "@/app/actions/vendorActions";
import { createBill } from "@/app/actions/billActions";

interface VendorOption {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  city?: string | null;
  state?: string | null;
  paymentTerms?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  purchasePrice?: number;
}

interface Props {
  vendors: VendorOption[];
  products: ProductOption[];
  onClose: () => void;
  onApplyToBillForm: (extractedData: {
    vendorId: string;
    vendorBillNumber: string;
    billDate: string;
    dueDate: string;
    paymentTerms: string;
    notes: string;
    items: Array<{
      productId?: string;
      description: string;
      hsnCode: string;
      quantity: number;
      unit: string;
      rate: number;
      gstRate: number;
      taxAmount: number;
      total: number;
    }>;
  }) => void;
  onBillCreatedSuccess?: () => void;
}

export default function PurchaseBillScannerModal({
  vendors: initialVendors,
  products,
  onClose,
  onApplyToBillForm,
  onBillCreatedSuccess
}: Props) {
  const [vendorList, setVendorList] = useState<VendorOption[]>(initialVendors);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extracted Data State
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string>("");
  const [vendorBillNumber, setVendorBillNumber] = useState("");
  const [billDate, setBillDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30 Days");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ExtractedBillItem[]>([]);
  const [isCreatingDirectly, setIsCreatingDirectly] = useState(false);

  // Quick Add Vendor State
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [showVendorEditForm, setShowVendorEditForm] = useState(false);
  const [customVendorName, setCustomVendorName] = useState("");
  const [customVendorGst, setCustomVendorGst] = useState("");
  const [customVendorPhone, setCustomVendorPhone] = useState("");
  const [customVendorCity, setCustomVendorCity] = useState("");
  const [customVendorState, setCustomVendorState] = useState("");
  const [customVendorAddress, setCustomVendorAddress] = useState("");
  const [vendorCreatedSuccess, setVendorCreatedSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);
    setVendorCreatedSuccess(null);

    const isPdfFile = selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    const previewUrl = URL.createObjectURL(selectedFile);
    setFilePreview(previewUrl);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Result = reader.result as string;
      await runAiScan(base64Result, selectedFile.type || (isPdfFile ? "application/pdf" : "image/jpeg"), selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  const runAiScan = async (base64Data: string, mimeType: string, fileName: string) => {
    setScanning(true);
    setScanStep("Uploading bill to Gemini Vision AI...");

    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev.includes("Uploading")) return "Deciphering vendor letterhead, GSTIN & bill header...";
        if (prev.includes("Deciphering")) return "Reading handwritten articles, quantities & rates...";
        if (prev.includes("Reading")) return "Extracting GST tax slabs (CGST / SGST) & round off...";
        return "Calculating totals and verifying vendor matching...";
      });
    }, 1200);

    try {
      const res = await scanPurchaseBillWithAI(base64Data, mimeType, fileName);
      clearInterval(stepInterval);

      if (res.success && res.data) {
        const d = res.data;
        setExtractedData(d);

        // Pre-fill vendor fields for quick registration
        setCustomVendorName(d.vendorName || "");
        setCustomVendorGst(d.vendorGstNumber || "");
        setCustomVendorPhone(d.vendorPhone || "");
        setCustomVendorCity(d.vendorCity || "");
        setCustomVendorState(d.vendorState || "");
        setCustomVendorAddress(d.vendorAddress || "");

        // Set matched vendor or leave unselected to allow 1-click registration
        setSelectedVendorId(d.matchedVendorId || "");

        setVendorBillNumber(d.vendorBillNumber || "");
        setBillDate(d.billDate || new Date().toISOString().split("T")[0]);
        setDueDate(d.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
        setPaymentTerms(d.paymentTerms || "Net 30 Days");
        setNotes(d.notes || `AI Scanned: Bill #${d.vendorBillNumber || '181'} from ${d.vendorName}`);
        setItems(d.items || []);
        setScanning(false);
      } else {
        setError(res.error || "Failed to parse bill details.");
        setScanning(false);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || "An unexpected error occurred during scan.");
      setScanning(false);
    }
  };

  // Quick Add Vendor from Scanned Details
  const handleQuickAddVendor = async () => {
    const nameToUse = customVendorName.trim() || extractedData?.vendorName?.trim();
    if (!nameToUse) {
      alert("Vendor company name is required.");
      return;
    }

    setIsAddingVendor(true);
    try {
      const res = await quickCreateVendorFromScan({
        companyName: nameToUse,
        gstNumber: customVendorGst.trim() || extractedData?.vendorGstNumber || undefined,
        mobile: customVendorPhone.trim() || extractedData?.vendorPhone || undefined,
        city: customVendorCity.trim() || extractedData?.vendorCity || undefined,
        state: customVendorState.trim() || extractedData?.vendorState || undefined,
        address: customVendorAddress.trim() || extractedData?.vendorAddress || undefined,
        paymentTerms: paymentTerms || "Net 30 Days"
      });

      setIsAddingVendor(false);

      if (res.success && res.vendor) {
        const newVendor: VendorOption = {
          id: res.vendor.id,
          companyName: res.vendor.companyName,
          gstNumber: res.vendor.gstNumber,
          mobile: res.vendor.mobile,
          city: res.vendor.city,
          state: res.vendor.state,
          paymentTerms: res.vendor.paymentTerms
        };

        // Add to local vendor list if not already present
        setVendorList(prev => {
          if (prev.some(v => v.id === newVendor.id)) return prev;
          return [newVendor, ...prev];
        });

        // Auto select newly created vendor
        setSelectedVendorId(newVendor.id);
        setVendorCreatedSuccess(`Vendor "${newVendor.companyName}" successfully registered & linked!`);
        setShowVendorEditForm(false);
      } else {
        alert("Failed to create vendor: " + (res.error || "Unknown error"));
      }
    } catch (err: any) {
      setIsAddingVendor(false);
      alert("Error adding vendor: " + err.message);
    }
  };

  // Recalculate item totals
  const handleItemChange = (index: number, field: keyof ExtractedBillItem, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "rate" || field === "gstRate") {
      const q = field === "quantity" ? parseFloat(value) || 0 : item.quantity;
      const r = field === "rate" ? parseFloat(value) || 0 : item.rate;
      const g = field === "gstRate" ? parseFloat(value) || 0 : item.gstRate;
      const taxable = q * r;
      const tax = (taxable * g) / 100;
      item.taxAmount = Number(tax.toFixed(2));
      item.total = Number((taxable + tax).toFixed(2));
    }

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: "",
        hsnCode: "6109",
        quantity: 1,
        unit: "pcs",
        rate: 0,
        gstRate: 5,
        taxAmount: 0,
        total: 0
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  // Compute live financial totals
  const computedSubtotal = items.reduce((acc, it) => acc + (it.quantity * it.rate), 0);
  const computedTotalTax = items.reduce((acc, it) => acc + it.taxAmount, 0);
  const computedGrandTotal = computedSubtotal + computedTotalTax;

  const handleApply = () => {
    if (!selectedVendorId) {
      alert("Please select or register the vendor first.");
      return;
    }

    onApplyToBillForm({
      vendorId: selectedVendorId,
      vendorBillNumber,
      billDate,
      dueDate,
      paymentTerms,
      notes,
      items: items.map(it => ({
        productId: it.matchedProductId,
        description: it.description,
        hsnCode: it.hsnCode,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        gstRate: it.gstRate,
        taxAmount: it.taxAmount,
        total: it.total
      }))
    });
    onClose();
  };

  const handleDirectCreate = async () => {
    if (!selectedVendorId) {
      alert("Please select or register the vendor first.");
      return;
    }
    if (!vendorBillNumber) {
      alert("Please provide the Vendor Bill/Invoice number.");
      return;
    }
    if (items.some(it => !it.description || it.quantity <= 0 || it.rate < 0)) {
      alert("Please ensure all line items have a valid description, quantity, and rate.");
      return;
    }

    setIsCreatingDirectly(true);

    try {
      const res = await createBill({
        vendorId: selectedVendorId,
        vendorBillNumber,
        billDate,
        dueDate,
        paymentTerms,
        notes: notes || "AI Scanned Purchase Bill",
        autoRestock: true,
        items: items.map(it => ({
          productId: it.matchedProductId,
          description: it.description,
          hsnCode: it.hsnCode,
          quantity: it.quantity,
          unit: it.unit,
          rate: it.rate,
          gstRate: it.gstRate,
          taxAmount: it.taxAmount,
          total: it.total
        }))
      });

      setIsCreatingDirectly(false);

      if (res.error) {
        alert("Error creating bill: " + res.error);
      } else {
        alert("Purchase Bill created and posted to ledgers successfully!");
        if (onBillCreatedSuccess) onBillCreatedSuccess();
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setIsCreatingDirectly(false);
      alert("Failed to create bill: " + err.message);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif)"
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: extractedData ? "1300px" : "640px",
          maxHeight: "94vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          transition: "max-width 0.3s ease"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "16px 22px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                AI Purchase Bill & Handwritten Invoice Scanner
              </h3>
              <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                Instant multimodal extraction from PDF invoices, camera photos & handwritten mandi slips
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          
          {/* UPLOAD VIEW */}
          {!extractedData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelected(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "12px",
                  padding: "48px 24px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                  style={{ display: "none" }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <div style={{ width: "56px", height: "56px", borderRadius: "50%", backgroundColor: "#e0f2fe", color: "#0284c7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <UploadCloud size={30} />
                </div>

                <h4 style={{ margin: "0 0 6px", fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                  Upload Supplier Bill, PDF, or Photo
                </h4>
                <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "#64748b" }}>
                  Supports digital tax invoices, camera photos, and handwritten wholesale slips
                </p>

                <button
                  type="button"
                  style={{
                    padding: "9px 20px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FileText size={16} /> Choose File / Take Photo
                </button>
              </div>

              {scanning && (
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2563eb", fontWeight: 600, fontSize: "0.9rem", marginBottom: "6px" }}>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Analyzing Purchase Bill with Gemini Vision AI...</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#1e40af" }}>
                    {scanStep}
                  </p>
                </div>
              )}

              {error && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", fontSize: "0.82rem" }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* SPLIT SCREEN REVIEW */}
          {extractedData && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "22px", alignItems: "flex-start" }}>
              
              {/* LEFT: LIVE DOCUMENT PREVIEW */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Scanned Document Preview
                  </span>
                  <span style={{ padding: "3px 8px", borderRadius: "4px", backgroundColor: "#dcfce7", color: "#166534", fontSize: "0.72rem", fontWeight: 700 }}>
                    {extractedData.confidenceScore}% Confidence
                  </span>
                </div>

                <div style={{ height: "540px", overflow: "auto", backgroundColor: "#0f172a", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isPdf && filePreview ? (
                    <iframe src={filePreview} style={{ width: "100%", height: "100%", border: "none" }} title="PDF Bill Preview" />
                  ) : filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreview} alt="Scanned Bill" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No document preview</div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedData(null);
                      setFile(null);
                      setFilePreview(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      fontSize: "0.75rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <RefreshCw size={13} /> Scan another document
                  </button>

                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    {file?.name} ({file?.size ? (file.size / 1024).toFixed(1) + " KB" : ""})
                  </span>
                </div>
              </div>

              {/* RIGHT: EDITABLE BILL & VENDOR FORM */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* VENDOR SELECTION & QUICK REGISTRATION */}
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "12px" }}>
                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                        VENDOR / SUPPLIER *
                      </label>
                      <select
                        value={selectedVendorId}
                        onChange={e => setSelectedVendorId(e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "7px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "#0f172a",
                          outline: "none"
                        }}
                      >
                        <option value="">Select Vendor...</option>
                        {vendorList.map(v => (
                          <option key={v.id} value={v.id}>
                            {v.companyName} {v.gstNumber ? `(${v.gstNumber})` : v.city ? `(${v.city})` : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                        VENDOR BILL / INVOICE # *
                      </label>
                      <input
                        type="text"
                        value={vendorBillNumber}
                        onChange={e => setVendorBillNumber(e.target.value)}
                        placeholder="e.g. 181 / INV-1001"
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          borderRadius: "7px",
                          border: "1px solid #cbd5e1",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          color: "#0f172a",
                          outline: "none"
                        }}
                      />
                    </div>
                  </div>

                  {/* QUICK ADD VENDOR BANNER (If vendor not in DB or unselected) */}
                  {!selectedVendorId && extractedData.vendorName && (
                    <div
                      style={{
                        marginTop: "8px",
                        backgroundColor: "#fffbeb",
                        border: "1px solid #fef3c7",
                        borderRadius: "8px",
                        padding: "10px 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" }}>
                        <div>
                          <span style={{ fontSize: "0.72rem", color: "#92400e", fontWeight: 700, display: "block" }}>
                            ✨ SCANNED NEW VENDOR: &ldquo;{customVendorName || extractedData.vendorName}&rdquo;
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "#78350f" }}>
                            GSTIN: <strong>{customVendorGst || extractedData.vendorGstNumber || "N/A"}</strong> • Phone: <strong>{customVendorPhone || extractedData.vendorPhone || "N/A"}</strong> • City: <strong>{customVendorCity || extractedData.vendorCity || "N/A"}</strong>
                          </span>
                        </div>

                        <div style={{ display: "flex", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setShowVendorEditForm(!showVendorEditForm)}
                            style={{
                              padding: "5px 9px",
                              borderRadius: "6px",
                              border: "1px solid #fde68a",
                              backgroundColor: "#ffffff",
                              color: "#92400e",
                              fontSize: "0.72rem",
                              fontWeight: 600,
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px"
                            }}
                          >
                            <Edit2 size={12} /> {showVendorEditForm ? "Hide" : "Edit"}
                          </button>

                          <button
                            type="button"
                            onClick={handleQuickAddVendor}
                            disabled={isAddingVendor}
                            style={{
                              padding: "5px 12px",
                              borderRadius: "6px",
                              border: "none",
                              backgroundColor: "#d97706",
                              color: "#ffffff",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                              cursor: isAddingVendor ? "wait" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              boxShadow: "0 1px 3px rgba(217, 119, 6, 0.25)"
                            }}
                          >
                            <UserPlus size={13} /> {isAddingVendor ? "Adding..." : "+ Add & Link Vendor (1-Click)"}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Vendor Mini Editor */}
                      {showVendorEditForm && (
                        <div style={{ backgroundColor: "#ffffff", border: "1px solid #fde68a", borderRadius: "6px", padding: "8px 10px", display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1fr", gap: "6px", marginTop: "4px" }}>
                          <div>
                            <label style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>Vendor Name</label>
                            <input
                              type="text"
                              value={customVendorName}
                              onChange={e => setCustomVendorName(e.target.value)}
                              style={{ width: "100%", padding: "4px 6px", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>GSTIN</label>
                            <input
                              type="text"
                              value={customVendorGst}
                              onChange={e => setCustomVendorGst(e.target.value)}
                              style={{ width: "100%", padding: "4px 6px", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>Mobile</label>
                            <input
                              type="text"
                              value={customVendorPhone}
                              onChange={e => setCustomVendorPhone(e.target.value)}
                              style={{ width: "100%", padding: "4px 6px", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>City</label>
                            <input
                              type="text"
                              value={customVendorCity}
                              onChange={e => setCustomVendorCity(e.target.value)}
                              style={{ width: "100%", padding: "4px 6px", fontSize: "0.75rem", border: "1px solid #cbd5e1", borderRadius: "4px" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {vendorCreatedSuccess && (
                    <div style={{ marginTop: "6px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "6px 10px", borderRadius: "6px", color: "#166534", fontSize: "0.74rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                      <Check size={14} /> {vendorCreatedSuccess}
                    </div>
                  )}
                </div>

                {/* ROW 2: DATES & TERMS */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      BILL DATE
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      DUE DATE
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      PAYMENT TERMS
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                {/* ROW 3: PURCHASE LINE ITEMS */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#334155" }}>
                      PURCHASE LINE ITEMS ({items.length})
                    </label>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{
                        padding: "3px 8px",
                        borderRadius: "4px",
                        border: "1px solid #cbd5e1",
                        backgroundColor: "#f8fafc",
                        color: "#334155",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={13} /> Add Line Item
                    </button>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "210px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                      <thead style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 5 }}>
                        <tr>
                          <th style={{ padding: "6px 8px", textAlign: "left" }}>Item Description</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "65px" }}>HSN</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "55px" }}>Qty</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "55px" }}>Unit</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "70px" }}>Rate (₹)</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "65px" }}>GST %</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "85px" }}>Total (₹)</th>
                          <th style={{ padding: "6px 8px", width: "26px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="text"
                                value={it.description}
                                onChange={e => handleItemChange(idx, "description", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="text"
                                value={it.hsnCode}
                                onChange={e => handleItemChange(idx, "hsnCode", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem" }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="number"
                                value={it.quantity}
                                onChange={e => handleItemChange(idx, "quantity", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="text"
                                value={it.unit}
                                onChange={e => handleItemChange(idx, "unit", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.72rem" }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="number"
                                value={it.rate}
                                onChange={e => handleItemChange(idx, "rate", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <select
                                value={it.gstRate}
                                onChange={e => handleItemChange(idx, "gstRate", e.target.value)}
                                style={{ width: "100%", padding: "4px 4px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem" }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                              ₹{it.total.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "4px 8px", textAlign: "center" }}>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "2px" }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* FINANCIAL TOTALS BOX */}
                <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Taxable Subtotal: </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedSubtotal.toLocaleString("en-IN")}</strong>
                    <span style={{ color: "#64748b", marginLeft: "14px" }}>Total Tax: </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedTotalTax.toLocaleString("en-IN")}</strong>
                  </div>

                  <div style={{ fontSize: "1.15rem", fontWeight: 800, color: "#059669" }}>
                    Total: ₹{computedGrandTotal.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* ACTION BUTTONS ROW */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "10px", marginTop: "4px" }}>
                  <button
                    type="button"
                    onClick={handleApply}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#334155",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <ArrowRight size={15} /> Transfer to Bill Form
                  </button>

                  <button
                    type="button"
                    onClick={handleDirectCreate}
                    disabled={isCreatingDirectly}
                    style={{
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      cursor: isCreatingDirectly ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(5, 150, 105, 0.3)"
                    }}
                  >
                    <CheckCircle2 size={16} /> {isCreatingDirectly ? "Posting Bill..." : "Create & Post Bill (1-Click)"}
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
