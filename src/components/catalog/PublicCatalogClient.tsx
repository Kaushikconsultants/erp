"use client";

import React, { useState, useMemo } from "react";
import { Search, MessageSquare, Phone, Mail, MapPin, Image as ImageIcon, Sparkles, ShoppingBag, Check } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  articleNumber: string | null;
  category: string | null;
  sellingPrice: number;
  stockQuantity: number;
  description?: string | null;
  images?: string[];
  fabric?: string | null;
  color?: string | null;
  size?: string | null;
}

interface Props {
  initialProducts: Product[];
  categories: string[];
  company: {
    companyName: string;
    address: string;
    city: string;
    state: string;
    mobile: string;
    email: string;
    gstin: string;
  };
  initialTitle?: string;
}

export default function PublicCatalogClient({ initialProducts, categories, company, initialTitle }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedForInquiry, setSelectedForInquiry] = useState<string[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const filteredProducts = useMemo(() => {
    return initialProducts.filter(p => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.articleNumber || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [initialProducts, selectedCategory, searchQuery]);

  const handleToggleSelect = (artNo: string) => {
    if (selectedForInquiry.includes(artNo)) {
      setSelectedForInquiry(selectedForInquiry.filter(a => a !== artNo));
    } else {
      setSelectedForInquiry([...selectedForInquiry, artNo]);
    }
  };

  const handleWhatsAppBooking = (singleArticle?: string) => {
    const articles = singleArticle ? [singleArticle] : selectedForInquiry;
    const cleanMobile = company.mobile.replace(/[^0-9]/g, "");

    let msg = `*Wholesale Order Booking / Sample Inquiry*\n\n`;
    msg += `Hello ${company.companyName},\nI am interested in placing an order for the following articles from your online lookbook:\n\n`;

    if (articles.length > 0) {
      articles.forEach((art, idx) => {
        msg += `${idx + 1}. Article #${art}\n`;
      });
    } else {
      msg += `• General Wholesale Catalog Inquiry\n`;
    }

    msg += `\nPlease share set ratios, delivery timelines, and bulk discounts.\nThank you!`;

    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif)" }}>
      
      {/* ─── HEADER / BRAND BANNER ─── */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 40, boxShadow: "0 1px 3px rgba(0,0,0,0.03)" }}>
        <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", letterSpacing: "-0.01em" }}>
              {company.companyName}
            </h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span><MapPin size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {company.city}, {company.state}</span>
              <span>•</span>
              <span>GSTIN: <strong>{company.gstin}</strong></span>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a
              href={`tel:${company.mobile}`}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "0.82rem",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <Phone size={14} /> Call Sales
            </a>

            <button
              type="button"
              onClick={() => handleWhatsAppBooking()}
              style={{
                padding: "8px 16px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#25D366",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(37, 211, 102, 0.3)"
              }}
            >
              <MessageSquare size={16} /> WhatsApp Inquiry {selectedForInquiry.length > 0 && `(${selectedForInquiry.length})`}
            </button>
          </div>
        </div>

        {/* Catalog Title Banner */}
        <div style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "10px 20px", textAlign: "center" }}>
          <h2 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, letterSpacing: "0.5px" }}>
            {initialTitle || "WHOLESALE APPAREL COLLECTION & LOOKBOOK"}
          </h2>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
            Verified Wholesale Buyer Portal • MOQ: 12/18 pcs per set
          </span>
        </div>
      </header>

      {/* ─── MAIN CONTENT ─── */}
      <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "20px" }}>
        
        {/* Filter & Search Bar */}
        <div style={{ backgroundColor: "#ffffff", padding: "14px 18px", borderRadius: "12px", border: "1px solid #e2e8f0", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          
          {/* Category Tabs */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", maxWidth: "100%", paddingBottom: "2px" }}>
            <button
              type="button"
              onClick={() => setSelectedCategory("All")}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                border: "1px solid",
                borderColor: selectedCategory === "All" ? "var(--accent-primary, #4f46e5)" : "#e2e8f0",
                backgroundColor: selectedCategory === "All" ? "#eef2ff" : "#ffffff",
                color: selectedCategory === "All" ? "#4f46e5" : "#64748b",
                fontSize: "0.78rem",
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap"
              }}
            >
              All Articles ({initialProducts.length})
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  border: "1px solid",
                  borderColor: selectedCategory === cat ? "var(--accent-primary, #4f46e5)" : "#e2e8f0",
                  backgroundColor: selectedCategory === cat ? "#eef2ff" : "#ffffff",
                  color: selectedCategory === cat ? "#4f46e5" : "#64748b",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap"
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", width: "240px" }}>
            <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
            <input
              type="text"
              placeholder="Search Article or Name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "7px 12px 7px 32px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.8rem",
                outline: "none"
              }}
            />
          </div>
        </div>

        {/* ─── 4:5 LOOKBOOK GRID ─── */}
        {filteredProducts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "20px",
              marginBottom: "32px"
            }}
          >
            {filteredProducts.map(product => {
              const imageSrc = (product.images && product.images.length > 0) ? product.images[0] : null;
              const artNo = product.articleNumber || product.sku || product.name;
              const isSelected = selectedForInquiry.includes(artNo);

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease"
                  }}
                >
                  {/* 4:5 ASPECT RATIO IMAGE CONTAINER */}
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 5",
                      backgroundColor: "#f1f5f9",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {imageSrc ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={imageSrc}
                        alt={product.name}
                        loading="lazy"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          display: "block"
                        }}
                      />
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", color: "#94a3b8" }}>
                        <ImageIcon size={36} />
                        <span style={{ fontSize: "0.75rem", marginTop: "6px", fontWeight: 500 }}>4:5 Garment Photo</span>
                      </div>
                    )}

                    {/* Article Badge */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        left: "10px",
                        backgroundColor: "rgba(15, 23, 42, 0.85)",
                        color: "#ffffff",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        fontSize: "0.72rem",
                        fontWeight: 700,
                        letterSpacing: "0.5px",
                        backdropFilter: "blur(4px)"
                      }}
                    >
                      Art #{artNo}
                    </div>

                    {/* Quick Select Checkbox Top-Right */}
                    <button
                      type="button"
                      onClick={() => handleToggleSelect(artNo)}
                      title={isSelected ? "Remove from inquiry" : "Add to inquiry list"}
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        width: "30px",
                        height: "30px",
                        borderRadius: "50%",
                        backgroundColor: isSelected ? "#2563eb" : "rgba(255, 255, 255, 0.9)",
                        color: isSelected ? "#ffffff" : "#64748b",
                        border: "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.15)"
                      }}
                    >
                      {isSelected ? <Check size={16} /> : <ShoppingBag size={15} />}
                    </button>
                  </div>

                  {/* Details Card Content */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600, color: "#0f172a" }}>
                        {product.name}
                      </h3>
                      <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        Category: <strong style={{ color: "#334155" }}>{product.category || "Apparel"}</strong>
                      </p>
                    </div>

                    {/* Fabric & Specs */}
                    <div style={{ fontSize: "0.72rem", color: "#64748b", backgroundColor: "#f8fafc", padding: "6px 10px", borderRadius: "6px", border: "1px solid #f1f5f9" }}>
                      {product.fabric && <div>Fabric: <strong style={{ color: "#0f172a" }}>{product.fabric}</strong></div>}
                      <div>Sizes: <strong style={{ color: "#0f172a" }}>S, M, L, XL, XXL (Set Ratio)</strong></div>
                    </div>

                    {/* Price & Action Row */}
                    <div style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontSize: "0.68rem", color: "#64748b", display: "block" }}>Wholesale Rate</span>
                        <span style={{ fontSize: "1.15rem", fontWeight: 700, color: "#059669" }}>
                          ₹{product.sellingPrice.toLocaleString("en-IN")}
                          <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}> / pc</span>
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleWhatsAppBooking(artNo)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          backgroundColor: "#25D366",
                          color: "#ffffff",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                      >
                        <MessageSquare size={13} /> Book Art #{artNo}
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <ShoppingBag size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "1.05rem", color: "#1e293b", margin: "0 0 6px" }}>No Articles Found</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>Try clearing your category filter or search query.</p>
          </div>
        )}

        {/* Floating Bulk Order Bar */}
        {selectedForInquiry.length > 0 && (
          <div
            style={{
              position: "fixed",
              bottom: "20px",
              left: "50%",
              transform: "translateX(-50%)",
              backgroundColor: "#0f172a",
              color: "#ffffff",
              padding: "12px 20px",
              borderRadius: "50px",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              zIndex: 99999
            }}
          >
            <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
              {selectedForInquiry.length} Articles Selected
            </span>

            <button
              type="button"
              onClick={() => handleWhatsAppBooking()}
              style={{
                padding: "8px 18px",
                borderRadius: "50px",
                border: "none",
                backgroundColor: "#25D366",
                color: "#ffffff",
                fontSize: "0.82rem",
                fontWeight: 700,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px"
              }}
            >
              <MessageSquare size={16} /> Send Bulk Inquiry on WhatsApp
            </button>

            <button
              type="button"
              onClick={() => setSelectedForInquiry([])}
              style={{
                background: "none",
                border: "none",
                color: "#94a3b8",
                fontSize: "0.75rem",
                cursor: "pointer"
              }}
            >
              Clear
            </button>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "24px 20px", textAlign: "center", fontSize: "0.78rem", color: "#64748b" }}>
        <p style={{ margin: "0 0 6px", fontWeight: 600, color: "#1e293b" }}>{company.companyName}</p>
        <p style={{ margin: 0 }}>{company.address} • Phone: {company.mobile} • Email: {company.email}</p>
      </footer>

    </div>
  );
}
