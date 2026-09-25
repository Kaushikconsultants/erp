"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  FilePlus, 
  Plus, 
  Search, 
  ChevronDown, 
  Printer, 
  ExternalLink, 
  Trash2, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Package, 
  Receipt, 
  X,
  FileSpreadsheet,
  Download,
  Loader2,
  Building2,
  User,
  ArrowUpRight,
  ArrowDownLeft
} from "lucide-react";
import * as XLSX from "xlsx";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import { createDebitNote, deleteDebitNote, deleteMultipleDebitNotes, updateDebitNoteStatus } from "@/app/actions/debitNoteActions";
import "./debit-notes.css";

interface DebitNotesClientProps {
  initialDebitNotes: any[];
  customers: any[];
  vendors: any[];
  invoices: any[];
  bills: any[];
  products: any[];
}

export default function DebitNotesClient({
  initialDebitNotes,
  customers,
  vendors,
  invoices,
  bills,
  products
}: DebitNotesClientProps) {
  const [debitNotes, setDebitNotes] = useState<any[]>(initialDebitNotes);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Export Dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
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

  const [dnType, setDnType] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedBillId, setSelectedBillId] = useState("");
  const [reason, setReason] = useState("Price Revision (Undercharged)");
  const [dnDate, setDnDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Debit note issued under Sec 34 of CGST Act. Payable upon receipt.");

  // View Voucher Modal
  const [viewNote, setViewNote] = useState<any | null>(null);

  // Dynamic Line Items
  const [lineItems, setLineItems] = useState<Array<{
    productId: string;
    description: string;
    sku: string;
    hsnCode: string;
    quantity: number;
    unit: string;
    rate: number;
    gstRate: number;
  }>>([
    { productId: "", description: "", sku: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }
  ]);

  // Customer Invoices / Vendor Bills for linking
  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return invoices.filter(i => i.customerId === selectedCustomerId);
  }, [selectedCustomerId, invoices]);

  const vendorBills = useMemo(() => {
    if (!selectedVendorId) return [];
    return bills.filter(b => b.vendorId === selectedVendorId);
  }, [selectedVendorId, bills]);

  // Filtered List
  const filtered = useMemo(() => {
    return debitNotes.filter(dn => {
      const matchType = filterType === "All" || dn.type === filterType;
      const matchStatus = filterStatus === "All" || dn.status === filterStatus;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        dn.debitNoteNumber.toLowerCase().includes(q) ||
        (dn.reason || "").toLowerCase().includes(q) ||
        (dn.customer?.businessName || "").toLowerCase().includes(q) ||
        (dn.vendor?.companyName || "").toLowerCase().includes(q) ||
        (dn.invoice?.invoiceNumber || "").toLowerCase().includes(q);

      return matchType && matchStatus && matchSearch;
    });
  }, [debitNotes, search, filterType, filterStatus]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterType, filterStatus, pageSize]);

  const paginatedDebitNotes = useMemo(() => {
    return paginate(filtered, currentPage, pageSize);
  }, [filtered, currentPage, pageSize]);

  // KPIs
  const totalIssued = debitNotes.filter(dn => dn.status !== "CANCELLED").reduce((acc, dn) => acc + (dn.totalAmount || 0), 0);
  const customerDebitsTotal = debitNotes.filter(dn => dn.type === "CUSTOMER" && dn.status !== "CANCELLED").reduce((acc, dn) => acc + (dn.totalAmount || 0), 0);
  const vendorDebitsTotal = debitNotes.filter(dn => dn.type === "VENDOR" && dn.status !== "CANCELLED").reduce((acc, dn) => acc + (dn.totalAmount || 0), 0);
  const openBalance = debitNotes.filter(dn => dn.status === "OPEN").reduce((acc, dn) => acc + (dn.balanceAmount || dn.totalAmount || 0), 0);

  // Selection Handlers
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedDebitNotes.map(n => n.id);
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
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected debit note(s)? This will reverse accounting entries.`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await deleteMultipleDebitNotes(Array.from(selectedIds));
      if (res.success) {
        setDebitNotes(prev => prev.filter(n => !selectedIds.has(n.id)));
        setSelectedIds(new Set());
      } else {
        alert(res.error || "Failed to delete selected debit notes");
      }
    } catch (err: any) {
      alert(err?.message || "An unexpected error occurred");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDeleteSingle = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete Debit Note #${num}?`)) return;
    try {
      const res = await deleteDebitNote(id);
      if (res.success) {
        setDebitNotes(prev => prev.filter(n => n.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert(res.error || "Failed to delete debit note");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete debit note");
    }
  };

  // Export
  const prepareExportData = () => {
    const itemsToExport = selectedIds.size > 0
      ? debitNotes.filter(n => selectedIds.has(n.id))
      : filtered;

    return itemsToExport.map(n => ({
      "Debit Note #": n.debitNoteNumber,
      "Type": n.type === "CUSTOMER" ? "Customer Debit" : "Vendor Debit",
      "Party Name": n.type === "CUSTOMER" ? (n.customer?.businessName || "Unknown") : (n.vendor?.companyName || "Unknown"),
      "Date": new Date(n.debitNoteDate).toLocaleDateString(),
      "Reason": n.reason,
      "Ref Document": n.invoice?.invoiceNumber || (n.bill?.billNumber || "-"),
      "Subtotal (₹)": n.subtotal || 0,
      "Tax Amount (₹)": n.taxAmount || 0,
      "Total Amount (₹)": n.totalAmount || 0,
      "Status": n.status
    }));
  };

  const handleExportExcel = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DebitNotes");
    XLSX.writeFile(wb, `Debit_Notes_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsExportDropdownOpen(false);
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `Debit_Notes_${new Date().toISOString().slice(0, 10)}.csv`);
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
        sku: prod.sku || "",
        hsnCode: prod.hsnCode || "6109",
        rate: prod.sellingPrice || prod.price || 0,
        gstRate: prod.gstRate || 12
      };
    } else {
      updated[index] = {
        ...updated[index],
        productId: "",
        description: "",
        sku: "",
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
    setLineItems([...lineItems, { productId: "", description: "", sku: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  // Calculation in Modal
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

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createDebitNote({
        type: dnType,
        customerId: dnType === "CUSTOMER" ? selectedCustomerId : undefined,
        vendorId: dnType === "VENDOR" ? selectedVendorId : undefined,
        invoiceId: dnType === "CUSTOMER" ? (selectedInvoiceId || undefined) : undefined,
        billId: dnType === "VENDOR" ? (selectedBillId || undefined) : undefined,
        debitNoteDate: dnDate,
        reason,
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
            description: it.description || "Debit adjustment",
            sku: it.sku,
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

      if (res.success && res.debitNote) {
        setDebitNotes([res.debitNote, ...debitNotes]);
        setShowModal(false);
        // Reset form
        setSelectedCustomerId("");
        setSelectedVendorId("");
        setSelectedInvoiceId("");
        setSelectedBillId("");
        setNotes("");
        setLineItems([{ productId: "", description: "", sku: "", hsnCode: "6109", quantity: 1, unit: "pcs", rate: 0, gstRate: 12 }]);
      } else {
        setError(res.error || "Failed to create debit note");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isAllPageSelected = paginatedDebitNotes.length > 0 && paginatedDebitNotes.every(n => selectedIds.has(n.id));

  return (
    <div className="debit-notes-container">
      {/* KPI Metric Grid */}
      <div className="debit-notes-kpi-grid">
        <div className="debit-notes-kpi-card total">
          <span className="debit-notes-kpi-label">Total Debit Notes Issued</span>
          <span className="debit-notes-kpi-value" style={{ color: "#4f46e5" }}>
            ₹{totalIssued.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="debit-notes-kpi-sub">Across {debitNotes.length} debit notes</span>
        </div>
        <div className="debit-notes-kpi-card customer">
          <span className="debit-notes-kpi-label">Customer Debits (Supplementary)</span>
          <span className="debit-notes-kpi-value" style={{ color: "#0284c7" }}>
            ₹{customerDebitsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="debit-notes-kpi-sub">Price revisions & extra charges</span>
        </div>
        <div className="debit-notes-kpi-card vendor">
          <span className="debit-notes-kpi-label">Vendor Debits (Purchase Returns)</span>
          <span className="debit-notes-kpi-value" style={{ color: "#10b981" }}>
            ₹{vendorDebitsTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="debit-notes-kpi-sub">Returns & rate differences</span>
        </div>
        <div className="debit-notes-kpi-card balance">
          <span className="debit-notes-kpi-label">Open Balance</span>
          <span className="debit-notes-kpi-value" style={{ color: "#d97706" }}>
            ₹{openBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
          <span className="debit-notes-kpi-sub">Pending adjustment / payment</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="debit-notes-toolbar">
        <div className="debit-notes-toolbar-top">
          {/* Search */}
          <div className="debit-notes-search-wrap">
            <Search className="debit-notes-search-icon" size={16} />
            <input
              type="text"
              className="debit-notes-search-input"
              placeholder="Search by DN #, Party, Reason, or Ref #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Type Filter */}
          <select
            className="debit-notes-select"
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="CUSTOMER">Customer Debits (Supplementary)</option>
            <option value="VENDOR">Vendor Debits (Returns)</option>
          </select>

          {/* Actions: Selection, Export, Create */}
          <div className="debit-notes-toolbar-actions">
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
                  {isAllPageSelected ? "Deselect Page" : `Select Page (${paginatedDebitNotes.length})`}
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
                backgroundColor: "#4f46e5",
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
              <span>Create Debit Note</span>
            </button>
          </div>
        </div>

        {/* Status Chips */}
        <div className="debit-notes-status-chips-bar">
          {["All", "OPEN", "ADJUSTED", "PAID", "CANCELLED"].map(st => {
            const count = st === "All"
              ? debitNotes.length
              : debitNotes.filter(n => n.status === st).length;
            const isActive = filterStatus === st;
            return (
              <button
                key={st}
                type="button"
                className={`debit-notes-status-chip ${isActive ? "active" : ""}`}
                onClick={() => setFilterStatus(st)}
              >
                <span>{st === "All" ? "All Status" : st}</span>
                <span className="dn-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="debit-notes-desktop-table" ref={tableContainerRef}>
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
                  Debit Note #
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Type
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Party Name
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Date
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Reason
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Amount
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
              {paginatedDebitNotes.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                    <Receipt size={42} style={{ margin: "0 auto 10px auto", color: "#cbd5e1" }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No Debit Notes Found</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem" }}>
                      {search ? "No records match your search filter." : "Create your first debit note to get started."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedDebitNotes.map(n => {
                  const isSelected = selectedIds.has(n.id);
                  const isCustomer = n.type === "CUSTOMER";
                  const partyName = isCustomer
                    ? (n.customer?.businessName || n.customer?.contactPerson || "Customer")
                    : (n.vendor?.companyName || n.vendor?.contactPerson || "Vendor");

                  return (
                    <tr
                      key={n.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isSelected ? "rgba(79, 70, 229, 0.04)" : "transparent",
                        transition: "background-color 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(n.id)}
                        />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setViewNote(n)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#4f46e5",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.84rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {n.debitNoteNumber}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor: isCustomer ? "#eff6ff" : "#ecfdf5",
                            color: isCustomer ? "#1d4ed8" : "#047857",
                            border: `1px solid ${isCustomer ? "#bfdbfe" : "#a7f3d0"}`
                          }}
                        >
                          {isCustomer ? <ArrowUpRight size={12} /> : <ArrowDownLeft size={12} />}
                          {isCustomer ? "Customer" : "Vendor"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.84rem", fontWeight: 600, color: "#1e293b" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          {isCustomer ? <User size={13} style={{ color: "#64748b" }} /> : <Building2 size={13} style={{ color: "#64748b" }} />}
                          <span>{partyName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#64748b" }}>
                        {new Date(n.debitNoteDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#334155" }}>
                        {n.reason}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#0f172a" }}>
                          ₹{(n.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </div>
                        {(n.taxAmount || 0) > 0 && (
                          <div style={{ fontSize: "0.7rem", color: "#64748b" }}>
                            incl. ₹{(n.taxAmount || 0).toFixed(2)} GST
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
                              n.status === "OPEN" ? "#fef3c7" :
                              n.status === "ADJUSTED" ? "#e0f2fe" :
                              n.status === "PAID" ? "#dcfce7" : "#fee2e2",
                            color:
                              n.status === "OPEN" ? "#b45309" :
                              n.status === "ADJUSTED" ? "#0369a1" :
                              n.status === "PAID" ? "#15803d" : "#b91c1c"
                          }}
                        >
                          {n.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setViewNote(n)}
                            title="View / Print Voucher"
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
                            onClick={() => handleDeleteSingle(n.id, n.debitNoteNumber)}
                            title="Delete Debit Note"
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
      <div className="debit-notes-mobile-feed">
        {paginatedDebitNotes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", background: "#fff", borderRadius: "14px", color: "#94a3b8" }}>
            <Receipt size={36} style={{ margin: "0 auto 8px auto", color: "#cbd5e1" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No Debit Notes Found</p>
          </div>
        ) : (
          paginatedDebitNotes.map(n => {
            const isSelected = selectedIds.has(n.id);
            const isCustomer = n.type === "CUSTOMER";
            const partyName = isCustomer
              ? (n.customer?.businessName || n.customer?.contactPerson || "Customer")
              : (n.vendor?.companyName || n.vendor?.contactPerson || "Vendor");

            return (
              <div
                key={n.id}
                className="debit-note-mobile-card"
                style={{
                  backgroundColor: isSelected ? "rgba(79, 70, 229, 0.04)" : "#ffffff",
                  borderColor: isSelected ? "#4f46e5" : "#e2e8f0"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(n.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewNote(n)}
                      style={{ background: "none", border: "none", color: "#4f46e5", fontWeight: 700, fontSize: "0.9rem" }}
                    >
                      {n.debitNoteNumber}
                    </button>
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: n.status === "OPEN" ? "#fef3c7" : "#dcfce7",
                      color: n.status === "OPEN" ? "#b45309" : "#15803d"
                    }}
                  >
                    {n.status}
                  </span>
                </div>

                <div style={{ fontSize: "0.84rem", color: "#1e293b", fontWeight: 600 }}>
                  {partyName}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
                  <span>{new Date(n.debitNoteDate).toLocaleDateString()}</span>
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>
                    ₹{(n.totalAmount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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
          backgroundColor: "rgba(15, 23, 42, 0.6)",
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
            maxWidth: "760px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{
              padding: "18px 24px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  backgroundColor: "#eff6ff",
                  color: "#4f46e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    Create Debit Note
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Issue supplementary charges to customer or debit adjustments to vendor
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {error && (
                <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "8px" }}>
                  <AlertCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              {/* Type Toggle */}
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => { setDnType("CUSTOMER"); setReason("Price Revision (Undercharged)"); }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: `1.5px solid ${dnType === "CUSTOMER" ? "#4f46e5" : "#e2e8f0"}`,
                    backgroundColor: dnType === "CUSTOMER" ? "#eff6ff" : "#ffffff",
                    color: dnType === "CUSTOMER" ? "#4f46e5" : "#64748b",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <ArrowUpRight size={16} />
                  <span>Customer Debit (Charge Upward)</span>
                </button>
                <button
                  type="button"
                  onClick={() => { setDnType("VENDOR"); setReason("Goods Return (Purchase Return)"); }}
                  style={{
                    flex: 1,
                    padding: "10px",
                    borderRadius: "10px",
                    border: `1.5px solid ${dnType === "VENDOR" ? "#10b981" : "#e2e8f0"}`,
                    backgroundColor: dnType === "VENDOR" ? "#ecfdf5" : "#ffffff",
                    color: dnType === "VENDOR" ? "#047857" : "#64748b",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px"
                  }}
                >
                  <ArrowDownLeft size={16} />
                  <span>Vendor Debit (Purchase Return)</span>
                </button>
              </div>

              {/* Party & Date Row */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {dnType === "CUSTOMER" ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Customer *
                    </label>
                    <select
                      required
                      className="debit-notes-select"
                      style={{ width: "100%" }}
                      value={selectedCustomerId}
                      onChange={e => { setSelectedCustomerId(e.target.value); setSelectedInvoiceId(""); }}
                    >
                      <option value="">-- Select Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.businessName || c.contactPerson} ({c.city || "India"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Vendor *
                    </label>
                    <select
                      required
                      className="debit-notes-select"
                      style={{ width: "100%" }}
                      value={selectedVendorId}
                      onChange={e => { setSelectedVendorId(e.target.value); setSelectedBillId(""); }}
                    >
                      <option value="">-- Select Vendor --</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.companyName || v.contactPerson}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Debit Note Date *
                  </label>
                  <input
                    type="date"
                    required
                    className="debit-notes-search-input"
                    style={{ paddingLeft: "12px !important" }}
                    value={dnDate}
                    onChange={e => setDnDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Linked Doc & Reason */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {dnType === "CUSTOMER" ? (
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Original Invoice (Optional)
                    </label>
                    <select
                      className="debit-notes-select"
                      style={{ width: "100%" }}
                      value={selectedInvoiceId}
                      onChange={e => setSelectedInvoiceId(e.target.value)}
                    >
                      <option value="">-- Direct Debit Note / No Invoice --</option>
                      {customerInvoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} (₹{(inv.totalAmount || 0).toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                      Original Vendor Bill (Optional)
                    </label>
                    <select
                      className="debit-notes-select"
                      style={{ width: "100%" }}
                      value={selectedBillId}
                      onChange={e => setSelectedBillId(e.target.value)}
                    >
                      <option value="">-- Direct Debit Note / No Bill --</option>
                      {vendorBills.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.billNumber || `Bill #${b.id.slice(0, 6)}`} (₹{(b.totalAmount || 0).toLocaleString("en-IN")})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Reason *
                  </label>
                  <select
                    className="debit-notes-select"
                    style={{ width: "100%" }}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  >
                    {dnType === "CUSTOMER" ? (
                      <>
                        <option value="Price Revision (Undercharged)">Price Revision (Undercharged)</option>
                        <option value="Additional Freight / Transport">Additional Freight / Transport</option>
                        <option value="Unbilled Goods / Services">Unbilled Goods / Services</option>
                        <option value="Interest on Overdue Payment">Interest on Overdue Payment</option>
                        <option value="Other">Other Adjustment</option>
                      </>
                    ) : (
                      <>
                        <option value="Goods Return (Purchase Return)">Goods Return (Purchase Return)</option>
                        <option value="Quality Rejection">Quality Rejection</option>
                        <option value="Rate Difference (Overcharged)">Rate Difference (Overcharged)</option>
                        <option value="Post-Purchase Discount">Post-Purchase Discount</option>
                        <option value="Other">Other Adjustment</option>
                      </>
                    )}
                  </select>
                </div>
              </div>

              {/* Line Items Table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                    Line Items *
                  </label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    style={{ background: "none", border: "none", color: "#4f46e5", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Product / Item</th>
                        <th style={{ padding: "8px 10px", width: "70px" }}>Qty</th>
                        <th style={{ padding: "8px 10px", width: "100px" }}>Rate (₹)</th>
                        <th style={{ padding: "8px 10px", width: "80px" }}>GST %</th>
                        <th style={{ padding: "8px 10px", width: "100px", textAlign: "right" }}>Total (₹)</th>
                        <th style={{ width: "36px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => {
                        const itemTaxable = (Number(item.quantity) || 0) * (Number(item.rate) || 0);
                        const itemTotal = itemTaxable * (1 + (Number(item.gstRate) || 0) / 100);

                        return (
                          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                            <td style={{ padding: "6px 10px" }}>
                              <select
                                style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
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
                                placeholder="Description / Particulars"
                                style={{ width: "100%", marginTop: "4px", padding: "4px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.76rem" }}
                                value={item.description}
                                onChange={e => handleLineItemChange(idx, "description", e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="number"
                                min="1"
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                                value={item.quantity}
                                onChange={e => handleLineItemChange(idx, "quantity", e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                                value={item.rate}
                                onChange={e => handleLineItemChange(idx, "rate", e.target.value)}
                              />
                            </td>
                            <td style={{ padding: "6px 10px" }}>
                              <select
                                style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
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
                            <td style={{ padding: "6px 10px", textAlign: "right", fontWeight: 700 }}>
                              ₹{itemTotal.toFixed(2)}
                            </td>
                            <td style={{ padding: "6px 4px", textAlign: "center" }}>
                              {lineItems.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeLineItem(idx)}
                                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation Summary */}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "10px" }}>
                  <div style={{ width: "240px", fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>Subtotal:</span>
                      <span>₹{modalCalculations.subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                      <span>GST Amount:</span>
                      <span>₹{modalCalculations.tax.toFixed(2)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "0.95rem", color: "#0f172a", borderTop: "1px solid #e2e8f0", paddingTop: "4px" }}>
                      <span>Total Debit:</span>
                      <span>₹{modalCalculations.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: "#4f46e5", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}
                  disabled={loading}
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>Create Debit Note</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW VOUCHER MODAL */}
      {viewNote && (
        <div style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(15, 23, 42, 0.6)",
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
            maxWidth: "680px",
            maxHeight: "90vh",
            overflowY: "auto",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            padding: "24px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1.5px solid #e2e8f0", paddingBottom: "16px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#4f46e5", textTransform: "uppercase" }}>
                  {viewNote.type === "CUSTOMER" ? "Customer Supplementary Debit" : "Vendor Purchase Return Debit"}
                </span>
                <h2 style={{ margin: "2px 0 0 0", fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
                  Debit Note #{viewNote.debitNoteNumber}
                </h2>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
                  Date: {new Date(viewNote.debitNoteDate).toLocaleDateString()} | Status: {viewNote.status}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewNote(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "16px 0", fontSize: "0.84rem" }}>
              <div>
                <strong style={{ color: "#475569" }}>Party Details:</strong>
                <div style={{ marginTop: "4px", fontWeight: 600, color: "#1e293b" }}>
                  {viewNote.type === "CUSTOMER"
                    ? (viewNote.customer?.businessName || viewNote.customer?.contactPerson)
                    : (viewNote.vendor?.companyName || viewNote.vendor?.contactPerson)}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  GSTIN: {viewNote.type === "CUSTOMER" ? (viewNote.customer?.gstin || "Unregistered") : (viewNote.vendor?.gstNumber || "Unregistered")}
                </div>
              </div>
              <div>
                <strong style={{ color: "#475569" }}>Reason & Reference:</strong>
                <div style={{ marginTop: "4px", color: "#1e293b" }}>{viewNote.reason}</div>
                {viewNote.invoice && (
                  <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                    Original Inv: #{viewNote.invoice.invoiceNumber}
                  </div>
                )}
              </div>
            </div>

            {/* Items */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", margin: "16px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Description</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Qty</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Rate</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>GST</th>
                    <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewNote.items || []).map((it: any) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px" }}>{it.description}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>{it.quantity} {it.unit}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>₹{(it.rate || 0).toFixed(2)}</td>
                      <td style={{ padding: "8px 12px", textAlign: "right" }}>{it.gstRate}%</td>
                      <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>₹{(it.total || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", margin: "16px 0" }}>
              <div style={{ width: "240px", fontSize: "0.84rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>Subtotal:</span>
                  <span>₹{(viewNote.subtotal || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "#64748b" }}>
                  <span>GST Total:</span>
                  <span>₹{(viewNote.taxAmount || 0).toFixed(2)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "1rem", color: "#0f172a", borderTop: "1.5px solid #e2e8f0", paddingTop: "6px" }}>
                  <span>Total Debit:</span>
                  <span>₹{(viewNote.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewNote(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ backgroundColor: "#4f46e5", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={15} />
                <span>Print Voucher</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
