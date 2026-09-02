"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  User, 
  Calendar, 
  DollarSign, 
  Building2, 
  Truck, 
  CheckCircle2, 
  AlertCircle, 
  Search,
  ExternalLink,
  ChevronDown
} from "lucide-react";
import { getInvoiceForFullEdit, saveFullInvoiceDetails } from "@/app/actions/invoiceActions";
import "@/components/ui/modal.css";

interface EditFullInvoiceModalProps {
  invoiceId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedInvoice?: any) => void;
}

interface ItemRow {
  id?: string;
  productId?: string;
  productName: string;
  hsnCode: string;
  quantity: number;
  rate: number;
  discount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
}

export default function EditFullInvoiceModal({
  invoiceId,
  isOpen,
  onClose,
  onSuccess
}: EditFullInvoiceModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  
  // Data from server
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [companyState, setCompanyState] = useState("Haryana");

  // Form state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [status, setStatus] = useState("Unpaid");
  const [notes, setNotes] = useState("");

  // Customer State
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [state, setState] = useState("");
  const [gstin, setGstin] = useState("");
  const [isInterstate, setIsInterstate] = useState(false);

  // Line items
  const [items, setItems] = useState<ItemRow[]>([]);

  // Overall adjustments
  const [overallDiscount, setOverallDiscount] = useState<number>(0);
  const [shippingCharges, setShippingCharges] = useState<number>(0);
  const [roundOff, setRoundOff] = useState<number>(0);
  const [amountPaid, setAmountPaid] = useState<number>(0);

  // Order link if any
  const [orderId, setOrderId] = useState<string | null>(null);

  // Load invoice data on open
  useEffect(() => {
    if (!isOpen || !invoiceId) return;

    let isMounted = true;
    setLoading(true);
    setError("");

    async function loadData() {
      const res = await getInvoiceForFullEdit(invoiceId);
      if (!isMounted) return;

      if (res.error || !res.invoice) {
        setError(res.error || "Failed to load invoice details");
        setLoading(false);
        return;
      }

      const inv = res.invoice;
      setAllProducts(res.products || []);
      setAllCustomers(res.customers || []);
      const compState = res.companyState || "Haryana";
      setCompanyState(compState);

      // Set Invoice header
      setInvoiceNumber(inv.invoiceNumber || "");
      setInvoiceDate(inv.invoiceDate ? new Date(inv.invoiceDate).toISOString().split("T")[0] : "");
      setDueDate(inv.dueDate ? new Date(inv.dueDate).toISOString().split("T")[0] : "");
      setPaymentTerms(inv.paymentTerms || "Net 30");
      setStatus(inv.status || "Unpaid");
      setNotes(inv.notes || "");
      setOrderId(inv.orderId || null);

      // Customer
      const cust = inv.customer || {};
      setCustomerId(inv.customerId || cust.id || "");
      setCustomerName(cust.businessName || "");
      setContactPerson(cust.contactPerson || "");
      setMobile(cust.mobile || "");
      setEmail(cust.email || "");
      setBillingAddress(cust.billingAddress || "");
      setShippingAddress(cust.shippingAddress || cust.billingAddress || "");
      const custState = cust.state || compState;
      setState(custState);
      setGstin((cust as any).gstNumber || (cust as any).gstin || "");

      const interstate = custState.trim().toLowerCase() !== compState.trim().toLowerCase();
      setIsInterstate(inv.order?.isInterstate !== undefined ? inv.order.isInterstate : interstate);

      // Order items
      if (inv.order?.items && inv.order.items.length > 0) {
        const loadedItems: ItemRow[] = inv.order.items.map((it: any) => ({
          id: it.id,
          productId: it.productId,
          productName: it.product?.name || "Product Item",
          hsnCode: it.hsnCode || it.product?.hsnCode || "6109",
          quantity: it.quantity || 1,
          rate: it.rate || 0,
          discount: 0,
          gstRate: it.gstRate || 12,
          cgst: it.cgst || 0,
          sgst: it.sgst || 0,
          igst: it.igst || 0,
          total: it.total || 0,
        }));
        setItems(loadedItems);
      } else {
        // Fallback row for manual invoice
        setItems([
          {
            productName: "General Item / Services",
            hsnCode: "6109",
            quantity: 1,
            rate: inv.subtotal || inv.totalAmount || 0,
            discount: 0,
            gstRate: 12,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: inv.totalAmount || 0,
          }
        ]);
      }

      setOverallDiscount(inv.discountAmount || 0);
      setAmountPaid(inv.amountPaid || 0);
      setLoading(false);
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, invoiceId]);

  // Recalculate item taxes when qty, rate, discount, gstRate, or isInterstate changes
  const updateItem = (index: number, field: keyof ItemRow, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const item = { ...updated[index], [field]: value };

      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const disc = Math.max(0, Number(item.discount) || 0);
      const gstPercent = Math.max(0, Number(item.gstRate) || 0);

      const taxable = Math.max(0, qty * rate - disc);
      const taxTotal = (taxable * gstPercent) / 100;

      if (isInterstate) {
        item.igst = taxTotal;
        item.cgst = 0;
        item.sgst = 0;
      } else {
        item.cgst = taxTotal / 2;
        item.sgst = taxTotal / 2;
        item.igst = 0;
      }

      item.total = taxable + taxTotal;
      updated[index] = item;
      return updated;
    });
  };

  // Re-run tax calculation for all items if interstate toggle changes
  const toggleInterstate = (newInterstate: boolean) => {
    setIsInterstate(newInterstate);
    setItems(prev =>
      prev.map(item => {
        const qty = Math.max(0, Number(item.quantity) || 0);
        const rate = Math.max(0, Number(item.rate) || 0);
        const disc = Math.max(0, Number(item.discount) || 0);
        const gstPercent = Math.max(0, Number(item.gstRate) || 0);
        const taxable = Math.max(0, qty * rate - disc);
        const taxTotal = (taxable * gstPercent) / 100;

        return {
          ...item,
          cgst: newInterstate ? 0 : taxTotal / 2,
          sgst: newInterstate ? 0 : taxTotal / 2,
          igst: newInterstate ? taxTotal : 0,
          total: taxable + taxTotal
        };
      })
    );
  };

  const handleAddRow = () => {
    setItems(prev => [
      ...prev,
      {
        productName: "",
        hsnCode: "6109",
        quantity: 1,
        rate: 0,
        discount: 0,
        gstRate: 12,
        cgst: 0,
        sgst: 0,
        igst: 0,
        total: 0
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (items.length <= 1) {
      alert("An invoice must have at least one line item.");
      return;
    }
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle selecting a product from catalog
  const handleProductSelect = (index: number, prodId: string) => {
    const prod = allProducts.find(p => p.id === prodId);
    if (!prod) return;

    setItems(prev => {
      const updated = [...prev];
      const qty = updated[index]?.quantity || 1;
      const rate = prod.sellingPrice || 0;
      const gstPercent = updated[index]?.gstRate || 12;
      const taxable = qty * rate;
      const taxTotal = (taxable * gstPercent) / 100;

      updated[index] = {
        ...updated[index],
        productId: prod.id,
        productName: prod.name,
        hsnCode: prod.hsnCode || "6109",
        rate: prod.sellingPrice || 0,
        cgst: isInterstate ? 0 : taxTotal / 2,
        sgst: isInterstate ? 0 : taxTotal / 2,
        igst: isInterstate ? taxTotal : 0,
        total: taxable + taxTotal
      };
      return updated;
    });
  };

  // Handle switching customer
  const handleCustomerSelect = (selectedId: string) => {
    const cust = allCustomers.find(c => c.id === selectedId);
    if (!cust) return;

    setCustomerId(cust.id);
    setCustomerName(cust.businessName || "");
    setContactPerson(cust.contactPerson || "");
    setMobile(cust.mobile || "");
    setEmail(cust.email || "");
    setBillingAddress(cust.billingAddress || "");
    setShippingAddress(cust.shippingAddress || cust.billingAddress || "");
    setState(cust.state || companyState);
    setGstin((cust as any).gstNumber || (cust as any).gstin || "");

    const interstate = (cust.state || "").trim().toLowerCase() !== companyState.trim().toLowerCase();
    toggleInterstate(interstate);
  };

  // Live Financial Summaries
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    items.forEach(item => {
      const qty = Math.max(0, Number(item.quantity) || 0);
      const rate = Math.max(0, Number(item.rate) || 0);
      const disc = Math.max(0, Number(item.discount) || 0);
      const taxable = Math.max(0, qty * rate - disc);

      subtotal += taxable;
      totalCgst += Number(item.cgst) || 0;
      totalSgst += Number(item.sgst) || 0;
      totalIgst += Number(item.igst) || 0;
    });

    const taxAmount = totalCgst + totalSgst + totalIgst;
    const gross = subtotal + taxAmount + (Number(shippingCharges) || 0) - (Number(overallDiscount) || 0) + (Number(roundOff) || 0);
    const totalAmount = Math.max(0, gross);
    const effectivePaid = Number(amountPaid) || 0;
    const amountDue = Math.max(0, totalAmount - effectivePaid);

    return {
      subtotal,
      totalCgst,
      totalSgst,
      totalIgst,
      taxAmount,
      totalAmount,
      amountDue
    };
  }, [items, overallDiscount, shippingCharges, roundOff, amountPaid]);

  // Handle Save
  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      setError("Invoice number is required.");
      return;
    }
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one line item.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      invoiceId,
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: dueDate || undefined,
      paymentTerms,
      status,
      notes,

      customerId,
      customerName,
      contactPerson,
      mobile,
      email,
      billingAddress,
      shippingAddress,
      state,
      gstin,
      placeOfSupply: state,
      isInterstate,

      items: items.map(item => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName || "Product",
        hsnCode: item.hsnCode || "6109",
        quantity: Number(item.quantity) || 1,
        rate: Number(item.rate) || 0,
        discount: Number(item.discount) || 0,
        gstRate: Number(item.gstRate) || 12,
        cgst: Number(item.cgst) || 0,
        sgst: Number(item.sgst) || 0,
        igst: Number(item.igst) || 0,
        total: Number(item.total) || 0
      })),

      subtotal: calculations.subtotal,
      discountAmount: Number(overallDiscount) || 0,
      cgst: calculations.totalCgst,
      sgst: calculations.totalSgst,
      igst: calculations.totalIgst,
      taxAmount: calculations.taxAmount,
      shippingCharges: Number(shippingCharges) || 0,
      roundOff: Number(roundOff) || 0,
      totalAmount: calculations.totalAmount,
      amountPaid: Number(amountPaid) || 0,
      amountDue: calculations.amountDue
    };

    const res = await saveFullInvoiceDetails(payload);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      onSuccess(res.invoice);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px"
      }}
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: "#ffffff",
          width: "100%",
          maxWidth: "1080px",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          border: "1px solid #e2e8f0",
          maxHeight: "92vh",
          display: "flex",
          flexDirection: "column"
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ─── MODAL HEADER ─── */}
        <div style={{
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
          color: "#ffffff",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <FileText size={22} color="#ffffff" />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#ffffff" }}>
                  Edit Tax Invoice
                </h2>
                <span style={{
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  padding: "3px 9px",
                  borderRadius: "20px",
                  backgroundColor: status === "Paid" ? "#16a34a" : status === "Partially Paid" ? "#d97706" : "#4f46e5",
                  color: "#ffffff"
                }}>
                  {status}
                </span>
              </div>
              <p style={{ margin: "2px 0 0 0", fontSize: "0.82rem", color: "#c7d2fe" }}>
                Modify invoice line items, pricing, billing address, and payment status.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {orderId && (
              <a
                href={`/orders/${orderId}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: "0.78rem",
                  color: "#e0e7ff",
                  background: "rgba(255,255,255,0.12)",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  fontWeight: 500
                }}
              >
                <ExternalLink size={13} /> View Printout
              </a>
            )}
            <button 
              type="button" 
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                border: "none",
                borderRadius: "8px",
                color: "#ffffff",
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── MODAL BODY / FORM ─── */}
        {loading ? (
          <div style={{ padding: "80px 20px", textAlign: "center", color: "#64748b" }}>
            <div className="spinner" style={{ margin: "0 auto 12px auto" }} />
            <p style={{ fontSize: "0.9rem", fontWeight: 500 }}>Loading comprehensive invoice data...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveInvoice} style={{ overflowY: "auto", flex: 1, padding: "20px 24px" }}>
            {error && (
              <div style={{
                backgroundColor: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                padding: "10px 14px",
                borderRadius: "8px",
                fontSize: "0.84rem",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            {/* 1. INVOICE META & GENERAL SETTINGS */}
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 18px",
              marginBottom: "18px"
            }}>
              <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
                <Calendar size={15} color="#4f46e5" /> Invoice Information & Terms
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={e => setPaymentTerms(e.target.value)}
                    placeholder="e.g. Net 30, Due on Receipt"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Invoice Status
                  </label>
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: "#0f172a",
                      backgroundColor: "#ffffff"
                    }}
                  >
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Overdue">Overdue</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. CUSTOMER & BILLING ADDRESS CARD */}
            <div style={{
              backgroundColor: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 18px",
              marginBottom: "18px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Building2 size={15} color="#4f46e5" /> Customer & Billing Information
                </div>

                {/* Customer Switcher */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "0.76rem", color: "#64748b" }}>Switch Customer:</span>
                  <select
                    value={customerId}
                    onChange={e => handleCustomerSelect(e.target.value)}
                    style={{
                      padding: "5px 10px",
                      borderRadius: "6px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      backgroundColor: "#ffffff",
                      maxWidth: "240px"
                    }}
                  >
                    {allCustomers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.businessName || c.contactPerson || "Unnamed"} ({c.mobile || "No phone"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Business / Client Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Contact Person
                  </label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Mobile / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={mobile}
                    onChange={e => setMobile(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    GSTIN / Tax ID
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={e => setGstin(e.target.value)}
                    placeholder="e.g. 06AAHCE7721Q1Z4"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a",
                      textTransform: "uppercase"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Place of Supply / State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={e => {
                      setState(e.target.value);
                      const interstate = e.target.value.trim().toLowerCase() !== companyState.trim().toLowerCase();
                      toggleInterstate(interstate);
                    }}
                    placeholder="e.g. Haryana, Delhi, Maharashtra"
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.86rem",
                      color: "#0f172a"
                    }}
                  />
                </div>
              </div>

              {/* Addresses & GST Tax Type Toggle */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Billing Address
                  </label>
                  <textarea
                    rows={2}
                    value={billingAddress}
                    onChange={e => setBillingAddress(e.target.value)}
                    placeholder="Full billing street address, city, pincode..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.84rem",
                      color: "#0f172a",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Shipping / Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={shippingAddress}
                    onChange={e => setShippingAddress(e.target.value)}
                    placeholder="Full delivery address if different from billing..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.84rem",
                      color: "#0f172a",
                      resize: "vertical"
                    }}
                  />
                </div>
              </div>

              {/* GST Type Banner */}
              <div style={{
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "8px",
                backgroundColor: isInterstate ? "#eff6ff" : "#f0fdf4",
                border: isInterstate ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}>
                <span style={{ fontSize: "0.78rem", color: isInterstate ? "#1e40af" : "#166534", fontWeight: 600 }}>
                  GST Tax Mode: {isInterstate ? "Inter-state Supply (IGST Applicable)" : "Intra-state Supply (CGST + SGST Applicable)"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleInterstate(!isInterstate)}
                  style={{
                    fontSize: "0.72rem",
                    padding: "3px 8px",
                    borderRadius: "5px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    cursor: "pointer",
                    fontWeight: 600,
                    color: "#334155"
                  }}
                >
                  Switch to {isInterstate ? "Intra-state (CGST+SGST)" : "Inter-state (IGST)"}
                </button>
              </div>
            </div>

            {/* 3. LINE ITEMS TABLE */}
            <div style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              padding: "16px 18px",
              marginBottom: "18px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "0.84rem", fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.04em", display: "flex", alignItems: "center", gap: "6px" }}>
                  <DollarSign size={16} color="#4f46e5" /> Invoice Line Items ({items.length})
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  style={{
                    backgroundColor: "#4f46e5",
                    color: "#ffffff",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "none",
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    boxShadow: "0 1px 2px rgba(79, 70, 229, 0.2)"
                  }}
                >
                  <Plus size={14} /> Add Line Item
                </button>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #cbd5e1" }}>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: "30px", color: "#64748b" }}>#</th>
                      <th style={{ padding: "8px 10px", textAlign: "left", minWidth: "220px", color: "#475569" }}>Product / Description</th>
                      <th style={{ padding: "8px 8px", textAlign: "left", width: "90px", color: "#475569" }}>HSN/SAC</th>
                      <th style={{ padding: "8px 8px", textAlign: "right", width: "80px", color: "#475569" }}>Qty</th>
                      <th style={{ padding: "8px 8px", textAlign: "right", width: "110px", color: "#475569" }}>Unit Rate (₹)</th>
                      <th style={{ padding: "8px 8px", textAlign: "right", width: "95px", color: "#475569" }}>Disc (₹)</th>
                      <th style={{ padding: "8px 8px", textAlign: "right", width: "90px", color: "#475569" }}>GST %</th>
                      <th style={{ padding: "8px 8px", textAlign: "right", width: "100px", color: "#475569" }}>Tax (₹)</th>
                      <th style={{ padding: "8px 10px", textAlign: "right", width: "120px", color: "#0f172a" }}>Line Total (₹)</th>
                      <th style={{ padding: "8px 6px", textAlign: "center", width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => {
                      const itemTax = (Number(item.cgst) || 0) + (Number(item.sgst) || 0) + (Number(item.igst) || 0);

                      return (
                        <tr key={index} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          {/* Row # */}
                          <td style={{ padding: "8px 6px", textAlign: "center", color: "#94a3b8", fontWeight: 600 }}>
                            {index + 1}
                          </td>

                          {/* Product Selection / Name */}
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                              {allProducts.length > 0 && (
                                <select
                                  value={item.productId || ""}
                                  onChange={e => handleProductSelect(index, e.target.value)}
                                  style={{
                                    width: "100%",
                                    padding: "5px 8px",
                                    borderRadius: "5px",
                                    border: "1px solid #e2e8f0",
                                    fontSize: "0.76rem",
                                    backgroundColor: "#f8fafc",
                                    color: "#334155"
                                  }}
                                >
                                  <option value="">-- Choose from Catalog or Type below --</option>
                                  {allProducts.map(p => (
                                    <option key={p.id} value={p.id}>
                                      {p.name} {p.sku ? `(${p.sku})` : ""} - ₹{p.sellingPrice}
                                    </option>
                                  ))}
                                </select>
                              )}
                              <input
                                type="text"
                                placeholder="Item title / description"
                                value={item.productName}
                                onChange={e => updateItem(index, "productName", e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "6px 8px",
                                  borderRadius: "5px",
                                  border: "1px solid #cbd5e1",
                                  fontSize: "0.82rem",
                                  fontWeight: 500,
                                  color: "#0f172a"
                                }}
                              />
                            </div>
                          </td>

                          {/* HSN */}
                          <td style={{ padding: "8px 8px" }}>
                            <input
                              type="text"
                              value={item.hsnCode}
                              onChange={e => updateItem(index, "hsnCode", e.target.value)}
                              placeholder="6109"
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "5px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                color: "#334155"
                              }}
                            />
                          </td>

                          {/* Qty */}
                          <td style={{ padding: "8px 8px" }}>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantity}
                              onChange={e => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "5px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                textAlign: "right",
                                color: "#0f172a"
                              }}
                            />
                          </td>

                          {/* Unit Rate */}
                          <td style={{ padding: "8px 8px" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={e => updateItem(index, "rate", parseFloat(e.target.value) || 0)}
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "5px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                textAlign: "right",
                                color: "#0f172a"
                              }}
                            />
                          </td>

                          {/* Discount */}
                          <td style={{ padding: "8px 8px" }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.discount}
                              onChange={e => updateItem(index, "discount", parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              style={{
                                width: "100%",
                                padding: "6px 8px",
                                borderRadius: "5px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                textAlign: "right",
                                color: "#475569"
                              }}
                            />
                          </td>

                          {/* GST % */}
                          <td style={{ padding: "8px 8px" }}>
                            <select
                              value={item.gstRate}
                              onChange={e => updateItem(index, "gstRate", parseFloat(e.target.value) || 0)}
                              style={{
                                width: "100%",
                                padding: "6px 6px",
                                borderRadius: "5px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                backgroundColor: "#ffffff",
                                textAlign: "right"
                              }}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>

                          {/* Tax Amount */}
                          <td style={{ padding: "8px 8px", textAlign: "right", color: "#64748b", fontWeight: 500 }}>
                            ₹{itemTax.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Line Total */}
                          <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                            ₹{(item.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>

                          {/* Delete Action */}
                          <td style={{ padding: "8px 6px", textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveRow(index)}
                              style={{
                                background: "none",
                                border: "none",
                                color: "#ef4444",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px"
                              }}
                              title="Delete Item"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. FINANCIAL SUMMARY & NOTES */}
            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "16px", marginBottom: "14px" }}>
              {/* Left: Notes & Terms */}
              <div style={{
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "12px"
              }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                    Internal Remarks & Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Reference PO number, dispatch instructions, or internal records..."
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.84rem",
                      color: "#0f172a",
                      resize: "vertical"
                    }}
                  />
                </div>

                <div style={{ padding: "10px 14px", backgroundColor: "#ffffff", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.78rem", color: "#64748b" }}>
                  💡 <strong>Tip:</strong> Changing items and amounts here automatically synchronizes the invoice, order ledger, and printable PDF documents.
                </div>
              </div>

              {/* Right: Price Calculation Ledger */}
              <div style={{
                backgroundColor: "#ffffff",
                border: "1px solid #cbd5e1",
                borderRadius: "12px",
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: "8px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                  <span>Taxable Subtotal</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>
                    ₹{calculations.subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Overall Discount Input */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem" }}>
                  <span style={{ color: "#475569" }}>Overall Discount (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={overallDiscount}
                    onChange={e => setOverallDiscount(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "110px",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#b91c1c"
                    }}
                  />
                </div>

                {/* Tax Breakdown */}
                {isInterstate ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                    <span>IGST</span>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      + ₹{calculations.totalIgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ) : (
                  <>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                      <span>CGST</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        + ₹{calculations.totalCgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                      <span>SGST</span>
                      <span style={{ fontWeight: 600, color: "#0f172a" }}>
                        + ₹{calculations.totalSgst.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </>
                )}

                {/* Shipping Charges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem" }}>
                  <span style={{ color: "#475569" }}>Shipping / Handling (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={shippingCharges}
                    onChange={e => setShippingCharges(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "110px",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                </div>

                {/* Round Off */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.84rem" }}>
                  <span style={{ color: "#475569" }}>Round Off (₹)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={roundOff}
                    onChange={e => setRoundOff(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "110px",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      border: "1px solid #cbd5e1",
                      fontSize: "0.82rem",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  />
                </div>

                {/* Grand Total */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "1.05rem",
                  fontWeight: 800,
                  color: "#0f172a",
                  paddingTop: "8px",
                  borderTop: "2px solid #e2e8f0",
                  marginTop: "4px"
                }}>
                  <span>Grand Total</span>
                  <span style={{ color: "#1e1b4b" }}>
                    ₹{calculations.totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Amount Paid Input */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "0.88rem",
                  marginTop: "6px",
                  paddingTop: "6px",
                  borderTop: "1px solid #f1f5f9"
                }}>
                  <span style={{ fontWeight: 600, color: "#16a34a" }}>Amount Paid (₹)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={amountPaid}
                    onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
                    style={{
                      width: "130px",
                      padding: "5px 8px",
                      borderRadius: "6px",
                      border: "1.5px solid #86efac",
                      fontSize: "0.86rem",
                      textAlign: "right",
                      fontWeight: 700,
                      color: "#15803d",
                      backgroundColor: "#f0fdf4"
                    }}
                  />
                </div>

                {/* Balance Due */}
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  color: calculations.amountDue > 0 ? "#b91c1c" : "#15803d",
                  padding: "8px 10px",
                  backgroundColor: calculations.amountDue > 0 ? "#fef2f2" : "#f0fdf4",
                  borderRadius: "8px",
                  marginTop: "4px"
                }}>
                  <span>Balance Due</span>
                  <span>₹{calculations.amountDue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* ─── MODAL FOOTER ─── */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "10px",
              paddingTop: "14px",
              borderTop: "1px solid #e2e8f0"
            }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={saving}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.86rem",
                  fontWeight: 600
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="primary-btn"
                disabled={saving}
                style={{
                  padding: "9px 24px",
                  borderRadius: "8px",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#4f46e5",
                  boxShadow: "0 2px 4px rgba(79, 70, 229, 0.25)"
                }}
              >
                <Save size={16} />
                {saving ? "Saving Changes..." : "Save Invoice Changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
