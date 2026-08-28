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
  ShoppingBag,
  ArrowRight,
  Truck
} from "lucide-react";
import { scanOrderSlipWithAI, ExtractedOrderData, ExtractedOrderItem } from "@/app/actions/orderScannerActions";
import { createOrder } from "@/app/actions/orderActions";

interface Customer {
  id: string;
  companyName: string;
  mobile?: string | null;
  city?: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
  sku?: string | null;
}

interface Props {
  customers: Customer[];
  products: Product[];
  onClose: () => void;
  onOrderCreatedSuccess?: () => void;
}

export default function OrderSlipScannerModal({
  customers,
  products,
  onClose,
  onOrderCreatedSuccess
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isPdf, setIsPdf] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extracted Data Form State
  const [extractedData, setExtractedData] = useState<ExtractedOrderData | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [transportDetails, setTransportDetails] = useState("");
  const [deliveryRemarks, setDeliveryRemarks] = useState("");
  const [items, setItems] = useState<ExtractedOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (selectedFile: File) => {
    setError(null);
    setFile(selectedFile);

    const isPdfFile = selectedFile.type === "application/pdf" || selectedFile.name.endsWith(".pdf");
    setIsPdf(isPdfFile);

    const previewUrl = URL.createObjectURL(selectedFile);
    setFilePreview(previewUrl);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      await runScan(base64, selectedFile.type || (isPdfFile ? "application/pdf" : "image/jpeg"), selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  const runScan = async (base64: string, mimeType: string, fileName: string) => {
    setScanning(true);
    setScanStep("Uploading slip to Gemini Vision AI...");

    const stepInterval = setInterval(() => {
      setScanStep(prev => {
        if (prev.includes("Uploading")) return "Reading handwritten articles, sizes & set ratios...";
        if (prev.includes("Reading")) return "Matching registered wholesale buyers & catalog SKUs...";
        return "Calculating wholesale totals and taxes...";
      });
    }, 1200);

    try {
      const res = await scanOrderSlipWithAI(base64, mimeType, fileName);
      clearInterval(stepInterval);

      if (res.success && res.data) {
        const d = res.data;
        setExtractedData(d);
        setSelectedCustomerId(d.matchedCustomerId || (customers.length > 0 ? customers[0].id : ""));
        setOrderDate(d.orderDate || new Date().toISOString().split("T")[0]);
        setTransportDetails(d.transportDetails || "");
        setDeliveryRemarks(d.deliveryRemarks || "");
        setItems(d.items || []);
        setScanning(false);
      } else {
        setError(res.error || "Failed to scan order slip.");
        setScanning(false);
      }
    } catch (err: any) {
      clearInterval(stepInterval);
      setError(err.message || "An unexpected error occurred during scan.");
      setScanning(false);
    }
  };

  const handleItemChange = (index: number, field: keyof ExtractedOrderItem, value: any) => {
    const updated = [...items];
    const it = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "rate") {
      const q = field === "quantity" ? parseInt(value) || 0 : it.quantity;
      const r = field === "rate" ? parseFloat(value) || 0 : it.rate;
      it.total = q * r;
    }
    updated[index] = it;
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        articleNumber: "",
        description: "",
        size: "S, M, L, XL",
        color: "Assorted",
        quantity: 12,
        rate: 200,
        total: 2400
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, idx) => idx !== index));
    }
  };

  const computedSubtotal = items.reduce((acc, it) => acc + (it.quantity * it.rate), 0);
  const computedTax = Number((computedSubtotal * 0.12).toFixed(2));
  const computedGrandTotal = computedSubtotal + computedTax;

  const handleCreateSalesOrder = async () => {
    if (!selectedCustomerId) {
      alert("Please select a customer.");
      return;
    }
    if (items.some(it => !it.description || it.quantity <= 0 || it.rate < 0)) {
      alert("Please ensure all line items have description, quantity, and rate.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Find or fallback to first product
      const defaultProd = products[0];
      const formData = new FormData();
      formData.set("customerId", selectedCustomerId);
      formData.set("productId", items[0]?.matchedProductId || defaultProd?.id || "");
      formData.set("quantity", items.reduce((acc, it) => acc + it.quantity, 0).toString());
      formData.set("shippingCharge", "0");
      formData.set("notes", `AI Scanned Order Slip: ${items.map(it => `${it.articleNumber || it.description} (${it.quantity} pcs @ ₹${it.rate})`).join(", ")} | Transport: ${transportDetails} | Remarks: ${deliveryRemarks}`);

      const res = await createOrder(formData);
      setIsSubmitting(false);

      if (res && res.error) {
        alert("Error creating order: " + res.error);
      } else {
        alert("Sales Order successfully created from AI scanned slip!");
        if (onOrderCreatedSuccess) onOrderCreatedSuccess();
        onClose();
        window.location.reload();
      }
    } catch (err: any) {
      setIsSubmitting(false);
      alert("Failed to create order: " + err.message);
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
          maxWidth: extractedData ? "1260px" : "620px",
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
        {/* Header */}
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
                backgroundColor: "#eff6ff",
                color: "#2563eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                AI Handwritten / WhatsApp Order Slip Scanner
              </h3>
              <p style={{ margin: "1px 0 0", fontSize: "0.74rem", color: "#64748b" }}>
                Converts WhatsApp screenshots, paper slips & handwritten orders into instant Sales Orders
              </p>
            </div>
          </div>

          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
          
          {/* UPLOAD ZONE */}
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
                  padding: "44px 20px",
                  textAlign: "center",
                  backgroundColor: "#f8fafc",
                  cursor: "pointer"
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

                <div style={{ width: "54px", height: "54px", borderRadius: "50%", backgroundColor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <UploadCloud size={28} />
                </div>

                <h4 style={{ margin: "0 0 6px", fontSize: "1rem", fontWeight: 600, color: "#1e293b" }}>
                  Upload WhatsApp Order Screenshot or Handwritten Paper Slip
                </h4>
                <p style={{ margin: "0 0 14px", fontSize: "0.8rem", color: "#64748b" }}>
                  Gemini Vision OCR deciphers article numbers, size set ratios, and buyer remarks
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
                  <FileText size={15} /> Browse Photos / PDF
                </button>
              </div>

              {scanning && (
                <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "18px", borderRadius: "10px", textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", color: "#2563eb", fontWeight: 600, fontSize: "0.9rem", marginBottom: "6px" }}>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Analyzing Order with Gemini Vision AI...</span>
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.35fr", gap: "20px", alignItems: "flex-start" }}>
              
              {/* LEFT: PREVIEW */}
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px", display: "flex", flexDirection: "column", gap: "10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#334155" }}>
                    Uploaded Slip Preview
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: "4px", backgroundColor: "#dcfce7", color: "#166534", fontSize: "0.7rem", fontWeight: 600 }}>
                    {extractedData.confidenceScore}% Confidence
                  </span>
                </div>

                <div style={{ height: "460px", overflow: "auto", backgroundColor: "#1e293b", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isPdf && filePreview ? (
                    <iframe src={filePreview} style={{ width: "100%", height: "100%", border: "none" }} title="Order Slip Preview" />
                  ) : filePreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={filePreview} alt="Order Slip" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                  ) : (
                    <div style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No preview</div>
                  )}
                </div>

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
                  <RefreshCw size={13} /> Scan another order slip
                </button>
              </div>

              {/* RIGHT: EDITABLE SALES ORDER FIELDS */}
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      BUYER / CUSTOMER *
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
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
                      <option value="">Select Customer...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} {c.city ? `(${c.city})` : ""}
                        </option>
                      ))}
                    </select>
                    {extractedData.customerName && !extractedData.matchedCustomerId && (
                      <span style={{ fontSize: "0.7rem", color: "#d97706", marginTop: "2px", display: "block" }}>
                        Scanned Name: &ldquo;{extractedData.customerName}&rdquo;
                      </span>
                    )}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      ORDER DATE
                    </label>
                    <input
                      type="date"
                      value={orderDate}
                      onChange={e => setOrderDate(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.82rem" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      TRANSPORT / DISPATCH VIA
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Jaipur Golden / Trackon"
                      value={transportDetails}
                      onChange={e => setTransportDetails(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.72rem", fontWeight: 600, color: "#64748b", marginBottom: "4px" }}>
                      DELIVERY REMARKS
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Urgent festive delivery"
                      value={deliveryRemarks}
                      onChange={e => setDeliveryRemarks(e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#334155" }}>
                      BOOKED ARTICLES ({items.length})
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
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", maxHeight: "200px", overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.75rem" }}>
                      <thead style={{ backgroundColor: "#f8fafc", color: "#64748b", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 5 }}>
                        <tr>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "80px" }}>Art #</th>
                          <th style={{ padding: "6px 8px", textAlign: "left" }}>Description</th>
                          <th style={{ padding: "6px 8px", textAlign: "left", width: "90px" }}>Sizes</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "65px" }}>Qty (Pcs)</th>
                          <th style={{ padding: "6px 8px", textAlign: "right", width: "75px" }}>Rate (₹)</th>
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
                                value={it.articleNumber}
                                onChange={e => handleItemChange(idx, "articleNumber", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", fontWeight: 600 }}
                              />
                            </td>
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
                                value={it.size || ""}
                                onChange={e => handleItemChange(idx, "size", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.72rem" }}
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
                                type="number"
                                value={it.rate}
                                onChange={e => handleItemChange(idx, "rate", e.target.value)}
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.75rem", textAlign: "right", fontWeight: 600 }}
                              />
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

                {/* Subtotal & Summary */}
                <div style={{ backgroundColor: "#f8fafc", padding: "12px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                  <div>
                    <span style={{ color: "#64748b" }}>Taxable: </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedSubtotal.toLocaleString("en-IN")}</strong>
                    <span style={{ color: "#64748b", marginLeft: "12px" }}>Est. GST (12%): </span>
                    <strong style={{ color: "#0f172a" }}>₹{computedTax.toLocaleString("en-IN")}</strong>
                  </div>

                  <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#2563eb" }}>
                    Total: ₹{computedGrandTotal.toLocaleString("en-IN")}
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="button"
                  onClick={handleCreateSalesOrder}
                  disabled={isSubmitting}
                  style={{
                    width: "100%",
                    padding: "11px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "var(--accent-primary, #4f46e5)",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    cursor: isSubmitting ? "wait" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    boxShadow: "0 2px 8px rgba(79, 70, 229, 0.3)"
                  }}
                >
                  <CheckCircle2 size={17} /> {isSubmitting ? "Creating Sales Order..." : "Confirm & Book Sales Order (1-Click)"}
                </button>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
