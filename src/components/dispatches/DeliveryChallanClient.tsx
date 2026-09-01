"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState } from "react";
import Link from "next/link";
import {
  Truck,
  Plus,
  FileCheck,
  Search,
  Building2,
  User,
  ArrowRight,
  Printer,
  FileText,
  Receipt,
  ExternalLink
} from "lucide-react";
import { createDeliveryChallan, convertChallanToInvoice } from "@/app/actions/deliveryChallanActions";

interface Props {
  initialChallans: any[];
  customers: any[];
  vendors: any[];
  products: any[];
}

export default function DeliveryChallanClient({
  initialChallans,
  customers,
  vendors,
  products
}: Props) {
  const [challans, setChallans] = useState<any[]>(initialChallans);
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isConverting, setIsConverting] = useState<string | null>(null);

  // Form State
  const [challanType, setChallanType] = useState<any>("JOB_WORK_OUT");
  const [partyType, setPartyType] = useState<"CUSTOMER" | "VENDOR">("CUSTOMER");
  const [customerId, setCustomerId] = useState(customers[0]?.id || "");
  const [vendorId, setVendorId] = useState(vendors[0]?.id || "");
  const [challanDate, setChallanDate] = useState(new Date().toISOString().split("T")[0]);
  const [transporterName, setTransporterName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([
    { productId: products[0]?.id || "", quantity: 10, rate: products[0]?.sellingPrice || 500, unit: "pcs", hsnCode: "6109" }
  ]);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleAddItem = () => {
    setItems([...items, { productId: products[0]?.id || "", quantity: 10, rate: products[0]?.sellingPrice || 500, unit: "pcs", hsnCode: "6109" }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    if (field === "productId") {
      const prod = products.find(p => p.id === value);
      if (prod) {
        updated[index].rate = prod.sellingPrice || 500;
        updated[index].hsnCode = prod.hsnCode || "6109";
      }
    }
    setItems(updated);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError("");

    try {
      const res = await createDeliveryChallan({
        challanType,
        challanDate,
        customerId: partyType === "CUSTOMER" ? customerId : undefined,
        vendorId: partyType === "VENDOR" ? vendorId : undefined,
        transporterName,
        vehicleNumber,
        lrNumber,
        notes,
        items
      });

      if (res.success) {
        setShowCreateModal(false);
        window.location.reload();
      } else {
        setFormError(res.error || "Failed to create delivery challan");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConvert = async (challanId: string) => {
    if (!confirm("Are you sure you want to convert this Delivery Challan into a GST Sales Invoice?")) return;
    setIsConverting(challanId);
    try {
      const res = await convertChallanToInvoice(challanId);
      if (res.success) {
        alert(res.message);
        window.location.reload();
      } else {
        alert(res.error || "Failed to convert");
      }
    } catch (e: any) {
      alert(e.message || "Error converting");
    } finally {
      setIsConverting(null);
    }
  };

  const filteredChallans = challans.filter(c => {
    if (typeFilter !== "ALL" && c.challanType !== typeFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.challanNumber.toLowerCase().includes(q) ||
      (c.customer?.businessName && c.customer.businessName.toLowerCase().includes(q)) ||
      (c.vendor?.companyName && c.vendor.companyName.toLowerCase().includes(q)) ||
      (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: 1, maxWidth: "450px" }}>
          <div style={{ position: "relative", width: "100%" }}>
            <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)" }} />
            <input
              type="text"
              placeholder="Search challan #, customer, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="form-input"
              style={{ paddingLeft: "36px", width: "100%" }}
            />
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="primary-btn"
          style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.875rem", padding: "8px 16px" }}
        >
          <Plus size={16} />
          Create Delivery Challan
        </button>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px" }}>
        {[
          { id: "ALL", label: "All Challans" },
          { id: "JOB_WORK_OUT", label: "Job Work Out" },
          { id: "SAMPLE_OUT", label: "Sample Out" },
          { id: "BRANCH_TRANSFER", label: "Branch Transfer" },
          { id: "CONSIGNMENT", label: "Consignment" },
          { id: "SALE_ON_APPROVAL", label: "Sale on Approval" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTypeFilter(t.id)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid var(--border-color, #e2e8f0)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              background: typeFilter === t.id ? "var(--primary, #4f46e5)" : "var(--bg-secondary, #f8fafc)",
              color: typeFilter === t.id ? "#fff" : "var(--text-secondary, #64748b)"
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Challan Table */}
      <div className="glass-panel" style={{ padding: "20px" }}>
        <div className="table-responsive">
          <table className="data-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-secondary, #f8fafc)", textAlign: "left", fontSize: "0.85rem" }}>
                <th style={{ padding: "10px 12px" }}>Challan #</th>
                <th style={{ padding: "10px 12px" }}>Date</th>
                <th style={{ padding: "10px 12px" }}>Type</th>
                <th style={{ padding: "10px 12px" }}>Party / Destination</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Qty</th>
                <th style={{ padding: "10px 12px", textAlign: "right" }}>Total Value (₹)</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Status</th>
                <th style={{ padding: "10px 12px", textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)" }}>
                    No delivery challans found.
                  </td>
                </tr>
              ) : (
                filteredChallans.map(c => (
                  <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "10px 12px", fontFamily: "monospace", fontWeight: 700, color: "#4f46e5" }}>
                      {c.challanNumber}
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                      {new Date(c.challanDate).toLocaleDateString("en-GB")}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: "#e0f2fe",
                        color: "#0369a1"
                      }}>
                        {c.challanType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", fontSize: "0.85rem" }}>
                      <div style={{ fontWeight: 600 }}>
                        {c.customerId && c.customer?.businessName ? (
                          <Link
                            href={`/customers/${c.customerId}/ledger`}
                            style={{ color: "#4f46e5", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            {c.customer.businessName} <ExternalLink size={11} style={{ opacity: 0.7 }} />
                          </Link>
                        ) : c.vendorId && c.vendor?.companyName ? (
                          <Link
                            href="/vendors"
                            style={{ color: "#4f46e5", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
                          >
                            {c.vendor.companyName} <ExternalLink size={11} style={{ opacity: 0.7 }} />
                          </Link>
                        ) : (
                          c.customer?.businessName || c.vendor?.companyName || "Internal Godown"
                        )}
                      </div>
                      {c.vehicleNumber && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                          Vehicle: {c.vehicleNumber} {c.lrNumber ? `• LR: ${c.lrNumber}` : ""}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>
                      {c.totalQuantity} pcs
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700 }}>
                      ₹{c.totalValue.toLocaleString()}
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      <span style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: c.status === "CONVERTED_TO_INVOICE" ? "#dcfce7" : "#fef3c7",
                        color: c.status === "CONVERTED_TO_INVOICE" ? "#15803d" : "#92400e"
                      }}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px", textAlign: "center" }}>
                      {c.customerId && c.status !== "CONVERTED_TO_INVOICE" && (
                        <button
                          onClick={() => handleConvert(c.id)}
                          disabled={isConverting === c.id}
                          className="action-btn"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            color: "#4f46e5",
                            fontWeight: 600
                          }}
                        >
                          <FileCheck size={13} />
                          {isConverting === c.id ? "Converting..." : "Convert to Inv"}
                        </button>
                      )}
                      {c.status === "CONVERTED_TO_INVOICE" && (
                        <Link
                          href="/invoices"
                          className="action-btn"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 10px",
                            fontSize: "0.75rem",
                            color: "#059669",
                            textDecoration: "none",
                            fontWeight: 600
                          }}
                        >
                          <Receipt size={13} /> View Inv
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE DELIVERY CHALLAN MODAL */}
      {showCreateModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.55)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "20px"
        }}>
          <div className="glass-panel" style={{ width: "100%", maxWidth: "720px", padding: "24px", background: "#fff", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "16px" }}>Create Delivery Challan (Material Out)</h2>

            {formError && (
              <div style={{ padding: "8px 12px", background: "#fef2f2", color: "#dc2626", borderRadius: "6px", marginBottom: "12px", fontSize: "0.85rem" }}>
                {formError}
              </div>
            )}

            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Challan Purpose / Type *</label>
                  <select
                    value={challanType}
                    onChange={(e) => setChallanType(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="JOB_WORK_OUT">Job Work Out (Dyeing / Stitching / Printing)</option>
                    <option value="SAMPLE_OUT">Sample Approval Out</option>
                    <option value="BRANCH_TRANSFER">Inter-Branch / Godown Transfer</option>
                    <option value="CONSIGNMENT">Consignment Stock Out</option>
                    <option value="SALE_ON_APPROVAL">Sale on Approval / Returnable</option>
                  </select>
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Challan Date *</label>
                  <DatePicker
                    
                    value={challanDate}
                    onChange={(e) => setChallanDate(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Recipient Category</label>
                  <select
                    value={partyType}
                    onChange={(e) => setPartyType(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="CUSTOMER">Customer / Buyer</option>
                    <option value="VENDOR">Vendor / Job Worker</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Recipient Party *</label>
                  {partyType === "CUSTOMER" ? (
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="form-input"
                      required
                    >
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.businessName} ({c.city || "Rohtak"})</option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={vendorId}
                      onChange={(e) => setVendorId(e.target.value)}
                      className="form-input"
                      required
                    >
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.companyName}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Transporter Name</label>
                  <input
                    type="text"
                    placeholder="e.g. VRL Logistics"
                    value={transporterName}
                    onChange={(e) => setTransporterName(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Vehicle Number</label>
                  <input
                    type="text"
                    placeholder="e.g. HR-12-AB-1234"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>LR / Bilty Number</label>
                  <input
                    type="text"
                    placeholder="LR / GR #"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Items List */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                  <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 700, margin: 0 }}>
                    Challan Items
                  </label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="action-btn"
                    style={{ padding: "4px 8px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: "3fr 1fr 1fr 1fr 30px", gap: "8px", alignItems: "center" }}>
                      <select
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, "productId", e.target.value)}
                        className="form-input"
                        style={{ padding: "6px" }}
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.stockQuantity})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ padding: "6px" }}
                        min="1"
                      />
                      <input
                        type="number"
                        placeholder="Rate"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, "rate", parseFloat(e.target.value) || 0)}
                        className="form-input"
                        style={{ padding: "6px" }}
                      />
                      <input
                        type="text"
                        placeholder="HSN"
                        value={item.hsnCode}
                        onChange={(e) => handleItemChange(idx, "hsnCode", e.target.value)}
                        className="form-input"
                        style={{ padding: "6px" }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        style={{ border: "none", background: "none", color: "#dc2626", cursor: "pointer" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="form-label" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Notes / Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding job work processing or return terms..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="action-btn"
                  style={{ padding: "8px 16px" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="primary-btn"
                  style={{ padding: "8px 20px" }}
                >
                  {isSaving ? "Saving..." : "Create Challan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
