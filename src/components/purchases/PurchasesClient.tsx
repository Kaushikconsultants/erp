"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createPurchaseOrder, updatePurchaseOrder, updatePOStatus, receiveGRN, deletePurchaseOrder, deleteMultiplePurchaseOrders } from "@/app/actions/purchaseActions";
import ModernSearchableSelect, { SelectOption } from "@/components/ui/ModernSearchableSelect";
import QuickAddProductModal from "@/components/products/QuickAddProductModal";
import TablePagination, { paginate } from "@/components/ui/TablePagination";
import * as XLSX from "xlsx";
import {
  ShoppingBag,
  Plus,
  Search,
  X,
  PackageCheck,
  Package,
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
  ShieldCheck,
  ChevronDown,
  CreditCard,
  Percent,
  Receipt,
  FileSpreadsheet,
  Pencil,
  Download,
  Loader2
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
  const searchParams = useSearchParams();
  const [orders, setOrders] = useState(initialOrders);
  const [productList, setProductList] = useState<ProductOption[]>(products);
  const [vendorList, setVendorList] = useState<VendorOption[]>(vendors);
  const [createOpen, setCreateOpen] = useState(false);
  const [grnOpen, setGrnOpen] = useState<string | null>(null);
  const [voucherPO, setVoucherPO] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Pagination state: default 25 per page (options: 25, 50, 100, 200)
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const tableContainerRef = React.useRef<HTMLDivElement>(null);

  // Multi-select & Export State
  const [selectedPOIds, setSelectedPOIds] = useState<Set<string>>(new Set());
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


  // Quick Add Product State
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddTargetIdx, setQuickAddTargetIdx] = useState<number | null>(null);
  const [quickAddInitialName, setQuickAddInitialName] = useState<string>("");

  useEffect(() => {
    setProductList(products);
  }, [products]);

  useEffect(() => {
    setVendorList(vendors);
  }, [vendors]);

  // Create Form State
  const [editingPO, setEditingPO] = useState<any | null>(null);
  const [vendorId, setVendorId] = useState<string>("");
  const [expectedDate, setExpectedDate] = useState<string>("");
  const [paymentTerms, setPaymentTerms] = useState<string>("Net 30 Days");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<POItemForm[]>([
    { productId: "", quantity: 1, rate: 0, gstRate: 18 }
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const act = searchParams?.get('action');
    if (act === 'new' || act === 'create') {
      setCreateOpen(true);
    }
  }, [searchParams]);

  const selectedPO = orders.find((o) => o.id === grnOpen);

  // Vendor options for ModernSearchableSelect
  const vendorSelectOptions: SelectOption[] = useMemo(() => {
    return vendorList.map((v) => ({
      value: v.id,
      label: v.companyName,
      subLabel: v.contactPerson
        ? `Contact: ${v.contactPerson}${v.mobile ? ` • ${v.mobile}` : ""}`
        : v.gstNumber
        ? `GSTIN: ${v.gstNumber}`
        : undefined,
      badge: v.gstNumber ? "GST Registered" : undefined
    }));
  }, [vendorList]);

  // Product options for ModernSearchableSelect
  const productSelectOptions: SelectOption[] = useMemo(() => {
    return productList.map((p) => ({
      value: p.id,
      label: p.name,
      subLabel: `SKU: ${p.sku || "N/A"} | Purchase Price: ₹${(p.purchasePrice || p.sellingPrice || 0).toLocaleString("en-IN")}`
    }));
  }, [productList]);

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

  // Reset to first page when search, tab, or pageSize changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeTab, pageSize]);

  const paginatedOrders = useMemo(() => {
    return paginate(filteredOrders, currentPage, pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  const isAllSelected = paginatedOrders.length > 0 && paginatedOrders.every((po) => selectedPOIds.has(po.id));
  const isSomeSelected = paginatedOrders.some((po) => selectedPOIds.has(po.id));

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = isSomeSelected && !isAllSelected;
    }
  }, [isSomeSelected, isAllSelected]);

  const handleToggleSelect = (id: string) => {
    setSelectedPOIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedPOIds((prev) => {
        const next = new Set(prev);
        paginatedOrders.forEach((po) => next.delete(po.id));
        return next;
      });
    } else {
      setSelectedPOIds((prev) => {
        const next = new Set(prev);
        paginatedOrders.forEach((po) => next.add(po.id));
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPOIds.size === 0) return;
    const count = selectedPOIds.size;
    if (!confirm(`Are you sure you want to delete ${count} selected purchase order(s)? This will reverse stock if received and delete items.`)) {
      return;
    }

    setIsBulkDeleting(true);
    try {
      const ids = Array.from(selectedPOIds);
      const res = await deleteMultiplePurchaseOrders(ids);
      if (res?.error) {
        alert(res.error);
      } else {
        setOrders((prev) => prev.filter((po) => !selectedPOIds.has(po.id)));
        setSelectedPOIds(new Set());
        if (res?.message) {
          alert(res.message);
        }
      }
    } catch (err: any) {
      alert(err?.message || "Failed to bulk delete purchase orders");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleExport = (format: "xlsx" | "csv") => {
    const targetPOs = selectedPOIds.size > 0
      ? orders.filter((po) => selectedPOIds.has(po.id))
      : filteredOrders;

    if (targetPOs.length === 0) {
      alert("No purchase orders available to export.");
      return;
    }

    const rows = targetPOs.map((po) => {
      const totalQty = po.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
      const receivedQty = po.items?.reduce((s: number, i: any) => s + (i.receivedQty || 0), 0) || 0;
      return {
        "PO Number": po.poNumber || "",
        "Vendor": po.vendor?.companyName || "",
        "Vendor Mobile": po.vendor?.mobile || "",
        "Order Date": po.createdAt ? new Date(po.createdAt).toLocaleDateString("en-IN") : "",
        "Expected Date": po.expectedDate ? new Date(po.expectedDate).toLocaleDateString("en-IN") : "",
        "Payment Terms": po.notes?.includes("[Terms:") ? (po.notes.match(/\[Terms:\s*([^\]]+)\]/) || [])[1] : "Net 30 Days",
        "Total Value (₹)": po.totalValue || 0,
        "Total Qty": totalQty,
        "Received Qty": receivedQty,
        "Status": po.status || "Draft"
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PurchaseOrders");
    const dateStr = new Date().toISOString().split("T")[0];

    if (format === "xlsx") {
      XLSX.writeFile(wb, `PurchaseOrders_Export_${dateStr}.xlsx`);
    } else {
      const csv = XLSX.utils.sheet_to_csv(ws);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `PurchaseOrders_Export_${dateStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setIsExportMenuOpen(false);
  };


  function resetCreateForm() {
    setEditingPO(null);
    setVendorId("");
    setExpectedDate("");
    setPaymentTerms("Net 30 Days");
    setNotes("");
    setItems([{ productId: "", quantity: 1, rate: 0, gstRate: 18 }]);
    setError("");
  }

  function handleOpenEditPO(po: any) {
    setEditingPO(po);
    setVendorId(po.vendorId || "");
    setExpectedDate(po.expectedDate ? new Date(po.expectedDate).toISOString().split('T')[0] : "");

    // Extract payment terms if notes has "[Terms: ...]"
    let noteText = po.notes || "";
    let extractedTerms = "Net 30 Days";
    const termsMatch = noteText.match(/\[Terms:\s*([^\]]+)\]/);
    if (termsMatch) {
      extractedTerms = termsMatch[1];
      noteText = noteText.replace(/\[Terms:\s*[^\]]+\]\s*/, "").trim();
    } else if (noteText.startsWith("Terms: ")) {
      extractedTerms = noteText.replace("Terms: ", "").trim();
      noteText = "";
    }
    setPaymentTerms(extractedTerms);
    setNotes(noteText);

    if (po.items && po.items.length > 0) {
      setItems(
        po.items.map((it: any) => {
          const lineVal = (it.quantity || 1) * (it.rate || 0);
          const computedGst = it.taxAmount && lineVal > 0 ? Math.round((it.taxAmount / lineVal) * 100) : 18;
          return {
            productId: it.productId || "",
            quantity: it.quantity || 1,
            rate: it.rate || 0,
            gstRate: computedGst
          };
        })
      );
    } else {
      setItems([{ productId: "", quantity: 1, rate: 0, gstRate: 18 }]);
    }

    setError("");
    setCreateOpen(true);
  }

  function handleProductChange(idx: number, prodId: string) {
    const selectedProd = productList.find((p) => p.id === prodId);
    const newItems = [...items];
    newItems[idx] = {
      ...newItems[idx],
      productId: prodId,
      rate: selectedProd?.purchasePrice || selectedProd?.sellingPrice || 0,
      gstRate: newItems[idx]?.gstRate || 18
    };
    setItems(newItems);
  }

  function handleOpenQuickAdd(targetIdx?: number, initialName?: string) {
    setQuickAddTargetIdx(targetIdx !== undefined ? targetIdx : null);
    setQuickAddInitialName(initialName || "");
    setQuickAddOpen(true);
  }

  function handleQuickProductCreated(newProd: {
    id: string;
    name: string;
    sku?: string | null;
    sellingPrice: number;
    purchasePrice?: number | null;
    category?: string | null;
    gstRate?: number;
  }) {
    setProductList((prev) => [newProd, ...prev.filter((p) => p.id !== newProd.id)]);

    if (quickAddTargetIdx !== null && quickAddTargetIdx >= 0 && quickAddTargetIdx < items.length) {
      const newItems = [...items];
      newItems[quickAddTargetIdx] = {
        ...newItems[quickAddTargetIdx],
        productId: newProd.id,
        rate: newProd.purchasePrice || newProd.sellingPrice || 0,
        gstRate: newProd.gstRate || 18
      };
      setItems(newItems);
    } else {
      // If the first line item in the PO is unselected, fill it in; otherwise append a new line item
      const emptyIdx = items.findIndex((it) => !it.productId);
      if (emptyIdx !== -1) {
        const newItems = [...items];
        newItems[emptyIdx] = {
          ...newItems[emptyIdx],
          productId: newProd.id,
          rate: newProd.purchasePrice || newProd.sellingPrice || 0,
          gstRate: newProd.gstRate || 18
        };
        setItems(newItems);
      } else {
        setItems((prev) => [
          ...prev,
          {
            productId: newProd.id,
            quantity: 1,
            rate: newProd.purchasePrice || newProd.sellingPrice || 0,
            gstRate: newProd.gstRate || 18
          }
        ]);
      }
    }
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
      setError("Please select a vendor / supplier.");
      return;
    }
    const validItems = items.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      setError("Please add at least one product with valid quantity.");
      return;
    }

    setLoading(true);
    setError("");

    const formattedNotes = notes
      ? `${paymentTerms ? `[Terms: ${paymentTerms}] ` : ""}${notes}`
      : paymentTerms
      ? `Terms: ${paymentTerms}`
      : undefined;

    const payloadItems = validItems.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      rate: it.rate,
      taxAmount: (it.quantity * it.rate * (it.gstRate || 0)) / 100
    }));

    if (editingPO) {
      const res = await updatePurchaseOrder(editingPO.id, {
        vendorId,
        expectedDate: expectedDate || undefined,
        notes: formattedNotes,
        status: editingPO.status,
        items: payloadItems
      });

      setLoading(false);
      if (res.error) {
        setError(res.error);
        return;
      }

      setOrders((prev) => prev.map((o) => (o.id === editingPO.id ? res.po : o)));
      setCreateOpen(false);
      resetCreateForm();
    } else {
      const res = await createPurchaseOrder({
        vendorId,
        expectedDate: expectedDate || undefined,
        notes: formattedNotes,
        items: payloadItems
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

  async function handleDeletePO(poId: string, poNumber: string) {
    if (!confirm(`Are you sure you want to delete Purchase Order #${poNumber}? Any received GRN stock will be reversed.`)) return;
    setLoading(true);
    const res = await deletePurchaseOrder(poId);
    setLoading(false);
    if (res.error) {
      alert(res.error);
    } else {
      setOrders(prev => prev.filter(o => o.id !== poId));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* ─── 1. TOP COMMAND HEADER ─── */}
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
              borderRadius: "var(--radius-lg, 12px)",
              background: "var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%))",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px var(--accent-light, rgba(79, 70, 229, 0.25))",
              flexShrink: 0
            }}
          >
            <ShoppingBag size={22} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 600, color: "var(--text-primary, #0f172a)", letterSpacing: "-0.015em" }}>
              Purchase Orders & Inward GRN
            </h1>
            <p style={{ margin: "3px 0 0 0", fontSize: "0.82rem", fontWeight: 400, color: "var(--text-secondary, #64748b)" }}>
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
            padding: "9px 18px",
            borderRadius: "var(--radius-md, 8px)",
            fontWeight: 600,
            fontSize: "0.86rem",
            background: "var(--accent-gradient, linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%))",
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px var(--accent-light, rgba(79, 70, 229, 0.25))",
            transition: "all 0.15s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "0.94";
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
              background: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563eb"
            }}
          >
            <TrendingUp size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Total Procurement Value
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#0f172a", marginTop: "1px" }}>
              ₹{totals.totalProcurement.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 400, color: "#94a3b8", marginTop: "1px" }}>
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
              background: "#e0e7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#4f46e5"
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Active Supplier Orders
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#4f46e5", marginTop: "1px" }}>
              {totals.issuedCount} {totals.issuedCount === 1 ? "Order" : "Orders"}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 400, color: "#94a3b8", marginTop: "1px" }}>
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
            <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Pending Inward Qty
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: totals.pendingItemsCount > 0 ? "#d97706" : "#059669", marginTop: "1px" }}>
              {totals.pendingItemsCount.toLocaleString("en-IN")} Units
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 400, color: "#94a3b8", marginTop: "1px" }}>
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
            <div style={{ color: "#64748b", fontSize: "0.72rem", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Completed Receipts
            </div>
            <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "#059669", marginTop: "1px" }}>
              {totals.receivedCount} {totals.receivedCount === 1 ? "Order" : "Orders"}
            </div>
            <div style={{ fontSize: "0.72rem", fontWeight: 400, color: "#94a3b8", marginTop: "1px" }}>
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
                  padding: "5px 12px",
                  borderRadius: "20px",
                  fontSize: "0.78rem",
                  fontWeight: isActive ? 600 : 450,
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
                    fontWeight: 500
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Export Dropdown Menu */}
          <div className="erp-export-dropdown-container" ref={exportMenuRef}>
            <button
              type="button"
              className="btn-erp-export"
              onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
              title="Export purchase orders to Excel or CSV"
            >
              <Download size={14} />
              <span>Export {selectedPOIds.size > 0 ? `(${selectedPOIds.size})` : ''}</span>
              <ChevronDown size={13} style={{ transform: isExportMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
            </button>

            {isExportMenuOpen && (
              <div className="erp-export-dropdown-menu">
                <div className="erp-export-dropdown-header">
                  <span>{selectedPOIds.size > 0 ? `Export Selected (${selectedPOIds.size})` : `Export All (${filteredOrders.length})`}</span>
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
          {selectedPOIds.size > 0 && (
            <>
              <div className="btn-selection-count" title={`${selectedPOIds.size} purchase orders selected`}>
                <span className="selection-count-pill">{selectedPOIds.size}</span>
                <span>Selected</span>
              </div>

              <button
                type="button"
                className="btn-select-all"
                onClick={handleToggleSelectAll}
                title={isAllSelected ? "Deselect page" : `Select all ${paginatedOrders.length} on page`}
              >
                <span>{isAllSelected ? "Deselect Page" : `Select Page (${paginatedOrders.length})`}</span>
              </button>

              <button
                type="button"
                className="btn-delete-selected"
                onClick={handleBulkDelete}
                disabled={isBulkDeleting}
                title="Delete selected purchase orders"
              >
                {isBulkDeleting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Delete ({selectedPOIds.size})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="btn-clear-selection"
                onClick={() => setSelectedPOIds(new Set())}
                title="Clear selection"
              >
                <X size={14} />
              </button>
            </>
          )}

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
      </div>

      {/* ─── 4. PURCHASE ORDERS TABLE ─── */}
      <div
        ref={tableContainerRef}
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
                <th className="table-checkbox-cell">
                  <input
                    type="checkbox"
                    ref={headerCheckboxRef}
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="table-checkbox"
                  />
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  PO Number
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Vendor / Supplier
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Order Date
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Expected Delivery
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Items & Products
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
                  Total Value (₹)
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>
                  Status
                </th>
                <th style={{ padding: "12px 14px", fontSize: "0.74rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((po) => {
                const totalItemsCount = po.items?.reduce((s: number, i: any) => s + (i.quantity || 0), 0) || 0;
                const receivedItemsCount = po.items?.reduce((s: number, i: any) => s + (i.receivedQty || 0), 0) || 0;
                const isFullyReceived = po.status === "Received" || (totalItemsCount > 0 && receivedItemsCount >= totalItemsCount);

                return (
                  <tr
                    key={po.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: selectedPOIds.has(po.id) ? "#f5f3ff" : undefined,
                      transition: "background-color 0.15s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedPOIds.has(po.id)) e.currentTarget.style.backgroundColor = "#fafafa";
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedPOIds.has(po.id)) e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <td className="table-checkbox-cell">
                      <input
                        type="checkbox"
                        checked={selectedPOIds.has(po.id)}
                        onChange={() => handleToggleSelect(po.id)}
                        className="table-checkbox"
                      />
                    </td>
                    {/* PO Number */}
                    <td style={{ padding: "14px" }}>
                      <span
                        style={{
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          color: "#4f46e5",
                          backgroundColor: "#eef2ff",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "1px solid #c7d2fe",
                          display: "inline-block"
                        }}
                      >
                        {po.poNumber}
                      </span>
                    </td>

                    {/* Vendor */}
                    <td style={{ padding: "14px" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.86rem" }}>
                        {po.vendor?.companyName || "Vendor"}
                      </div>
                      <div style={{ fontSize: "0.74rem", fontWeight: 400, color: "#64748b" }}>
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
                            fontSize: "0.74rem",
                            fontWeight: 500,
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
                    <td style={{ padding: "14px", textAlign: "right", fontWeight: 650, color: "#0f172a", fontSize: "0.9rem", fontVariantNumeric: "tabular-nums" }}>
                      ₹{po.totalValue.toLocaleString("en-IN")}
                    </td>

                    {/* Status */}
                    <td style={{ padding: "14px", textAlign: "center" }}>
                      <span
                        style={{
                          fontSize: "0.74rem",
                          fontWeight: 500,
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
                        {/* Edit Button */}
                        <button
                          type="button"
                          className="action-btn"
                          onClick={() => handleOpenEditPO(po)}
                          title="Edit Purchase Order"
                          style={{ padding: "4px 8px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", color: "#4f46e5", border: "1px solid #c7d2fe", backgroundColor: "#eef2ff", fontWeight: 600, borderRadius: "6px" }}
                        >
                          <Pencil size={12} /> Edit
                        </button>

                        {/* Issue Button */}
                        {po.status === "Draft" && (
                          <button
                            type="button"
                            className="action-btn text-blue"
                            onClick={async () => {
                              await updatePOStatus(po.id, "Issued");
                              window.location.reload();
                            }}
                            style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}
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
                            style={{ padding: "4px 10px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", fontWeight: 600 }}
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

                        {/* Delete PO Button */}
                        <button
                          type="button"
                          className="action-btn text-red"
                          onClick={() => handleDeletePO(po.id, po.poNumber)}
                          title="Delete / Cancel Purchase Order"
                          style={{ padding: "4px 8px", fontSize: "0.78rem", display: "inline-flex", alignItems: "center", gap: "4px", color: "#dc2626" }}
                        >
                          <Trash2 size={12} />
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
                    <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "#0f172a" }}>No Purchase Orders Found</div>
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
                        background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%)",
                        color: "#ffffff",
                        border: "none",
                        fontSize: "0.82rem",
                        fontWeight: 600,
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

        {/* ─── PAGINATION FOOTER ─── */}
        <TablePagination
          totalCount={filteredOrders.length}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          itemName="purchase orders"
          containerRef={tableContainerRef}
          style={{ margin: "16px -20px -20px -20px", borderBottomLeftRadius: "14px", borderBottomRightRadius: "14px" }}
        />
      </div>

      {/* ─────────────────────────────────────────────────────────────
          5. CREATE PURCHASE ORDER MODAL (Modernized & Theme Aligned)
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
              maxWidth: "860px",
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
              maxHeight: "92vh",
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
                padding: "20px 26px",
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
                    width: 42,
                    height: 42,
                    borderRadius: "11px",
                    background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(79, 70, 229, 0.28)",
                    flexShrink: 0
                  }}
                >
                  <ShoppingBag size={21} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                    {editingPO ? `Edit Purchase Order — ${editingPO.poNumber}` : "Create Purchase Order"}
                  </h2>
                  <p style={{ fontSize: "0.8rem", fontWeight: 400, margin: "2px 0 0 0", color: "#64748b" }}>
                    {editingPO ? "Update vendor procurement items, schedule, or pricing details." : "Issue an official procurement order to your registered supplier with line items and delivery terms."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "9px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fee2e2";
                  e.currentTarget.style.color = "#dc2626";
                  e.currentTarget.style.borderColor = "#fecaca";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleCreatePO} style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* Row 1: Vendor Selection */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Building2 size={14} color="#4f46e5" />
                  <span>Vendor / Supplier</span>
                  <span style={{ color: "#ef4444" }}>*</span>
                </label>
                <ModernSearchableSelect
                  options={vendorSelectOptions}
                  value={vendorId}
                  onChange={(val) => {
                    setVendorId(val);
                    const sel = vendors.find((v) => v.id === val);
                    if (sel?.paymentTerms) setPaymentTerms(sel.paymentTerms);
                  }}
                  placeholder="-- Choose Supplier / Vendor --"
                  searchPlaceholder="Search vendor by company or contact..."
                  required
                />
              </div>

              {/* Row 2: Metadata Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                {/* Expected Date */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={14} color="#4f46e5" />
                    <span>Expected Delivery Date</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <DatePicker
                      
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 12px 0 38px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        color: "#0f172a",
                        outline: "none",
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                        boxSizing: "border-box"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    />
                    <Calendar
                      size={16}
                      style={{
                        position: "absolute",
                        left: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#94a3b8",
                        pointerEvents: "none"
                      }}
                    />
                  </div>
                </div>

                {/* Payment Terms */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b", display: "flex", alignItems: "center", gap: "4px" }}>
                    <CreditCard size={14} color="#4f46e5" />
                    <span>Payment Terms</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={paymentTerms}
                      onChange={(e) => setPaymentTerms(e.target.value)}
                      style={{
                        width: "100%",
                        height: "40px",
                        padding: "0 34px 0 14px",
                        backgroundColor: "#f8fafc",
                        border: "1px solid #cbd5e1",
                        borderRadius: "10px",
                        fontSize: "0.85rem",
                        fontWeight: 500,
                        color: "#0f172a",
                        outline: "none",
                        appearance: "none",
                        WebkitAppearance: "none",
                        fontFamily: "inherit",
                        transition: "all 0.15s ease",
                        boxSizing: "border-box",
                        cursor: "pointer"
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.backgroundColor = "#ffffff";
                        e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = "#cbd5e1";
                        e.currentTarget.style.backgroundColor = "#f8fafc";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <option value="Net 30 Days">Net 30 Days</option>
                      <option value="Net 15 Days">Net 15 Days</option>
                      <option value="Net 45 Days">Net 45 Days</option>
                      <option value="Immediate COD">Immediate / Cash on Delivery (COD)</option>
                      <option value="100% Advance">100% Advance Payment</option>
                      <option value="50% Advance / 50% on Delivery">50% Advance / 50% on Delivery</option>
                    </select>
                    <ChevronDown
                      size={15}
                      style={{
                        position: "absolute",
                        right: "12px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "#64748b",
                        pointerEvents: "none"
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Order Line Items Container */}
              <div
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  backgroundColor: "#f8fafc",
                  padding: "16px 18px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "#0f172a", display: "flex", alignItems: "center", gap: "8px" }}>
                    <FileSpreadsheet size={16} color="#4f46e5" />
                    <span>Order Line Items</span>
                    <span style={{ fontSize: "0.72rem", backgroundColor: "#e2e8f0", padding: "2px 8px", borderRadius: "10px", color: "#475569", fontWeight: 500 }}>
                      {items.length} {items.length === 1 ? "Item" : "Items"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenQuickAdd()}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#f0fdf4",
                        color: "#15803d",
                        border: "1px solid #bbf7d0",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 2px rgba(22, 101, 52, 0.05)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#dcfce7";
                        e.currentTarget.style.borderColor = "#86efac";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f0fdf4";
                        e.currentTarget.style.borderColor = "#bbf7d0";
                      }}
                      title="Quick create a new item / raw material"
                    >
                      <Plus size={14} /> New Product / Item
                    </button>

                    <button
                      type="button"
                      onClick={handleAddItem}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        padding: "6px 14px",
                        borderRadius: "8px",
                        backgroundColor: "#eef2ff",
                        color: "var(--accent-primary, #4f46e5)",
                        border: "1px solid #c7d2fe",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: "0 1px 2px rgba(79, 70, 229, 0.08)"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.color = "#ffffff";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#eef2ff";
                        e.currentTarget.style.color = "var(--accent-primary, #4f46e5)";
                        e.currentTarget.style.borderColor = "#c7d2fe";
                      }}
                    >
                      <Plus size={14} /> Add Line Item
                    </button>
                  </div>
                </div>

                {/* Line Items List */}
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
                          borderRadius: "12px",
                          padding: "14px 16px",
                          display: "grid",
                          gridTemplateColumns: "minmax(220px, 3.2fr) 95px 130px 90px 115px 36px",
                          gap: "12px",
                          alignItems: "center",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                        }}
                      >
                        {/* Product Select */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Product #{idx + 1}
                          </label>
                          <ModernSearchableSelect
                            options={productSelectOptions}
                            value={item.productId}
                            onChange={(val) => handleProductChange(idx, val)}
                            placeholder="-- Choose Product / Item --"
                            searchPlaceholder="Search product by name or SKU..."
                            onAddNew={(search) => handleOpenQuickAdd(idx, search)}
                            addNewLabel="+ Add New Product / Item"
                            required
                          />
                        </div>

                        {/* Quantity */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>
                            Qty
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemQuantityChange(idx, parseInt(e.target.value, 10))}
                            style={{
                              width: "100%",
                              height: "38px",
                              backgroundColor: "#f8fafc",
                              border: "1px solid #cbd5e1",
                              borderRadius: "8px",
                              textAlign: "center",
                              fontSize: "0.88rem",
                              fontWeight: 600,
                              color: "#0f172a",
                              outline: "none",
                              boxSizing: "border-box",
                              transition: "all 0.15s ease"
                            }}
                            onFocus={(e) => {
                              e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                              e.currentTarget.style.backgroundColor = "#ffffff";
                              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.borderColor = "#cbd5e1";
                              e.currentTarget.style.backgroundColor = "#f8fafc";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                            required
                          />
                        </div>

                        {/* Unit Rate */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "right" }}>
                            Unit Rate (₹)
                          </label>
                          <div style={{ position: "relative" }}>
                            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b", fontWeight: 600, fontSize: "0.8rem", pointerEvents: "none" }}>₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.rate}
                              onChange={(e) => handleItemRateChange(idx, parseFloat(e.target.value))}
                              style={{
                                width: "100%",
                                height: "38px",
                                paddingLeft: "24px",
                                paddingRight: "10px",
                                backgroundColor: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                textAlign: "right",
                                fontSize: "0.88rem",
                                fontWeight: 600,
                                color: "#0f172a",
                                outline: "none",
                                boxSizing: "border-box",
                                fontVariantNumeric: "tabular-nums",
                                transition: "all 0.15s ease"
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#cbd5e1";
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                              required
                            />
                          </div>
                        </div>

                        {/* GST % */}
                        <div>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "center" }}>
                            GST %
                          </label>
                          <div style={{ position: "relative" }}>
                            <select
                              value={item.gstRate}
                              onChange={(e) => {
                                const n = [...items];
                                n[idx].gstRate = parseFloat(e.target.value);
                                setItems(n);
                              }}
                              style={{
                                width: "100%",
                                height: "38px",
                                padding: "0 22px 0 8px",
                                backgroundColor: "#f8fafc",
                                border: "1px solid #cbd5e1",
                                borderRadius: "8px",
                                textAlign: "center",
                                fontSize: "0.82rem",
                                fontWeight: 500,
                                color: "#0f172a",
                                outline: "none",
                                appearance: "none",
                                WebkitAppearance: "none",
                                boxSizing: "border-box",
                                cursor: "pointer"
                              }}
                              onFocus={(e) => {
                                e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                                e.currentTarget.style.backgroundColor = "#ffffff";
                                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                              }}
                              onBlur={(e) => {
                                e.currentTarget.style.borderColor = "#cbd5e1";
                                e.currentTarget.style.backgroundColor = "#f8fafc";
                                e.currentTarget.style.boxShadow = "none";
                              }}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                            <ChevronDown
                              size={12}
                              style={{
                                position: "absolute",
                                right: "6px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: "#64748b",
                                pointerEvents: "none"
                              }}
                            />
                          </div>
                        </div>

                        {/* Line Total */}
                        <div style={{ textAlign: "right" }}>
                          <label style={{ fontSize: "0.72rem", color: "#64748b", display: "block", marginBottom: "4px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Total (₹)
                          </label>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: "0.92rem",
                              color: "#0f172a",
                              height: "38px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "flex-end",
                              fontVariantNumeric: "tabular-nums"
                            }}
                          >
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
                              borderRadius: "8px",
                              border: "1px solid #fee2e2",
                              backgroundColor: items.length <= 1 ? "#f8fafc" : "#fef2f2",
                              color: items.length <= 1 ? "#cbd5e1" : "#ef4444",
                              cursor: items.length <= 1 ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              transition: "all 0.15s ease"
                            }}
                            onMouseEnter={(e) => {
                              if (items.length > 1) {
                                e.currentTarget.style.backgroundColor = "#fee2e2";
                                e.currentTarget.style.transform = "scale(1.05)";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (items.length > 1) {
                                e.currentTarget.style.backgroundColor = "#fef2f2";
                                e.currentTarget.style.transform = "none";
                              }
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
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: "16px" }}>
                {/* Notes Textarea */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>
                    Purchase Order Remarks & Instructions
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter delivery location, transporter terms, dock notes, or special handling instructions..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      backgroundColor: "#f8fafc",
                      border: "1px solid #cbd5e1",
                      borderRadius: "10px",
                      fontSize: "0.84rem",
                      fontFamily: "inherit",
                      color: "#0f172a",
                      outline: "none",
                      resize: "vertical",
                      minHeight: "94px",
                      boxSizing: "border-box",
                      transition: "all 0.15s ease"
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = "var(--accent-primary, #4f46e5)";
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.boxShadow = "0 0 0 3px rgba(79, 70, 229, 0.12)";
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = "#cbd5e1";
                      e.currentTarget.style.backgroundColor = "#f8fafc";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  />
                </div>

                {/* Calculation Summary Card */}
                <div
                  style={{
                    background: "linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)",
                    border: "1.5px solid #bfdbfe",
                    borderRadius: "12px",
                    padding: "16px 20px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "10px",
                    boxShadow: "0 2px 6px rgba(37, 99, 235, 0.05)"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                    <span>Taxable Subtotal</span>
                    <span style={{ fontWeight: 600, color: "#1e293b", fontVariantNumeric: "tabular-nums" }}>
                      ₹{createSubtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.84rem", color: "#475569" }}>
                    <span>Estimated Tax / GST</span>
                    <span style={{ fontWeight: 600, color: "#2563eb", fontVariantNumeric: "tabular-nums" }}>
                      + ₹{createTaxAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1.5px dashed #93c5fd",
                      paddingTop: "10px",
                      marginTop: "2px",
                      fontSize: "1.15rem",
                      fontWeight: 700,
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
                <div
                  style={{
                    padding: "11px 16px",
                    backgroundColor: "#fef2f2",
                    border: "1px solid #fecaca",
                    color: "#b91c1c",
                    borderRadius: "10px",
                    fontSize: "0.84rem",
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}

              {/* Sticky Footer */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                  marginTop: "6px",
                  paddingTop: "16px",
                  borderTop: "1px solid #e2e8f0"
                }}
              >
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  style={{
                    padding: "9px 20px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "0.86rem",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#f1f5f9";
                    e.currentTarget.style.color = "#0f172a";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#ffffff";
                    e.currentTarget.style.color = "#475569";
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.86rem",
                    boxShadow: "0 4px 14px rgba(79, 70, 229, 0.3)",
                    transition: "all 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.boxShadow = "0 6px 20px rgba(79, 70, 229, 0.4)";
                      e.currentTarget.style.transform = "translateY(-1px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.currentTarget.style.boxShadow = "0 4px 14px rgba(79, 70, 229, 0.3)";
                      e.currentTarget.style.transform = "none";
                    }
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>{loading ? (editingPO ? "Updating PO..." : "Generating PO...") : (editingPO ? "Update Purchase Order" : "Confirm & Create PO")}</span>
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
              maxWidth: "720px",
              backgroundColor: "#ffffff",
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
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
                padding: "20px 26px",
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
                    width: 42,
                    height: 42,
                    borderRadius: "11px",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.28)",
                    flexShrink: 0
                  }}
                >
                  <PackageCheck size={21} />
                </div>
                <div>
                  <h2 style={{ fontSize: "1.15rem", fontWeight: 600, margin: 0, color: "#0f172a" }}>
                    Receive Inward Goods (GRN) — {selectedPO.poNumber}
                  </h2>
                  <p style={{ fontSize: "0.8rem", fontWeight: 400, margin: "2px 0 0 0", color: "#64748b" }}>
                    Vendor: {selectedPO.vendor?.companyName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGrnOpen(null)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "9px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#f8fafc",
                  color: "#64748b",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#fee2e2";
                  e.currentTarget.style.color = "#dc2626";
                  e.currentTarget.style.borderColor = "#fecaca";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#f8fafc";
                  e.currentTarget.style.color = "#64748b";
                  e.currentTarget.style.borderColor = "#e2e8f0";
                }}
              >
                <X size={17} />
              </button>
            </div>

            {/* GRN Body */}
            <form onSubmit={handleGRN} style={{ padding: "22px 26px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ padding: "12px 16px", backgroundColor: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#475569" }}>
                Enter the exact quantity physically verified at the warehouse dock. Inward inventory will be updated immediately.
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
                        gap: "14px",
                        alignItems: "center",
                        padding: "14px 16px",
                        backgroundColor: pendingQty > 0 ? "#ffffff" : "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.86rem" }}>
                          {item.product?.name || "Product Item"}
                        </div>
                        <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "1px" }}>
                          SKU: {item.product?.sku || "N/A"}
                        </div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Ordered</div>
                        <div style={{ fontWeight: 650, color: "#0f172a", fontSize: "0.88rem" }}>{item.quantity}</div>
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "#64748b", textTransform: "uppercase", fontWeight: 600 }}>Pending</div>
                        <div style={{ fontWeight: 650, color: pendingQty > 0 ? "#d97706" : "#059669", fontSize: "0.88rem" }}>
                          {pendingQty}
                        </div>
                      </div>

                      <div>
                        <label style={{ fontSize: "0.7rem", color: "#047857", fontWeight: 600, display: "block", marginBottom: "3px" }}>
                          Receive Now
                        </label>
                        <input
                          type="number"
                          name={`qty_${item.id}`}
                          min="0"
                          max={pendingQty}
                          defaultValue={pendingQty}
                          disabled={pendingQty <= 0}
                          style={{
                            width: "100%",
                            height: "38px",
                            textAlign: "center",
                            fontWeight: 650,
                            fontSize: "0.9rem",
                            backgroundColor: pendingQty <= 0 ? "#f1f5f9" : "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "8px",
                            outline: "none",
                            boxSizing: "border-box"
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = "#059669";
                            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(16, 185, 129, 0.15)";
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = "#cbd5e1";
                            e.currentTarget.style.boxShadow = "none";
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Stock Auto Update Notice */}
              <div style={{ padding: "12px 16px", backgroundColor: "#ecfdf5", borderRadius: "10px", border: "1px solid #a7f3d0", fontSize: "0.8rem", color: "#065f46", display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={18} />
                <span>
                  <strong>Audited Inventory Update:</strong> Verified quantities will instantly increment product stock levels and generate an audited GRN transaction reference.
                </span>
              </div>

              {error && (
                <div style={{ padding: "11px 16px", backgroundColor: "#fef2f2", color: "#b91c1c", borderRadius: "10px", fontSize: "0.84rem", fontWeight: 500 }}>
                  {error}
                </div>
              )}

              {/* Footer */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "8px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
                <button
                  type="button"
                  onClick={() => setGrnOpen(null)}
                  style={{
                    padding: "9px 18px",
                    borderRadius: "10px",
                    border: "1px solid #cbd5e1",
                    backgroundColor: "#ffffff",
                    color: "#475569",
                    fontWeight: 500,
                    cursor: "pointer",
                    fontSize: "0.86rem"
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "9px 22px",
                    borderRadius: "10px",
                    border: "none",
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "0.86rem",
                    boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)"
                  }}
                >
                  <PackageCheck size={16} />
                  <span>{loading ? "Confirming GRN..." : "Confirm GRN Receipt"}</span>
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
              borderRadius: "18px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.3)",
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
                padding: "18px 26px",
                borderBottom: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                borderRadius: "18px 18px 0 0"
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <FileText size={20} color="#4f46e5" />
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600, color: "#0f172a" }}>
                  Purchase Order Voucher — {voucherPO.poNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setVoucherPO(null)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#ffffff",
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

            {/* Printable Content */}
            <div style={{ padding: "26px", display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #4f46e5", paddingBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "#4f46e5" }}>PURCHASE ORDER</div>
                  <div style={{ fontSize: "0.86rem", fontWeight: 600, color: "#0f172a", marginTop: "2px" }}>
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
                      fontWeight: 600,
                      color: voucherPO.status === "Received" ? "#059669" : "#4f46e5",
                      backgroundColor: voucherPO.status === "Received" ? "#ecfdf5" : "#eef2ff",
                      padding: "4px 12px",
                      borderRadius: "10px",
                      display: "inline-block",
                      marginTop: "3px"
                    }}
                  >
                    {voucherPO.status}
                  </span>
                </div>
              </div>

              {/* Vendor Details */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                <div>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Supplier / Vendor</div>
                  <div style={{ fontWeight: 650, color: "#0f172a", fontSize: "0.92rem", marginTop: "2px" }}>
                    {voucherPO.vendor?.companyName}
                  </div>
                  <div style={{ fontSize: "0.78rem", color: "#475569" }}>{voucherPO.vendor?.contactPerson || ""}</div>
                  <div style={{ fontSize: "0.78rem", color: "#64748b" }}>{voucherPO.vendor?.email || voucherPO.vendor?.mobile || ""}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600, textTransform: "uppercase" }}>Expected Delivery</div>
                  <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.88rem", marginTop: "2px" }}>
                    {voucherPO.expectedDate ? new Date(voucherPO.expectedDate).toLocaleDateString("en-IN") : "Standard Delivery"}
                  </div>
                  {voucherPO.notes && (
                    <div style={{ fontSize: "0.76rem", color: "#64748b", marginTop: "4px" }}>
                      {voucherPO.notes}
                    </div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.84rem" }}>
                <thead>
                  <tr style={{ backgroundColor: "#f1f5f9", borderBottom: "1px solid #cbd5e1", textAlign: "left", color: "#334155" }}>
                    <th style={{ padding: "10px 12px" }}>#</th>
                    <th style={{ padding: "10px 12px" }}>Item Description</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Qty Ordered</th>
                    <th style={{ padding: "10px 12px", textAlign: "center" }}>Qty Received</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Rate (₹)</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>Total (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucherPO.items?.map((it: any, i: number) => (
                    <tr key={it.id || i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={{ padding: "10px 12px" }}>{i + 1}</td>
                      <td style={{ padding: "10px 12px", fontWeight: 500, color: "#0f172a" }}>
                        {it.product?.name || "Product"} {it.product?.sku ? `(${it.product.sku})` : ""}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center", fontWeight: 600 }}>{it.quantity}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: it.receivedQty >= it.quantity ? "#059669" : "#d97706", fontWeight: 600 }}>
                        {it.receivedQty || 0}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        ₹{it.rate?.toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 650, fontVariantNumeric: "tabular-nums" }}>
                        ₹{(it.quantity * it.rate).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Grand Total */}
              <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "2px solid #4f46e5", paddingTop: "12px" }}>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Total Purchase Amount</div>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#4f46e5" }}>
                    ₹{voucherPO.totalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: "16px 26px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", display: "flex", justifyContent: "flex-end", gap: "12px", borderRadius: "0 0 18px 18px" }}>
              <button
                type="button"
                onClick={() => {
                  const poToEdit = voucherPO;
                  setVoucherPO(null);
                  handleOpenEditPO(poToEdit);
                }}
                style={{
                  padding: "9px 18px",
                  borderRadius: "9px",
                  border: "1px solid #c7d2fe",
                  backgroundColor: "#eef2ff",
                  color: "#4f46e5",
                  fontWeight: 600,
                  cursor: "pointer",
                  fontSize: "0.86rem",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <Pencil size={15} /> Edit PO
              </button>
              <button
                type="button"
                onClick={() => setVoucherPO(null)}
                style={{ padding: "9px 18px", borderRadius: "9px", border: "1px solid #cbd5e1", backgroundColor: "#ffffff", color: "#475569", fontWeight: 500, cursor: "pointer", fontSize: "0.86rem" }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                style={{ padding: "9px 22px", borderRadius: "9px", border: "none", background: "linear-gradient(135deg, var(--accent-primary, #4f46e5) 0%, #3730a3 100%)", color: "#ffffff", fontWeight: 600, cursor: "pointer", fontSize: "0.86rem", display: "inline-flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(79, 70, 229, 0.25)" }}
              >
                <Printer size={15} /> Print PO Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add Product / Raw Material Modal */}
      {quickAddOpen && (
        <QuickAddProductModal
          isOpen={quickAddOpen}
          initialName={quickAddInitialName}
          onClose={() => {
            setQuickAddOpen(false);
            setQuickAddTargetIdx(null);
            setQuickAddInitialName("");
          }}
          onSuccess={handleQuickProductCreated}
        />
      )}
    </div>
  );
}
