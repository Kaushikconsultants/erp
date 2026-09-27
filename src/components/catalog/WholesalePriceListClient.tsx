"use client";

import React, { useState, useMemo } from "react";
import { Search, Download, ArrowUpDown, Sparkles, MessageSquare, Phone, MapPin, Check, FileSpreadsheet } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  articleNumber: string | null;
  category: string | null;
  capacityMl?: number | null;
  material?: string | null;
  masterCartonQty?: number | null;
  cbm?: number | null;
  sellingPrice: number;
  mrp: number;
  stockQuantity: number;
  hsnCode?: string | null;
  exportPriceUsd?: number | null;
}

interface Props {
  products: Product[];
  company: {
    companyName: string;
    tradeName?: string;
    address: string;
    city: string;
    state: string;
    mobile: string;
    email: string;
    gstin: string;
  };
}

export default function WholesalePriceListClient({ products, company }: Props) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortField, setSortField] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter(p => {
        const matchCat = selectedCategory === "All" || p.category === selectedCategory;
        const q = search.toLowerCase().trim();
        const matchSearch = !q ||
          p.name.toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.articleNumber || "").toLowerCase().includes(q) ||
          (p.category || "").toLowerCase().includes(q);
        return matchCat && matchSearch;
      })
      .sort((a: any, b: any) => {
        let valA = a[sortField] || 0;
        let valB = b[sortField] || 0;
        if (typeof valA === "string") {
          return sortOrder === "asc"
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }
        return sortOrder === "asc" ? valA - valB : valB - valA;
      });
  }, [products, selectedCategory, search, sortField, sortOrder]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
  };

  const handleDownloadCsv = () => {
    const headers = [
      "SKU",
      "Article No",
      "Product Name",
      "Category",
      "Material",
      "Capacity (ml)",
      "Master Carton (pcs)",
      "Carton CBM (m3)",
      "Live Stock Qty",
      "Wholesale Rate (ex. GST)",
      "Wholesale Rate (incl. 18% GST)",
      "Suggested Retail Price (SRP/MRP)",
      "Retailer Margin (Rs)",
      "Retailer Margin (%)",
      "Export FOB (USD $)",
      "HSN Code"
    ];

    const rows = filteredProducts.map(p => {
      const gstPrice = Math.round(p.sellingPrice * 1.18 * 100) / 100;
      const marginRs = p.mrp > 0 ? p.mrp - p.sellingPrice : 0;
      const marginPct = p.mrp > 0 ? Math.round((marginRs / p.mrp) * 100) : 0;

      return [
        `"${p.sku || ''}"`,
        `"${p.articleNumber || ''}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category || ''}"`,
        `"${p.material || ''}"`,
        p.capacityMl || '',
        p.masterCartonQty || 24,
        p.cbm || '',
        p.stockQuantity || 0,
        p.sellingPrice,
        gstPrice,
        p.mrp,
        marginRs,
        `${marginPct}%`,
        p.exportPriceUsd || '',
        `"${p.hsnCode || '7013'}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `R3_EXPORTS_Wholesale_Price_List_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif)" }}>
      
      {/* Header */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "4px 8px", borderRadius: "6px", fontWeight: 900, fontSize: "0.85rem", letterSpacing: "1px" }}>R3</span>
              <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                {company.companyName} — Live Wholesale Price List
              </h1>
            </div>
            <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
              GSTIN: <strong>{company.gstin}</strong> • Live synced with factory ERP database
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button
              type="button"
              onClick={handleDownloadCsv}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#059669",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(5, 150, 105, 0.25)"
              }}
            >
              <FileSpreadsheet size={15} /> Download Excel / CSV
            </button>

            <a
              href="/catalog"
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "1px solid #0f172a",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              View Visual Lookbook
            </a>
          </div>
        </div>
      </header>

      {/* Main Table */}
      <main style={{ maxWidth: "1320px", margin: "0 auto", padding: "20px" }}>
        
        {/* Filters */}
        <div style={{ backgroundColor: "#ffffff", padding: "12px 18px", borderRadius: "10px", border: "1px solid #e2e8f0", marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          
          <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              style={{
                padding: "5px 12px",
                borderRadius: "9999px",
                border: "1px solid",
                borderColor: selectedCategory === "All" ? "#0f172a" : "#cbd5e1",
                backgroundColor: selectedCategory === "All" ? "#0f172a" : "#fff",
                color: selectedCategory === "All" ? "#fff" : "#475569",
                fontSize: "0.75rem",
                fontWeight: 600,
                cursor: "pointer"
              }}
            >
              All ({products.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "5px 12px",
                  borderRadius: "9999px",
                  border: "1px solid",
                  borderColor: selectedCategory === cat ? "#0f172a" : "#cbd5e1",
                  backgroundColor: selectedCategory === cat ? "#0f172a" : "#fff",
                  color: selectedCategory === cat ? "#fff" : "#475569",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          <div style={{ position: "relative", width: "240px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search Article, Name, SKU..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                borderRadius: "6px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* Table Container */}
        <div style={{ backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0", overflowX: "auto", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e2e8f0", color: "#475569" }}>
                <th style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer" }} onClick={() => toggleSort("sku")}>
                  SKU / Art # <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer" }} onClick={() => toggleSort("name")}>
                  Product Name & Category <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 700 }}>Specifications</th>
                <th style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer" }} onClick={() => toggleSort("stockQuantity")}>
                  Live Stock <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer" }} onClick={() => toggleSort("sellingPrice")}>
                  Trade Price (ex. GST) <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 700 }}>Trade Rate (incl. 18% GST)</th>
                <th style={{ padding: "12px 14px", fontWeight: 700, cursor: "pointer" }} onClick={() => toggleSort("mrp")}>
                  SRP (MRP) <ArrowUpDown size={11} style={{ display: "inline" }} />
                </th>
                <th style={{ padding: "12px 14px", fontWeight: 700 }}>Retailer Margin</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((p, idx) => {
                const gstRate = Math.round(p.sellingPrice * 1.18 * 100) / 100;
                const marginRs = p.mrp > 0 ? p.mrp - p.sellingPrice : 0;
                const marginPct = p.mrp > 0 ? Math.round((marginRs / p.mrp) * 100) : 0;

                return (
                  <tr
                    key={p.id}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#ffffff" : "#fcfdfe"
                    }}
                  >
                    <td style={{ padding: "12px 14px", fontFamily: "monospace", fontWeight: 700, color: "#2563eb" }}>
                      {p.articleNumber || p.sku || 'N/A'}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <div style={{ fontWeight: 700, color: "#0f172a" }}>{p.name}</div>
                      <div style={{ fontSize: "0.72rem", color: "#64748b" }}>{p.category || 'Glassware'}</div>
                    </td>
                    <td style={{ padding: "12px 14px", fontSize: "0.75rem", color: "#475569" }}>
                      {p.capacityMl && <span>{p.capacityMl}ml • </span>}
                      <span>{p.material || 'Lead-Free Crystal'}</span>
                      <div style={{ color: "#94a3b8", fontSize: "0.7rem" }}>Pack: {p.masterCartonQty || 24} pcs/ctn</div>
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      {p.stockQuantity > 0 ? (
                        <span style={{ backgroundColor: "#ecfdf5", color: "#059669", padding: "3px 8px", borderRadius: "6px", fontWeight: 700, fontSize: "0.75rem" }}>
                          ⚡ {p.stockQuantity} pcs
                        </span>
                      ) : (
                        <span style={{ backgroundColor: "#fffbeb", color: "#b45309", padding: "3px 8px", borderRadius: "6px", fontWeight: 600, fontSize: "0.75rem" }}>
                          🏭 Made to Order
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 800, color: "#059669", fontSize: "0.9rem" }}>
                      ₹{p.sellingPrice.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#0f172a" }}>
                      ₹{gstRate.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 14px", fontWeight: 700, color: "#7c3aed" }}>
                      ₹{p.mrp.toLocaleString("en-IN")}
                    </td>
                    <td style={{ padding: "12px 14px" }}>
                      <span style={{ color: "#059669", fontWeight: 700 }}>+₹{marginRs}</span>
                      <span style={{ color: "#64748b", fontSize: "0.72rem", marginLeft: "4px" }}>({marginPct}%)</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </main>
    </div>
  );
}
