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
  Building2,
  ClipboardCheck,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import * as XLSX from "xlsx";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import { 
  createGoodsReceiptNote, 
  deleteGoodsReceiptNote, 
  deleteMultipleGoodsReceiptNotes 
} from "@/app/actions/grnActions";
import "./grn.css";

interface GoodsReceiptNotesClientProps {
  initialGrns: any[];
  vendors: any[];
  purchaseOrders: any[];
  warehouses: any[];
  products: any[];
}

export default function GoodsReceiptNotesClient({
  initialGrns,
  vendors,
  purchaseOrders,
  warehouses,
  products
}: GoodsReceiptNotesClientProps) {
  const [grns, setGrns] = useState<any[]>(initialGrns);
  const [search, setSearch] = useState("");
  const [filterQcStatus, setFilterQcStatus] = useState("All");
  const [filterWarehouse, setFilterWarehouse] = useState("All");

  // Selection & Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);

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

  const [selectedPoId, setSelectedPoId] = useState("");
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || "");
  const [challanNumber, setChallanNumber] = useState("");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [inspectedBy, setInspectedBy] = useState("");
  const [remarks, setRemarks] = useState("");

  // Line Items
  const [lineItems, setLineItems] = useState<Array<{
    productId: string;
    description: string;
    orderedQty: number;
    receivedQty: number;
    acceptedQty: number;
    rejectedQty: number;
    rejectionReason: string;
    unitCost: number;
  }>>([
    { productId: "", description: "", orderedQty: 1, receivedQty: 1, acceptedQty: 1, rejectedQty: 0, rejectionReason: "", unitCost: 0 }
  ]);

  // View Modal
  const [viewGrn, setViewGrn] = useState<any | null>(null);

  // Auto-populate when PO is selected
  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId);
    if (!poId) return;

    const po = purchaseOrders.find(p => p.id === poId);
    if (po) {
      setSelectedVendorId(po.vendorId);
      if (po.items && po.items.length > 0) {
        setLineItems(po.items.map((it: any) => ({
          productId: it.productId,
          description: it.product?.name || "PO Item",
          orderedQty: it.quantity || 1,
          receivedQty: it.quantity || 1,
          acceptedQty: it.quantity || 1,
          rejectedQty: 0,
          rejectionReason: "",
          unitCost: it.unitPrice || 0
        })));
      }
    }
  };

  // Filtered List
  const filtered = useMemo(() => {
    return grns.filter(g => {
      const matchQc = filterQcStatus === "All" || g.qcStatus === filterQcStatus;
      const matchWh = filterWarehouse === "All" || g.warehouseId === filterWarehouse;
      const q = search.toLowerCase();
      const matchSearch = !search ||
        g.grnNumber.toLowerCase().includes(q) ||
        (g.challanNumber || "").toLowerCase().includes(q) ||
        (g.vendor?.companyName || "").toLowerCase().includes(q) ||
        (g.purchaseOrder?.poNumber || "").toLowerCase().includes(q) ||
        (g.warehouse?.name || "").toLowerCase().includes(q);

      return matchQc && matchWh && matchSearch;
    });
  }, [grns, search, filterQcStatus, filterWarehouse]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterQcStatus, filterWarehouse, pageSize]);

  const paginatedGrns = useMemo(() => {
    return paginate(filtered, currentPage, pageSize);
  }, [filtered, currentPage, pageSize]);

  // KPIs
  const totalGrns = grns.length;
  let totalAccepted = 0;
  let totalRejected = 0;
  grns.forEach(g => {
    (g.items || []).forEach((it: any) => {
      totalAccepted += it.acceptedQty || 0;
      totalRejected += it.rejectedQty || 0;
    });
  });
  const passedCount = grns.filter(g => g.qcStatus === "PASSED").length;
  const qcPassRate = totalGrns > 0 ? ((passedCount / totalGrns) * 100).toFixed(1) : "100";

  // Selection Handlers
  const handleSelectAllOnPage = () => {
    const pageIds = paginatedGrns.map(g => g.id);
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
    if (!window.confirm(`Are you sure you want to permanently delete ${selectedIds.size} selected GRN(s)? This will reverse stock from warehouses.`)) {
      return;
    }

    setIsDeletingBulk(true);
    try {
      const res = await deleteMultipleGoodsReceiptNotes(Array.from(selectedIds));
      if (res.success) {
        setGrns(prev => prev.filter(g => !selectedIds.has(g.id)));
        setSelectedIds(new Set());
      } else {
        alert(res.error || "Failed to delete selected GRNs");
      }
    } catch (err: any) {
      alert(err?.message || "An unexpected error occurred");
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleDeleteSingle = async (id: string, num: string) => {
    if (!window.confirm(`Are you sure you want to delete GRN #${num}? This will reverse inward stock.`)) return;
    try {
      const res = await deleteGoodsReceiptNote(id);
      if (res.success) {
        setGrns(prev => prev.filter(g => g.id !== id));
        setSelectedIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        alert(res.error || "Failed to delete GRN");
      }
    } catch (err: any) {
      alert(err?.message || "Failed to delete GRN");
    }
  };

  // Export
  const prepareExportData = () => {
    const itemsToExport = selectedIds.size > 0
      ? grns.filter(g => selectedIds.has(g.id))
      : filtered;

    return itemsToExport.map(g => ({
      "GRN #": g.grnNumber,
      "Vendor": g.vendor?.companyName || "Unknown",
      "PO #": g.purchaseOrder?.poNumber || "-",
      "Warehouse": g.warehouse?.name || "-",
      "Challan #": g.challanNumber || "-",
      "Received Date": new Date(g.receivedDate).toLocaleDateString(),
      "QC Status": g.qcStatus,
      "Inspected By": g.inspectedBy || "-"
    }));
  };

  const handleExportExcel = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "GRN_Records");
    XLSX.writeFile(wb, `GRN_Records_${new Date().toISOString().slice(0, 10)}.xlsx`);
    setIsExportDropdownOpen(false);
  };

  const handleExportCSV = () => {
    const data = prepareExportData();
    const ws = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `GRN_Records_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setIsExportDropdownOpen(false);
  };

  // Line Item Handlers
  const handleLineItemChange = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    (updated[index] as any)[field] = value;

    // Auto-calculate rejected if received and accepted changed
    if (field === "receivedQty" || field === "acceptedQty") {
      const rec = Number(updated[index].receivedQty) || 0;
      const acc = Number(updated[index].acceptedQty) || 0;
      updated[index].rejectedQty = Math.max(0, rec - acc);
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { productId: "", description: "", orderedQty: 1, receivedQty: 1, acceptedQty: 1, rejectedQty: 0, rejectionReason: "", unitCost: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await createGoodsReceiptNote({
        purchaseOrderId: selectedPoId || undefined,
        vendorId: selectedVendorId,
        warehouseId: selectedWarehouseId,
        challanNumber,
        challanDate,
        inspectedBy,
        remarks,
        items: lineItems.map(it => ({
          productId: it.productId,
          orderedQty: Number(it.orderedQty) || 0,
          receivedQty: Number(it.receivedQty) || 0,
          acceptedQty: Number(it.acceptedQty) || 0,
          rejectedQty: Number(it.rejectedQty) || 0,
          rejectionReason: it.rejectionReason || undefined,
          unitCost: Number(it.unitCost) || 0
        }))
      });

      if (res.success && res.grn) {
        setGrns([res.grn, ...grns]);
        setShowModal(false);
        setSelectedPoId("");
        setSelectedVendorId("");
        setChallanNumber("");
        setRemarks("");
        setLineItems([{ productId: "", description: "", orderedQty: 1, receivedQty: 1, acceptedQty: 1, rejectedQty: 0, rejectionReason: "", unitCost: 0 }]);
      } else {
        setError(res.error || "Failed to create Goods Receipt Note");
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const isAllPageSelected = paginatedGrns.length > 0 && paginatedGrns.every(g => selectedIds.has(g.id));

  return (
    <div className="grn-container">
      {/* KPI Grid */}
      <div className="grn-kpi-grid">
        <div className="grn-kpi-card total">
          <span className="grn-kpi-label">Total GRNs Recorded</span>
          <span className="grn-kpi-value" style={{ color: "#059669" }}>
            {totalGrns}
          </span>
          <span className="grn-kpi-sub">Across all warehouses</span>
        </div>
        <div className="grn-kpi-card accepted">
          <span className="grn-kpi-label">Total Accepted Quantity</span>
          <span className="grn-kpi-value" style={{ color: "#10b981" }}>
            {totalAccepted.toLocaleString("en-IN")} pcs
          </span>
          <span className="grn-kpi-sub">Added to warehouse inventory</span>
        </div>
        <div className="grn-kpi-card rejected">
          <span className="grn-kpi-label">Rejected / Defective Qty</span>
          <span className="grn-kpi-value" style={{ color: "#ef4444" }}>
            {totalRejected.toLocaleString("en-IN")} pcs
          </span>
          <span className="grn-kpi-sub">Quality rejections & shortages</span>
        </div>
        <div className="grn-kpi-card qc-rate">
          <span className="grn-kpi-label">QC Pass Rate</span>
          <span className="grn-kpi-value" style={{ color: "#3b82f6" }}>
            {qcPassRate}%
          </span>
          <span className="grn-kpi-sub">Inward quality acceptance</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="grn-toolbar">
        <div className="grn-toolbar-top">
          <div className="grn-search-wrap">
            <Search className="grn-search-icon" size={16} />
            <input
              type="text"
              className="grn-search-input"
              placeholder="Search by GRN #, Challan #, Vendor, or PO #..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select
            className="grn-select"
            value={filterWarehouse}
            onChange={e => setFilterWarehouse(e.target.value)}
          >
            <option value="All">All Warehouses</option>
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>

          <div className="grn-toolbar-actions">
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
                  {isAllPageSelected ? "Deselect Page" : `Select Page (${paginatedGrns.length})`}
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
                backgroundColor: "#059669",
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
              <span>Create GRN (Inward)</span>
            </button>
          </div>
        </div>

        {/* QC Status Chips */}
        <div className="grn-status-chips-bar">
          {["All", "PASSED", "PARTIALLY_PASSED", "REJECTED"].map(st => {
            const count = st === "All"
              ? grns.length
              : grns.filter(g => g.qcStatus === st).length;
            const isActive = filterQcStatus === st;
            return (
              <button
                key={st}
                type="button"
                className={`grn-status-chip ${isActive ? "active" : ""}`}
                onClick={() => setFilterQcStatus(st)}
              >
                <span>{st === "All" ? "All QC Status" : st.replace("_", " ")}</span>
                <span className="grn-chip-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="grn-desktop-table" ref={tableContainerRef}>
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
                  GRN #
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Vendor
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  PO # / Challan #
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Warehouse
                </th>
                <th style={{ padding: "12px 14px", textAlign: "left", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Date
                </th>
                <th style={{ padding: "12px 14px", textAlign: "center", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  QC Status
                </th>
                <th style={{ padding: "12px 14px", textAlign: "right", fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedGrns.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "48px 16px", color: "#94a3b8" }}>
                    <ClipboardCheck size={42} style={{ margin: "0 auto 10px auto", color: "#cbd5e1" }} />
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "0.95rem" }}>No Goods Receipt Notes Found</p>
                    <p style={{ margin: "4px 0 0 0", fontSize: "0.82rem" }}>
                      {search ? "No records match your search filter." : "Create your first GRN to receive vendor goods into warehouse stock."}
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedGrns.map(g => {
                  const isSelected = selectedIds.has(g.id);

                  return (
                    <tr
                      key={g.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: isSelected ? "rgba(5, 150, 105, 0.04)" : "transparent",
                        transition: "background-color 0.15s ease"
                      }}
                    >
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <input
                          type="checkbox"
                          className="table-checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(g.id)}
                        />
                      </td>
                      <td style={{ padding: "12px 14px" }}>
                        <button
                          type="button"
                          onClick={() => setViewGrn(g)}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#059669",
                            fontWeight: 700,
                            cursor: "pointer",
                            fontSize: "0.84rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px"
                          }}
                        >
                          {g.grnNumber}
                          <ExternalLink size={12} />
                        </button>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.84rem", fontWeight: 600, color: "#1e293b" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <Building2 size={13} style={{ color: "#64748b" }} />
                          <span>{g.vendor?.companyName || "Vendor"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#334155" }}>
                        {g.purchaseOrder ? (
                          <span style={{ fontWeight: 600 }}>PO #{g.purchaseOrder.poNumber}</span>
                        ) : (
                          <span style={{ color: "#64748b" }}>Direct Receipt</span>
                        )}
                        {g.challanNumber && (
                          <div style={{ fontSize: "0.72rem", color: "#64748b" }}>
                            Challan: {g.challanNumber}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#475569" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <Warehouse size={13} style={{ color: "#6d28d9" }} />
                          <span>{g.warehouse?.name || "Warehouse"}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 14px", fontSize: "0.82rem", color: "#64748b" }}>
                        {new Date(g.receivedDate).toLocaleDateString()}
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "center" }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "3px 8px",
                            borderRadius: "12px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            backgroundColor:
                              g.qcStatus === "PASSED" ? "#dcfce7" :
                              g.qcStatus === "PARTIALLY_PASSED" ? "#fef3c7" : "#fee2e2",
                            color:
                              g.qcStatus === "PASSED" ? "#15803d" :
                              g.qcStatus === "PARTIALLY_PASSED" ? "#b45309" : "#b91c1c"
                          }}
                        >
                          {g.qcStatus === "PASSED" ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                          <span>{g.qcStatus.replace("_", " ")}</span>
                        </span>
                      </td>
                      <td style={{ padding: "12px 14px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={() => setViewGrn(g)}
                            title="View / Print Inspection Report"
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
                            onClick={() => handleDeleteSingle(g.id, g.grnNumber)}
                            title="Delete GRN"
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
      <div className="grn-mobile-feed">
        {paginatedGrns.length === 0 ? (
          <div style={{ textAlign: "center", padding: "36px 16px", background: "#fff", borderRadius: "14px", color: "#94a3b8" }}>
            <ClipboardCheck size={36} style={{ margin: "0 auto 8px auto", color: "#cbd5e1" }} />
            <p style={{ margin: 0, fontWeight: 600 }}>No GRNs Found</p>
          </div>
        ) : (
          paginatedGrns.map(g => {
            const isSelected = selectedIds.has(g.id);

            return (
              <div
                key={g.id}
                className="grn-mobile-card"
                style={{
                  backgroundColor: isSelected ? "rgba(5, 150, 105, 0.04)" : "#ffffff",
                  borderColor: isSelected ? "#059669" : "#e2e8f0"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="checkbox"
                      className="table-checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(g.id)}
                    />
                    <button
                      type="button"
                      onClick={() => setViewGrn(g)}
                      style={{ background: "none", border: "none", color: "#059669", fontWeight: 700, fontSize: "0.9rem" }}
                    >
                      {g.grnNumber}
                    </button>
                  </div>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      backgroundColor: g.qcStatus === "PASSED" ? "#dcfce7" : "#fee2e2",
                      color: g.qcStatus === "PASSED" ? "#15803d" : "#b91c1c"
                    }}
                  >
                    {g.qcStatus}
                  </span>
                </div>

                <div style={{ fontSize: "0.84rem", color: "#1e293b", fontWeight: 600 }}>
                  {g.vendor?.companyName || "Vendor"}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "#64748b" }}>
                  <span>{g.warehouse?.name}</span>
                  <span>{new Date(g.receivedDate).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE GRN MODAL */}
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
                  backgroundColor: "#ecfdf5",
                  color: "#059669",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <ClipboardCheck size={18} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                    Create Goods Receipt Note (Inward with QC)
                  </h3>
                  <p style={{ margin: "2px 0 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Inspect received vendor goods, record accepted/rejected quantities, and update warehouse stock
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

              {/* PO and Vendor */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Select Purchase Order (Optional)
                  </label>
                  <select
                    className="grn-select"
                    style={{ width: "100%" }}
                    value={selectedPoId}
                    onChange={e => handlePoSelect(e.target.value)}
                  >
                    <option value="">-- Direct Receipt / No PO --</option>
                    {purchaseOrders.map(po => (
                      <option key={po.id} value={po.id}>
                        {po.poNumber} ({po.vendor?.companyName}) - ₹{(po.totalValue || 0).toLocaleString("en-IN")}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Vendor *
                  </label>
                  <select
                    required
                    className="grn-select"
                    style={{ width: "100%" }}
                    value={selectedVendorId}
                    onChange={e => setSelectedVendorId(e.target.value)}
                  >
                    <option value="">-- Select Vendor --</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.companyName || v.contactPerson}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Warehouse and Dates */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Receiving Warehouse *
                  </label>
                  <select
                    required
                    className="grn-select"
                    style={{ width: "100%" }}
                    value={selectedWarehouseId}
                    onChange={e => setSelectedWarehouseId(e.target.value)}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Vendor Challan #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DC-9842"
                    className="grn-search-input"
                    style={{ paddingLeft: "12px !important" }}
                    value={challanNumber}
                    onChange={e => setChallanNumber(e.target.value)}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                    Challan Date
                  </label>
                  <input
                    type="date"
                    className="grn-search-input"
                    style={{ paddingLeft: "12px !important" }}
                    value={challanDate}
                    onChange={e => setChallanDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Inspection Items Table */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569" }}>
                    Inspection Items (QC Breakdown) *
                  </label>
                  <button
                    type="button"
                    onClick={addLineItem}
                    style={{ background: "none", border: "none", color: "#059669", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
                    <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                      <tr>
                        <th style={{ padding: "8px 10px", textAlign: "left" }}>Product</th>
                        <th style={{ padding: "8px 10px", width: "70px" }}>Ordered</th>
                        <th style={{ padding: "8px 10px", width: "75px" }}>Received</th>
                        <th style={{ padding: "8px 10px", width: "75px" }}>Accepted</th>
                        <th style={{ padding: "8px 10px", width: "75px" }}>Rejected</th>
                        <th style={{ padding: "8px 10px", width: "120px" }}>Rejection Reason</th>
                        <th style={{ width: "32px" }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "6px 10px" }}>
                            <select
                              required
                              style={{ width: "100%", padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                              value={item.productId}
                              onChange={e => handleLineItemChange(idx, "productId", e.target.value)}
                            >
                              <option value="">-- Select Product --</option>
                              {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} ({p.sku || "No SKU"})</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                              value={item.orderedQty}
                              onChange={e => handleLineItemChange(idx, "orderedQty", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.78rem" }}
                              value={item.receivedQty}
                              onChange={e => handleLineItemChange(idx, "receivedQty", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #10b981", fontSize: "0.78rem", fontWeight: 700 }}
                              value={item.acceptedQty}
                              onChange={e => handleLineItemChange(idx, "acceptedQty", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <input
                              type="number"
                              min="0"
                              style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #ef4444", fontSize: "0.78rem", color: "#b91c1c" }}
                              value={item.rejectedQty}
                              onChange={e => handleLineItemChange(idx, "rejectedQty", e.target.value)}
                            />
                          </td>
                          <td style={{ padding: "6px 10px" }}>
                            <input
                              type="text"
                              placeholder="Defect / Damage"
                              style={{ width: "100%", padding: "4px 6px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.76rem" }}
                              value={item.rejectionReason}
                              onChange={e => handleLineItemChange(idx, "rejectionReason", e.target.value)}
                            />
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
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                  QC Inspector Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Visual inspection passed, 2 pieces rejected due to fabric staining."
                  className="grn-search-input"
                  style={{ paddingLeft: "12px !important" }}
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                />
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
                  style={{ backgroundColor: "#059669", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}
                  disabled={loading}
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  <span>Save GRN & Inward Stock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW GRN REPORT MODAL */}
      {viewGrn && (
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
                <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#059669", textTransform: "uppercase" }}>
                  GOODS RECEIPT NOTE (INWARD QC REPORT)
                </span>
                <h2 style={{ margin: "2px 0 0 0", fontSize: "1.3rem", fontWeight: 800, color: "#0f172a" }}>
                  #{viewGrn.grnNumber}
                </h2>
                <div style={{ fontSize: "0.82rem", color: "#64748b", marginTop: "4px" }}>
                  Received: {new Date(viewGrn.receivedDate).toLocaleDateString()} | Warehouse: {viewGrn.warehouse?.name}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewGrn(null)}
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
              >
                <X size={22} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", margin: "16px 0", fontSize: "0.84rem" }}>
              <div>
                <strong style={{ color: "#475569" }}>Vendor Details:</strong>
                <div style={{ marginTop: "4px", fontWeight: 600, color: "#1e293b" }}>
                  {viewGrn.vendor?.companyName || "Vendor"}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  Challan: {viewGrn.challanNumber || "-"}
                </div>
              </div>
              <div>
                <strong style={{ color: "#475569" }}>QC Status & Inspector:</strong>
                <div style={{ marginTop: "4px", fontWeight: 700, color: viewGrn.qcStatus === "PASSED" ? "#15803d" : "#b91c1c" }}>
                  {viewGrn.qcStatus}
                </div>
                <div style={{ color: "#64748b", fontSize: "0.78rem" }}>
                  Inspected By: {viewGrn.inspectedBy || "Quality Team"}
                </div>
              </div>
            </div>

            {/* Items */}
            <div style={{ border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", margin: "16px 0" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left" }}>Product</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Ordered</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Received</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Accepted</th>
                    <th style={{ padding: "8px 12px", textAlign: "center" }}>Rejected</th>
                  </tr>
                </thead>
                <tbody>
                  {(viewGrn.items || []).map((it: any) => (
                    <tr key={it.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{it.product?.name || "Item"}</div>
                        {it.rejectionReason && (
                          <div style={{ fontSize: "0.72rem", color: "#dc2626" }}>
                            Rejection: {it.rejectionReason}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>{it.orderedQty}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center" }}>{it.receivedQty}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: "#15803d" }}>{it.acceptedQty}</td>
                      <td style={{ padding: "8px 12px", textAlign: "center", fontWeight: 700, color: it.rejectedQty > 0 ? "#dc2626" : "#64748b" }}>{it.rejectedQty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {viewGrn.remarks && (
              <div style={{ padding: "10px 14px", borderRadius: "8px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#475569" }}>
                <strong>Remarks:</strong> {viewGrn.remarks}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setViewGrn(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ backgroundColor: "#059669", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={15} />
                <span>Print Inspection Report</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
