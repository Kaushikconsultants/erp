"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import {
  Building2,
  Phone,
  Mail,
  Package,
  IndianRupee,
  Search,
  X,
  SlidersHorizontal,
  Edit2,
  Trash2,
  MessageCircle,
  Plus,
  ArrowUpDown,
  LayoutGrid,
  List,
  MapPin,
  FileText,
  AlertCircle,
  Loader2,
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Download,
  FileSpreadsheet,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import AddVendorButton from "@/components/vendors/AddVendorButton";
import EditVendorModal, { VendorData } from "@/components/vendors/EditVendorModal";
import { deleteVendor, deleteMultipleVendors } from "@/app/actions/vendorActions";
import { useRouter } from "next/navigation";
import { openPhoneDialer } from "@/lib/dialer";

export interface VendorItem {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  email?: string | null;
  mobile?: string | null;
  gstNumber?: string | null;
  pan?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  paymentTerms?: string | null;
  status: string;
  createdAt: string | Date;
  purchaseOrders: {
    id: string;
    totalValue: number;
    status: string;
  }[];
}

interface VendorManagementClientProps {
  initialVendors: VendorItem[];
}

export default function VendorManagementClient({ initialVendors }: VendorManagementClientProps) {
  const router = useRouter();

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modal / Action State
  const [editingVendor, setEditingVendor] = useState<VendorData | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Multi-select & Export State
  const [selectedVendorIds, setSelectedVendorIds] = useState<Set<string>>(new Set());
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const exportMenuRef = React.useRef<HTMLDivElement>(null);
  const headerCheckboxRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setIsExportMenuOpen(false);
      }
    };
    if (isExportMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isExportMenuOpen]);

  // Derive unique states from vendor list for filter dropdown
  const uniqueStates = useMemo(() => {
    const states = new Set<string>();
    initialVendors.forEach((v) => {
      if (v.state && v.state.trim()) states.add(v.state.trim());
    });
    return Array.from(states).sort();
  }, [initialVendors]);

  // Filter & Search Logic
  const filteredVendors = useMemo(() => {
    let list = [...initialVendors];

    // Status Filter
    if (statusFilter !== "All") {
      list = list.filter((v) => v.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // State Filter
    if (stateFilter !== "All") {
      list = list.filter((v) => v.state?.toLowerCase() === stateFilter.toLowerCase());
    }

    // Search Query (Company, Contact, Phone, Email, GSTIN, PAN, City, State, Address, Payment Terms)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((v) => {
        const company = (v.companyName || "").toLowerCase();
        const contact = (v.contactPerson || "").toLowerCase();
        const phone = (v.mobile || "").replace(/\D/g, "");
        const email = (v.email || "").toLowerCase();
        const gst = (v.gstNumber || "").toLowerCase();
        const pan = (v.pan || "").toLowerCase();
        const city = (v.city || "").toLowerCase();
        const state = (v.state || "").toLowerCase();
        const address = (v.address || "").toLowerCase();
        const terms = (v.paymentTerms || "").toLowerCase();

        return (
          company.includes(q) ||
          contact.includes(q) ||
          phone.includes(q.replace(/\D/g, "")) ||
          email.includes(q) ||
          gst.includes(q) ||
          pan.includes(q) ||
          city.includes(q) ||
          state.includes(q) ||
          address.includes(q) ||
          terms.includes(q)
        );
      });
    }

    // Sort Logic
    list.sort((a, b) => {
      const aTotalPOValue = (a.purchaseOrders || []).reduce((sum, po) => sum + (po.totalValue || 0), 0);
      const bTotalPOValue = (b.purchaseOrders || []).reduce((sum, po) => sum + (po.totalValue || 0), 0);
      const aPOCount = a.purchaseOrders?.length || 0;
      const bPOCount = b.purchaseOrders?.length || 0;

      switch (sortBy) {
        case "name_asc":
          return a.companyName.localeCompare(b.companyName);
        case "name_desc":
          return b.companyName.localeCompare(a.companyName);
        case "po_count":
          return bPOCount - aPOCount;
        case "po_value":
          return bTotalPOValue - aTotalPOValue;
        case "recent":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [initialVendors, searchQuery, statusFilter, stateFilter, sortBy]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, stateFilter, sortBy, pageSize]);

  const paginatedVendors = useMemo(() => {
    return paginate(filteredVendors, currentPage, pageSize);
  }, [filteredVendors, currentPage, pageSize]);

  const isAllSelected = paginatedVendors.length > 0 && paginatedVendors.every((v) => selectedVendorIds.has(v.id));
  const isSomeSelected = paginatedVendors.some((v) => selectedVendorIds.has(v.id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected;
    }
  }, [isSomeSelected, isAllSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedVendorIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedVendorIds((prev) => {
        const next = new Set(prev);
        paginatedVendors.forEach((v) => next.delete(v.id));
        return next;
      });
    } else {
      setSelectedVendorIds((prev) => {
        const next = new Set(prev);
        paginatedVendors.forEach((v) => next.add(v.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedVendorIds.size === 0) return;
    const count = selectedVendorIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected vendor(s)?`)) {
      return;
    }

    setIsBulkDeleting(true);
    setDeleteError(null);
    try {
      const ids = Array.from(selectedVendorIds);
      const res = await deleteMultipleVendors(ids);
      if (res?.error) {
        setDeleteError(res.error);
        alert(res.error);
      } else {
        setSelectedVendorIds(new Set());
        if (res?.message) {
          alert(res.message);
        }
        router.refresh();
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to bulk delete vendors");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = (format: "xlsx" | "csv") => {
    const targetVendors = selectedVendorIds.size > 0
      ? initialVendors.filter((v) => selectedVendorIds.has(v.id))
      : filteredVendors;

    if (targetVendors.length === 0) {
      alert("No vendors available to export.");
      return;
    }

    const rows = targetVendors.map((v) => {
      const totalPOVal = (v.purchaseOrders || []).reduce((sum, po) => sum + (po.totalValue || 0), 0);
      return {
        "Company Name": v.companyName || "",
        "Contact Person": v.contactPerson || "",
        "Phone / Mobile": v.mobile || "",
        "Email": v.email || "",
        "GSTIN": v.gstNumber || "",
        "PAN": v.pan || "",
        "Address": v.address || "",
        "City": v.city || "",
        "State": v.state || "",
        "Pincode": v.pincode || "",
        "Payment Terms": v.paymentTerms || "",
        "Status": v.status || "Active",
        "PO Count": v.purchaseOrders?.length || 0,
        "Total Procurement Spend (₹)": totalPOVal
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vendors");
    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "xlsx") {
      XLSX.writeFile(wb, `Vendors_Export_${dateStr}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `Vendors_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportMenuOpen(false);
  };

  // Overall statistics
  const totalVendors = initialVendors.length;
  const activeVendors = initialVendors.filter((v) => v.status === "Active").length;
  const totalPOs = initialVendors.reduce((sum, v) => sum + (v.purchaseOrders?.length || 0), 0);
  const totalProcurementValue = initialVendors.reduce(
    (sum, v) => sum + (v.purchaseOrders || []).reduce((pSum, po) => pSum + (po.totalValue || 0), 0),
    0
  );

  const handleWhatsApp = (mobile?: string | null) => {
    if (!mobile) return;
    const clean = mobile.replace(/\D/g, "");
    const num = clean.length === 10 ? `91${clean}` : clean;
    window.open(`https://wa.me/${num}`, "_blank");
  };

  const handleDelete = async (vendor: VendorItem) => {
    if (!confirm(`Are you sure you want to delete vendor "${vendor.companyName}"? This action cannot be undone.`)) {
      return;
    }
    setDeletingId(vendor.id);
    setDeleteError(null);
    try {
      const res = await deleteVendor(vendor.id);
      if (res?.error) {
        setDeleteError(res.error);
        alert(res.error);
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setDeleteError(err?.message || "Failed to delete vendor");
    } finally {
      setDeletingId(null);
    }
  };

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter("All");
    setStateFilter("All");
    setSortBy("recent");
  };

  return (
    <div className="page-container" style={{ padding: "24px" }}>
      {/* Page Header */}
      <div
        className="dashboard-header mb-6"
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}
      >
        <div>
          <h1 className="page-title" style={{ fontSize: "1.6rem", fontWeight: 700, color: "var(--text-primary)" }}>
            Vendor Management
          </h1>
          <p className="page-subtitle" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            Search, manage suppliers, GSTIN profiles, and purchase partners.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <AddVendorButton />
        </div>
      </div>

      {/* Delete Error Notification Banner */}
      {deleteError && (
        <div
          style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fca5a5",
            color: "#991b1b",
            padding: "12px 16px",
            borderRadius: "8px",
            marginBottom: "20px",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertCircle size={18} color="#dc2626" />
            <span>{deleteError}</span>
          </div>
          <button
            type="button"
            onClick={() => setDeleteError(null)}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "#991b1b" }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* KPI Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Vendors
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "4px", color: "var(--text-primary)" }}>
            {totalVendors}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {filteredVendors.length !== totalVendors ? `Showing ${filteredVendors.length} matching` : "All registered suppliers"}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Active Vendors
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "4px", color: "#10b981" }}>
            {activeVendors}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            {totalVendors > 0 ? `${Math.round((activeVendors / totalVendors) * 100)}% of total partners` : "0% active"}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total POs Raised
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "4px", color: "var(--accent-primary, #4f46e5)" }}>
            {totalPOs}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Across all vendors
          </div>
        </div>

        <div className="glass-panel" style={{ padding: "18px 20px", borderRadius: "12px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Total Procurement Spend
          </div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "4px", color: "#0284c7" }}>
            ₹{totalProcurementValue.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
            Cumulative PO order value
          </div>
        </div>
      </div>

      {/* Modern Search & Filter Toolbar */}
      <div
        className="glass-panel"
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          marginBottom: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {/* Main Search Input */}
          <div
            style={{
              position: "relative",
              flex: "1 1 340px",
              maxWidth: "600px",
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "14px",
                top: "50%",
                transform: "translateY(-50%)",
                color: searchQuery ? "var(--accent-primary, #4f46e5)" : "#94a3b8",
                pointerEvents: "none",
                transition: "color 0.15s ease",
              }}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search existing vendors by company, contact person, phone, GSTIN, city..."
              style={{
                width: "100%",
                padding: "10px 38px 10px 42px",
                borderRadius: "10px",
                border: searchQuery ? "1.5px solid var(--accent-primary, #4f46e5)" : "1px solid #cbd5e1",
                backgroundColor: "var(--bg-primary, #ffffff)",
                fontSize: "0.9rem",
                outline: "none",
                transition: "all 0.15s ease",
                boxShadow: searchQuery ? "0 0 0 3px rgba(79, 70, 229, 0.12)" : "none",
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "#f1f5f9",
                  border: "none",
                  borderRadius: "50%",
                  width: "22px",
                  height: "22px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#64748b",
                }}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Filters & Controls */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
            {/* Status Filter */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "var(--bg-primary, #ffffff)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Vendors</option>
                <option value="Inactive">Inactive Vendors</option>
              </select>
            </div>

            {/* State Filter (if states exist) */}
            {uniqueStates.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  style={{
                    padding: "9px 14px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "var(--bg-primary, #ffffff)",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    color: "#334155",
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="All">All States ({uniqueStates.length})</option>
                  {uniqueStates.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Sort Dropdown */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  padding: "9px 14px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "var(--bg-primary, #ffffff)",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                  color: "#334155",
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                <option value="recent">Sort: Recently Added</option>
                <option value="name_asc">Sort: Company Name (A-Z)</option>
                <option value="name_desc">Sort: Company Name (Z-A)</option>
                <option value="po_count">Sort: Most Purchase Orders</option>
                <option value="po_value">Sort: Highest Order Value</option>
              </select>
            </div>

            {/* View Mode Toggle Buttons */}
            <div
              style={{
                display: "flex",
                backgroundColor: "#f1f5f9",
                borderRadius: "8px",
                padding: "3px",
                border: "1px solid #e2e8f0",
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: viewMode === "grid" ? "#ffffff" : "transparent",
                  color: viewMode === "grid" ? "var(--accent-primary, #4f46e5)" : "#64748b",
                  boxShadow: viewMode === "grid" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
                title="Grid Card View"
              >
                <LayoutGrid size={15} />
                <span>Grid</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  padding: "6px 10px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: viewMode === "table" ? "#ffffff" : "transparent",
                  color: viewMode === "table" ? "var(--accent-primary, #4f46e5)" : "#64748b",
                  boxShadow: viewMode === "table" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
                title="Table List View"
              >
                <List size={15} />
                <span>Table</span>
              </button>
            </div>

            {/* Export Dropdown Menu */}
            <div className="erp-export-dropdown-container" ref={exportMenuRef}>
              <button
                type="button"
                className="btn-erp-export"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                title="Export vendors to Excel or CSV"
              >
                <Download size={14} />
                <span>Export {selectedVendorIds.size > 0 ? `(${selectedVendorIds.size})` : ''}</span>
                <ChevronDown size={13} style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
              </button>

              {isExportMenuOpen && (
                <div className="erp-export-dropdown-menu">
                  <div className="erp-export-dropdown-header">
                    <span>{selectedVendorIds.size > 0 ? `Export Selected (${selectedVendorIds.size})` : `Export All (${filteredVendors.length})`}</span>
                  </div>
                  <button
                    type="button"
                    className="erp-export-dropdown-item"
                    onClick={() => handleExport('xlsx')}
                  >
                    <FileSpreadsheet size={15} style={{ color: '#10b981' }} />
                    <div className="erp-export-item-text">
                      <span className="title">Excel Spreadsheet</span>
                      <span className="sub">.xlsx format</span>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="erp-export-dropdown-item"
                    onClick={() => handleExport('csv')}
                  >
                    <Download size={15} style={{ color: '#3b82f6' }} />
                    <div className="erp-export-item-text">
                      <span className="title">CSV File</span>
                      <span className="sub">Standard comma-separated</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Selection Action Buttons (Matched with Theme) */}
            {selectedVendorIds.size > 0 && (
              <>
                <div className="btn-selection-count" title={`${selectedVendorIds.size} vendors selected`}>
                  <span className="selection-count-pill">{selectedVendorIds.size}</span>
                  <span>Selected</span>
                </div>

                <button
                  type="button"
                  className="btn-select-all"
                  onClick={handleToggleSelectAll}
                  title={isAllSelected ? "Deselect page" : `Select all ${paginatedVendors.length} on page`}
                >
                  <span>{isAllSelected ? "Deselect Page" : `Select Page (${paginatedVendors.length})`}</span>
                </button>

                <button
                  type="button"
                  className="btn-delete-selected"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  title="Delete selected vendors"
                >
                  {isBulkDeleting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      <span>Delete ({selectedVendorIds.size})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className="btn-clear-selection"
                  onClick={() => setSelectedVendorIds(new Set())}
                  title="Clear selection"
                >
                  <X size={14} />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Active Filter Summary / Results Count */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <div>
            Showing <strong style={{ color: "var(--text-primary)" }}>{filteredVendors.length}</strong> of{" "}
            <strong style={{ color: "var(--text-primary)" }}>{totalVendors}</strong> vendors
            {searchQuery && (
              <span>
                {" "}
                matching &quot;<strong>{searchQuery}</strong>&quot;
              </span>
            )}
            {statusFilter !== "All" && <span> • Status: {statusFilter}</span>}
            {stateFilter !== "All" && <span> • State: {stateFilter}</span>}
          </div>

          {(searchQuery || statusFilter !== "All" || stateFilter !== "All" || sortBy !== "recent") && (
            <button
              type="button"
              onClick={resetFilters}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent-primary, #4f46e5)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.82rem",
                padding: "2px 6px",
              }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* VENDOR CARDS GRID VIEW */}
      {viewMode === "grid" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "18px" }}>
          {paginatedVendors.map((vendor) => {
            const totalPOValue = (vendor.purchaseOrders || []).reduce((sum, po) => sum + (po.totalValue || 0), 0);
            const poCount = vendor.purchaseOrders?.length || 0;
            const isDeletingThis = deletingId === vendor.id;

            return (
              <div
                key={vendor.id}
                className="glass-panel"
                style={{
                  padding: "22px",
                  borderRadius: "14px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  border: "1px solid rgba(226, 232, 240, 0.8)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                  opacity: isDeletingThis ? 0.5 : 1,
                  position: "relative",
                }}
              >
                <div>
                  {/* Top Bar: Company Name, Status Pill */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px", gap: "10px" }}>
                    <div style={{ flex: 1, display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <input
                        type="checkbox"
                        checked={selectedVendorIds.has(vendor.id)}
                        onChange={() => handleToggleSelect(vendor.id)}
                        className="table-checkbox"
                        style={{ marginTop: "3px" }}
                      />
                      <div>
                        <h3
                          style={{
                            fontWeight: 700,
                            fontSize: "1.05rem",
                            marginBottom: "4px",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            color: "var(--text-primary)",
                          }}
                        >
                          <Building2 size={18} style={{ color: "var(--accent-primary, #4f46e5)", flexShrink: 0 }} />
                          <span style={{ wordBreak: "break-word" }}>{vendor.companyName}</span>
                        </h3>
                        {vendor.contactPerson && (
                          <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: 500 }}>
                            Contact: <strong>{vendor.contactPerson}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        className={`status-badge ${vendor.status === "Active" ? "active" : "inactive"}`}
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "3px 9px",
                          borderRadius: "12px",
                          backgroundColor: vendor.status === "Active" ? "#ecfdf5" : "#f1f5f9",
                          color: vendor.status === "Active" ? "#059669" : "#64748b",
                          border: vendor.status === "Active" ? "1px solid #a7f3d0" : "1px solid #e2e8f0",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            backgroundColor: vendor.status === "Active" ? "#10b981" : "#94a3b8",
                          }}
                        />
                        {vendor.status || "Active"}
                      </span>
                    </div>
                  </div>

                  {/* Vendor Details (Phone, Email, GST, PAN, City/State) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
                    {vendor.mobile && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.85rem" }}>
                        <button
                          type="button"
                          onClick={() => openPhoneDialer({
                            phone: vendor.mobile || "",
                            name: vendor.companyName || vendor.contactPerson || "Vendor"
                          })}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            color: "var(--text-primary)",
                            textDecoration: "none",
                            fontWeight: 500,
                            background: "none",
                            border: "none",
                            padding: 0,
                            cursor: "pointer",
                            font: "inherit"
                          }}
                          title={`Call ${vendor.companyName || 'Vendor'}`}
                        >
                          <Phone size={14} style={{ color: "#3b82f6" }} />
                          <span>{vendor.mobile}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleWhatsApp(vendor.mobile)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            backgroundColor: "#ecfdf5",
                            color: "#059669",
                            border: "1px solid #a7f3d0",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                          title="Message on WhatsApp"
                        >
                          <MessageCircle size={11} /> WhatsApp
                        </button>
                      </div>
                    )}

                    {vendor.email && (
                      <a
                        href={`mailto:${vendor.email}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          textDecoration: "none",
                          wordBreak: "break-all",
                        }}
                      >
                        <Mail size={14} style={{ color: "#8b5cf6" }} />
                        <span>{vendor.email}</span>
                      </a>
                    )}

                    {vendor.gstNumber && (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                          fontSize: "0.8rem",
                          backgroundColor: "#f8fafc",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontFamily: "monospace",
                          color: "#334155",
                          width: "fit-content",
                        }}
                      >
                        <ShieldCheck size={13} color="#0284c7" />
                        <span>
                          <strong>GSTIN:</strong> {vendor.gstNumber}
                        </span>
                      </div>
                    )}

                    {(vendor.city || vendor.state) && (
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        <MapPin size={13} color="#ef4444" />
                        <span>
                          {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                          {vendor.pincode ? ` - ${vendor.pincode}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Box: PO Count & Total Spend */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                      padding: "12px 14px",
                      background: "var(--bg-secondary, #f8fafc)",
                      borderRadius: "10px",
                      border: "1px solid #f1f5f9",
                      marginBottom: "12px",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                        Purchase Orders
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "5px", color: "var(--text-primary)", marginTop: "2px" }}>
                        <Package size={15} style={{ color: "var(--accent-primary, #4f46e5)" }} />
                        <span>{poCount}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
                        Total Value
                      </div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "2px", color: "#0284c7", marginTop: "2px" }}>
                        <span>₹{totalPOValue.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Terms Tag */}
                  {vendor.paymentTerms && (
                    <div style={{ fontSize: "0.78rem", color: "#475569", marginBottom: "14px", display: "flex", alignItems: "center", gap: "5px" }}>
                      <CreditCard size={13} color="#64748b" />
                      <span>
                        <strong>Payment Terms:</strong> {vendor.paymentTerms}
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Action Buttons: Edit, Delete, Raise PO */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: "12px",
                    borderTop: "1px solid #f1f5f9",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={() => setEditingVendor(vendor)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        color: "#334155",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Edit vendor profile"
                    >
                      <Edit2 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(vendor)}
                      disabled={isDeletingThis}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 10px",
                        borderRadius: "6px",
                        backgroundColor: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#e11d48",
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                      }}
                      title="Delete vendor"
                    >
                      {isDeletingThis ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      <span>Delete</span>
                    </button>
                  </div>

                  <Link
                    href={`/purchases?vendorId=${vendor.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "rgba(79, 70, 229, 0.08)",
                      color: "var(--accent-primary, #4f46e5)",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      textDecoration: "none",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span>View POs</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {filteredVendors.length > 0 && (
          <div style={{ marginTop: '16px', background: '#ffffff', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)', overflow: 'hidden' }}>
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredVendors.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              itemName="vendors"
            />
          </div>
        )}
      </>
    )}

      {/* VENDOR TABLE LIST VIEW */}
      {viewMode === "table" && (
        <div
          className="glass-panel"
          style={{
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid rgba(226, 232, 240, 0.8)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, fontSize: "0.8rem" }}>
                  <th className="table-checkbox-cell">
                    <input
                      type="checkbox"
                      ref={headerCheckboxRef}
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="table-checkbox"
                    />
                  </th>
                  <th style={{ padding: "14px 18px" }}>Supplier / Company</th>
                  <th style={{ padding: "14px 18px" }}>Contact Person</th>
                  <th style={{ padding: "14px 18px" }}>Phone & Email</th>
                  <th style={{ padding: "14px 18px" }}>Location & GSTIN</th>
                  <th style={{ padding: "14px 18px" }}>POs & Total Value</th>
                  <th style={{ padding: "14px 18px" }}>Terms</th>
                  <th style={{ padding: "14px 18px" }}>Status</th>
                  <th style={{ padding: "14px 18px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedVendors.map((vendor) => {
                  const totalPOValue = (vendor.purchaseOrders || []).reduce((sum, po) => sum + (po.totalValue || 0), 0);
                  const poCount = vendor.purchaseOrders?.length || 0;
                  const isDeletingThis = deletingId === vendor.id;

                  return (
                    <tr
                      key={vendor.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: selectedVendorIds.has(vendor.id) ? "#f5f3ff" : undefined,
                        transition: "background 0.15s ease",
                        opacity: isDeletingThis ? 0.5 : 1,
                      }}
                    >
                      <td className="table-checkbox-cell">
                        <input
                          type="checkbox"
                          checked={selectedVendorIds.has(vendor.id)}
                          onChange={() => handleToggleSelect(vendor.id)}
                          className="table-checkbox"
                        />
                      </td>
                      {/* Company Name */}
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: "var(--text-primary)" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Building2 size={16} color="var(--accent-primary, #4f46e5)" />
                          <span>{vendor.companyName}</span>
                        </div>
                      </td>

                      {/* Contact Person */}
                      <td style={{ padding: "14px 18px", color: "var(--text-secondary)" }}>
                        {vendor.contactPerson || "—"}
                      </td>

                      {/* Phone & Email */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {vendor.mobile && (
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <button
                                type="button"
                                onClick={() => openPhoneDialer({
                                  phone: vendor.mobile || "",
                                  name: vendor.companyName || vendor.contactPerson || "Vendor"
                                })}
                                style={{ color: "var(--text-primary)", textDecoration: "none", fontWeight: 500, fontSize: "0.82rem", background: "none", border: "none", padding: 0, cursor: "pointer", font: "inherit" }}
                                title={`Call ${vendor.companyName || 'Vendor'}`}
                              >
                                {vendor.mobile}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleWhatsApp(vendor.mobile)}
                                style={{
                                  background: "#ecfdf5",
                                  border: "none",
                                  borderRadius: "4px",
                                  color: "#059669",
                                  padding: "1px 4px",
                                  cursor: "pointer",
                                }}
                                title="WhatsApp"
                              >
                                <MessageCircle size={12} />
                              </button>
                            </div>
                          )}
                          {vendor.email && (
                            <a
                              href={`mailto:${vendor.email}`}
                              style={{ color: "#64748b", textDecoration: "none", fontSize: "0.78rem" }}
                            >
                              {vendor.email}
                            </a>
                          )}
                          {!vendor.mobile && !vendor.email && <span style={{ color: "#94a3b8" }}>—</span>}
                        </div>
                      </td>

                      {/* Location & GSTIN */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                          {(vendor.city || vendor.state) && (
                            <div style={{ fontSize: "0.82rem", color: "var(--text-primary)" }}>
                              {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                            </div>
                          )}
                          {vendor.gstNumber ? (
                            <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "#64748b" }}>
                              GSTIN: {vendor.gstNumber}
                            </div>
                          ) : (
                            !vendor.city && !vendor.state && <span style={{ color: "#94a3b8" }}>—</span>
                          )}
                        </div>
                      </td>

                      {/* POs & Value */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                          ₹{totalPOValue.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {poCount} PO{poCount === 1 ? "" : "s"}
                        </div>
                      </td>

                      {/* Payment Terms */}
                      <td style={{ padding: "14px 18px", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {vendor.paymentTerms || "—"}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          className={`status-badge ${vendor.status === "Active" ? "active" : "inactive"}`}
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "10px",
                            backgroundColor: vendor.status === "Active" ? "#ecfdf5" : "#f1f5f9",
                            color: vendor.status === "Active" ? "#059669" : "#64748b",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <span
                            style={{
                              width: "5px",
                              height: "5px",
                              borderRadius: "50%",
                              backgroundColor: vendor.status === "Active" ? "#10b981" : "#94a3b8",
                            }}
                          />
                          {vendor.status || "Active"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "14px 18px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "6px", alignItems: "center" }}>
                          <button
                            type="button"
                            onClick={() => setEditingVendor(vendor)}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                              background: "#ffffff",
                              color: "#475569",
                              cursor: "pointer",
                            }}
                            title="Edit vendor"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDelete(vendor)}
                            disabled={isDeletingThis}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #fecdd3",
                              background: "#fff1f2",
                              color: "#e11d48",
                              cursor: "pointer",
                            }}
                            title="Delete vendor"
                          >
                            {isDeletingThis ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                          </button>

                          <Link
                            href={`/purchases?vendorId=${vendor.id}`}
                            style={{
                              padding: "6px 8px",
                              borderRadius: "6px",
                              border: "1px solid #c7d2fe",
                              background: "#e0e7ff",
                              color: "#4338ca",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                            title="View Purchase Orders"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalItems={filteredVendors.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            itemName="vendors"
          />
        </div>
      )}

      {/* ZERO RESULTS / EMPTY STATE */}
      {filteredVendors.length === 0 && (
        <div
          className="glass-panel"
          style={{
            textAlign: "center",
            padding: "54px 20px",
            borderRadius: "14px",
            marginTop: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "rgba(79, 70, 229, 0.08)",
              color: "var(--accent-primary, #4f46e5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px auto",
            }}
          >
            <Search size={26} />
          </div>

          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "6px" }}>
            {searchQuery || statusFilter !== "All" || stateFilter !== "All"
              ? "No matching vendors found"
              : "No vendors registered yet"}
          </h3>

          <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", maxWidth: "420px", margin: "0 auto 18px auto" }}>
            {searchQuery || statusFilter !== "All" || stateFilter !== "All"
              ? `We couldn't find any suppliers matching "${searchQuery || statusFilter || stateFilter}". Try searching by legal company name, contact, GSTIN, phone, or clear active filters.`
              : "Start organizing your procurement supply chain by registering your first supplier partner."}
          </p>

          {searchQuery || statusFilter !== "All" || stateFilter !== "All" ? (
            <button
              type="button"
              onClick={resetFilters}
              className="primary-btn"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <X size={15} />
              <span>Clear Search & Filters</span>
            </button>
          ) : (
            <AddVendorButton />
          )}
        </div>
      )}

      {/* Edit Vendor Modal */}
      {editingVendor && (
        <EditVendorModal
          vendor={editingVendor}
          isOpen={Boolean(editingVendor)}
          onClose={() => setEditingVendor(null)}
          onSuccess={() => {
            setEditingVendor(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
