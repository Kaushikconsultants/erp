"use client";

import React, { useState, useMemo } from "react";
import { createPurchaseOrder, updatePOStatus, receiveGRN } from "@/app/actions/purchaseActions";
import ModernSearchableSelect, { SelectOption } from "@/components/ui/ModernSearchableSelect";
import {
  ShoppingBag,
  Plus,
  Search,
  X,
  PackageCheck,
  Printer,
  Calendar,
  Building2,
  Trash2,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  FileText,
  Boxes,
  ShieldCheck
} from "lucide-react";

export interface VendorOption {
  id: string;
  companyName: string;
  contactPerson?: string | null;
  mobile?: string | null;
  email?: string | null;
  gstNumber?: string | null;
  paymentTerms?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface ProductOption {
  id: string;
  name: string;
  sku?: string | null;
  sellingPrice: number;
  purchasePrice?: number | null;
  category?: string | null;
}

interface POItemForm {
  productId: string;
  quantity: number;
  rate: number;
  gstRate: number;
}

export default function PurchasesClient({
  initialOrders,
  vendors,
  products
}: {
  initialOrders: any[];
  vendors: VendorOption[];
  products: ProductOption[];
}) {
  const [orders, setOrders] = useState(initialOrders);
  const [createOpen, setCreateOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState<string | null>(null);
  const [voucherPO, setVoucherPO] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Create Form State
  const [vendorId, setVendorId] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<POItemForm[]>([
    { productId: "", quantity: 1, rate: 0, gstRate: 18 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedPO = orders.find((o) => o.id === grnOpen);

  // Vendor options for ModernSearchableSelect
  const vendorSelectOptions: SelectOption[] = useMemo(() => {
    return vendors.map((v) => ({
      value: v.id,
      label: v.companyName,
      subLabel: v.contactPerson
        ? `Contact: ${v.contactPerson}${v.mobile ? ` • ${v.mobile}` : ""}`
        : v.gstNumber
        ? `GST: ${v.gstNumber}`
        : undefined,
      badge: v.gstNumber ? "GST Registered" : undefined
    }));
  }, [vendors]);

  // Product options for ModernSearchableSelect
  const productSelectOptions: SelectOption[] = useMemo(() => {
    return products.map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: `SKU: ${p.sku || "N/A"} | Purchase Price: ₹${(p.purchasePrice || p.sellingPrice || 0).toLocaleString("en-IN")}`
    }));
  }, [products]);

  // KPI Calculations
  const totals = useMemo(() => {
    let totalProcurement = 0;
    let issuedCount = 0;
    let draftCount = 0;
    let receivedCount = 0;
    let pendingItemsCount = 0;

    orders.forEach((po) => {
      totalProcurement += po.totalValue || 0;
      if (po.status === "Issued" || po.status === "Partially Received") {
        issuedCount++;
      }
      if (po.status === "Draft") draftCount++;
      if (po.status === "Received") receivedCount++;

      (po.items || []).forEach((it: any) => {
        const remaining = (it.quantity || 0) - (it.receivedQty || 0);
        if (remaining > 0) pendingItemsCount += remaining;
      });
    });

    return {
      totalProcurement,
      issuedCount,
      draftCount,
      receivedCount,
      pendingItemsCount,
      totalOrders: orders.length
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((po) => {
      if (activeTab === "DRAFT" && po.status !== "Draft") return false;
      if (activeTab === "ISSUED" && po.status !== "Issued") return false;
      if (activeTab === "PARTIAL" && po.status !== "Partially Received") return false;
      if (activeTab === "RECEIVED" && po.status !== "Received") return false;
      if (activeTab === "CANCELLED" && po.status !== "Cancelled") return false;

      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const poNumMatch = po.poNumber?.toLowerCase().includes(query);
        const vendorMatch = po.vendor?.companyName?.toLowerCase().includes(query);
        const notesMatch = po.notes?.toLowerCase().includes(query);
        const productMatch = po.items?.some((it: any) =>
          it.product?.name?.toLowerCase().includes(query) || it.product?.sku?.toLowerCase().includes(query)
        );
        return poNumMatch || vendorMatch || notesMatch || productMatch;
      }

      return true;
    });
  }, [orders, activeTab, searchTerm]);

  function resetCreateForm() {
    setVendorId("");
    setExpectedDate("");
    setPaymentTerms("Net 30");
    setNotes("");
    setItems([{ productId: "", quantity: 1, rate: 0, gstRate: 18 }]);
    setError("");
  }

  function handleProductChange(idx: number, prodId: string) {
    const selectedProd = products.find((p) => p.id === prodId);
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      productId: prodId,
      rate: selectedProd?.purchasePrice || selectedProd?.sellingPrice || 0,
      gstRate: 18
    };
    setItems(newItems);
  }

  function handleItemQuantityChange(idx: number, qty: number) {
    const newItems = [...items];
    newItems[idx].quantity = Math.max(1, qty || 1);
    setItems(newItems);
  }

  function handleItemRateChange(idx: number, rate: number) {
    const newItems = [...items];
    newItems[idx].rate = Math.max(0, rate || 0);
    setItems(newItems);
  }

  function handleAddItem() {
    setItems([...items, { productId: "", quantity: 1, rate: 0, gstRate: 18 }]);
  }

  function handleRemoveItem(idx: number) {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  // Calculated Create Totals
  const createSubtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0);
  const createTaxAmount = items.reduce((s, it) => s + (it.quantity * it.rate * (it.gstRate || 0)) / 100, 0);
  const createGrandTotal = createSubtotal + createTaxAmount;

  async function handleCreatePO(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      setError("Please select a vendor.");
      return;
    }
    const validItems = items.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      setError("Please add at least one product with valid quantity.");
      return;
    }

    setLoading(true);
    setError("");

    const res = await createPurchaseOrder({
      vendorId,
      expectedDate: expectedDate || undefined,
      notes: notes
        ? `${paymentTerms ? `[Terms: ${paymentTerms}] ` : ""}${notes}`
        : paymentTerms
        ? `Terms: ${paymentTerms}`
        : undefined,
      items: validItems.map((it) => ({
        productId: it.productId,
        quantity: it.quantity,
        rate: it.rate,
        taxAmount: (it.quantity * it.rate * (it.gstRate || 0)) / 100
      }))
    });

    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }

    setCreateOpen(false);
    resetCreateForm();
    window.location.reload();
  }

  async function handleGRN(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedPO) return;
    setLoading(true);
    setError("");
    const fd = new FormData(e.currentTarget);
    const receivedItems = selectedPO.items
      .map((item: any) => ({
        itemId: item.id,
        receivedQty: parseInt((fd.get(`qty_${item.id}`) as string) || "0", 10)
      }))
      .filter((ri: any) => ri.receivedQty > 0);

    if (receivedItems.length === 0) {
      setError("Please enter quantity greater than 0 for at least one item.");
      setLoading(false);
      return;
    }

    const res = await receiveGRN(selectedPO.id, receivedItems);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setGrnOpen(null);
    window.location.reload();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── 1. TOP HEADER ─── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px"
        }}
      >
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
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.45rem", fontWeight: 800, color: "#0f172a" }}>
              Purchase Orders & Inward GRN
            </h1>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.82rem", color: "#64748b" }}>
              Manage supplier procurement, issue PO orders, and verify warehouse Goods Received Notes (GRN).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            resetCreateForm();
            setCreateOpen(true);
          }}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            borderRadius: "10px",
            fontWeight: 700,
            fontSize: "0.88rem",
            backgroundColor: "var(--accent-primary, #4f46e5)",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(79, 70, 229, 0.25)",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.92";
            e.currentTarget.style.transform = "translateY(-1px)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.transform = "none";
          }}
        >
          <Plus size={16} />
          <span>Create Purchase Order</span>
        </button>
      </div>

      {/* ─── 2. TOP KPI CARDS ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "14px"
        }}
      >
        {/* Card 1: Total Procurement Value */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669"
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Total Procurement Value
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", marginTop: "1px" }}>
              ₹{totals.totalProcurement.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              Across {totals.totalOrders} total purchase orders
            </div>
          </div>
        </div>

        {/* Card 2: Active / Issued POs */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb"
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Active Supplier Orders
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#2563eb", marginTop: "1px" }}>
              {totals.issuedCount} {totals.issuedCount === 1 ? "Order" : "Orders"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              Issued & awaiting fulfillment
            </div>
          </div>
        </div>

        {/* Card 3: Pending Inward Items (GRN) */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: totals.pendingItemsCount > 0 ? "#fffbeb" : "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: totals.pendingItemsCount > 0 ? "#d97706" : "#059669"
            }}
          >
            <Boxes size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Pending Inward Qty
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: totals.pendingItemsCount > 0 ? "#d97706" : "#059669", marginTop: "1px" }}>
              {totals.pendingItemsCount.toLocaleString("en-IN")} Units
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              Pending GRN warehouse entry
            </div>
          </div>
        </div>

        {/* Card 4: Fully Received */}
        <div
          className="glass-panel"
          style={{
            padding: "16px 18px",
            display: "flex",
            alignItems: "center",
            gap: "14px",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            border: "1px solid #e2e8f0"
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "10px",
              background: "#ecfdf5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#059669"
            }}
          >
            <CheckCircle2 size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.74rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              Completed Receipts
            </div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#059669", marginTop: "1px" }}>
              {totals.receivedCount} {totals.receivedCount === 1 ? "Order" : "Orders"}
            </div>
            <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "1px" }}>
              100% Inward stock received
            </div>
          </div>
        </div>
      </div>

      {/* ─── 3. FILTER TABS & SEARCH BAR ─── */}
      <div
        className="glass-panel"
        style={{
          padding: "14px 18px",
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          border: "1px solid #e2e8f0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px"
        }}
      >
        {/* Status Tab Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
          {[
            { id: "ALL", label: "All POs", count: orders.length },
            { id: "DRAFT", label: "Draft", count: orders.filter((o) => o.status === "Draft").length },
            { id: "ISSUED", label: "Issued", count: orders.filter((o) => o.status === "Issued").length },
            { id: "PARTIAL", label: "Partially Received", count: orders.filter((o) => o.status === "Partially Received").length },
            { id: "RECEIVED", label: "Received", count: orders.filter((o) => o.status === "Received").length },
            { id: "CANCELLED", label: "Cancelled", count: orders.filter((o) => o.status === "Cancelled").length }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 700 : 500,
                  backgroundColor: isActive ? "var(--accent-primary, #4f46e5)" : "#f8fafc",
                  color: isActive ? "#ffffff" : "#64748b",
                  border: isActive ? "1px solid transparent" : "1px solid #e2e8f0",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    fontSize: "0.68rem",
                    padding: "1px 6px",
                    borderRadius: "10px",
                    backgroundColor: isActive ? "rgba(255,255,255,0.25)" : "#e2e8f0",
                    color: isActive ? "#ffffff" : "#475569",
                    fontWeight: 700
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div style={{ position: "relative", minWidth: "260px" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94a3b8"
            }}
          />
          <input
            type="text"
            placeholder="Search PO #, vendor, or product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: "100%",
              height: "36px",
              padding: "0 32px 0 34px",
              borderRadius: "9999px",
              border: "1px solid #cbd5e1",
              fontSize: "0.82rem",
              backgroundColor: "#f8fafc",
              color: "#0f172a",
              outline: "none"
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "#94a3b8",
                cursor: "pointer",
                padding: "2px"
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─── 4. PURCHASE ORDERS TABLE ─── */}
      <div
        className="glass-panel"
        style={{
          padding: "20px",
          backgroundColor: "#ffffff",
          borderRadius: "14px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}
      >
        <div className="table-responsive" style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  PO Number
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Vendor / Supplier
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Order Date
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Expected Delivery
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase" }}>
                  Items & Products
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                  Total Value (₹)
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.76rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((po) => {
                const totalItemsCount = po.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
                const receivedItemsCount = po.items?.reduce((s: number, i: any) => s + (i.receivedQty || 0), 0) || 0;
                const isFullyReceived = po.status === "Received" || (totalItemsCount > 0 && receivedItemsCount >= totalItemsCount);

                return (
                  <tr
                    key={po.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      transition: "background-color 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#fafafa";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    {/* PO Number */}
                    <td style={{ padding: "14px" }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.85rem",
                          color: "#1d4ed8",
                          backgroundColor: "#eff6ff",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #bfdbfe",
                          display: "inline-block"
                        }}
                      >
                        {po.poNumber}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem" }}>
                        {po.vendor?.companyName || "Vendor"}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        {po.vendor?.contactPerson || (po.vendor?.email ? po.vendor.email : "Supplier")}
                      </div>
                    </td>

                    {/* Order Date */}
                    <td style={{ padding: "14px", color: "#475569", fontSize: "0.82rem" }}>
                      {new Date(po.orderDate || po.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>

                    {/* Expected Delivery */}
                    <td style={{ padding: "14px" }}>
                      {po.expectedDate ? (
                        <span style={{ fontSize: "0.8rem", color: "#334155", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Calendar size={13} color="#64748b" />
                          {new Date(po.expectedDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric"
                          })}
                        </span>
                      ) : (
                        <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>

                    {/* Items & Products */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            padding: "2px 8px",
                            borderRadius: "10px",
                            backgroundColor: isFullyReceived ? "#ecfdf5" : "#f1f5f9",
                            color: isFullyReceived ? "#047857" : "#475569"
                          }}
                        >
                          📦 {po.items?.length || 0} {po.items?.length === 1 ? "Line" : "Lines"} ({receivedItemsCount}/{totalItemsCount} units)
                        </span>
                      </div>
                      {po.items?.[0]?.product?.name && (
                        <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "200px" }}>
                          {po.items[0].product.name}
                          {po.items.length > 1 ? ` +${po.items.length - 1} more` : ""}
                        </div>
                      )}
                    </td>

                    {/* Total Value */}
                    <td style={{ padding: "14px", textAlign: "right", fontWeight: 800, color: "#0f172a", fontSize: "0.92rem", fontVariantNumeric: "tabular-nums" }}>
                      ₹{po.totalValue.toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 700,
                          padding: "3px 10px",
                          borderRadius: "12px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          backgroundColor:
                            po.status === "Received"
                              ? "#ecfdf5"
                              : po.status === "Partially Received"
                              ? "#fffbeb"
                              : po.status === "Issued"
                              ? "#eff6ff"
                              : po.status === "Cancelled"
                              ? "#fef2f2"
                              : "#f1f5f9",
                          color:
                            po.status === "Received"
                              ? "#059669"
                              : po.status === "Partially Received"
                              ? "#d97706"
                              : po.status === "Issued"
                              ? "#2563eb"
                              : po.status === "Cancelled"
                              ? "#dc2626"
                              : "#475569"
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor:
                              po.status === "Received"
                                ? "#059669"
                                : po.status === "Partially Received"
                                ? "#d97706"
                                : po.status === "Issued"
                                ? "#2563eb"
                                : po.status === "Cancelled"
                                ? "#dc2626"
                                : "#64748b"
                          }}
                        />
                        {po.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "14px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {/* Issue Button */}
                        {po.status === "Draft" && (
                          <button
                            type="button"
                            className="action-btn text-blue"
                            onClick={async () => {
                              await updatePOStatus(po.id, "Issued");
                              window.location.reload();
                            }}
                            style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700 }}
                          >
                            <Send size={12} /> Issue
                          </button>
                        )}

                        {/* Receive GRN Button */}
                        {po.status !== "Received" && po.status !== "Cancelled" && po.status !== "Draft" && (
                          <button
                            type="button"
                            className="action-btn text-green"
                            onClick={() => setGrnOpen(po.id)}
                            style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 700 }}
                          >
                            <PackageCheck size={13} /> Receive GRN
                          </button>
                        )}

                        {/* View / Print Voucher Button */}
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => setVoucherPO(po)}
                          style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
                        >
                          <Printer size={12} /> Voucher
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredOrders.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "48px 20px", color: "var(--text-muted)" }}>
                    <ShoppingBag size={40} style={{ margin: "0 auto 10px auto", opacity: 0.4 }} />
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>No Purchase Orders Found</div>
                    <p style={{ margin: "4px 0 14px 0", fontSize: "0.8rem", color: "#64748b" }}>
                      {searchTerm ? "No orders match your search criteria." : "Get started by generating your first supplier purchase order."}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        resetCreateForm();
                        setCreateOpen(true);
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "8px 16px",
                        borderRadius: "8px",
                        backgroundColor: "var(--accent-primary, #4f46e5)",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "0.82rem",
                        fontWeight: 700,
                        cursor: "pointer"
                      }}
                    >
                      <Plus size={15} /> Create Purchase Order
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CREATE PURCHASE ORDER MODAL (Overhauled Modern Form)
      ───────────────────────────────────────────────────────────── */}
      {createOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setCreateOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "840px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(5, 150, 105, 0.25)",
                    flexShrink: 0
                  }}
                >
                  <ShoppingBag size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Create Purchase Order
                  </h2>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    Issue a procurement order to your supplier with line items and delivery terms.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreatePO} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Row 1: Vendor Selection (Full Width) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                  Vendor / Supplier <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <ModernSearchableSelect
                  options={vendorSelectOptions}
                  value={vendorId}
                  onChange={(val) => {
                    setVendorId(val);
                    const sel = vendors.find((v) => v.id === val);
                    if (sel?.paymentTerms) setPaymentTerms(sel.paymentTerms);
                  }}
                  placeholder="-- Select Supplier / Vendor --"
                  searchPlaceholder="Search vendor by company or contact..."
                  required
                />
              </div>

              {/* Row 2: Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Expected Date */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    style={{ height: "38px", fontSize: "0.85rem" }}
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                  />
                </div>

                {/* Payment Terms */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Payment Terms
                  </label>
                  <select
                    className="form-input"
                    style={{ height: "38px", fontSize: "0.85rem" }}
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  >
                    <option value="Net 30">Net 30 Days</option>
                    <option value="Net 15">Net 15 Days</option>
                    <option value="Net 45">Net 45 Days</option>
                    <option value="Immediate COD">Immediate / Cash on Delivery (COD)</option>
                    <option value="100% Advance">100% Advance Payment</option>
                    <option value="50% Advance / 50% on Delivery">50% Advance / 50% on Delivery</option>
                  </select>
                </div>
              </div>

              {/* Row 3: Order Line Items Container */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  backgroundColor: "#f8fafc",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "0.86rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "6px" }}>
                    <span>Order Line Items</span>
                    <span style={{ fontSize: "0.72rem", backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "10px", color: "#475569" }}>
                      {items.length} {items.length === 1 ? "Item" : "Items"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "5px 12px",
                      borderRadius: "6px",
                      backgroundColor: "#eef2ff",
                      color: "var(--accent-primary, #4f46e5)",
                      border: "1px solid #c7d2fe",
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={13} /> Add Line Item
                  </button>
                </div>

                {/* Line Items Table */}
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {items.map((item, idx) => {
                    const lineSubtotal = item.quantity * item.rate;
                    const lineTax = (lineSubtotal * (item.gstRate || 0)) / 100;
                    const lineTotal = lineSubtotal + lineTax;

                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "10px",
                          padding: "12px",
                          display: "grid",
                          gridTemplateColumns: "minmax(220px, 3fr) 90px 120px 80px 110px 36px",
                          gap: "10px",
                          alignItems: "center"
                        }}
                      >
                        {/* Product Select */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                            Product #{idx + 1}
                          </label>
                          <ModernSearchableSelect
                            options={productSelectOptions}
                            value={item.productId}
                            onChange={(val) => handleProductChange(idx, val)}
                            placeholder="-- Choose Product --"
                            searchPlaceholder="Search product by name or SKU..."
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textAlign: "center" }}>
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(idx, parseInt(e.target.value, 10))}
                            className="form-input"
                            style={{ height: "38px", textAlign: "center", fontSize: "0.85rem", fontWeight: 700 }}
                            required
                          />
                        </div>

                        {/* Unit Rate */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textAlign: "right" }}>
                            Unit Rate (₹)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.rate}
                            onChange={(e) => handleItemRateChange(idx, parseFloat(e.target.value))}
                            className="form-input"
                            style={{ height: "38px", textAlign: "right", fontSize: "0.85rem", fontWeight: 700 }}
                            required
                          />
                        </div>

                        {/* GST % */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textAlign: "center" }}>
                            GST %
                          </label>
                          <select
                            value={item.gstRate}
                            onChange={(e) => {
                              const n = [...items];
                              n[idx].gstRate = parseFloat(e.target.value);
                              setItems(n);
                            }}
                            className="form-input"
                            style={{ height: "38px", textAlign: "center", fontSize: "0.8rem" }}
                          >
                            <option value="0">0%</option>
                            <option value="5">5%</option>
                            <option value="12">12%</option>
                            <option value="18">18%</option>
                            <option value="28">28%</option>
                          </select>
                        </div>

                        {/* Line Total */}
                        <div style={{ textAlign: "right" }}>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600 }}>
                            Total (₹)
                          </label>
                          <div style={{ fontWeight: 800, fontSize: "0.9rem", color: "#0f172a", height: "38px", display: "flex", alignItems: "center", justifyContent: "flex-end", fontVariantNumeric: "tabular-nums" }}>
                            ₹{lineTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>

                        {/* Delete Button */}
                        <div style={{ display: "flex", justifyContent: "center", paddingTop: "18px" }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            disabled={items.length <= 1}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: "7px",
                              border: "1px solid #fee2e2",
                              backgroundColor: items.length <= 1 ? "#f8fafc" : "#fef2f2",
                              color: items.length <= 1 ? "#cbd5e1" : "#ef4444",
                              cursor: items.length <= 1 ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center"
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Notes and Calculation Card */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                {/* Notes Textarea */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#334155" }}>
                    Purchase Order Remarks & Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter delivery location, transporter terms, or warehouse dock notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="form-input"
                    style={{ fontSize: "0.82rem", resize: "vertical" }}
                  />
                </div>

                {/* Calculation Summary Card */}
                <div
                  style={{
                    backgroundColor: "#eff6ff",
                    border: "1px solid #bfdbfe",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "8px"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#1e40af" }}>
                    <span>Taxable Subtotal</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      ₹{createSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#1e40af" }}>
                    <span>Estimated Tax / GST</span>
                    <span style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                      + ₹{createTaxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1.5px dashed #93c5fd",
                      paddingTop: "8px",
                      marginTop: "2px",
                      fontSize: "1.05rem",
                      fontWeight: 900,
                      color: "#1e3a8a"
                    }}
                  >
                    <span>Grand Total Value</span>
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      ₹{createGrandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {/* Sticky Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "6px",
                  paddingTop: "14px",
                  borderTop: "1px solid #e2e8f0"
                }}
              >
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.84rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "9px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #059669 0%, #047857 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.86rem",
                    boxShadow: "0 2px 6px rgba(5, 150, 105, 0.25)"
                  }}
                >
                  {loading ? "Generating PO..." : "Confirm & Create PO"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          6. RECEIVE GRN (GOODS RECEIVED NOTE) MODAL
      ───────────────────────────────────────────────────────────── */}
      {grnOpen && selectedPO && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setGrnOpen(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "700px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "18px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                position: "sticky",
                top: 0,
                zIndex: 10
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(16, 185, 129, 0.25)",
                    flexShrink: 0
                  }}
                >
                  <PackageCheck size={20} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0, color: "#0f172a" }}>
                    Receive Inward Goods (GRN) — {selectedPO.poNumber}
                  </h2>
                  <p style={{ fontSize: "0.8rem", margin: "2px 0 0 0", color: "#64748b" }}>
                    Vendor: {selectedPO.vendor?.companyName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGrnOpen(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* GRN Body */}
            <form onSubmit={handleGRN} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ padding: "10px 14px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#475569" }}>
                Enter the exact quantity physically verified at warehouse dock. Inward inventory will be updated immediately.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {selectedPO.items?.map((item: any) => {
                  const pendingQty = (item.quantity || 0) - (item.receivedQty || 0);

                  return (
                    <div
                      key={item.id}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "3fr 1fr 1fr 120px",
                        gap: "12px",
                        alignItems: "center",
                        padding: "12px 14px",
                        backgroundColor: pendingQty > 0 ? "#ffffff" : "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "10px"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.86rem" }}>
                          {item.product?.name || "Product Item"}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b" }}>
                          SKU: {item.product?.sku || "N/A"}
                        </div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>Ordered</div>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.85rem" }}>{item.quantity}</div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase" }}>Pending</div>
                        <div style={{ fontWeight: 800, color: pendingQty > 0 ? "#d97706" : "#059669", fontSize: "0.9rem" }}>
                          {pendingQty}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#047857", fontWeight: 700, display: "block", marginBottom: "2px" }}>
                          Receive Now
                        </label>
                        <input
                          type="number"
                          name={`qty_${item.id}`}
                          min="0"
                          max={pendingQty}
                          defaultValue={pendingQty}
                          disabled={pendingQty <= 0}
                          className="form-input"
                          style={{
                            height: "36px",
                            textAlign: "center",
                            fontWeight: 800,
                            fontSize: "0.9rem",
                            backgroundColor: pendingQty <= 0 ? "#f1f5f9" : "#ffffff"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stock Auto Update Notice */}
              <div style={{ padding: "10px 14px", backgroundColor: "#ecfdf5", borderRadius: "8px", border: "1px solid #a7f3d0", fontSize: "0.78rem", color: "#065f46", display: "flex", alignItems: "center", gap: "8px" }}>
                <ShieldCheck size={16} />
                <span>
                  <strong>Inventory Update:</strong> Verified quantities will instantly increment product stock levels and generate an audited GRN transaction reference.
                </span>
              </div>

              {error && (
                <div style={{ padding: "10px 14px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "8px", fontSize: "0.82rem", fontWeight: 600 }}>
                  {error}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px", paddingTop: "14px", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setGrnOpen(null)}
                  style={{
                    padding: "8px 18px",
                    borderRadius: "8px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 600,
                    cursor: "pointer",
                    fontSize: "0.84rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: "8px 22px",
                    borderRadius: "8px",
                    border: "none",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: 700,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.86rem",
                    boxShadow: "0 2px 6px rgba(16, 185, 129, 0.25)"
                  }}
                >
                  {loading ? "Confirming GRN..." : "Confirm GRN Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          7. PRINTABLE PURCHASE ORDER VOUCHER MODAL
      ───────────────────────────────────────────────────────────── */}
      {voucherPO && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 999999,
            padding: "16px"
          }}
          onClick={() => setVoucherPO(null)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "760px",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              maxHeight: "90vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                borderRadius: "16px 16px 0 0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#059669" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
                  Purchase Order Voucher — {voucherPO.poNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoucherPO(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.3rem",
                  cursor: "pointer",
                  color: "#64748b"
                }}
              >
                ×
              </button>
            </div>

            {/* Printable Content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #059669", paddingBottom: "14px" }}>
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 900, color: "#065f46" }}>PURCHASE ORDER</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>
                    PO #: {voucherPO.poNumber}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>
                    Date: {new Date(voucherPO.orderDate || voucherPO.createdAt).toLocaleDateString("en-IN")}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>Status</div>
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 800,
                      color: voucherPO.status === "Received" ? "#059669" : "#2563eb",
                      backgroundColor: voucherPO.status === "Received" ? "#ecfdf5" : "#eff6ff",
                      padding: "3px 10px",
                      borderRadius: "10px",
                      display: "inline-block",
                      marginTop: "2px"
                    }}
                  >
                    {voucherPO.status}
                  </span>
                </div>
              </div>

              {/* Vendor Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", backgroundColor: "#f8fafc", padding: "14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Supplier / Vendor</div>
                  <div style={{ fontWeight: 800, color: "#0f172a", fontSize: "0.92rem", marginTop: "2px" }}>
                    {voucherPO.vendor?.companyName}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#475569" }}>{voucherPO.vendor?.contactPerson || ""}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{voucherPO.vendor?.email || voucherPO.vendor?.mobile || ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Expected Delivery</div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: "0.88rem", marginTop: "2px" }}>
                    {voucherPO.expectedDate ? new Date(voucherPO.expectedDate).toLocaleDateString("en-IN") : "Standard Delivery"}
                  </div>
                  {voucherPO.notes && (
                    <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "4px" }}>
                      {voucherPO.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #cbd5e1", textAlign: "left", color: "#334155" }}>
                    <th style={{ padding: "8px 10px" }}>#</th>
                    <th style={{ padding: "8px 10px" }}>Item Description</th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>Qty Ordered</th>
                    <th style={{ padding: "8px 10px", textAlign: "center" }}>Qty Received</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ padding: "8px 10px", textAlign: "right" }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucherPO.items?.map((it: any, i: number) => (
                    <tr key={it.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "8px 10px" }}>{i + 1}</td>
                      <td style={{ padding: "8px 10px", fontWeight: 600, color: "#0f172a" }}>
                        {it.product?.name || "Product"} {it.product?.sku ? `(${it.product.sku})` : ""}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{it.quantity}</td>
                      <td style={{ padding: "8px 10px", textAlign: "center", color: it.receivedQty >= it.quantity ? "#059669" : "#d97706", fontWeight: 700 }}>
                        {it.receivedQty || 0}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        ₹{it.rate?.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "8px 10px", textAlign: "right", fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                        ₹{(it.quantity * it.rate).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Grand Total */}
              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "2px solid #059669", paddingTop: "10px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Total Purchase Amount</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 900, color: "#065f46" }}>
                    ₹{voucherPO.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "10px", borderRadius: "0 0 16px 16px" }}>
              <button
                type="button"
                onClick={() => setVoucherPO(null)}
                style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 600, cursor: "pointer", fontSize: "0.84rem" }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: "8px 20px", borderRadius: "8px", border: "none", backgroundColor: "#059669", color: "#ffffff", fontWeight: 700, cursor: "pointer", fontSize: "0.84rem", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Printer size={14} /> Print PO Voucher
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
