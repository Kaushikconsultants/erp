"use client";

import React, { useState, useEffect } from "react";
import {
  Warehouse,
  Plus,
  Edit2,
  Trash2,
  Search,
  MapPin,
  ArrowDown,
  ArrowUp,
  Package,
  Layers,
  Sparkles,
  Loader2,
  X,
  CheckCircle2,
  AlertCircle,
  Building,
  User,
  Phone,
  ArrowLeft
} from "lucide-react";
import Link from "next/link";
import { createWarehouse, updateWarehouse, deleteWarehouse } from "@/app/actions/warehouseActions";
import "@/components/ui/modal.css";

export interface BranchOption {
  id: string;
  name: string;
  code?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface WarehouseItem {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  managerId?: string | null;
  branchId?: string | null;
  branch?: {
    id?: string;
    name: string;
    code?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  inventoryTransactions?: {
    id: string;
    quantity: number;
    type: string;
    reference?: string | null;
    date: Date | string;
  }[];
  productBatches?: {
    id: string;
    batchNumber: string;
    stockQuantity: number;
    status: string;
  }[];
}

interface Props {
  initialWarehouses: WarehouseItem[];
  branches?: BranchOption[];
  isSettingsContext?: boolean;
}

export default function WarehouseManagerClient({
  initialWarehouses = [],
  branches = [],
  isSettingsContext = false
}: Props) {
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>(initialWarehouses);
  const [search, setSearch] = useState("");
  const [selectedBranchFilter, setSelectedBranchFilter] = useState("ALL");

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [address, setAddress] = useState("");
  const [branchId, setBranchId] = useState("");
  const [managerId, setManagerId] = useState("");

  // Sync state if initial changes
  useEffect(() => {
    setWarehouses(initialWarehouses);
  }, [initialWarehouses]);

  // Handle ESC to close modal & lock body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeModal();
      }
    };
    if (modalOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [modalOpen]);

  const openCreateModal = () => {
    setEditingWarehouse(null);
    setName("");
    setCode("");
    setAddress("");
    setBranchId(branches.length > 0 ? branches[0].id : "");
    setManagerId("");
    setErrorMsg("");
    setSuccessMsg("");
    setModalOpen(true);
  };

  const openEditModal = (wh: WarehouseItem) => {
    setEditingWarehouse(wh);
    setName(wh.name || "");
    setCode(wh.code || "");
    setAddress(wh.address || "");
    setBranchId(wh.branchId || "");
    setManagerId(wh.managerId || "");
    setErrorMsg("");
    setSuccessMsg("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingWarehouse(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  const handleAutoGenerateCode = () => {
    const prefix = name ? name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 3).toUpperCase() : "WH";
    const rand = Math.floor(100 + Math.random() * 900);
    setCode(`WH-${prefix || "LOC"}-${rand}`);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Warehouse Name is required.");
      return;
    }

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    const fd = new FormData();
    fd.append("name", name.trim());
    fd.append("code", code.trim());
    fd.append("address", address.trim());
    fd.append("branchId", branchId);
    fd.append("managerId", managerId.trim());

    if (editingWarehouse) {
      const res = await updateWarehouse(editingWarehouse.id, fd);
      if (res.success && res.warehouse) {
        setWarehouses((prev) =>
          prev.map((w) =>
            w.id === editingWarehouse.id
              ? {
                  ...w,
                  name: res.warehouse.name,
                  code: res.warehouse.code,
                  address: res.warehouse.address,
                  branchId: res.warehouse.branchId,
                  branch: res.warehouse.branch,
                  managerId: res.warehouse.managerId
                }
              : w
          )
        );
        setSuccessMsg("✓ Warehouse updated successfully!");
        setTimeout(() => closeModal(), 700);
      } else {
        setErrorMsg(res.error || "Failed to update warehouse");
      }
    } else {
      const res = await createWarehouse(fd);
      if (res.success && res.warehouse) {
        const newWh: WarehouseItem = {
          id: res.warehouse.id,
          name: res.warehouse.name,
          code: res.warehouse.code,
          address: res.warehouse.address,
          branchId: res.warehouse.branchId,
          branch: res.warehouse.branch,
          managerId: res.warehouse.managerId,
          inventoryTransactions: [],
          productBatches: []
        };
        setWarehouses((prev) => [newWh, ...prev]);
        setSuccessMsg("✓ Warehouse created successfully!");
        setTimeout(() => closeModal(), 700);
      } else {
        setErrorMsg(res.error || "Failed to create warehouse");
      }
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, whName: string) => {
    if (!confirm(`Are you sure you want to delete warehouse "${whName}"?`)) return;

    setDeletingId(id);
    const res = await deleteWarehouse(id);
    setDeletingId(null);

    if (res.success) {
      setWarehouses((prev) => prev.filter((w) => w.id !== id));
    } else {
      alert(res.error || "Failed to delete warehouse");
    }
  };

  // Filtered warehouses
  const filteredWarehouses = warehouses.filter((wh) => {
    const matchesSearch =
      wh.name.toLowerCase().includes(search.toLowerCase()) ||
      (wh.code && wh.code.toLowerCase().includes(search.toLowerCase())) ||
      (wh.address && wh.address.toLowerCase().includes(search.toLowerCase())) ||
      (wh.branch?.name && wh.branch.name.toLowerCase().includes(search.toLowerCase()));

    const matchesBranch =
      selectedBranchFilter === "ALL" ||
      wh.branchId === selectedBranchFilter ||
      (!wh.branchId && selectedBranchFilter === "STANDALONE");

    return matchesSearch && matchesBranch;
  });

  // Calculate metrics
  const totalWarehouses = warehouses.length;
  const totalStockIn = warehouses.reduce((sum, wh) => {
    const inQty = (wh.inventoryTransactions || [])
      .filter((t) => t.type === "IN")
      .reduce((s, t) => s + t.quantity, 0);
    return sum + inQty;
  }, 0);

  const totalStockOut = warehouses.reduce((sum, wh) => {
    const outQty = (wh.inventoryTransactions || [])
      .filter((t) => t.type === "OUT")
      .reduce((s, t) => s + t.quantity, 0);
    return sum + outQty;
  }, 0);

  const netBalance = totalStockIn - totalStockOut;

  return (
    <div className="page-container" style={{ padding: isSettingsContext ? "0" : "24px", maxWidth: "1400px", margin: "0 auto" }}>
      {/* Settings Navigation Breadcrumb */}
      {isSettingsContext && (
        <div style={{ marginBottom: "16px" }}>
          <Link
            href="/settings"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "var(--accent-primary, #4f46e5)",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={16} /> Back to Settings Hub
          </Link>
        </div>
      )}

      {/* Header Section */}
      <div className="dashboard-header" style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "12px",
                background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 4px 12px rgba(5, 150, 105, 0.25)",
                flexShrink: 0
              }}
            >
              <Warehouse size={22} />
            </div>
            <div>
              <h1 className="page-title" style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
                {isSettingsContext ? "Warehouse & Storage Settings" : "Warehouse Management"}
              </h1>
              <p className="page-subtitle" style={{ margin: "3px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
                Configure storage hubs, track stock locations, and monitor material inventory flow.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="primary-btn"
          onClick={openCreateModal}
          style={{
            backgroundColor: "#059669",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            fontSize: "0.875rem",
            fontWeight: 700,
            borderRadius: "10px",
            boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)"
          }}
        >
          <Plus size={18} /> Add Warehouse
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {/* Total Warehouses */}
        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ width: 38, height: 38, borderRadius: "10px", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Warehouse size={18} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Storage Facilities
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0f172a" }}>
            {totalWarehouses} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>Hub{totalWarehouses === 1 ? "" : "s"}</span>
          </div>
        </div>

        {/* Total Stock Received (IN) */}
        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ width: 38, height: 38, borderRadius: "10px", backgroundColor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowDown size={18} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Stock Received (IN)
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#2563eb" }}>
            {totalStockIn.toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>Units</span>
          </div>
        </div>

        {/* Total Stock Dispatched (OUT) */}
        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ width: 38, height: 38, borderRadius: "10px", backgroundColor: "#fff1f2", color: "#e11d48", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUp size={18} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Stock Dispatched (OUT)
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#e11d48" }}>
            {totalStockOut.toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>Units</span>
          </div>
        </div>

        {/* Current Net Balance */}
        <div className="glass-panel" style={{ padding: "18px 20px", backgroundColor: "#ffffff", borderRadius: "14px", border: "1px solid #e2e8f0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
            <div style={{ width: 38, height: 38, borderRadius: "10px", backgroundColor: "#f5f3ff", color: "#7c3aed", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Package size={18} />
            </div>
            <div style={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Net Warehouse Stock
            </div>
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#7c3aed" }}>
            {netBalance.toLocaleString()} <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#64748b" }}>Units</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          marginBottom: "20px",
          backgroundColor: "#ffffff",
          padding: "14px 18px",
          borderRadius: "12px",
          border: "1px solid #e2e8f0"
        }}
      >
        <div style={{ position: "relative", flex: 1, minWidth: "260px" }}>
          <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by warehouse name, code, branch, or address..."
            style={{
              width: "100%",
              padding: "9px 12px 9px 36px",
              borderRadius: "8px",
              border: "1px solid #cbd5e1",
              backgroundColor: "#f8fafc",
              fontSize: "0.875rem",
              outline: "none"
            }}
          />
        </div>

        {branches.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#64748b" }}>Filter Branch:</span>
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "#1e293b",
                outline: "none"
              }}
            >
              <option value="ALL">All Branches</option>
              <option value="STANDALONE">Standalone Hubs (No Branch)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Warehouse Cards Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(350px, 1fr))", gap: "18px" }}>
        {filteredWarehouses.map((wh) => {
          const inQty = (wh.inventoryTransactions || [])
            .filter((t) => t.type === "IN")
            .reduce((s, t) => s + t.quantity, 0);

          const outQty = (wh.inventoryTransactions || [])
            .filter((t) => t.type === "OUT")
            .reduce((s, t) => s + t.quantity, 0);

          const txCount = (wh.inventoryTransactions || []).length;
          const batchCount = (wh.productBatches || []).length;

          return (
            <div
              key={wh.id}
              className="glass-panel"
              style={{
                backgroundColor: "#ffffff",
                padding: "20px",
                borderRadius: "14px",
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: "16px",
                transition: "all 0.2s ease"
              }}
            >
              <div>
                {/* Header: Title + Badges */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "10px",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      <Warehouse size={20} />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}>
                        {wh.name}
                      </h3>
                      {wh.code && (
                        <span
                          style={{
                            display: "inline-block",
                            fontSize: "0.72rem",
                            fontFamily: "monospace",
                            fontWeight: 700,
                            color: "#4f46e5",
                            backgroundColor: "#eef2ff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            marginTop: "3px"
                          }}
                        >
                          {wh.code}
                        </span>
                      )}
                    </div>
                  </div>

                  {wh.branch ? (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#0284c7",
                        backgroundColor: "#f0f9ff",
                        border: "1px solid #bae6fd",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px"
                      }}
                    >
                      <Building size={12} /> {wh.branch.name}
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        color: "#64748b",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        padding: "3px 8px",
                        borderRadius: "6px"
                      }}
                    >
                      Standalone
                    </span>
                  )}
                </div>

                {/* Location Address */}
                {wh.address && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      fontSize: "0.82rem",
                      color: "#475569",
                      marginBottom: "12px"
                    }}
                  >
                    <MapPin size={15} style={{ color: "#94a3b8", flexShrink: 0, marginTop: "2px" }} />
                    <span style={{ lineHeight: 1.4 }}>{wh.address}</span>
                  </div>
                )}

                {/* Manager Info if present */}
                {wh.managerId && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.8rem",
                      color: "#64748b",
                      marginBottom: "12px"
                    }}
                  >
                    <User size={14} />
                    <span>Manager / Incharge: <strong style={{ color: "#334155" }}>{wh.managerId}</strong></span>
                  </div>
                )}

                {/* Inventory Flow Stats */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Stock IN</div>
                    <div style={{ fontWeight: 700, color: "#16a34a", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
                      <ArrowDown size={13} /> {inQty.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Stock OUT</div>
                    <div style={{ fontWeight: 700, color: "#dc2626", fontSize: "0.95rem", display: "flex", alignItems: "center", gap: "3px", marginTop: "2px" }}>
                      <ArrowUp size={13} /> {outQty.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>Current Balance</div>
                    <div style={{ fontWeight: 700, color: "#4f46e5", fontSize: "0.95rem", marginTop: "2px" }}>
                      {(inQty - outQty).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Footer Metadata Tag */}
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.75rem", color: "#94a3b8" }}>
                  <span>{txCount} Inventory Transactions</span>
                  {batchCount > 0 && <span>{batchCount} Active Batches</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                <button
                  type="button"
                  onClick={() => openEditModal(wh)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #cbd5e1",
                    color: "#334155",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(wh.id, wh.name)}
                  disabled={deletingId === wh.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#dc2626",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  {deletingId === wh.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />} Delete
                </button>
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredWarehouses.length === 0 && (
          <div
            style={{
              gridColumn: "1 / -1",
              textAlign: "center",
              padding: "50px 24px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "2px dashed #cbd5e1"
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "16px"
              }}
            >
              <Warehouse size={32} />
            </div>
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>
              {search ? "No matching warehouses found" : "No warehouses configured yet"}
            </h3>
            <p style={{ color: "#64748b", fontSize: "0.875rem", maxWidth: "480px", margin: "0 auto 20px auto" }}>
              {search
                ? `No storage hubs match your search query "${search}". Try clearing search filters.`
                : "Create central warehouses, branch storage depots, or dispatch fulfillment hubs to organize inventory, stock batches, and delivery challans."}
            </p>
            {search ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setSearch("")}
                style={{ padding: "9px 18px", borderRadius: "8px", fontWeight: 600 }}
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                className="primary-btn"
                onClick={openCreateModal}
                style={{
                  backgroundColor: "#059669",
                  padding: "10px 22px",
                  borderRadius: "10px",
                  fontWeight: 700,
                  fontSize: "0.9rem",
                  boxShadow: "0 4px 12px rgba(5, 150, 105, 0.3)"
                }}
              >
                + Create Your First Warehouse
              </button>
            )}
          </div>
        )}
      </div>

      {/* CREATE / EDIT WAREHOUSE MODAL */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div
            className="modal-content animate-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "95%" }}
          >
            {/* Modal Header */}
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "8px",
                    backgroundColor: "#ecfdf5",
                    color: "#059669",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}
                >
                  <Warehouse size={20} />
                </div>
                <div>
                  <h2 className="modal-title">
                    {editingWarehouse ? "Edit Warehouse Facility" : "Add New Warehouse"}
                  </h2>
                  <p className="modal-subtitle">
                    {editingWarehouse
                      ? `Update configuration for ${editingWarehouse.name}`
                      : "Configure a new storage facility or inventory location"}
                  </p>
                </div>
              </div>
              <button type="button" className="modal-close" onClick={closeModal} aria-label="Close dialog">
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="modal-body" style={{ maxHeight: "calc(88vh - 135px)", padding: "20px 24px" }}>
                {/* Success Banner */}
                {successMsg && (
                  <div
                    style={{
                      backgroundColor: "#ecfdf5",
                      border: "1px solid #a7f3d0",
                      color: "#065f46",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Error Banner */}
                {errorMsg && (
                  <div
                    style={{
                      backgroundColor: "#fef2f2",
                      border: "1px solid #fca5a5",
                      color: "#b91c1c",
                      padding: "10px 14px",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      display: "flex",
                      alignItems: "center",
                      gap: "8px"
                    }}
                  >
                    <AlertCircle size={16} color="#dc2626" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Warehouse Name */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Warehouse / Hub Name <span style={{ color: "#ef4444" }}>*</span>
                  </label>
                  <input
                    name="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Central Distribution Hub, North Storage Unit"
                    className="form-input"
                  />
                </div>

                {/* Warehouse Code & Auto-Generate */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                      Warehouse Code (Unique)
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateCode}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "2px 8px",
                        borderRadius: "5px",
                        backgroundColor: "#eff6ff",
                        color: "#2563eb",
                        border: "1px solid #bfdbfe",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <Sparkles size={11} /> ⚡ Auto-Generate
                    </button>
                  </div>
                  <input
                    name="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WH-DEL-01, WH-MUM-MAIN"
                    className="form-input"
                    style={{ textTransform: "uppercase", fontFamily: "monospace", fontWeight: 600 }}
                  />
                </div>

                {/* Associated Branch */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Associated Branch / Business Unit
                  </label>
                  <select
                    name="branchId"
                    value={branchId}
                    onChange={(e) => setBranchId(e.target.value)}
                    className="form-input"
                  >
                    <option value="">None (Standalone Central Warehouse)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.city ? `(${b.city})` : ""}
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "4px", display: "block" }}>
                    Linking to a branch allows tracking intra-branch delivery challans and regional inventory.
                  </span>
                </div>

                {/* Manager / Supervisor Contact */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Warehouse Incharge / Manager Name & Phone
                  </label>
                  <input
                    name="managerId"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    placeholder="e.g. Ramesh Kumar (+91 98765 43210)"
                    className="form-input"
                  />
                </div>

                {/* Physical Address */}
                <div className="form-group" style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155" }}>
                    Physical Address & Premises Details
                  </label>
                  <textarea
                    name="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={3}
                    placeholder="Plot No, Industrial Area, Sector, City, State, Pincode..."
                    className="form-input"
                    style={{ resize: "vertical", fontFamily: "inherit" }}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading}
                  style={{ backgroundColor: "#059669" }}
                >
                  {loading && <Loader2 size={15} className="animate-spin" />}
                  {loading
                    ? "Saving..."
                    : editingWarehouse
                    ? "Update Warehouse"
                    : "Save Warehouse"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
