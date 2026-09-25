"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  Building2, 
  User, 
  CreditCard,
  Percent,
  Truck,
  RotateCcw
} from "lucide-react";
import { getDirectInvoiceFormData, createDirectInvoice } from "@/app/actions/invoiceActions";
import DatePicker from "@/components/ui/DatePicker";
import "@/components/ui/modal.css";

interface ItemRow {
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

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newInvoice: any) => void;
}

const PAYMENT_TERMS_OPTIONS = [
  { label: "Due on Receipt", days: 0 },
  { label: "Net 15", days: 15 },
  { label: "Net 30", days: 30 },
  { label: "Net 45", days: 45 },
  { label: "Net 60", days: 60 }
];

const PAYMENT_MODES = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];

export default function CreateInvoiceModal({
  isOpen,
  onClose,
  onSuccess
}: CreateInvoiceModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Server Data
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);
  const [companyState, setCompanyState] = useState("Haryana");

  // Invoice Meta
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentTerms, setPaymentTerms] = useState("Net 30");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [notes, setNotes] = useState("");

  // Customer State
  const [customerId, setCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  // Line items
  const [items, setItems] = useState<ItemRow[]>([
    {
      productId: "",
      productName: "",
      hsnCode: "6109",
      quantity: 1,
      rate: 0,
      discount: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    }
  ]);

  // Adjustments
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [shippingCharges, setShippingCharges] = useState<number>(0);

  // Immediate Settlement
  const [amountPaid, setAmountPaid] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paymentReference, setPaymentReference] = useState<string>("");

  // Determine Interstate Status
  const isInterstate = useMemo(() => {
    if (!selectedCustomer?.state) return false;
    return selectedCustomer.state.trim().toLowerCase() !== companyState.trim().toLowerCase();
  }, [selectedCustomer, companyState]);

  // Fetch initial form data
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError("");

    getDirectInvoiceFormData().then(res => {
      if (!isMounted) return;
      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      setAllProducts(res.products || []);
      setAllCustomers(res.customers || []);
      if (res.companyState) setCompanyState(res.companyState);
      if (res.nextInvoiceNumber) setInvoiceNumber(res.nextInvoiceNumber);

      // Pre-select first product if items empty
      if (res.products && res.products.length > 0) {
        const p = res.products[0];
        setItems([
          {
            productId: p.id,
            productName: p.name,
            hsnCode: p.hsnCode || "6109",
            quantity: 1,
            rate: p.sellingPrice || 0,
            discount: 0,
            gstRate: 18,
            cgst: 0,
            sgst: 0,
            igst: 0,
            total: 0
          }
        ]);
      }
    });

    return () => { isMounted = false; };
  }, [isOpen]);

  // Update Due Date when Payment Terms or Invoice Date change
  const handleTermsChange = (terms: string) => {
    setPaymentTerms(terms);
    const opt = PAYMENT_TERMS_OPTIONS.find(o => o.label === terms);
    const days = opt ? opt.days : 30;
    const base = invoiceDate ? new Date(invoiceDate) : new Date();
    base.setDate(base.getDate() + days);
    setDueDate(base.toISOString().split("T")[0]);
  };

  // Recalculate row totals
  const recalculateRow = (row: ItemRow, interstate: boolean): ItemRow => {
    const qty = Math.max(0, row.quantity || 0);
    const rate = Math.max(0, row.rate || 0);
    const disc = Math.max(0, row.discount || 0);
    const taxable = Math.max(0, (qty * rate) - disc);

    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    if (row.gstRate > 0) {
      if (interstate) {
        igst = Math.round((taxable * row.gstRate) / 100);
      } else {
        const half = row.gstRate / 2;
        cgst = Math.round((taxable * half) / 100);
        sgst = Math.round((taxable * half) / 100);
      }
    }

    const total = taxable + cgst + sgst + igst;
    return { ...row, cgst, sgst, igst, total };
  };

  // Update rows whenever isInterstate changes
  useEffect(() => {
    setItems(prev => prev.map(row => recalculateRow(row, isInterstate)));
  }, [isInterstate]);

  const handleItemChange = (index: number, field: keyof ItemRow, value: any) => {
    setItems(prev => {
      const updated = [...prev];
      const row = { ...updated[index], [field]: value };

      // Auto fill on product selection
      if (field === "productId" && value) {
        const p = allProducts.find(prod => prod.id === value);
        if (p) {
          row.productName = p.name;
          row.rate = p.sellingPrice || 0;
          row.hsnCode = p.hsnCode || "6109";
        }
      }

      updated[index] = recalculateRow(row, isInterstate);
      return updated;
    });
  };

  const addItemRow = () => {
    const defaultProd = allProducts[0];
    const newRow: ItemRow = {
      productId: defaultProd?.id || "",
      productName: defaultProd?.name || "",
      hsnCode: defaultProd?.hsnCode || "6109",
      quantity: 1,
      rate: defaultProd?.sellingPrice || 0,
      discount: 0,
      gstRate: 18,
      cgst: 0,
      sgst: 0,
      igst: 0,
      total: 0
    };
    setItems(prev => [...prev, recalculateRow(newRow, isInterstate)]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Totals calculations
  const subtotal = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity * it.rate), 0);
  }, [items]);

  const totalCgst = useMemo(() => items.reduce((sum, it) => sum + (it.cgst || 0), 0), [items]);
  const totalSgst = useMemo(() => items.reduce((sum, it) => sum + (it.sgst || 0), 0), [items]);
  const totalIgst = useMemo(() => items.reduce((sum, it) => sum + (it.igst || 0), 0), [items]);
  const totalTax = totalCgst + totalSgst + totalIgst;

  const grandTotalRaw = subtotal - (discountAmount || 0) + totalTax + (shippingCharges || 0);
  const grandTotal = Math.round(Math.max(0, grandTotalRaw));
  const roundOff = Math.round((grandTotal - grandTotalRaw) * 100) / 100;
  const balanceDue = Math.max(0, grandTotal - (amountPaid || 0));

  // Handle Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    if (items.length === 0 || items.some(it => !it.productName.trim())) {
      setError("Please add at least one valid item with a name and rate.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await createDirectInvoice({
        invoiceNumber,
        invoiceDate,
        dueDate,
        paymentTerms,
        notes,
        customerId,
        items,
        subtotal,
        discountAmount,
        taxAmount: totalTax,
        shippingCharges,
        roundOff,
        totalAmount: grandTotal,
        amountPaid: amountPaid > 0 ? amountPaid : 0,
        paymentMode,
        paymentReference
      });

      setSubmitting(false);
      if (res.error) {
        setError(res.error);
        return;
      }

      onSuccess(res.invoice);
      onClose();
    } catch (err: any) {
      setSubmitting(false);
      setError(err?.message || "Failed to create direct invoice");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div 
        className="modal-container"
        style={{
          maxWidth: '1050px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <FileText size={22} color="#2563eb" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
                Create Direct Tax Invoice
              </h2>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Generate an immediate B2B sales invoice with automated GST & stock deduction
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {error && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              color: '#b91c1c',
              fontSize: '0.875rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: '#64748b' }}>
              <RotateCcw size={28} className="animate-spin" style={{ margin: '0 auto 12px auto' }} />
              <p>Loading invoice forms & catalog...</p>
            </div>
          ) : (
            <form id="create-invoice-form" onSubmit={handleSubmit}>
              {/* Section 1: Customer Selection */}
              <div style={{
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                marginBottom: '20px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Building2 size={18} color="#2563eb" />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                    Customer Details
                  </span>
                  {selectedCustomer && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      backgroundColor: isInterstate ? '#fffbeb' : '#f0fdf4',
                      color: isInterstate ? '#b45309' : '#16a34a'
                    }}>
                      {isInterstate ? "Interstate (IGST)" : "Intrastate (CGST + SGST)"}
                    </span>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Select Customer <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <select
                      value={customerId}
                      onChange={e => {
                        const id = e.target.value;
                        setCustomerId(id);
                        const c = allCustomers.find(cust => cust.id === id);
                        setSelectedCustomer(c || null);
                      }}
                      required
                      style={{
                        width: '100%',
                        height: '42px',
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.875rem',
                        color: '#0f172a',
                        backgroundColor: '#ffffff'
                      }}
                    >
                      <option value="">-- Choose Customer --</option>
                      {allCustomers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.businessName} {c.mobile ? `(${c.mobile})` : ''} - {c.state || 'State N/A'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedCustomer && (
                    <>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                          GSTIN / Tax ID
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={selectedCustomer.gstNumber || "Unregistered / Consumer"}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            fontSize: '0.875rem',
                            color: '#64748b'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                          Place of Supply (State)
                        </label>
                        <input
                          type="text"
                          readOnly
                          value={selectedCustomer.state || companyState}
                          style={{
                            width: '100%',
                            height: '42px',
                            padding: '0 12px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f8fafc',
                            fontSize: '0.875rem',
                            color: '#64748b'
                          }}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Section 2: Invoice Metadata */}
              <div style={{
                padding: '16px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Invoice Number <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={e => setInvoiceNumber(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Invoice Date <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => {
                      setInvoiceDate(e.target.value);
                      handleTermsChange(paymentTerms);
                    }}
                    required
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      color: '#0f172a'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={e => handleTermsChange(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      color: '#0f172a'
                    }}
                  >
                    {PAYMENT_TERMS_OPTIONS.map(opt => (
                      <option key={opt.label} value={opt.label}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.875rem',
                      color: '#0f172a'
                    }}
                  />
                </div>
              </div>

              {/* Section 3: Line Items Table */}
              <div style={{
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '20px'
              }}>
                <div style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                    Invoice Line Items ({items.length})
                  </span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#2563eb',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    <Plus size={14} /> Add Line Item
                  </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f1f5f9', color: '#475569', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px' }}>Item / Description</th>
                        <th style={{ padding: '10px 10px', width: '100px' }}>HSN</th>
                        <th style={{ padding: '10px 10px', width: '90px' }}>Qty</th>
                        <th style={{ padding: '10px 10px', width: '110px' }}>Rate (₹)</th>
                        <th style={{ padding: '10px 10px', width: '90px' }}>GST %</th>
                        <th style={{ padding: '10px 14px', width: '120px', textAlign: 'right' }}>Total (₹)</th>
                        <th style={{ padding: '10px 10px', width: '45px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((it, idx) => (
                        <tr key={idx} style={{ borderTop: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <select
                              value={it.productId}
                              onChange={e => handleItemChange(idx, "productId", e.target.value)}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem',
                                marginBottom: '4px'
                              }}
                            >
                              <option value="">Custom Item Description</option>
                              {allProducts.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.name} (₹{p.sellingPrice})
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Product or service name..."
                              value={it.productName}
                              onChange={e => handleItemChange(idx, "productName", e.target.value)}
                              required
                              style={{
                                width: '100%',
                                height: '32px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                fontSize: '0.8rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <input
                              type="text"
                              value={it.hsnCode}
                              onChange={e => handleItemChange(idx, "hsnCode", e.target.value)}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={e => handleItemChange(idx, "quantity", Number(e.target.value))}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={it.rate}
                              onChange={e => handleItemChange(idx, "rate", Number(e.target.value))}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 8px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem'
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px 10px' }}>
                            <select
                              value={it.gstRate}
                              onChange={e => handleItemChange(idx, "gstRate", Number(e.target.value))}
                              style={{
                                width: '100%',
                                height: '36px',
                                padding: '0 6px',
                                borderRadius: '6px',
                                border: '1px solid #cbd5e1',
                                fontSize: '0.82rem'
                              }}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                            ₹{it.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => removeItemRow(idx)}
                              disabled={items.length <= 1}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: items.length <= 1 ? '#cbd5e1' : '#ef4444',
                                cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 4: Bottom Layout (Notes & Settlement vs Summary) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '20px',
                alignItems: 'start'
              }}>
                {/* Left Column: Settlement & Notes */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {/* Settlement / Immediate Payment */}
                  <div style={{
                    padding: '16px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    backgroundColor: '#ffffff'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <CreditCard size={18} color="#16a34a" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
                        Settlement & Advance Payment (Optional)
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '10px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Amount Paid Now (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          step="1"
                          placeholder="0"
                          value={amountPaid || ""}
                          onChange={e => setAmountPaid(Math.min(grandTotal, Math.max(0, Number(e.target.value))))}
                          style={{
                            width: '100%',
                            height: '38px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.875rem',
                            fontWeight: 600,
                            color: '#16a34a'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Payment Mode
                        </label>
                        <select
                          value={paymentMode}
                          onChange={e => setPaymentMode(e.target.value)}
                          style={{
                            width: '100%',
                            height: '38px',
                            padding: '0 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.85rem',
                            color: '#0f172a'
                          }}
                        >
                          {PAYMENT_MODES.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {amountPaid > 0 && (
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                          Reference / Transaction ID
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. UPI UTR #, Cheque #, etc."
                          value={paymentReference}
                          onChange={e => setPaymentReference(e.target.value)}
                          style={{
                            width: '100%',
                            height: '36px',
                            padding: '0 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.82rem'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Invoice Notes / Terms
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Notes or special conditions displayed on the invoice..."
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </div>

                {/* Right Column: Financial Calculation Card */}
                <div style={{
                  padding: '18px 20px',
                  borderRadius: '12px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Subtotal:</span>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                      ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Discount (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={discountAmount || ""}
                      placeholder="0"
                      onChange={e => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: '90px',
                        height: '30px',
                        textAlign: 'right',
                        padding: '0 6px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', fontSize: '0.85rem' }}>
                    <span style={{ color: '#64748b' }}>Shipping / Freight (₹):</span>
                    <input
                      type="number"
                      min="0"
                      value={shippingCharges || ""}
                      placeholder="0"
                      onChange={e => setShippingCharges(Math.max(0, Number(e.target.value)))}
                      style={{
                        width: '90px',
                        height: '30px',
                        textAlign: 'right',
                        padding: '0 6px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.82rem'
                      }}
                    />
                  </div>

                  <div style={{ borderTop: '1px dashed #cbd5e1', margin: '8px 0' }} />

                  {isInterstate ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Integrated GST (IGST):</span>
                      <span>₹{totalIgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>Central GST (CGST):</span>
                        <span>₹{totalCgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>
                        <span>State GST (SGST):</span>
                        <span>₹{totalSgst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  {roundOff !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: '0.8rem', color: '#64748b' }}>
                      <span>Round Off:</span>
                      <span>{roundOff > 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
                    </div>
                  )}

                  <div style={{
                    borderTop: '2px solid #0f172a',
                    marginTop: '12px',
                    paddingTop: '12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline'
                  }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                      Grand Total:
                    </span>
                    <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div style={{
                    marginTop: '10px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    backgroundColor: balanceDue === 0 ? '#f0fdf4' : '#fffbeb',
                    border: `1px solid ${balanceDue === 0 ? '#bbf7d0' : '#fde68a'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: balanceDue === 0 ? '#16a34a' : '#b45309'
                  }}>
                    <span>{balanceDue === 0 ? "Fully Paid" : "Balance Due:"}</span>
                    <span>₹{balanceDue.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: '12px',
          backgroundColor: '#f8fafc'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="create-invoice-form"
            disabled={submitting || loading}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              color: '#ffffff',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: submitting || loading ? 'not-allowed' : 'pointer',
              opacity: submitting || loading ? 0.7 : 1,
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.25)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {submitting ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                Generating Invoice...
              </>
            ) : (
              <>
                <Plus size={16} />
                Create & Generate Invoice
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
