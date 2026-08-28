"use client";

import React, { useState, useRef } from "react";
import {
  X,
  UploadCloud,
  FileText,
  Camera,
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
  HelpCircle,
  FileSpreadsheet
} from "lucide-react";
import { scanPurchaseBillWithAI, ExtractedBillData, ExtractedBillItem } from "@/app/actions/billScannerActions";
import { createBill } from "@/app/actions/billActions";

interface Vendor {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku?: string | null;
  purchasePrice?: number;
}

interface Props {
  vendors: Vendor[];
  products: Product[];
  onClose: () => void;
  onApplyToBillForm: (extracted: {
    vendorId: string;
    vendorBillNumber: string;
    billDate: string;
    dueDate: string;
    paymentTerms: string;
    notes: string;
    items: Array<{
      productId: string;
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
  vendors,
  products,
  onClose,
  onApplyToBillForm,
  onBillCreatedSuccess
}: Props) {
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

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const isPdfFile = selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    // Generate local preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    setFilePreview(previewUrl);

    // Read base64 data for AI parser
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Result = reader.result as string;
      await runAiScan(base64Result, selectedFile.type || (isPdfFile ? "application/pdf" : "image/jpeg"), selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  const runAiScan = async (base64Data: string, mimeType: string, fileName: string) => {
    setScanning(true);
    setScanStep("Uploading document to Gemini Vision AI...");

    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev.includes("Uploading")) return "Analyzing document structure & handwriting...";
        if (prev.includes("Analyzing")) return "Extracting vendor GSTIN & invoice header...";
        if (prev.includes("Extracting")) return "Deciphering line items, HSN & tax slabs...";
        return "Reconciling subtotals and double-entry balance...";
      });
    }, 1200);

    try {
      const res = await scanPurchaseBillWithAI(base64Data, mimeType, fileName);
      clearInterval(stepInterval);

      if (res.success && res.data) {
        const d = res.data;
        setExtractedData(d);
        setSelectedVendorId(d.matchedVendorId || (vendors.length > 0 ? vendors[0].id : ""));
        setVendorBillNumber(d.vendorBillNumber || "");
        setBillDate(d.billDate || new Date().toISOString().split("T")[0]);
        setDueDate(d.dueDate || new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]);
        setPaymentTerms(d.paymentTerms || "Net 30 Days");
        setNotes(d.notes || `AI Scanned from ${fileName}`);
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
        gstRate: 12,
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

  const computedSubtotal = items.reduce((acc, it) => acc + (it.quantity * it.rate), 0);
  const computedTotalTax = items.reduce((acc, it) => acc + (it.taxAmount || 0), 0);
  const computedTotalAmount = computedSubtotal + computedTotalTax;

  const handleApplyToBill = () => {
    if (!selectedVendorId) {
      alert("Please select or match a vendor first.");
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
        productId: it.matchedProductId || "",
        description: it.description || "Item",
        hsnCode: it.hsnCode || "6109",
        quantity: it.quantity,
        unit: it.unit || "pcs",
        rate: it.rate,
        gstRate: it.gstRate,
        taxAmount: it.taxAmount,
        total: it.total
      }))
    });
    onClose();
  };

  const handleDirectCreateBill = async () => {
    if (!selectedVendorId) {
      alert("Please select a vendor.");
      return;
    }
    if (items.some(it => !it.description || it.quantity <= 0 || it.rate < 0)) {
      alert("Please ensure all line items have a valid description, quantity, and rate.");
      return;
    }

    setIsCreatingDirectly(true);
    const res = await createBill({
      vendorId: selectedVendorId,
      vendorBillNumber,
      billDate,
      dueDate,
      paymentTerms,
      notes: `${notes} (AI Scanned Document)`,
      items: items.map(it => ({
        productId: it.matchedProductId || undefined,
        description: it.description,
        hsnCode: it.hsnCode,
        quantity: it.quantity,
        unit: it.unit,
        rate: it.rate,
        gstRate: it.gstRate,
        taxAmount: it.taxAmount,
        total: it.total
      })),
      autoRestock: true
    });
    setIsCreatingDirectly(false);

    if (res.error) {
      alert("Error creating bill: " + res.error);
    } else {
      if (onBillCreatedSuccess) {
        onBillCreatedSuccess();
      }
      onClose();
      window.location.reload();
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
          borderRadius: "14px",
          width: "100%",
          maxWidth: extractedData ? "1280px" : "640px",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          transition: "max-width 0.3s ease"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            padding: "14px 20px",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                backgroundColor: "var(--accent-light, #eef2ff)",
                color: "var(--accent-primary, #4f46e5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                AI Purchase Bill & Handwritten Invoice Scanner
              </h3>
              <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: "#64748b" }}>
                Instant multimodal extraction from PDF invoices, camera photos & handwritten slips
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94a3b8",
              cursor: "pointer",
              padding: "4px"
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          
          {/* 1. UPLOAD ZONE (When no file or scanning) */}
          {!extractedData && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              
              {/* Drag & Drop Card */}
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
                  padding: "40px 20px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: "none" }}
                  onChange={e => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileSelected(e.target.files[0]);
                    }
                  }}
                />

                <div style={{ width: "54px", height: "54px", borderRadius: "50%", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <UploadCloud size={28} />
                </div>

                <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
                  Drag & Drop PDF or Photo here
                </h4>
                <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#64748b" }}>
                  Supports Supplier PDF Invoices, Mobile Photos, PNG/JPG scans, or Handwritten Gumashta slips
                </p>

                <button
                  type="button"
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#334155",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <FileText size={15} /> Browse Files
                </button>
              </div>

              {/* Scanning Progress */}
              {scanning && (
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2563eb", fontWeight: 600, fontSize: "0.9rem", marginBottom: "6px" }}>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Processing Document with Gemini Vision AI...</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#1e40af" }}>
                    {scanStep}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px 16px", borderRadius: "8px", display: "flex", alignItems: "center", gap: "8px", color: "#b91c1c", fontSize: "0.82rem" }}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Industry Features Callout */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginTop: "10px" }}>
                <div style={{ padding: "12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "3px" }}>📄 PDF Invoices</strong>
                  <span style={{ color: "#64748b" }}>Directly parses computer-generated supplier tax invoices with HSN breakdowns.</span>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "3px" }}>✍️ Handwritten Slips</strong>
                  <span style={{ color: "#64748b" }}>Deciphers local mandi/market handwritten challans, fabric meterage, and rates.</span>
                </div>
                <div style={{ padding: "12px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem" }}>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "3px" }}>⚡ Auto Double-Entry</strong>
                  <span style={{ color: "#64748b" }}>Automatically populates double-entry ledgers, ITC CGST/SGST/IGST, and stock items.</span>
                </div>
              </div>

            </div>
          )}

          {/* 2. SPLIT SCREEN REVIEW (When document is scanned) */}
          {extractedData && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "20px", alignItems: "flex-start" }}>
              
              {/* LEFT PANE: DOCUMENT PREVIEW */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155" }}>
                    Scanned Document Preview
                  </span>
                  <div style={{ display: "flex", gap: "6px" }}>
                    {extractedData.isHandwritten && (
                      <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: "#fef3c7", color: "#92400e", fontSize: "0.7rem", fontWeight: 600 }}>
                        Handwritten Document
                      </span>
                    )}
                    <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: "#dcfce7", color: "#166534", fontSize: "0.7rem", fontWeight: 600 }}>
                      {extractedData.confidenceScore}% Confidence
                    </span>
                  </div>
                </div>

                {/* Document Viewer */}
                <div style={{ height: "460px", overflow: "auto", backgroundColor: "#1e293b", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isPdf && filePreview ? (
                    <iframe
                      src={filePreview}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      title="PDF Document Preview"
                    />
                  ) : filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={filePreview}
                      alt="Scanned Bill"
                      style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No document preview available</div>
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
                    {file?.name} ({((file?.size || 0) / 1024).toFixed(1)} KB)
                  </span>
                </div>
              </div>

              {/* RIGHT PANE: EXTRACTED FORM FIELDS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* Header Inputs: Vendor & Bill Ref */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      VENDOR / SUPPLIER *
                    </label>
                    <select
                      value={selectedVendorId}
                      onChange={e => setSelectedVendorId(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    >
                      <option value="">Select Vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.companyName} {v.gstNumber ? `(${v.gstNumber})` : ""}
                        </option>
                      ))}
                    </select>
                    {extractedData.vendorName && !extractedData.matchedVendorId && (
                      <span style={{ fontSize: "0.7rem", color: "#d97706", marginTop: "2px", display: "block" }}>
                        Scanned name: &ldquo;{extractedData.vendorName}&rdquo;
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      VENDOR BILL / INVOICE # *
                    </label>
                    <input
                      type="text"
                      value={vendorBillNumber}
                      onChange={e => setVendorBillNumber(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        border: "1px solid #cbd5e1",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#0f172a"
                      }}
                    />
                  </div>
                </div>

                {/* Dates & Payment Terms */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      BILL DATE
                    </label>
                    <input
                      type="date"
                      value={billDate}
                      onChange={e => setBillDate(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      DUE DATE
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      PAYMENT TERMS
                    </label>
                    <input
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
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
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={13} /> Add Line Item
                    </button>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "200px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                      <thead style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 5 }}>
                        <tr>
                          <th style={{ padding: "6px 8px", textAlign: "left" }}>Item Description</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "70px" }}>HSN</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "65px" }}>Qty</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "55px" }}>Unit</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "75px" }}>Rate (₹)</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "65px" }}>GST %</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "85px" }}>Total (₹)</th>
                          <th style={{ padding: "6px 8px", width: "30px" }}></th>
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
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem" }}
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
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", textAlign: "right" }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="text"
                                value={it.unit}
                                onChange={e => handleItemChange(idx, "unit", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem" }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <input
                                type="number"
                                value={it.rate}
                                onChange={e => handleItemChange(idx, "rate", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", textAlign: "right" }}
                              />
                            </td>
                            <td style={{ padding: "4px 8px" }}>
                              <select
                                value={it.gstRate}
                                onChange={e => handleItemChange(idx, "gstRate", Number(e.target.value))}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem" }}
                              >
                                <option value={0}>0%</option>
                                <option value={5}>5%</option>
                                <option value={12}>12%</option>
                                <option value={18}>18%</option>
                                <option value={28}>28%</option>
                              </select>
                            </td>
                            <td style={{ padding: "4px 8px", textAlign: "right", fontWeight: 600, color: "#0f172a" }}>
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

                {/* Subtotal & GST Summary */}
                <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Taxable Subtotal: </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedSubtotal.toLocaleString("en-IN")}</strong>
                    <span style={{ color: "#64748b", marginLeft: "14px" }}>Total Tax: </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedTotalTax.toLocaleString("en-IN")}</strong>
                  </div>

                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "#059669" }}>
                    Total: ₹{computedTotalAmount.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: "10px", marginTop: "6px" }}>
                  <button
                    type="button"
                    onClick={handleApplyToBill}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "1px solid #cbd5e1",
                      backgroundColor: "#ffffff",
                      color: "#1e293b",
                      fontSize: "0.82rem",
                      fontWeight: 600,
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
                    onClick={handleDirectCreateBill}
                    disabled={isCreatingDirectly}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "var(--accent-primary, #4f46e5)",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      cursor: isCreatingDirectly ? "wait" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 2px 6px rgba(79, 70, 229, 0.25)"
                    }}
                  >
                    <CheckCircle2 size={16} /> {isCreatingDirectly ? "Creating Bill..." : "Create & Post Bill (1-Click)"}
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
