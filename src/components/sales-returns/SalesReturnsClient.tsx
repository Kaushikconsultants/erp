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
  X,
  FileSpreadsheet,
  Download,
  Loader2,
  Warehouse,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  FileMinus,
  Building2
} from "lucide-react";
import * as XLSX from "xlsx";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import { 
  createSalesReturn, 
  deleteSalesReturn, 
  deleteMultipleSalesReturns 
} from "@/app/actions/salesReturnActions";
import "./sales-returns.css";

interface SalesReturnsClientProps {
  initialSalesReturns: any[];
  customers: any[];
  invoices: any[];
  warehouses: any[];
  products: any[];
}

export default function SalesReturnsClient({
  initialSalesReturns,
  customers,
  invoices,
  warehouses,
  products
}: SalesReturnsClientProps) {
  const [salesReturns, setSalesReturns] = useState<any[]>(initialSalesReturns);
  const [search, setSearch] = useState("");
  const [filterCondition, setFilterCondition] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

  // Export Dropdown
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [viewingReturn, setViewingReturn] = useState<any | null>(null);

  // Create Form State
  const [formData, setFormData] = useState({
    customerId: "",
    invoiceId: "",
    warehouseId: warehouses[0]?.id || "",
    reason: "Defective Goods",
    condition: "RESTOCKABLE" as "RESTOCKABLE" | "DAMAGED" | "SCRAP",
    notes: "",
    inspectedBy: "",
    autoGenerateCreditNote: true,
    items: [
      {
        productId: products[0]?.id || "",
        quantity: 1,
        condition: "RESTOCKABLE" as "RESTOCKABLE" | "DAMAGED" | "SCRAP",
        reason: "",
        unitPrice: products[0]?.sellingPrice || 0
      }
    ]
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filtered Returns
  const filteredReturns = useMemo(() => {
    return salesReturns.filter((ret) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        ret.returnNumber.toLowerCase().includes(q) ||
        (ret.customer?.businessName && ret.customer.businessName.toLowerCase().includes(q)) ||
        (ret.invoice?.invoiceNumber && ret.invoice.invoiceNumber.toLowerCase().includes(q)) ||
        (ret.reason && ret.reason.toLowerCase().includes(q));

      const matchCondition = filterCondition === "All" || ret.condition === filterCondition;
      const matchStatus = filterStatus === "All" || ret.status === filterStatus;

      return matchSearch && matchCondition && matchStatus;
    });
  }, [salesReturns, search, filterCondition, filterStatus]);

  // Paginated Returns
  const paginatedReturns = useMemo(() => {
    return paginate(filteredReturns, currentPage, pageSize);
  }, [filteredReturns, currentPage, pageSize]);

  // Metrics
  const metrics = useMemo(() => {
    let totalReturns = salesReturns.length;
    let restockableUnits = 0;
    let damagedUnits = 0;
    let totalCreditGenerated = 0;

    salesReturns.forEach((r) => {
      if (r.creditNote?.totalAmount) {
        totalCreditGenerated += Number(r.creditNote.totalAmount);
      }
      r.items?.forEach((it: any) => {
        if (it.condition === "RESTOCKABLE") {
          restockableUnits += Number(it.quantity) || 0;
        } else {
          damagedUnits += Number(it.quantity) || 0;
        }
      });
    });

    return { totalReturns, restockableUnits, damagedUnits, totalCreditGenerated };
  }, [salesReturns]);

  // Selection handlers
  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedReturns.map((i: any) => i.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id: string) => selectedIds.has(id));

    const newSet = new Set(selectedIds);
    if (allSelected) {
      pageIds.forEach((id: string) => newSet.delete(id));
    } else {
      pageIds.forEach((id: string) => newSet.add(id));
    }
    setSelectedIds(newSet);
  };

  const handleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const isAllCurrentPageSelected =
    paginatedReturns.length > 0 &&
    paginatedReturns.every((i: any) => selectedIds.has(i.id));

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected sales return(s)?`)) return;

    setIsDeletingBulk(true);
    try {
      const res = await deleteMultipleSalesReturns(Array.from(selectedIds));
      if (res.success) {
        setSalesReturns((prev) => prev.filter((r) => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
      } else {
        alert(res.error || "Failed to delete sales returns");
      }
    } catch (err: any) {
      alert("Error deleting sales returns: " + err.message);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  // Single Delete
  const handleDeleteSingle = async (id: string, returnNumber: string) => {
    if (!confirm(`Are you sure you want to delete sales return #${returnNumber}?`)) return;

    try {
      const res = await deleteSalesReturn(id);
      if (res.success) {
        setSalesReturns((prev) => prev.filter((r) => r.id !== id));
        if (selectedIds.has(id)) {
          const newSet = new Set(selectedIds);
          newSet.delete(id);
          setSelectedIds(newSet);
        }
      } else {
        alert(res.error || "Failed to delete return");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  // Export
  const handleExport = (format: "xlsx" | "csv") => {
    setIsExportDropdownOpen(false);

    const exportRows = filteredReturns.map((r) => ({
      "RMA Number": r.returnNumber,
      "Date": new Date(r.returnDate).toLocaleDateString("en-IN"),
      "Customer": r.customer?.businessName || "Unknown",
      "Invoice Number": r.invoice?.invoiceNumber || "N/A",
      "Reason": r.reason,
      "Condition": r.condition,
      "Status": r.status,
      "Warehouse": r.warehouse?.name || "N/A",
      "Credit Note #": r.creditNote?.creditNoteNumber || "N/A",
      "Credit Amount": r.creditNote?.totalAmount ? `₹${r.creditNote.totalAmount.toLocaleString("en-IN")}` : "N/A",
      "Total Items": r.items?.length || 0,
      "Inspected By": r.inspectedBy || "N/A",
      "Notes": r.notes || ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sales Returns");

    if (format === "xlsx") {
      XLSX.writeFile(workbook, `sales_returns_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } else {
      XLSX.writeFile(workbook, `sales_returns_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
    }
  };

  // Item management in create form
  const handleAddItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          productId: products[0]?.id || "",
          quantity: 1,
          condition: prev.condition,
          reason: "",
          unitPrice: products[0]?.sellingPrice || 0
        }
      ]
    }));
  };

  const handleRemoveItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData((prev) => {
      const nextItems = [...prev.items];
      const item = { ...nextItems[index], [field]: value };

      if (field === "productId") {
        const prod = products.find((p) => p.id === value);
        if (prod) {
          item.unitPrice = prod.sellingPrice || 0;
        }
      }

      nextItems[index] = item;
      return { ...prev, items: nextItems };
    });
  };

  // When customer changes, clear invoice
  const handleCustomerChange = (customerId: string) => {
    setFormData((prev) => ({
      ...prev,
      customerId,
      invoiceId: ""
    }));
  };

  // When invoice changes, optionally pre-fill items
  const handleInvoiceChange = (invoiceId: string) => {
    setFormData((prev) => ({ ...prev, invoiceId }));
    const inv = invoices.find((i) => i.id === invoiceId);
    const orderItems = inv?.order?.items;
    if (orderItems && orderItems.length > 0) {
      setFormData((prev) => ({
        ...prev,
        invoiceId,
        items: orderItems.map((it: any) => ({
          productId: it.productId,
          quantity: it.quantity,
          condition: prev.condition,
          reason: "",
          unitPrice: it.rate || 0
        }))
      }));
    }
  };

  // Form Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId) {
      alert("Please select a customer");
      return;
    }
    if (formData.items.length === 0) {
      alert("Please add at least one line item");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createSalesReturn(formData);
      if (res.success && res.salesReturn) {
        setSalesReturns((prev) => [res.salesReturn, ...prev]);
        setIsCreateModalOpen(false);
        // Reset form
        setFormData({
          customerId: "",
          invoiceId: "",
          warehouseId: warehouses[0]?.id || "",
          reason: "Defective Goods",
          condition: "RESTOCKABLE",
          notes: "",
          inspectedBy: "",
          autoGenerateCreditNote: true,
          items: [
            {
              productId: products[0]?.id || "",
              quantity: 1,
              condition: "RESTOCKABLE",
              reason: "",
              unitPrice: products[0]?.sellingPrice || 0
            }
          ]
        });
      } else {
        alert(res.error || "Failed to create sales return");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Customer Invoices filtered by customer
  const customerInvoices = useMemo(() => {
    if (!formData.customerId) return [];
    return invoices.filter((inv) => inv.customerId === formData.customerId);
  }, [invoices, formData.customerId]);

  return (
    <div className="sales-returns-container">
      {/* ─── Top KPI Metric Cards ─── */}
      <div className="sales-returns-kpi-grid">
        <div className="sales-returns-kpi-card total">
          <div className="sales-returns-kpi-label">Total RMA Returns</div>
          <div className="sales-returns-kpi-value">{metrics.totalReturns}</div>
          <div className="sales-returns-kpi-sub">Processed return notes</div>
        </div>

        <div className="sales-returns-kpi-card restockable">
          <div className="sales-returns-kpi-label">Restocked Units</div>
          <div className="sales-returns-kpi-value" style={{ color: "#10b981" }}>
            {metrics.restockableUnits.toLocaleString("en-IN")}
          </div>
          <div className="sales-returns-kpi-sub">Added back to warehouse stock</div>
        </div>

        <div className="sales-returns-kpi-card damaged">
          <div className="sales-returns-kpi-label">Damaged / Scrap</div>
          <div className="sales-returns-kpi-value" style={{ color: "#ef4444" }}>
            {metrics.damagedUnits.toLocaleString("en-IN")}
          </div>
          <div className="sales-returns-kpi-sub">Quarantined / Written off</div>
        </div>

        <div className="sales-returns-kpi-card credit">
          <div className="sales-returns-kpi-label">Credit Notes Issued</div>
          <div className="sales-returns-kpi-value" style={{ color: "#4f46e5" }}>
            ₹{metrics.totalCreditGenerated.toLocaleString("en-IN")}
          </div>
          <div className="sales-returns-kpi-sub">Adjusted in customer ledger</div>
        </div>
      </div>

      {/* ─── Toolbar & Filters ─── */}
      <div className="sales-returns-toolbar">
        <div className="sales-returns-toolbar-top">
          {/* Search Box */}
          <div className="sales-returns-search-wrap">
            <Search className="sales-returns-search-icon" size={17} />
            <input
              type="text"
              placeholder="Search by RMA #, Customer, Invoice, Reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sales-returns-search-input"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="sales-returns-filter-group">
            <select
              value={filterCondition}
              onChange={(e) => setFilterCondition(e.target.value)}
              className="sales-returns-select"
            >
              <option value="All">All Conditions</option>
              <option value="RESTOCKABLE">Restockable</option>
              <option value="DAMAGED">Damaged</option>
              <option value="SCRAP">Scrap</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="sales-returns-select"
            >
              <option value="All">All Statuses</option>
              <option value="RECEIVED">Received</option>
              <option value="INSPECTED">Inspected</option>
              <option value="APPROVED">Approved</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>

          {/* Actions: Export, Create */}
          <div className="sales-returns-actions-group">
            {/* Export Dropdown */}
            <div className="export-dropdown-wrapper" ref={exportDropdownRef} style={{ position: "relative" }}>
              <button
                type="button"
                className="sales-returns-btn sales-returns-btn-secondary"
                onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              >
                <Download size={15} />
                <span>Export</span>
                <ChevronDown size={13} />
              </button>

              {isExportDropdownOpen && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    right: 0,
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    minWidth: "150px",
                    zIndex: 50,
                    padding: "4px"
                  }}
                >
                  <button
                    type="button"
                    onClick={() => handleExport("xlsx")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      background: "none",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <FileSpreadsheet size={15} style={{ color: "#10b981" }} />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("csv")}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      width: "100%",
                      padding: "8px 12px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#1e293b",
                      background: "none",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f1f5f9")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    <Download size={15} style={{ color: "#0284c7" }} />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Create Return Button */}
            <button
              type="button"
              className="sales-returns-btn sales-returns-btn-primary"
              onClick={() => setIsCreateModalOpen(true)}
            >
              <Plus size={16} />
              <span>New Return (RMA)</span>
            </button>
          </div>
        </div>

        {/* ─── Modern Theme-Matched Selection Button Group ─── */}
        {selectedIds.size > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              backgroundColor: "rgba(249, 115, 22, 0.08)",
              border: "1px solid rgba(249, 115, 22, 0.3)",
              borderRadius: "10px",
              width: "fit-content"
            }}
          >
            <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#c2410c" }}>
              {selectedIds.size} Selected
            </span>
            <button
              type="button"
              onClick={handleSelectAllCurrentPage}
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#475569",
                background: "#ffffff",
                border: "1px solid #cbd5e1",
                padding: "3px 9px",
                borderRadius: "6px",
                cursor: "pointer"
              }}
            >
              {isAllCurrentPageSelected ? "Deselect Page" : `Select Page (${paginatedReturns.length})`}
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              disabled={isDeletingBulk}
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: "#dc2626",
                background: "#fee2e2",
                border: "1px solid #fca5a5",
                padding: "3px 9px",
                borderRadius: "6px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
            >
              <Trash2 size={13} />
              <span>{isDeletingBulk ? "Deleting..." : `Delete (${selectedIds.size})`}</span>
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                background: "none",
                border: "none",
                color: "#64748b",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                padding: "2px"
              }}
              title="Clear selection"
            >
              <X size={15} />
            </button>
          </div>
        )}
      </div>

      {/* ─── Sales Returns Data Table ─── */}
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.02)"
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                <th style={{ width: "40px", padding: "12px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={handleSelectAllCurrentPage}
                    style={{ cursor: "pointer", width: "15px", height: "15px" }}
                  />
                </th>
                <th style={{ padding: "12px 14px" }}>RMA # & Date</th>
                <th style={{ padding: "12px 14px" }}>Customer</th>
                <th style={{ padding: "12px 14px" }}>Invoice / Order</th>
                <th style={{ padding: "12px 14px" }}>Reason & Condition</th>
                <th style={{ padding: "12px 14px" }}>Warehouse</th>
                <th style={{ padding: "12px 14px" }}>Credit Note</th>
                <th style={{ padding: "12px 14px" }}>Status</th>
                <th style={{ padding: "12px 14px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "48px 16px", textAlign: "center", color: "#94a3b8" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                      <RotateCcw size={36} strokeWidth={1.5} style={{ opacity: 0.5, color: "#f97316" }} />
                      <span style={{ fontSize: "0.95rem", fontWeight: 600, color: "#475569" }}>No sales returns found</span>
                      <span style={{ fontSize: "0.8rem", color: "#64748b" }}>Create an RMA to inspect and restock returned items</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedReturns.map((ret: any) => {
                  const isSelected = selectedIds.has(ret.id);
                  const isRestockable = ret.condition === "RESTOCKABLE";
                  const isDamaged = ret.condition === "DAMAGED";

                  return (
                    <tr
                      key={ret.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isSelected ? "rgba(249, 115, 22, 0.04)" : "transparent",
                        transition: "background-color 0.15s"
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(ret.id)}
                          style={{ cursor: "pointer", width: "15px", height: "15px" }}
                        />
                      </td>

                      {/* RMA # */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 700, color: "#ea580c" }}>{ret.returnNumber}</div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {new Date(ret.returnDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </div>
                      </td>

                      {/* Customer */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 600, color: "#1e293b" }}>
                          {ret.customer?.businessName || "Unknown Customer"}
                        </div>
                        {ret.customer?.mobile && (
                          <div style={{ fontSize: "0.74rem", color: "#64748b" }}>{ret.customer.mobile}</div>
                        )}
                      </td>

                      {/* Invoice */}
                      <td style={{ padding: "12px 14px" }}>
                        {ret.invoice ? (
                          <div>
                            <span style={{ fontWeight: 600, color: "#0284c7" }}>
                              {ret.invoice.invoiceNumber}
                            </span>
                            <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                              ₹{ret.invoice.totalAmount?.toLocaleString("en-IN")}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>

                      {/* Reason & Condition */}
                      <td style={{ padding: "12px 14px" }}>
                        <div style={{ fontWeight: 500, color: "#334155", marginBottom: "4px" }}>
                          {ret.reason}
                        </div>
                        <span
                          className={`rma-badge ${
                            isRestockable
                              ? "rma-condition-restockable"
                              : isDamaged
                              ? "rma-condition-damaged"
                              : "rma-condition-scrap"
                          }`}
                        >
                          {isRestockable ? (
                            <ShieldCheck size={11} />
                          ) : (
                            <ShieldAlert size={11} />
                          )}
                          <span>{ret.condition}</span>
                        </span>
                      </td>

                      {/* Warehouse */}
                      <td style={{ padding: "12px 14px" }}>
                        {ret.warehouse ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569" }}>
                            <Warehouse size={14} style={{ color: "#64748b" }} />
                            <span>{ret.warehouse.name}</span>
                          </div>
                        ) : (
                          <span style={{ color: "#94a3b8" }}>—</span>
                        )}
                      </td>

                      {/* Credit Note */}
                      <td style={{ padding: "12px 14px" }}>
                        {ret.creditNote ? (
                          <Link
                            href="/credit-notes"
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              backgroundColor: "#eef2ff",
                              color: "#4338ca",
                              border: "1px solid #c7d2fe",
                              padding: "2px 7px",
                              borderRadius: "6px",
                              fontSize: "0.74rem",
                              fontWeight: 700,
                              textDecoration: "none"
                            }}
                          >
                            <FileMinus size={12} />
                            <span>{ret.creditNote.creditNoteNumber}</span>
                          </Link>
                        ) : (
                          <span style={{ color: "#94a3b8", fontSize: "0.78rem" }}>No Credit Note</span>
                        )}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 14px" }}>
                        <span
                          className={`rma-badge ${
                            ret.status === "RECEIVED"
                              ? "rma-status-received"
                              : ret.status === "INSPECTED"
                              ? "rma-status-inspected"
                              : ret.status === "APPROVED"
                              ? "rma-status-approved"
                              : "rma-status-completed"
                          }`}
                        >
                          {ret.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setViewingReturn(ret)}
                            style={{
                              background: "none",
                              border: "1px solid #cbd5e1",
                              padding: "5px 9px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              color: "#334155",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "0.76rem",
                              fontWeight: 600
                            }}
                            title="View / Print RMA Slip"
                          >
                            <Printer size={13} />
                            <span>View</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteSingle(ret.id, ret.returnNumber)}
                            style={{
                              background: "none",
                              border: "1px solid #fecaca",
                              padding: "5px 7px",
                              borderRadius: "6px",
                              cursor: "pointer",
                              color: "#dc2626"
                            }}
                            title="Delete Return"
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

        {/* Pagination Footer */}
        {filteredReturns.length > 0 && (
          <TablePagination
            currentPage={currentPage}
            totalItems={filteredReturns.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        )}
      </div>

      {/* ─── Create Sales Return (RMA) Modal ─── */}
      {isCreateModalOpen && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px"
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "850px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>
                  Record Sales Return (RMA)
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                  Inspect goods, return restockable items to warehouse inventory, and auto-issue Credit Note.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#64748b",
                  cursor: "pointer",
                  padding: "4px"
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Row 1: Customer & Invoice */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Customer *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => handleCustomerChange(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  >
                    <option value="">Select Customer...</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.businessName} {c.city ? `(${c.city})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Link Tax Invoice (Optional)
                  </label>
                  <select
                    value={formData.invoiceId}
                    onChange={(e) => handleInvoiceChange(e.target.value)}
                    disabled={!formData.customerId}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: formData.customerId ? "#f8fafc" : "#f1f5f9"
                    }}
                  >
                    <option value="">No invoice linked (Standalone Return)</option>
                    {customerInvoices.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.invoiceNumber} — ₹{inv.totalAmount?.toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Warehouse, Reason & Condition */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Restock Warehouse
                  </label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Primary Reason
                  </label>
                  <select
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  >
                    <option value="Defective Goods">Defective Goods</option>
                    <option value="Damaged In Transit">Damaged In Transit</option>
                    <option value="Wrong Item Shipped">Wrong Item Shipped</option>
                    <option value="Customer Preference">Customer Preference</option>
                    <option value="Quality Rejection">Quality Rejection</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Overall Condition
                  </label>
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition: e.target.value as any,
                        items: formData.items.map((it) => ({ ...it, condition: e.target.value as any }))
                      })
                    }
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  >
                    <option value="RESTOCKABLE">RESTOCKABLE (Restock inventory)</option>
                    <option value="DAMAGED">DAMAGED (Quarantine)</option>
                    <option value="SCRAP">SCRAP (Write-off)</option>
                  </select>
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <label style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>
                    Returned Items & Quality Inspection
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "#ea580c",
                      background: "none",
                      border: "1px solid #ea580c",
                      padding: "4px 10px",
                      borderRadius: "6px",
                      cursor: "pointer"
                    }}
                  >
                    + Add Item
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Product</th>
                        <th style={{ padding: "8px 12px", width: "100px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "8px 12px", width: "120px", textAlign: "right" }}>Unit Price (₹)</th>
                        <th style={{ padding: "8px 12px", width: "140px", textAlign: "left" }}>Condition</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Defect / Reason</th>
                        <th style={{ padding: "8px 12px", width: "40px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.items.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px" }}>
                            <select
                              value={item.productId}
                              onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                              required
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                padding: "0 8px",
                                fontSize: "0.82rem"
                              }}
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} ({p.sku})
                                </option>
                              ))}
                            </select>
                          </td>

                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", Number(e.target.value))}
                              required
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                padding: "0 8px",
                                textAlign: "center",
                                fontSize: "0.82rem"
                              }}
                            />
                          </td>

                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="number"
                              min="0"
                              step="any"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                              required
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                padding: "0 8px",
                                textAlign: "right",
                                fontSize: "0.82rem"
                              }}
                            />
                          </td>

                          <td style={{ padding: "8px 12px" }}>
                            <select
                              value={item.condition}
                              onChange={(e) => handleItemChange(idx, "condition", e.target.value)}
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                padding: "0 8px",
                                fontSize: "0.8rem"
                              }}
                            >
                              <option value="RESTOCKABLE">RESTOCKABLE</option>
                              <option value="DAMAGED">DAMAGED</option>
                              <option value="SCRAP">SCRAP</option>
                            </select>
                          </td>

                          <td style={{ padding: "8px 12px" }}>
                            <input
                              type="text"
                              placeholder="e.g. Broken zipper, torn seam..."
                              value={item.reason || ""}
                              onChange={(e) => handleItemChange(idx, "reason", e.target.value)}
                              style={{
                                width: "100%",
                                height: "34px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                padding: "0 8px",
                                fontSize: "0.8rem"
                              }}
                            />
                          </td>

                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "#dc2626",
                                  cursor: "pointer"
                                }}
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Checkbox: Auto Generate Credit Note */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  backgroundColor: "rgba(79, 70, 229, 0.05)",
                  border: "1px solid rgba(79, 70, 229, 0.2)",
                  borderRadius: "10px"
                }}
              >
                <input
                  type="checkbox"
                  id="autoGenerateCreditNote"
                  checked={formData.autoGenerateCreditNote}
                  onChange={(e) => setFormData({ ...formData, autoGenerateCreditNote: e.target.checked })}
                  style={{ width: "18px", height: "18px", cursor: "pointer" }}
                />
                <label htmlFor="autoGenerateCreditNote" style={{ fontSize: "0.85rem", fontWeight: 600, color: "#3730a3", cursor: "pointer" }}>
                  Auto-generate Credit Note for customer balance adjustment and accounting ledger sync
                </label>
              </div>

              {/* Notes & Inspector */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Inspected By
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar (QC Lead)"
                    value={formData.inspectedBy}
                    onChange={(e) => setFormData({ ...formData, inspectedBy: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#334155", marginBottom: "6px" }}>
                    Internal Notes / Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Batch inspected, repackaged for warehouse"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    style={{
                      width: "100%",
                      height: "40px",
                      borderRadius: "8px",
                      border: "1.5px solid #cbd5e1",
                      padding: "0 10px",
                      fontSize: "0.85rem",
                      backgroundColor: "#f8fafc"
                    }}
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "1.5px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#475569",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  {isSubmitting && <Loader2 size={16} className="spin" />}
                  <span>{isSubmitting ? "Creating..." : "Confirm & Record RMA"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Viewing / Print RMA Voucher Slip Modal ─── */}
      {viewingReturn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: "16px"
          }}
        >
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              maxWidth: "750px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column"
            }}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <RotateCcw size={18} style={{ color: "#ea580c" }} />
                <span style={{ fontWeight: 700, fontSize: "1.05rem", color: "#0f172a" }}>
                  Sales Return Slip #{viewingReturn.returnNumber}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#f8fafc",
                    color: "#334155",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px"
                  }}
                >
                  <Printer size={14} />
                  <span>Print Slip</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReturn(null)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                    padding: "4px"
                  }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Header Box */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                  padding: "16px",
                  backgroundColor: "#f8fafc",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0"
                }}
              >
                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Customer Details
                  </div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    {viewingReturn.customer?.businessName}
                  </div>
                  {viewingReturn.customer?.contactPerson && (
                    <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                      Attn: {viewingReturn.customer.contactPerson}
                    </div>
                  )}
                  {viewingReturn.customer?.mobile && (
                    <div style={{ fontSize: "0.8rem", color: "#475569" }}>
                      Tel: {viewingReturn.customer.mobile}
                    </div>
                  )}
                  {viewingReturn.customer?.gstNumber && (
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "2px" }}>
                      GSTIN: {viewingReturn.customer.gstNumber.toUpperCase()}
                    </div>
                  )}
                </div>

                <div>
                  <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                    Return Information
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#334155", marginTop: "4px" }}>
                    <strong>Date:</strong> {new Date(viewingReturn.returnDate).toLocaleDateString("en-IN")}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                    <strong>Invoice #:</strong> {viewingReturn.invoice?.invoiceNumber || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                    <strong>Warehouse:</strong> {viewingReturn.warehouse?.name || "N/A"}
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "#334155" }}>
                    <strong>Inspected By:</strong> {viewingReturn.inspectedBy || "QC Inspector"}
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 style={{ margin: "0 0 10px", fontSize: "0.9rem", fontWeight: 700, color: "#0f172a" }}>
                  Inspected Line Items
                </h4>
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                    <thead>
                      <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Product</th>
                        <th style={{ padding: "8px 12px", textAlign: "center" }}>Qty</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Unit Price</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Condition</th>
                        <th style={{ padding: "8px 12px", textAlign: "left" }}>Reason</th>
                        <th style={{ padding: "8px 12px", textAlign: "right" }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {viewingReturn.items?.map((it: any) => (
                        <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 12px", fontWeight: 600, color: "#1e293b" }}>
                            {it.product?.name || "Product"}
                            {it.product?.sku && (
                              <span style={{ fontSize: "0.72rem", color: "#64748b", marginLeft: "6px" }}>
                                ({it.product.sku})
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700 }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right" }}>
                            ₹{it.unitPrice?.toLocaleString("en-IN")}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              className={`rma-badge ${
                                it.condition === "RESTOCKABLE"
                                  ? "rma-condition-restockable"
                                  : it.condition === "DAMAGED"
                                  ? "rma-condition-damaged"
                                  : "rma-condition-scrap"
                              }`}
                            >
                              {it.condition}
                            </span>
                          </td>
                          <td style={{ padding: "8px 12px", color: "#475569" }}>
                            {it.reason || "—"}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "right", fontWeight: 700 }}>
                            ₹{(Number(it.quantity) * Number(it.unitPrice)).toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Linked Credit Note Box */}
              {viewingReturn.creditNote && (
                <div
                  style={{
                    padding: "12px 16px",
                    backgroundColor: "#eef2ff",
                    border: "1px solid #c7d2fe",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                  }}
                >
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#3730a3", textTransform: "uppercase" }}>
                      Linked Credit Note
                    </div>
                    <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e1b4b", marginTop: "2px" }}>
                      {viewingReturn.creditNote.creditNoteNumber} — ₹{viewingReturn.creditNote.totalAmount?.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <Link
                    href="/credit-notes"
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "#4f46e5",
                      textDecoration: "none",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px"
                    }}
                  >
                    <span>View Credit Note</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>
              )}

              {/* Notes */}
              {viewingReturn.notes && (
                <div style={{ fontSize: "0.82rem", color: "#475569", fontStyle: "italic" }}>
                  <strong>Notes:</strong> {viewingReturn.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
