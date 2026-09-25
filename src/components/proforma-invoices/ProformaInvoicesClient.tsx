"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  ChevronDown, 
  Printer, 
  ExternalLink, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Receipt, 
  X,
  FileSpreadsheet,
  Download,
  Loader2,
  FileCheck2,
  ArrowRight,
  TrendingUp,
  Clock,
  Send
} from "lucide-react";
import * as XLSX from "xlsx";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import { 
  createProformaInvoice, 
  convertProformaToTaxInvoice, 
  deleteProformaInvoice, 
  deleteMultipleProformaInvoices,
  updateProformaStatus 
} from "@/app/actions/proformaActions";
import { numberToWordsINR } from "@/lib/gstUtils";
import "./proforma-invoices.css";

interface ProformaInvoicesClientProps {
  initialProformas: any[];
  customers: any[];
  orders: any[];
  products: any[];
}

export default function ProformaInvoicesClient({
  initialProformas,
  customers,
  orders,
  products
}: ProformaInvoicesClientProps) {
  const [proformas, setProformas] = useState<any[]>(initialProformas);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Conversion loading state
  const [convertingId, setConvertingId] = useState<string | null>(null);

  // Export Dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Pagination state: default 25 per page
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Proforma Invoice for advance estimation. Not a tax invoice. Goods will be dispatched upon receipt of advance payment.");

  // View Voucher Modal
  const [viewProforma, setViewProforma] = useState<any | null>(null);

  // Line Items
  const [lineItems, setLineItems] = useState<Array<{
    productId: string;
    description: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    gstRate: number;
  }>>([
    { productId: "", description: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }
  ]);

  // Filtered List
  const filtered = useMemo(() => {
    return proformas.filter(pi => {
      const matchStatus = filterStatus === "All" || pi.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        pi.proformaNumber.toLowerCase().includes(q) ||
        (pi.customer?.businessName || "").toLowerCase().includes(q) ||
        (pi.customer?.contactPerson || "").toLowerCase().includes(q) ||
        (pi.order?.orderNumber || "").toLowerCase().includes(q) ||
        (pi.invoice?.invoiceNumber || "").toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [proformas, search, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterStatus, pageSize]);

  const paginatedProformas = useMemo(() => {
    return paginate(filtered, currentPage, pageSize);
  }, [filtered, currentPage, pageSize]);

  // KPIs
  const totalIssued = proformas.reduce((acc, pi) => acc + (pi.totalAmount || 0), 0);
  const convertedCount = proformas.filter(pi => pi.status === "CONVERTED").length;
  const pendingAmount = proformas.filter(pi => pi.status !== "CONVERTED" && pi.status !== "CANCELLED").reduce((acc, pi) => acc + (pi.totalAmount || 0), 0);
  const conversionRate = proformas.length > 0 ? ((convertedCount / proformas.length) * 100).toFixed(1) : "0";

  // Selection Handlers
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedProformas.map(p => p.id);
    const allSelected = pageIds.length > 0 && pageIds.every(id => selectedIds.has(id));
    const next = new Set(selectedIds);
    if (allSelected) {
      pageIds.forEach(id => next.delete(id));
    } else {
      pageIds.forEach(id => next.add(id));
    }
    setSelectedIds(next);
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected proforma invoice(s)?`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await deleteMultipleProformaInvoices(Array.from(selectedIds));
      if (res.success) {
        setProformas(prev => prev.filter(p => !selectedIds.has(p.id)));
        setSelectedIds(new Set());
      } else {
        alert(res.error || "Failed to delete selected proforma invoices");
      }
    } catch (err: any) {
      alert(err?.message || "An unexpected error occurred");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDeleteSingle = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete Proforma Invoice #${num}?`)) return;
    try {
      const res = await deleteProformaInvoice(id);
      if (res.success) {
        setProformas(prev => prev.filter(p => p.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert(res.error || "Failed to delete proforma invoice");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete proforma invoice");
    }
  };

  // Convert to Tax Invoice
  const handleConvert = async (id: string, num: string) => {
    if (!window.confirm(`Convert Proforma Invoice #${num} into an official GST Tax Invoice? This will deduct warehouse stock and generate an invoice number.`)) {
      return;
    }

    setConvertingId(id);
    try {
      const res = await convertProformaToTaxInvoice(id);
      if (res.success && res.invoice) {
        alert(`Successfully converted to Tax Invoice #${res.invoice.invoiceNumber}!`);
        setProformas(prev => prev.map(p => p.id === id ? { ...p, status: "CONVERTED", invoice: res.invoice } : p));
      } else {
        alert(res.error || "Failed to convert Proforma Invoice");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to convert Proforma Invoice");
    } finally {
      setConvertingId(null);
    }
  };

  // Export
  const prepareExportData = () => {
    const itemsToExport = selectedIds.size > 0
      ? proformas.filter(p => selectedIds.has(p.id))
      : filtered;

    return itemsToExport.map(p => ({
      "Proforma #": p.proformaNumber,
      "Customer": p.customer?.businessName || p.customer?.contactPerson || "Unknown",
      "Issue Date": new Date(p.issueDate).toLocaleDateString(),
      "Expiry Date": p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "-",
      "Subtotal (₹)": p.subtotal || 0,
      "Tax Amount (₹)": p.taxAmount || 0,
      "Total Amount (₹)": p.totalAmount || 0,
      "Status": p.status,
      "Converted Invoice": p.invoice?.invoiceNumber || "-"
    }));
  };

  const handleExportExcel = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ProformaInvoices");
    XLSX.writeFile(wb, `Proforma_Invoices_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsExportDropdownOpen(false);
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Proforma_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportDropdownOpen(false);
  };

  // Line Item Handlers
  const handleProductSelect = (index: number, productId: string) => {
    const prod = products.find(p => p.id === productId);
    const updated = [...lineItems];
    if (prod) {
      updated[index] = {
        ...updated[index],
        productId: prod.id,
        description: prod.name,
        hsnCode: prod.hsnCode || "6109",
        rate: prod.sellingPrice || prod.price || 0,
        gstRate: prod.gstRate || 12
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: "",
        description: "",
        rate: 0
      };
    }
    setLineItems(updated);
  };

  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;
    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: "", description: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const modalCalculations = useMemo(() => {
    let subtotal = 0;
    let tax = 0;
    lineItems.forEach(item => {
      const itemTaxable = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
      const itemTax = itemTaxable * ((Number(item.gstRate) || 0) / 100);
      subtotal += itemTaxable;
      tax += itemTax;
    });
    return {
      subtotal,
      tax,
      total: subtotal + tax
    };
  }, [lineItems]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createProformaInvoice({
        customerId: selectedCustomerId,
        orderId: selectedOrderId || undefined,
        issueDate,
        expiryDate,
        notes,
        termsConditions: terms,
        items: lineItems.map(it => {
          const qty = Number(it.quantity) || 1;
          const rate = Number(it.rate) || 0;
          const taxable = qty * rate;
          const gstRate = Number(it.gstRate) || 0;
          const tax = taxable * (gstRate / 100);
          return {
            productId: it.productId || undefined,
            description: it.description || "Proforma item",
            hsnCode: it.hsnCode,
            quantity: qty,
            unit: it.unit,
            rate,
            taxableAmount: taxable,
            gstRate,
            cgst: tax / 2,
            sgst: tax / 2,
            igst: 0,
            total: taxable + tax
          };
        })
      });

      if (res.success && res.proforma) {
        setProformas([res.proforma, ...proformas]);
        setShowModal(false);
        setSelectedCustomerId("");
        setSelectedOrderId("");
        setNotes("");
        setLineItems([{ productId: "", description: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }]);
      } else {
        setError(res.error || "Failed to create Proforma Invoice");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isAllPageSelected = paginatedProformas.length > 0 && paginatedProformas.every(p => selectedIds.has(p.id));

  return (
    <div className="proforma-container">
      {/* KPI Grid */}
      <div className="proforma-kpi-grid">
        <div className="proforma-kpi-card total">
          <span className="proforma-kpi-label">Total Proforma Value</span>
          <span className="proforma-kpi-value" style={{ color: "#0284c7" }}>
            ₹{totalIssued.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="proforma-kpi-sub">Across {proformas.length} proforma invoices</span>
        </div>
        <div className="proforma-kpi-card converted">
          <span className="proforma-kpi-label">Converted to Tax Invoices</span>
          <span className="proforma-kpi-value" style={{ color: "#10b981" }}>
            {convertedCount} / {proformas.length}
          </span>
          <span className="proforma-kpi-sub">Successfully converted</span>
        </div>
        <div className="proforma-kpi-card pending">
          <span className="proforma-kpi-label">Open / Pending Advance</span>
          <span className="proforma-kpi-value" style={{ color: "#f59e0b" }}>
            ₹{pendingAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="proforma-kpi-sub">Awaiting customer payment</span>
        </div>
        <div className="proforma-kpi-card rate">
          <span className="proforma-kpi-label">Conversion Rate</span>
          <span className="proforma-kpi-value" style={{ color: "#8b5cf6" }}>
            {conversionRate}%
          </span>
          <span className="proforma-kpi-sub">Quote to Invoice win rate</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="proforma-toolbar">
        <div className="proforma-toolbar-top">
          <div className="proforma-search-wrap">
            <Search className="proforma-search-icon" size={16} />
            <input
              type="text"
              className="proforma-search-input"
              placeholder="Search by PI #, Customer, Ref Order, or Tax Inv #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="proforma-toolbar-actions">
            {selectedIds.size > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="btn-selection-count">
                  {selectedIds.size} Selected
                </span>
                <button
                  type="button"
                  className="btn-select-all"
                  onClick={handleSelectAllOnPage}
                >
                  {isAllPageSelected ? "Deselect Page" : `Select Page (${paginatedProformas.length})`}
                </button>
                <button
                  type="button"
                  className="btn-delete-selected"
                  onClick={handleDeleteSelected}
                  disabled={isDeletingBulk}
                >
                  {isDeletingBulk ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                  Delete ({selectedIds.size})
                </button>
                <button
                  type="button"
                  className="btn-clear-selection"
                  onClick={handleClearSelection}
                  title="Clear Selection"
                >
                  <X size={13} />
                </button>
              </div>
            ) : null}

            {/* Export Dropdown */}
            <div className="erp-export-dropdown-container" ref={exportDropdownRef}>
              <button
                type="button"
                className="btn-erp-export"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              >
                <Download size={14} />
                <span>Export</span>
                <ChevronDown size={13} />
              </button>
              {isExportDropdownOpen && (
                <div className="erp-export-dropdown-menu">
                  <button
                    type="button"
                    className="erp-export-dropdown-item"
                    onClick={handleExportExcel}
                  >
                    <FileSpreadsheet size={15} style={{ color: "#16a34a" }} />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    className="erp-export-dropdown-item"
                    onClick={handleExportCSV}
                  >
                    <FileSpreadsheet size={15} style={{ color: "#2563eb" }} />
                    <span>Export CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Create Button */}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: "#0284c7",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.82rem",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "none",
                cursor: "pointer"
              }}
              onClick={() => setShowModal(true)}
            >
              <Plus size={15} />
              <span>Create Proforma</span>
            </button>
          </div>
        </div>

        {/* Status Chips */}
        <div className="proforma-status-chips-bar">
          {["All", "DRAFT", "SENT", "CONVERTED", "EXPIRED", "CANCELLED"].map(st => {
            const count = st === "All"
              ? proformas.length
              : proformas.filter(p => p.status === st).length;
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                type="button"
                className={`proforma-status-chip ${isActive ? "active" : ""}`}
                onClick={() => setFilterStatus(st)}
              >
                <span>{st === "All" ? "All Status" : st}</span>
                <span className="pi-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="proforma-desktop-table" ref={tableContainerRef}>
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1.5px solid #e2e8f0" }}>
                <th style={{ width: "42px", padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    className="table-checkbox"
                    checked={isAllPageSelected}
                    onChange={handleSelectAllOnPage}
                    title="Select all on page"
                  />
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Proforma #
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Customer
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Issue Date
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Valid Till
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Total Amount
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Status
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedProformas.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                    <Receipt size={42} style={{ margin: "0 auto 10px auto", color: "#cbd5e1" }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No Proforma Invoices Found</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem" }}>
                      {search ? "No records match your search filter." : "Create your first Proforma Invoice for advance billing."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedProformas.map(p => {
                  const isSelected = selectedIds.has(p.id);
                  const isConverted = p.status === "CONVERTED";
                  const isConverting = convertingId === p.id;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isSelected ? "rgba(2, 132, 199, 0.04)" : "transparent",
                        transition: "background-color 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(p.id)}
                        />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setViewProforma(p)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#0284c7",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.84rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {p.proformaNumber}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.84rem", fontWeight: 600, color: "#1e293b" }}>
                        {p.customer?.businessName || p.customer?.contactPerson || "Customer"}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#64748b" }}>
                        {new Date(p.issueDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#64748b" }}>
                        {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : "-"}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#0f172a" }}>
                          ₹{(p.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {(p.taxAmount || 0) > 0 && (
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            incl. ₹{(p.taxAmount || 0).toFixed(2)} GST
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor:
                              p.status === "CONVERTED" ? "#dcfce7" :
                              p.status === "SENT" ? "#e0f2fe" :
                              p.status === "DRAFT" ? "#f1f5f9" : "#fee2e2",
                            color:
                              p.status === "CONVERTED" ? "#15803d" :
                              p.status === "SENT" ? "#0369a1" :
                              p.status === "DRAFT" ? "#475569" : "#b91c1c"
                          }}
                        >
                          {p.status}
                        </span>
                        {p.invoice && (
                          <div style={{ fontSize: "0.7rem", color: "#16a34a", marginTop: "2px", fontWeight: 600 }}>
                            Inv #{p.invoice.invoiceNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          {!isConverted && (
                            <button
                              type="button"
                              onClick={() => handleConvert(p.id, p.proformaNumber)}
                              disabled={isConverting}
                              title="Convert to Official Tax Invoice"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                backgroundColor: "#ecfdf5",
                                border: "1px solid #a7f3d0",
                                color: "#047857",
                                borderRadius: "6px",
                                padding: "4px 8px",
                                fontSize: "0.74rem",
                                fontWeight: 700,
                                cursor: "pointer"
                              }}
                            >
                              {isConverting ? <Loader2 size={12} className="animate-spin" /> : <FileCheck2 size={12} />}
                              <span>Convert</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setViewProforma(p)}
                            title="View / Print Proforma"
                            style={{
                              background: "none",
                              border: "1px solid #e2e8f0",
                              borderRadius: "6px",
                              padding: "5px 8px",
                              cursor: "pointer",
                              color: "#475569"
                            }}
                          >
                            <Printer size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(p.id, p.proformaNumber)}
                            title="Delete Proforma"
                            style={{
                              background: "none",
                              border: "1px solid #fee2e2",
                              borderRadius: "6px",
                              padding: "5px 8px",
                              cursor: "pointer",
                              color: "#ef4444"
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <TablePagination
          currentPage={currentPage}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={p => setCurrentPage(p)}
          onPageSizeChange={s => { setPageSize(s); setCurrentPage(1); }}
        />
      </div>

      {/* Mobile Card Feed */}
      <div className="proforma-mobile-feed">
        {paginatedProformas.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", background: "#fff", borderRadius: "14px", color: "#94a3b8" }}>
            <Receipt size={36} style={{ margin: "0 auto 8px auto", color: "#cbd5e1" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No Proforma Invoices Found</p>
          </div>
        ) : (
          paginatedProformas.map(p => {
            const isSelected = selectedIds.has(p.id);

            return (
              <div
                key={p.id}
                className="proforma-mobile-card"
                style={{
                  backgroundColor: isSelected ? "rgba(2, 132, 199, 0.04)" : "#ffffff",
                  borderColor: isSelected ? "#0284c7" : "#e2e8f0"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(p.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewProforma(p)}
                      style={{ background: "none", border: "none", color: "#0284c7", fontWeight: 700, fontSize: "0.9rem" }}
                    >
                      {p.proformaNumber}
                    </button>
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: p.status === "CONVERTED" ? "#dcfce7" : "#e0f2fe",
                      color: p.status === "CONVERTED" ? "#15803d" : "#0369a1"
                    }}
                  >
                    {p.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.84rem", color: "#1e293b", fontWeight: 600 }}>
                  {p.customer?.businessName || p.customer?.contactPerson || "Customer"}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
                  <span>{new Date(p.issueDate).toLocaleDateString()}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                    ₹{(p.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.65)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "920px",
            maxHeight: "92vh",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            border: "1px solid #e2e8f0",
            overflow: "hidden"
          }}>
            {/* Modal Header */}
            <div style={{
              padding: "16px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "#f8fafc"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#e0f2fe",
                  color: "#0284c7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Receipt size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>
                    Create Proforma Invoice
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                    Issue advance quotation invoice before receiving payment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              <form id="create-proforma-form" onSubmit={handleCreateSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {error && (
                  <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }}>
                    <AlertCircle size={15} />
                    <span>{error}</span>
                  </div>
                )}

                {/* Customer & Order */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Customer *
                    </label>
                    <select
                      required
                      className="proforma-select"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.84rem" }}
                      value={selectedCustomerId}
                      onChange={e => setSelectedCustomerId(e.target.value)}
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.businessName || c.contactPerson} {c.city ? `(${c.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Linked Sales Order (Optional)
                    </label>
                    <select
                      className="proforma-select"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.84rem" }}
                      value={selectedOrderId}
                      onChange={e => setSelectedOrderId(e.target.value)}
                    >
                      <option value="">-- No Linked Order --</option>
                      {orders.filter(o => !selectedCustomerId || o.customerId === selectedCustomerId).map(o => (
                        <option key={o.id} value={o.id}>
                          {o.orderNumber} (₹{(o.totalValue || o.totalAmount || 0).toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Dates */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      required
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.84rem", boxSizing: "border-box" }}
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Expiry / Validity Date
                    </label>
                    <input
                      type="date"
                      style={{ width: "100%", padding: "9px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.84rem", boxSizing: "border-box" }}
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Line Items Table */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "#334155" }}>
                      Line Items *
                    </label>
                    <button
                      type="button"
                      onClick={addLineItem}
                      style={{
                        padding: "5px 12px",
                        borderRadius: "6px",
                        border: "1px solid #bae6fd",
                        backgroundColor: "#f0f9ff",
                        color: "#0284c7",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Plus size={13} /> Add Item
                    </button>
                  </div>

                  <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                      <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <tr>
                          <th style={{ padding: "8px 10px", textAlign: "left" }}>Product / Description</th>
                          <th style={{ padding: "8px 10px", width: "80px", textAlign: "center" }}>HSN</th>
                          <th style={{ padding: "8px 10px", width: "70px", textAlign: "right" }}>Qty</th>
                          <th style={{ padding: "8px 10px", width: "65px", textAlign: "center" }}>Unit</th>
                          <th style={{ padding: "8px 10px", width: "95px", textAlign: "right" }}>Rate (₹)</th>
                          <th style={{ padding: "8px 10px", width: "80px", textAlign: "right" }}>GST %</th>
                          <th style={{ padding: "8px 10px", width: "105px", textAlign: "right" }}>Total (₹)</th>
                          <th style={{ width: "36px", padding: "8px 4px" }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => {
                          const itemTaxable = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                          const itemTotal = itemTaxable * (1 + (Number(item.gstRate) || 0) / 100);

                          return (
                            <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                              <td style={{ padding: "6px 8px" }}>
                                <select
                                  style={{ width: "100%", padding: "5px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                                  value={item.productId}
                                  onChange={e => handleProductSelect(idx, e.target.value)}
                                >
                                  <option value="">-- Custom Description --</option>
                                  {products.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.sku || "No SKU"})</option>
                                  ))}
                                </select>
                                <input
                                  type="text"
                                  placeholder="Item details / custom description"
                                  style={{ width: "100%", marginTop: "4px", padding: "5px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.76rem", boxSizing: "border-box" }}
                                  value={item.description}
                                  onChange={e => handleLineItemChange(idx, "description", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 4px", textAlign: "center" }}>
                                <input
                                  type="text"
                                  placeholder="HSN"
                                  style={{ width: "100%", padding: "5px 4px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", textAlign: "center", boxSizing: "border-box" }}
                                  value={item.hsnCode}
                                  onChange={e => handleLineItemChange(idx, "hsnCode", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 4px" }}>
                                <input
                                  type="number"
                                  min="1"
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", textAlign: "right", boxSizing: "border-box" }}
                                  value={item.quantity}
                                  onChange={e => handleLineItemChange(idx, "quantity", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 4px", textAlign: "center" }}>
                                <select
                                  style={{ width: "100%", padding: "5px 4px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.76rem" }}
                                  value={item.unit}
                                  onChange={e => handleLineItemChange(idx, "unit", e.target.value)}
                                >
                                  <option value="pcs">pcs</option>
                                  <option value="sets">sets</option>
                                  <option value="box">box</option>
                                  <option value="mtr">mtr</option>
                                  <option value="kg">kg</option>
                                </select>
                              </td>
                              <td style={{ padding: "6px 4px" }}>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  style={{ width: "100%", padding: "5px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem", textAlign: "right", boxSizing: "border-box" }}
                                  value={item.rate}
                                  onChange={e => handleLineItemChange(idx, "rate", e.target.value)}
                                />
                              </td>
                              <td style={{ padding: "6px 4px" }}>
                                <select
                                  style={{ width: "100%", padding: "5px 4px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                                  value={item.gstRate}
                                  onChange={e => handleLineItemChange(idx, "gstRate", e.target.value)}
                                >
                                  <option value="0">0%</option>
                                  <option value="5">5%</option>
                                  <option value="12">12%</option>
                                  <option value="18">18%</option>
                                  <option value="28">28%</option>
                                </select>
                              </td>
                              <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 700, color: "#0f172a" }}>
                                ₹{itemTotal.toFixed(2)}
                              </td>
                              <td style={{ padding: "6px 4px", textAlign: "center" }}>
                                {lineItems.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeLineItem(idx)}
                                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "4px" }}
                                  >
                                    <X size={15} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Calculations Summary */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "12px" }}>
                    <div style={{ width: "260px", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "5px", backgroundColor: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                        <span>Subtotal:</span>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>₹{modalCalculations.subtotal.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                        <span>GST Amount:</span>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>₹{modalCalculations.tax.toFixed(2)}</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.95rem", color: "#0284c7", borderTop: "1px solid #e2e8f0", paddingTop: "5px" }}>
                        <span>Total Proforma:</span>
                        <span>₹{modalCalculations.total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes & Terms */}
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Advance payment terms or delivery remarks"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", fontSize: "0.82rem", boxSizing: "border-box" }}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </form>
            </div>

            {/* Modal Footer - Fixed with ample padding & no clipping */}
            <div style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: "12px",
              borderTop: "1px solid #e2e8f0",
              padding: "16px 24px",
              backgroundColor: "#f8fafc",
              borderBottomLeftRadius: "16px",
              borderBottomRightRadius: "16px",
              boxSizing: "border-box"
            }}>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                disabled={loading}
                style={{
                  padding: "8px 18px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#475569",
                  fontWeight: 600,
                  fontSize: "0.84rem",
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-proforma-form"
                disabled={loading}
                style={{
                  backgroundColor: "#0284c7",
                  color: "#ffffff",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "9px 22px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 2px 6px rgba(2, 132, 199, 0.3)"
                }}
              >
                {loading && <Loader2 size={15} className="animate-spin" />}
                <span>Create Proforma Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW PROFORMA MODAL - Identical Quotations Zoho-Standard Layout */}
      {viewProforma && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.7)",
          backdropFilter: "blur(4px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: "16px"
        }}>
          <div style={{
            backgroundColor: "#ffffff",
            borderRadius: "16px",
            width: "100%",
            maxWidth: "860px",
            maxHeight: "92vh",
            overflowY: "auto",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            padding: "24px 28px",
            boxSizing: "border-box"
          }}>
            {/* Modal Top Floating Bar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>
                  Status: <strong style={{ color: viewProforma.status === "CONVERTED" ? "#059669" : "#0284c7" }}>{viewProforma.status}</strong>
                </span>
                <Link
                  href={`/proforma-invoices/${viewProforma.id}`}
                  style={{
                    fontSize: "0.78rem",
                    color: "#0284c7",
                    fontWeight: 600,
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px"
                  }}
                >
                  Open Full Page <ExternalLink size={12} />
                </Link>
              </div>

              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    backgroundColor: "#0284c7",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 14px",
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <Printer size={13} />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewProforma(null)}
                  style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", padding: "4px" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Printable Document Container (Quotation Standard Layout) */}
            <div style={{
              backgroundColor: "#ffffff",
              padding: "20px",
              border: "1px solid #d1d5db",
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
              color: "#111827",
              fontSize: "10.5px",
              lineHeight: "1.4"
            }} id="printable-proforma-modal">
              {/* 1. Header Row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <svg width="54" height="60" viewBox="0 0 100 110" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                    <path d="M50 4 C24 4 10 10 10 32 C10 68 34 94 50 106 C66 94 90 68 90 32 C90 10 76 4 50 4 Z" stroke="#000000" strokeWidth="5" fill="#ffffff" />
                    <text x="50" y="32" textAnchor="middle" fontFamily="sans-serif" fontWeight="900" fontSize="13" fill="#000000" letterSpacing="1">ESPON</text>
                    <path d="M48 44 C41 44 36 50 36 60 C36 74 46 80 58 76 C65 74 68 68 68 68 M40 56 C44 56 60 55 60 48 C60 42 52 44 48 44" stroke="#000000" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    <path d="M50 78 C44 84 42 90 48 94 C53 96 62 88 64 80" stroke="#000000" strokeWidth="3.5" strokeLinecap="round" fill="none" />
                  </svg>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: 800, color: "#111827", marginBottom: "2px" }}>Espon Clothing Private Limited</div>
                    <div style={{ fontSize: "9.5px", color: "#374151" }}>Sco 71A , 2nd Floor , Ashoka PlazaDelhi Road</div>
                    <div style={{ fontSize: "9.5px", color: "#374151" }}>Rohtak- Haryana 124001 India</div>
                    <div style={{ fontSize: "9.5px", color: "#111827", fontWeight: 600 }}>GSTIN 06AAHCE7721Q1Z4</div>
                    <div style={{ fontSize: "9.5px", color: "#374151" }}>7206066678 | clothingespon@gmail.com</div>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "#111827", lineHeight: "1.1" }}>
                    PROFORMA INVOICE
                  </h1>
                  <div style={{ fontSize: "10px", color: "#64748b", marginTop: "3px" }}>(Advance Quotation)</div>
                </div>
              </div>

              {/* 2. Meta Details Box (Zoho 2-Column Key-Value Box) */}
              <div style={{ border: "1px solid #d1d5db", display: "flex", marginBottom: "12px", fontSize: "10px" }}>
                <div style={{ flex: "1 1 50%", borderRight: "1px solid #d1d5db", padding: "6px 10px" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "9.5px" }}>
                    <tbody>
                      <tr>
                        <td style={{ color: "#374151", padding: "1px 0", width: "90px" }}>Proforma No.</td>
                        <td style={{ color: "#111827", padding: "1px 0", width: "10px" }}>:</td>
                        <td style={{ color: "#111827", fontWeight: 700, padding: "1px 0" }}>{viewProforma.proformaNumber}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "#374151", padding: "1px 0" }}>Proforma Date</td>
                        <td style={{ color: "#111827", padding: "1px 0" }}>:</td>
                        <td style={{ color: "#111827", fontWeight: 700, padding: "1px 0" }}>{new Date(viewProforma.issueDate).toLocaleDateString("en-GB")}</td>
                      </tr>
                      <tr>
                        <td style={{ color: "#374151", padding: "1px 0" }}>Terms</td>
                        <td style={{ color: "#111827", padding: "1px 0" }}>:</td>
                        <td style={{ color: "#111827", fontWeight: 700, padding: "1px 0" }}>Advance Payment / Due on Receipt</td>
                      </tr>
                      <tr>
                        <td style={{ color: "#374151", padding: "1px 0" }}>Valid Till</td>
                        <td style={{ color: "#111827", padding: "1px 0" }}>:</td>
                        <td style={{ color: "#111827", fontWeight: 700, padding: "1px 0" }}>
                          {viewProforma.expiryDate ? new Date(viewProforma.expiryDate).toLocaleDateString("en-GB") : "-"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style={{ flex: "1 1 50%", padding: "6px 10px" }}>
                  <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "9.5px" }}>
                    <tbody>
                      <tr>
                        <td style={{ width: "95px", color: "#374151", padding: "1px 0" }}>Place Of Supply</td>
                        <td style={{ color: "#111827", padding: "1px 0", width: "10px" }}>:</td>
                        <td style={{ color: "#111827", fontWeight: 700, padding: "1px 0" }}>
                          {viewProforma.customer?.state || "Haryana"} ({viewProforma.customer?.gstNumber?.slice(0, 2) || "06"})
                        </td>
                      </tr>
                      {viewProforma.invoice && (
                        <tr>
                          <td style={{ color: "#374151", padding: "1px 0" }}>Converted Inv</td>
                          <td style={{ color: "#111827", padding: "1px 0" }}>:</td>
                          <td style={{ color: "#059669", fontWeight: 700, padding: "1px 0" }}>#{viewProforma.invoice.invoiceNumber}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Address Box */}
              <div style={{ border: "1px solid #d1d5db", display: "flex", marginBottom: "12px", fontSize: "9.5px" }}>
                <div style={{ flex: "1 1 50%", borderRight: "1px solid #d1d5db", display: "flex", flexDirection: "column" }}>
                  <div style={{ backgroundColor: "#f8fafc", padding: "4px 10px", borderBottom: "1px solid #d1d5db", fontWeight: 700, color: "#111827" }}>
                    Bill To
                  </div>
                  <div style={{ padding: "6px 10px", lineHeight: "1.35", flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: "10.5px", color: "#111827" }}>
                      {viewProforma.customer?.businessName || viewProforma.customer?.contactPerson}
                    </div>
                    {viewProforma.customer?.billingAddress && <div>{viewProforma.customer.billingAddress}</div>}
                    <div>{viewProforma.customer?.city || ""} {viewProforma.customer?.state || ""} {viewProforma.customer?.pincode || ""} India</div>
                    {viewProforma.customer?.mobile && <div>+91-{viewProforma.customer.mobile}</div>}
                    {viewProforma.customer?.gstNumber && <div style={{ fontWeight: 600, textTransform: 'uppercase' }}>GSTIN {viewProforma.customer.gstNumber.toUpperCase()}</div>}
                  </div>
                </div>

                <div style={{ flex: "1 1 50%", display: "flex", flexDirection: "column" }}>
                  <div style={{ backgroundColor: "#f8fafc", padding: "4px 10px", borderBottom: "1px solid #d1d5db", fontWeight: 700, color: "#111827" }}>
                    Ship To
                  </div>
                  <div style={{ padding: "6px 10px", lineHeight: "1.35", flex: 1 }}>
                    <div>{viewProforma.customer?.shippingAddress || viewProforma.customer?.billingAddress || viewProforma.customer?.businessName}</div>
                    <div>{viewProforma.customer?.city || ""} {viewProforma.customer?.state || ""} India</div>
                  </div>
                </div>
              </div>

              {/* 4. Items Table (Zoho 2-Tier Nested Table) */}
              <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #cbd5e1", fontSize: "9.5px" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f8fafc", color: "#111827", fontWeight: 700 }}>
                    <th rowSpan={2} style={{ padding: "7px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", width: "24px", verticalAlign: "middle", lineHeight: "1.3" }}>#</th>
                    <th rowSpan={2} style={{ padding: "7px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "left", verticalAlign: "middle", lineHeight: "1.3" }}>Item &amp; Description</th>
                    <th rowSpan={2} style={{ padding: "7px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", width: "50px", verticalAlign: "middle", lineHeight: "1.3" }}>HSN</th>
                    <th rowSpan={2} style={{ padding: "7px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "45px", verticalAlign: "middle", lineHeight: "1.3" }}>Qty</th>
                    <th rowSpan={2} style={{ padding: "7px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "55px", verticalAlign: "middle", lineHeight: "1.3" }}>Rate</th>
                    <th colSpan={2} style={{ padding: "5px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", verticalAlign: "middle", lineHeight: "1.3" }}>CGST</th>
                    <th colSpan={2} style={{ padding: "5px 4px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "center", verticalAlign: "middle", lineHeight: "1.3" }}>SGST</th>
                    <th rowSpan={2} style={{ padding: "7px 6px", border: "1px solid #cbd5e1", borderTop: "2px solid #94a3b8", textAlign: "right", width: "70px", verticalAlign: "middle", lineHeight: "1.3" }}>Amount</th>
                  </tr>
                  <tr style={{ backgroundColor: "#f8fafc", color: "#111827", fontWeight: 700, fontSize: "9px" }}>
                    <th style={{ padding: "4px 3px", border: "1px solid #cbd5e1", textAlign: "right", width: "30px", verticalAlign: "middle", lineHeight: "1.3" }}>%</th>
                    <th style={{ padding: "4px 4px", border: "1px solid #cbd5e1", textAlign: "right", width: "45px", verticalAlign: "middle", lineHeight: "1.3" }}>Amt</th>
                    <th style={{ padding: "4px 3px", border: "1px solid #cbd5e1", textAlign: "right", width: "30px", verticalAlign: "middle", lineHeight: "1.3" }}>%</th>
                    <th style={{ padding: "4px 4px", border: "1px solid #cbd5e1", textAlign: "right", width: "45px", verticalAlign: "middle", lineHeight: "1.3" }}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewProforma.items || []).map((it: any, i: number) => {
                    const taxable = it.taxableAmount || (it.rate * it.quantity);
                    const halfGstRate = (it.gstRate || 12) / 2;
                    const halfGstAmt = it.cgst || (taxable * halfGstRate / 100);

                    return (
                      <tr key={it.id || i}>
                        <td style={{ padding: "4px 4px", border: "1px solid #d1d5db", textAlign: "center", color: "#4b5563" }}>{i + 1}</td>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db" }}>
                          <div style={{ fontWeight: 700, color: "#111827" }}>{it.description}</div>
                        </td>
                        <td style={{ padding: "4px 4px", border: "1px solid #d1d5db", textAlign: "center", color: "#4b5563" }}>{it.hsnCode || "6109"}</td>
                        <td style={{ padding: "4px 4px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: 700 }}>
                          {it.quantity} {it.unit || "pcs"}
                        </td>
                        <td style={{ padding: "4px 4px", border: "1px solid #d1d5db", textAlign: "right" }}>₹{(it.rate || 0).toFixed(2)}</td>
                        <td style={{ padding: "2px 3px", border: "1px solid #d1d5db", textAlign: "right" }}>{halfGstRate}%</td>
                        <td style={{ padding: "2px 4px", border: "1px solid #d1d5db", textAlign: "right" }}>₹{halfGstAmt.toFixed(2)}</td>
                        <td style={{ padding: "2px 3px", border: "1px solid #d1d5db", textAlign: "right" }}>{halfGstRate}%</td>
                        <td style={{ padding: "2px 4px", border: "1px solid #d1d5db", textAlign: "right" }}>₹{halfGstAmt.toFixed(2)}</td>
                        <td style={{ padding: "4px 6px", border: "1px solid #d1d5db", textAlign: "right", fontWeight: 700 }}>₹{taxable.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* 5. Lower Box */}
              <div style={{ border: "1px solid #d1d5db", borderTop: "none", display: "flex", backgroundColor: "#ffffff" }}>
                {/* Left 58% */}
                <div style={{ flex: "1 1 58%", borderRight: "1px solid #d1d5db", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ padding: "6px 10px" }}>
                      <div style={{ fontSize: "8.5px", color: "#6b7280" }}>Total In Words</div>
                      <div style={{ fontStyle: "italic", fontWeight: 700, color: "#111827", fontSize: "10px" }}>
                        {numberToWordsINR(viewProforma.totalAmount)}
                      </div>
                    </div>
                    <div style={{ padding: "5px 10px", fontSize: "9px", color: "#4b5563" }}>
                      <strong style={{ color: "#111827" }}>Terms:</strong> Advance payment required. Proforma valid for 15 days.
                    </div>
                  </div>
                  <div style={{ padding: "6px 10px", fontSize: "9px", color: "#1f2937", borderTop: "1px dashed #e5e7eb" }}>
                    <strong>Bank:</strong> ESPON CLOTHING PRIVATE LIMITED. | A/C: 016805006415 | IFSC: ICIC0000168 | Branch: Rohtak
                  </div>
                </div>

                {/* Right 42% */}
                <div style={{ flex: "0 0 42%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div style={{ padding: "6px 10px", fontSize: "10px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span style={{ color: "#374151" }}>Sub Total:</span>
                      <span>₹{(viewProforma.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                      <span style={{ color: "#374151" }}>Tax Amount:</span>
                      <span>₹{(viewProforma.taxAmount || 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0 2px 0", borderTop: "1px solid #111827", fontWeight: 800, fontSize: "11px" }}>
                      <span>Total Proforma Amount:</span>
                      <span>₹{(viewProforma.totalAmount || 0).toFixed(2)}</span>
                    </div>
                  </div>
                  <div style={{ padding: "6px 10px 10px 10px", textAlign: "center", borderTop: "1px dashed #e5e7eb" }}>
                    <div style={{ height: "26px" }}></div>
                    <div style={{ borderTop: "1px solid #9ca3af", paddingTop: "3px", fontSize: "9.5px", fontWeight: 700 }}>
                      Authorized Signatory
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "16px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewProforma(null)}
                style={{ padding: "7px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, fontSize: "0.82rem", cursor: "pointer" }}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ backgroundColor: "#0284c7", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px", padding: "7px 18px", borderRadius: "8px", border: "none", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}
              >
                <Printer size={15} />
                <span>Print Proforma</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
