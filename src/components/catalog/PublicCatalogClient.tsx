"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  MessageSquare, 
  Phone, 
  MapPin, 
  Image as ImageIcon, 
  ShoppingBag, 
  Check, 
  Plus, 
  Minus, 
  Sparkles, 
  Truck, 
  ShieldCheck, 
  Package, 
  ChevronRight, 
  X, 
  ArrowRight, 
  SlidersHorizontal,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText
} from "lucide-react";
import { placeCatalogOrder, CatalogOrderBuyerDetails } from "@/app/actions/catalogActions";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  articleNumber: string | null;
  category: string | null;
  subCategory?: string | null;
  sellingPrice: number;
  purchasePrice?: number | null;
  mrp: number;
  stockQuantity: number;
  minimumStock?: number;
  capacityMl?: number | null;
  material?: string | null;
  moq?: number | null;
  masterCartonQty?: number | null;
  cbm?: number | null;
  diameterMm?: number | null;
  heightMm?: number | null;
  weight?: number | null;
  customizationOptions?: string | null;
  hsnCode?: string | null;
  description?: string | null;
  images?: string[];
  color?: string | null;
  size?: string | null;
}

interface CompanyInfo {
  organizationId?: string;
  companyName: string;
  tradeName?: string;
  address: string;
  city: string;
  state: string;
  mobile: string;
  email: string;
  gstin: string;
  minOrderValueReadyStock?: number;
  minOrderValueMadeToOrder?: number;
  leadTimeReadyStockDays?: number;
  leadTimeMadeToOrderDays?: number;
}

interface Props {
  initialProducts: Product[];
  categories: string[];
  company: CompanyInfo;
  initialTitle?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  boxOption: number;
  effectiveRate: number;
  discountPercent: number;
}

const INDIAN_STATES = [
  "Delhi", "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu", "Uttar Pradesh",
  "Haryana", "Rajasthan", "West Bengal", "Telangana", "Punjab", "Madhya Pradesh",
  "Kerala", "Andhra Pradesh", "Bihar", "Odisha", "Assam", "Chandigarh", "Goa",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Uttarakhand"
];

export default function PublicCatalogClient({ initialProducts, categories, company, initialTitle }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockFilter, setSelectedStockFilter] = useState<"ALL" | "IN_STOCK" | "MADE_TO_ORDER">("ALL");
  
  // Cart state: map of productId -> CartItem
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderSuccessData, setOrderSuccessData] = useState<any>(null);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState("");

  // Quick zoom modal for product details
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Checkout Form State
  const [buyerForm, setBuyerForm] = useState<CatalogOrderBuyerDetails>({
    businessName: "",
    contactPerson: "",
    mobile: "",
    whatsappNumber: "",
    email: "",
    gstin: "",
    shippingAddress: "",
    city: "",
    state: company.state || "Delhi",
    pincode: "",
    notes: "",
    buyingStream: "READY_STOCK",
    courierType: "R3_COURIER"
  });

  // Calculate Wholesale Slabs
  const calculateSlab = (basePrice: number, qty: number) => {
    let discount = 0;
    if (qty >= 500) discount = 20;
    else if (qty >= 300) discount = 10;
    else if (qty >= 100) discount = 5;

    const rate = Math.round((basePrice * (1 - discount / 100)) * 100) / 100;
    return { discount, rate };
  };

  const filteredProducts = useMemo(() => {
    return initialProducts.filter(p => {
      const matchCat = selectedCategory === "All" || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.articleNumber || "").toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.material || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);

      const matchStock = 
        selectedStockFilter === "ALL" ? true :
        selectedStockFilter === "IN_STOCK" ? (p.stockQuantity > 0) :
        (p.stockQuantity <= 0);

      return matchCat && matchSearch && matchStock;
    });
  }, [initialProducts, selectedCategory, searchQuery, selectedStockFilter]);

  // Cart Helpers
  const handleAddToCart = (product: Product, customQty?: number, boxPack?: number) => {
    const pack = boxPack || product.masterCartonQty || 6;
    const currentQty = cart[product.id]?.quantity || 0;
    let newQty = customQty !== undefined ? customQty : currentQty + pack;
    
    if (newQty <= 0) {
      const updated = { ...cart };
      delete updated[product.id];
      setCart(updated);
      return;
    }

    const { discount, rate } = calculateSlab(product.sellingPrice, newQty);
    setCart({
      ...cart,
      [product.id]: {
        product,
        quantity: newQty,
        boxOption: pack,
        effectiveRate: rate,
        discountPercent: discount
      }
    });
  };

  const cartList = useMemo(() => Object.values(cart), [cart]);

  const cartTotals = useMemo(() => {
    let subtotal = 0;
    let totalPcs = 0;
    let hasReadyStock = false;
    let hasMadeToOrder = false;

    cartList.forEach(item => {
      subtotal += item.effectiveRate * item.quantity;
      totalPcs += item.quantity;
      if (item.product.stockQuantity > 0) {
        hasReadyStock = true;
      } else {
        hasMadeToOrder = true;
      }
    });

    const isInterstate = company.state.toLowerCase() !== buyerForm.state.toLowerCase();
    const gstRate = 0.18; // 18% Glassware GST
    const tax = Math.round((subtotal * gstRate) * 100) / 100;
    const grandTotal = subtotal + tax;

    const minMOV = hasMadeToOrder ? 50000 : 15000;
    const movMet = subtotal >= minMOV;
    const movProgress = Math.min(100, Math.round((subtotal / minMOV) * 100));

    return {
      subtotal,
      tax,
      grandTotal,
      totalPcs,
      isInterstate,
      minMOV,
      movMet,
      movProgress,
      hasReadyStock,
      hasMadeToOrder
    };
  }, [cartList, company.state, buyerForm.state]);

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingOrder(true);
    setOrderError("");

    if (!cartTotals.movMet) {
      setOrderError(`Minimum Order Value (MOV) of ₹${cartTotals.minMOV.toLocaleString("en-IN")} not met. Current Subtotal: ₹${cartTotals.subtotal.toLocaleString("en-IN")}`);
      setSubmittingOrder(false);
      return;
    }

    const itemsPayload = cartList.map(it => ({
      productId: it.product.id,
      quantity: it.quantity,
      boxPackOption: it.boxOption
    }));

    const res = await placeCatalogOrder({
      buyer: {
        ...buyerForm,
        buyingStream: cartTotals.hasMadeToOrder ? "MADE_TO_ORDER" : "READY_STOCK"
      },
      items: itemsPayload
    });

    if (res?.error) {
      setOrderError(res.error);
      setSubmittingOrder(false);
    } else if (res?.success) {
      setOrderSuccessData(res);
      setCart({});
      setSubmittingOrder(false);
      setIsCheckoutOpen(false);
    }
  };

  const handleWhatsAppBookingDirect = (singleProduct?: Product) => {
    const cleanMobile = company.mobile.replace(/[^0-9]/g, "");
    let msg = `*Wholesale Inquiry / Lookbook Order*\n\n`;
    msg += `Hello ${company.companyName},\nI am viewing your official B2B Glassware Catalog and would like to place an inquiry:\n\n`;

    if (singleProduct) {
      msg += `• *${singleProduct.name}*\n`;
      msg += `  Article: #${singleProduct.articleNumber || singleProduct.sku || 'N/A'}\n`;
      msg += `  Base Rate: ₹${singleProduct.sellingPrice}/pc • SRP: ₹${singleProduct.mrp}\n`;
      msg += `  Stock Status: ${singleProduct.stockQuantity > 0 ? `In Stock (${singleProduct.stockQuantity} pcs)` : 'Made to Order'}\n\n`;
    } else if (cartList.length > 0) {
      cartList.forEach((it, idx) => {
        msg += `${idx + 1}. *${it.product.name}* (Art #${it.product.articleNumber || it.product.sku})\n`;
        msg += `   Qty: *${it.quantity} pcs* @ ₹${it.effectiveRate}/pc = ₹${(it.effectiveRate * it.quantity).toLocaleString("en-IN")}\n`;
      });
      msg += `\n*Subtotal:* ₹${cartTotals.subtotal.toLocaleString("en-IN")}\n`;
      msg += `*Est. Total incl. 18% GST:* ₹${cartTotals.grandTotal.toLocaleString("en-IN")}\n\n`;
    } else {
      msg += `• General Wholesale Catalog & Custom Design Inquiry\n\n`;
    }

    msg += `Please share proforma invoice, packaging dimensions, and dispatch timeline. Thank you!`;
    window.open(`https://wa.me/${cleanMobile}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f8fafc", color: "#0f172a", fontFamily: "var(--font-family, -apple-system, BlinkMacSystemFont, 'Inter', sans-serif)" }}>
      
      {/* ─── HEADER / BRAND BANNER ─── */}
      <header style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
        <div style={{ maxWidth: "1320px", margin: "0 auto", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ backgroundColor: "#0f172a", color: "#ffffff", padding: "4px 8px", borderRadius: "6px", fontWeight: 900, fontSize: "0.85rem", letterSpacing: "1px" }}>R3</span>
              <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                {company.companyName}
              </h1>
            </div>
            <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "#64748b", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span><MapPin size={12} style={{ display: "inline", verticalAlign: "middle" }} /> {company.city}, {company.state}</span>
              <span>•</span>
              <span>GSTIN: <strong>{company.gstin}</strong></span>
              <span>•</span>
              <span style={{ color: "#059669", fontWeight: 600 }}>⚡ Direct ERP Connected Catalog</span>
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <a
              href={`tel:${company.mobile}`}
              style={{
                padding: "7px 12px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#1e293b",
                fontSize: "0.8rem",
                fontWeight: 600,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px"
              }}
            >
              <Phone size={13} /> Call Sales
            </a>

            <button
              type="button"
              onClick={() => handleWhatsAppBookingDirect()}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#25D366",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                boxShadow: "0 2px 6px rgba(37, 211, 102, 0.25)"
              }}
            >
              <MessageSquare size={14} /> WhatsApp
            </button>

            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              style={{
                padding: "7px 14px",
                borderRadius: "8px",
                border: "none",
                backgroundColor: "#0f172a",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                position: "relative"
              }}
            >
              <ShoppingBag size={14} />
              <span>Wholesale Order</span>
              {cartTotals.totalPcs > 0 && (
                <span style={{
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  fontSize: "0.7rem",
                  fontWeight: 800,
                  padding: "1px 6px",
                  borderRadius: "10px",
                  marginLeft: "2px"
                }}>
                  {cartTotals.totalPcs} pcs
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Dual Stream Policy Bar */}
        <div style={{ backgroundColor: "#0f172a", color: "#f8fafc", padding: "8px 20px", fontSize: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div style={{ display: "flex", gap: "16px", alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Truck size={13} color="#38bdf8" /> <strong>Ready Stock:</strong> MOV ₹15,000 • Dispatches in ≤ 48 Hours
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <Package size={13} color="#fbbf24" /> <strong>Made to Order:</strong> MOV ₹50,000 • 20-30 Days Production
            </span>
            <span style={{ color: "#475569" }}>|</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <ShieldCheck size={13} color="#4ade80" /> <strong>Transit Breakage Covered</strong> with R3 Courier
            </span>
          </div>

          <div style={{ color: "#94a3b8", fontWeight: 500 }}>
            Wholesale Tier Pricing: 100+ pcs (-5%) • 300+ pcs (-10%) • 500+ pcs (-20%)
          </div>
        </div>
      </header>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <main style={{ maxWidth: "1320px", margin: "0 auto", padding: "20px" }}>
        
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
                borderColor: selectedCategory === "All" ? "#0f172a" : "#e2e8f0",
                backgroundColor: selectedCategory === "All" ? "#0f172a" : "#ffffff",
                color: selectedCategory === "All" ? "#ffffff" : "#64748b",
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
                  borderColor: selectedCategory === cat ? "#0f172a" : "#e2e8f0",
                  backgroundColor: selectedCategory === cat ? "#0f172a" : "#ffffff",
                  color: selectedCategory === cat ? "#ffffff" : "#64748b",
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

          {/* Search & Stock Filter */}
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={selectedStockFilter}
              onChange={(e: any) => setSelectedStockFilter(e.target.value)}
              style={{
                padding: "7px 10px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                fontSize: "0.78rem",
                backgroundColor: "#ffffff",
                color: "#334155",
                fontWeight: 600
              }}
            >
              <option value="ALL">All Stock Status</option>
              <option value="IN_STOCK">⚡ Ready Stock Only</option>
              <option value="MADE_TO_ORDER">🏭 Made to Order</option>
            </select>

            <div style={{ position: "relative", width: "220px" }}>
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                type="text"
                placeholder="Search Article, Name, SKU..."
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
        </div>

        {/* ─── 4:5 LOOKBOOK GRID ─── */}
        {filteredProducts.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "20px",
              marginBottom: "40px"
            }}
          >
            {filteredProducts.map(product => {
              const imageSrc = (product.images && product.images.length > 0) ? product.images[0] : null;
              const artNo = product.articleNumber || product.sku || product.name;
              const inStock = product.stockQuantity > 0;
              const cartItem = cart[product.id];
              const qtyInCart = cartItem?.quantity || 0;

              const retailerMargin = product.mrp > 0 ? product.mrp - product.sellingPrice : 0;
              const retailerMarginPercent = product.mrp > 0 ? Math.round((retailerMargin / product.mrp) * 100) : 0;

              return (
                <div
                  key={product.id}
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: qtyInCart > 0 ? "2px solid #2563eb" : "1px solid #e2e8f0",
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: qtyInCart > 0 ? "0 4px 12px rgba(37, 99, 235, 0.12)" : "0 1px 3px rgba(0,0,0,0.03)",
                    transition: "all 0.2s ease",
                    position: "relative"
                  }}
                >
                  {/* 4:5 ASPECT RATIO IMAGE CONTAINER */}
                  <div
                    onClick={() => setQuickViewProduct(product)}
                    style={{
                      width: "100%",
                      aspectRatio: "4 / 5",
                      backgroundColor: "#f1f5f9",
                      position: "relative",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
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
                        <span style={{ fontSize: "0.75rem", marginTop: "6px", fontWeight: 500 }}>High-Res Glassware Image</span>
                      </div>
                    )}

                    {/* Article Badge Top-Left */}
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

                    {/* Live ERP Stock Badge Top-Right */}
                    <div
                      style={{
                        position: "absolute",
                        top: "10px",
                        right: "10px",
                        backgroundColor: inStock ? "#ecfdf5" : "#fffbeb",
                        color: inStock ? "#059669" : "#b45309",
                        border: `1px solid ${inStock ? "#a7f3d0" : "#fde68a"}`,
                        padding: "3px 8px",
                        borderRadius: "6px",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
                      }}
                    >
                      {inStock ? (
                        <>⚡ Ready: {product.stockQuantity} pcs</>
                      ) : (
                        <>🏭 Made to Order</>
                      )}
                    </div>

                    {/* Multiple Photos Count Indicator */}
                    {product.images && product.images.length > 1 && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "10px",
                          right: "10px",
                          backgroundColor: "rgba(0,0,0,0.6)",
                          color: "#ffffff",
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          padding: "2px 6px",
                          borderRadius: "4px"
                        }}
                      >
                        +{product.images.length - 1} photos
                      </div>
                    )}
                  </div>

                  {/* Product Details Content */}
                  <div style={{ padding: "14px", display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
                    
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px" }}>
                        <h3 
                          onClick={() => setQuickViewProduct(product)}
                          style={{ margin: 0, fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", lineHeight: 1.3, cursor: "pointer" }}
                        >
                          {product.name}
                        </h3>
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: "0.73rem", color: "#64748b" }}>
                        Category: <strong style={{ color: "#334155" }}>{product.category || "Glassware"}</strong>
                      </p>
                    </div>

                    {/* Technical Glassware Specs Chip Row */}
                    <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", fontSize: "0.7rem" }}>
                      {product.capacityMl && (
                        <span style={{ backgroundColor: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontWeight: 600 }}>
                          {product.capacityMl} ml
                        </span>
                      )}
                      {product.material && (
                        <span style={{ backgroundColor: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontWeight: 500 }}>
                          {product.material}
                        </span>
                      )}
                      {product.masterCartonQty && (
                        <span style={{ backgroundColor: "#f1f5f9", color: "#334155", padding: "2px 6px", borderRadius: "4px", fontWeight: 500 }}>
                          {product.masterCartonQty} pcs/ctn
                        </span>
                      )}
                    </div>

                    {/* Retailer Margin & SRP Box */}
                    {product.mrp > 0 && (
                      <div style={{ backgroundColor: "#f8fafc", padding: "6px 8px", borderRadius: "6px", border: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem" }}>
                        <span style={{ color: "#64748b" }}>Suggested Retail Price (SRP): <strong>₹{product.mrp}</strong></span>
                        <span style={{ color: "#059669", fontWeight: 700, backgroundColor: "#ecfdf5", padding: "1px 5px", borderRadius: "4px" }}>
                          +{retailerMarginPercent}% Margin
                        </span>
                      </div>
                    )}

                    {/* 4-Tier Wholesale Slabs Preview */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "2px", textAlign: "center", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "6px", fontSize: "0.68rem" }}>
                      <div>
                        <div style={{ color: "#64748b" }}>1-99</div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>₹{product.sellingPrice}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b" }}>100-299</div>
                        <div style={{ fontWeight: 700, color: "#2563eb" }}>₹{Math.round(product.sellingPrice * 0.95)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b" }}>300-499</div>
                        <div style={{ fontWeight: 700, color: "#7c3aed" }}>₹{Math.round(product.sellingPrice * 0.90)}</div>
                      </div>
                      <div>
                        <div style={{ color: "#64748b" }}>500+</div>
                        <div style={{ fontWeight: 700, color: "#059669" }}>₹{Math.round(product.sellingPrice * 0.80)}</div>
                      </div>
                    </div>

                    {/* Price & Action Row */}
                    <div style={{ marginTop: "auto", paddingTop: "10px", borderTop: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                      <div>
                        <span style={{ fontSize: "0.65rem", color: "#64748b", display: "block" }}>Trade Price (ex. GST)</span>
                        <span style={{ fontSize: "1.1rem", fontWeight: 800, color: "#059669" }}>
                          ₹{qtyInCart > 0 ? cartItem.effectiveRate : product.sellingPrice}
                          <span style={{ fontSize: "0.7rem", color: "#64748b", fontWeight: 400 }}> / pc</span>
                        </span>
                      </div>

                      {/* Quick Add / Counter */}
                      {qtyInCart > 0 ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#0f172a", borderRadius: "8px", padding: "3px 6px" }}>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product, qtyInCart - (product.masterCartonQty || 6))}
                            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ color: "#fff", fontWeight: 700, fontSize: "0.8rem", minWidth: "42px", textAlign: "center" }}>
                            {qtyInCart} pcs
                          </span>
                          <button
                            type="button"
                            onClick={() => handleAddToCart(product, qtyInCart + (product.masterCartonQty || 6))}
                            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center" }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product, product.masterCartonQty || 24)}
                          style={{
                            padding: "7px 12px",
                            borderRadius: "8px",
                            border: "none",
                            backgroundColor: "#0f172a",
                            color: "#ffffff",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            boxShadow: "0 2px 6px rgba(15, 23, 42, 0.15)"
                          }}
                        >
                          <ShoppingBag size={13} /> Add {product.masterCartonQty || 24} pcs
                        </button>
                      )}

                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "60px 20px", textAlign: "center", backgroundColor: "#ffffff", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <ShoppingBag size={48} style={{ color: "#cbd5e1", margin: "0 auto 12px" }} />
            <h3 style={{ fontSize: "1.05rem", color: "#1e293b", margin: "0 0 6px" }}>No Glassware Articles Found</h3>
            <p style={{ fontSize: "0.82rem", color: "#64748b", margin: 0 }}>Try clearing your category filter or search query.</p>
          </div>
        )}

      </main>

      {/* ─── FLOATING WHOLESALE ORDER BAR ─── */}
      {cartTotals.totalPcs > 0 && !isCartOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#0f172a",
            color: "#ffffff",
            padding: "12px 24px",
            borderRadius: "50px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
            display: "flex",
            alignItems: "center",
            gap: "20px",
            zIndex: 99999,
            maxWidth: "90vw"
          }}
        >
          <div>
            <div style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
              {cartList.length} Articles • {cartTotals.totalPcs} pcs selected
            </div>
            <div style={{ fontSize: "1.05rem", fontWeight: 800 }}>
              ₹{cartTotals.subtotal.toLocaleString("en-IN")} <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 400 }}>+ 18% GST</span>
            </div>
          </div>

          {/* MOV Progress Pill */}
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", minWidth: "120px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.68rem" }}>
              <span style={{ color: cartTotals.movMet ? "#4ade80" : "#fbbf24", fontWeight: 600 }}>
                {cartTotals.movMet ? "✓ MOV Met" : `MOV: ₹${cartTotals.minMOV / 1000}k`}
              </span>
              <span style={{ color: "#94a3b8" }}>{cartTotals.movProgress}%</span>
            </div>
            <div style={{ height: "4px", backgroundColor: "#334155", borderRadius: "9999px", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${cartTotals.movProgress}%`, backgroundColor: cartTotals.movMet ? "#4ade80" : "#fbbf24" }} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            style={{
              padding: "9px 20px",
              borderRadius: "50px",
              border: "none",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            Review Cart <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ─── CART SLIDE-OVER DRAWER ─── */}
      {isCartOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 100000,
            display: "flex",
            justifyContent: "flex-end"
          }}
          onClick={() => setIsCartOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "480px",
              maxWidth: "100%",
              height: "100%",
              backgroundColor: "#ffffff",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-4px 0 25px rgba(0,0,0,0.15)"
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "#0f172a" }}>Wholesale Order Cart</h2>
                <span style={{ fontSize: "0.75rem", color: "#64748b" }}>Live sync with ERP stock & wholesale slabs</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {/* MOV Progress Status Banner */}
            <div style={{ padding: "12px 20px", backgroundColor: cartTotals.movMet ? "#ecfdf5" : "#fffbeb", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", fontSize: "0.78rem" }}>
                <span style={{ fontWeight: 700, color: cartTotals.movMet ? "#065f46" : "#92400e" }}>
                  {cartTotals.movMet ? "✓ Minimum Order Value (MOV) Reached" : `Required MOV: ₹${cartTotals.minMOV.toLocaleString("en-IN")}`}
                </span>
                <span style={{ fontWeight: 600, color: "#64748b" }}>₹{cartTotals.subtotal.toLocaleString("en-IN")} / ₹{cartTotals.minMOV.toLocaleString("en-IN")}</span>
              </div>
              <div style={{ height: "6px", backgroundColor: "rgba(0,0,0,0.08)", borderRadius: "9999px", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${cartTotals.movProgress}%`, backgroundColor: cartTotals.movMet ? "#059669" : "#d97706" }} />
              </div>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: "12px" }}>
              {cartList.length > 0 ? (
                cartList.map(item => (
                  <div
                    key={item.product.id}
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0",
                      backgroundColor: "#f8fafc",
                      display: "flex",
                      gap: "12px",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ width: "50px", height: "50px", borderRadius: "6px", overflow: "hidden", backgroundColor: "#e2e8f0", flexShrink: 0 }}>
                      {item.product.images && item.product.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.product.images[0]} alt={item.product.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : (
                        <ImageIcon size={24} style={{ margin: "13px auto", color: "#94a3b8" }} />
                      )}
                    </div>

                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, fontSize: "0.85rem", fontWeight: 700, color: "#0f172a" }}>{item.product.name}</h4>
                      <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "2px" }}>
                        Art #{item.product.articleNumber || item.product.sku} • {item.product.stockQuantity > 0 ? "⚡ Ready Stock" : "🏭 Made to Order"}
                      </div>
                      <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#059669", marginTop: "4px" }}>
                        ₹{item.effectiveRate} / pc {item.discountPercent > 0 && <span style={{ fontSize: "0.68rem", color: "#7c3aed" }}>(-{item.discountPercent}%)</span>}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item.product, item.quantity - (item.product.masterCartonQty || 6))}
                        style={{ width: "26px", height: "26px", borderRadius: "4px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ minWidth: "36px", textAlign: "center", fontSize: "0.8rem", fontWeight: 700 }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddToCart(item.product, item.quantity + (item.product.masterCartonQty || 6))}
                        style={{ width: "26px", height: "26px", borderRadius: "4px", border: "1px solid #cbd5e1", backgroundColor: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: "40px 20px", textAlign: "center", color: "#64748b" }}>
                  <ShoppingBag size={36} style={{ color: "#cbd5e1", margin: "0 auto 10px" }} />
                  <p style={{ margin: 0, fontSize: "0.85rem" }}>Your wholesale cart is currently empty.</p>
                </div>
              )}
            </div>

            {/* Cart Footer */}
            {cartList.length > 0 && (
              <div style={{ padding: "16px 20px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#64748b", marginBottom: "4px" }}>
                  <span>Taxable Subtotal</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>₹{cartTotals.subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", color: "#64748b", marginBottom: "8px" }}>
                  <span>Estimated 18% GST</span>
                  <span style={{ fontWeight: 600, color: "#0f172a" }}>₹{cartTotals.tax.toLocaleString("en-IN")}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "1.05rem", fontWeight: 800, color: "#0f172a", marginBottom: "14px", borderTop: "1px solid #e2e8f0", paddingTop: "8px" }}>
                  <span>Total Order Value</span>
                  <span style={{ color: "#059669" }}>₹{cartTotals.grandTotal.toLocaleString("en-IN")}</span>
                </div>

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => handleWhatsAppBookingDirect()}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#25D366",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <MessageSquare size={16} /> WhatsApp Order
                  </button>

                  <button
                    type="button"
                    disabled={!cartTotals.movMet}
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsCheckoutOpen(true);
                    }}
                    style={{
                      flex: 1.2,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: cartTotals.movMet ? "#0f172a" : "#94a3b8",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: cartTotals.movMet ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <span>Direct ERP Checkout</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DIRECT ERP CHECKOUT MODAL ─── */}
      {isCheckoutOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 100001,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setIsCheckoutOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "640px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "#0f172a" }}>
                  Complete Wholesale Order & Proforma Booking
                </h2>
                <p style={{ margin: "3px 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                  Orders are directly booked into {company.companyName} ERP with live inventory allocation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
              >
                <X size={20} />
              </button>
            </div>

            {orderError && (
              <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626", padding: "10px 14px", borderRadius: "8px", fontSize: "0.82rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertTriangle size={16} />
                <span>{orderError}</span>
              </div>
            )}

            <form onSubmit={handleCheckoutSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Business / Company Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.businessName}
                    onChange={e => setBuyerForm({ ...buyerForm, businessName: e.target.value })}
                    placeholder="e.g. Acme Hospitality Pvt Ltd"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.contactPerson}
                    onChange={e => setBuyerForm({ ...buyerForm, contactPerson: e.target.value })}
                    placeholder="e.g. Rahul Sharma"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Mobile / WhatsApp Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={buyerForm.mobile}
                    onChange={e => setBuyerForm({ ...buyerForm, mobile: e.target.value })}
                    placeholder="e.g. 9876543210"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={buyerForm.email}
                    onChange={e => setBuyerForm({ ...buyerForm, email: e.target.value })}
                    placeholder="e.g. purchasing@acme.com"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    GSTIN Number (For Input Tax Credit)
                  </label>
                  <input
                    type="text"
                    value={buyerForm.gstin}
                    onChange={e => setBuyerForm({ ...buyerForm, gstin: e.target.value.toUpperCase() })}
                    placeholder="e.g. 07AAAAA0000A1Z5"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", textTransform: "uppercase" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Destination State (For GST Calculation) *
                  </label>
                  <select
                    value={buyerForm.state}
                    onChange={e => setBuyerForm({ ...buyerForm, state: e.target.value })}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", backgroundColor: "#fff" }}
                  >
                    {INDIAN_STATES.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                  Delivery / Warehouse Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={buyerForm.shippingAddress}
                  onChange={e => setBuyerForm({ ...buyerForm, shippingAddress: e.target.value })}
                  placeholder="Plot / Street / Building details..."
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem", resize: "vertical" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.city}
                    onChange={e => setBuyerForm({ ...buyerForm, city: e.target.value })}
                    placeholder="e.g. Mumbai"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#334155", display: "block", marginBottom: "4px" }}>
                    Pincode *
                  </label>
                  <input
                    type="text"
                    required
                    value={buyerForm.pincode}
                    onChange={e => setBuyerForm({ ...buyerForm, pincode: e.target.value })}
                    placeholder="e.g. 400001"
                    style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #cbd5e1", fontSize: "0.85rem" }}
                  />
                </div>
              </div>

              {/* Courier & Transit Breakage Option */}
              <div style={{ backgroundColor: "#f8fafc", padding: "12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "#0f172a", display: "block", marginBottom: "6px" }}>
                  Logistics & Transit Breakage Policy
                </label>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.8rem" }}>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="courierType"
                      checked={buyerForm.courierType === "R3_COURIER"}
                      onChange={() => setBuyerForm({ ...buyerForm, courierType: "R3_COURIER" })}
                    />
                    <span><strong>R3 Courier:</strong> Breakage Replacement Credit Covered</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name="courierType"
                      checked={buyerForm.courierType === "OWN_TRANSPORTER"}
                      onChange={() => setBuyerForm({ ...buyerForm, courierType: "OWN_TRANSPORTER" })}
                    />
                    <span><strong>Own Transporter:</strong> Buyer handles freight (₹0 on invoice)</span>
                  </label>
                </div>
              </div>

              {/* Order Summary Confirmation */}
              <div style={{ backgroundColor: "#f1f5f9", padding: "12px 16px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Order Items & Value</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#0f172a" }}>
                    {cartList.length} Items ({cartTotals.totalPcs} pcs)
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Grand Total (incl. 18% GST)</span>
                  <span style={{ fontSize: "1.15rem", fontWeight: 800, color: "#059669" }}>
                    ₹{cartTotals.grandTotal.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(false)}
                  style={{ padding: "10px 18px", borderRadius: "8px", border: "1px solid #cbd5e1", backgroundColor: "#fff", fontSize: "0.84rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder}
                  style={{
                    padding: "10px 24px",
                    borderRadius: "8px",
                    border: "none",
                    backgroundColor: "#059669",
                    color: "#ffffff",
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    cursor: submittingOrder ? "not-allowed" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <CheckCircle2 size={16} />
                  {submittingOrder ? "Submitting to ERP..." : "Confirm & Place ERP Order"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ─── ORDER CONFIRMATION SUCCESS MODAL ─── */}
      {orderSuccessData && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.75)",
            zIndex: 100002,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
        >
          <div
            style={{
              width: "520px",
              maxWidth: "100%",
              backgroundColor: "#ffffff",
              borderRadius: "16px",
              padding: "28px",
              textAlign: "center",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)"
            }}
          >
            <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0f172a", margin: "0 0 6px" }}>
              Wholesale Order Confirmed!
            </h2>
            <p style={{ fontSize: "0.85rem", color: "#64748b", margin: "0 0 20px" }}>
              Your order has been registered in the ERP database. Proforma Invoice & Order record generated.
            </p>

            <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px", textAlign: "left", marginBottom: "20px", fontSize: "0.82rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Order Reference Number:</span>
                <strong style={{ color: "#0f172a", fontFamily: "monospace", fontSize: "0.95rem" }}>{orderSuccessData.orderNumber}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Proforma Invoice #:</span>
                <strong style={{ color: "#0f172a", fontFamily: "monospace" }}>{orderSuccessData.piNumber}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span style={{ color: "#64748b" }}>Total Quantity Allocated:</span>
                <strong style={{ color: "#0f172a" }}>{orderSuccessData.totalQuantity} pcs</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "6px" }}>
                <span style={{ color: "#64748b" }}>Total Order Amount (incl. GST):</span>
                <strong style={{ color: "#059669", fontSize: "1rem" }}>₹{orderSuccessData.totalValue.toLocaleString("en-IN")}</strong>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {orderSuccessData.whatsAppUrl && (
                <a
                  href={orderSuccessData.whatsAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    padding: "12px",
                    borderRadius: "8px",
                    backgroundColor: "#25D366",
                    color: "#ffffff",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <MessageSquare size={16} /> Open Order Confirmation on WhatsApp
                </a>
              )}

              <button
                type="button"
                onClick={() => setOrderSuccessData(null)}
                style={{
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  color: "#334155",
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Back to Catalog Lookbook
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── QUICK VIEW PRODUCT MODAL ─── */}
      {quickViewProduct && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.7)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px"
          }}
          onClick={() => setQuickViewProduct(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "740px",
              maxWidth: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              backgroundColor: "#ffffff",
              borderRadius: "14px",
              padding: "24px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "24px",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
              position: "relative"
            }}
          >
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              style={{ position: "absolute", top: "14px", right: "14px", background: "none", border: "none", cursor: "pointer", color: "#64748b" }}
            >
              <X size={20} />
            </button>

            {/* Left: Gallery View */}
            <div>
              <div style={{ width: "100%", aspectRatio: "4/5", borderRadius: "10px", overflow: "hidden", backgroundColor: "#f1f5f9" }}>
                {quickViewProduct.images && quickViewProduct.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={quickViewProduct.images[0]} alt={quickViewProduct.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <ImageIcon size={48} style={{ margin: "40% auto", color: "#94a3b8" }} />
                )}
              </div>
            </div>

            {/* Right: Detailed Specifications */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
                Art #{quickViewProduct.articleNumber || quickViewProduct.sku}
              </div>
              <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.3 }}>
                {quickViewProduct.name}
              </h2>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                {quickViewProduct.description || "Premium export-grade glassware engineered with lead-free crystal and high-precision thermal durability."}
              </p>

              <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div>Material: <strong>{quickViewProduct.material || "Lead-Free Crystal"}</strong></div>
                <div>Capacity: <strong>{quickViewProduct.capacityMl ? `${quickViewProduct.capacityMl} ml` : 'N/A'}</strong></div>
                <div>Master Carton: <strong>{quickViewProduct.masterCartonQty || 24} pcs</strong></div>
                <div>Carton CBM: <strong>{quickViewProduct.cbm || '0.045'} m³</strong></div>
                <div>HSN Code: <strong>{quickViewProduct.hsnCode || '7013'}</strong></div>
                <div>Live Stock: <strong style={{ color: quickViewProduct.stockQuantity > 0 ? '#059669' : '#b45309' }}>{quickViewProduct.stockQuantity} pcs</strong></div>
              </div>

              {quickViewProduct.customizationOptions && (
                <div style={{ fontSize: "0.75rem", color: "#475569" }}>
                  <strong>Customization:</strong> {quickViewProduct.customizationOptions}
                </div>
              )}

              <div style={{ marginTop: "auto", paddingTop: "12px", borderTop: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
                  <div>
                    <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Trade Wholesale Rate</span>
                    <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#059669" }}>
                      ₹{quickViewProduct.sellingPrice} <span style={{ fontSize: "0.75rem", color: "#64748b", fontWeight: 400 }}>/ pc</span>
                    </div>
                  </div>
                  {quickViewProduct.mrp > 0 && (
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "0.7rem", color: "#64748b" }}>SRP (MRP)</span>
                      <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "#7c3aed" }}>
                        ₹{quickViewProduct.mrp}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(quickViewProduct, quickViewProduct.masterCartonQty || 24);
                      setQuickViewProduct(null);
                    }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#0f172a",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    <ShoppingBag size={14} /> Add {quickViewProduct.masterCartonQty || 24} pcs
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleWhatsAppBookingDirect(quickViewProduct);
                      setQuickViewProduct(null);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: "none",
                      backgroundColor: "#25D366",
                      color: "#ffffff",
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    <MessageSquare size={16} />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={{ backgroundColor: "#ffffff", borderTop: "1px solid #e2e8f0", padding: "24px 20px", textAlign: "center", fontSize: "0.78rem", color: "#64748b" }}>
        <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#1e293b" }}>{company.companyName} ({company.tradeName || 'R3 EXPORTS'})</p>
        <p style={{ margin: 0 }}>{company.address} • Phone: {company.mobile} • Email: {company.email} • GSTIN: {company.gstin}</p>
        <p style={{ margin: "6px 0 0", color: "#94a3b8", fontSize: "0.72rem" }}>
          All prices ex-factory. GST (18%) applicable on checkout. Export packaging and freight calculated on destination.
        </p>
      </footer>

    </div>
  );
}
