"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
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
  Heart,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  MessageCircle,
  ExternalLink
} from "lucide-react";
import { placeCatalogOrder, CatalogOrderBuyerDetails } from "@/app/actions/catalogActions";
import { R3_TRADE_SLABS, R3_COMPANY_PROFILE, R3GlasswareProduct } from "@/lib/dummyProducts";
import "@/app/catalog/catalog.css";

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
  shape?: string;
  ship?: number;
  tags?: string[];
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
  isSample?: boolean;
}

const INDIAN_STATES = [
  "Uttar Pradesh", "Delhi", "Maharashtra", "Gujarat", "Karnataka", "Tamil Nadu",
  "Haryana", "Rajasthan", "West Bengal", "Telangana", "Punjab", "Madhya Pradesh",
  "Kerala", "Andhra Pradesh", "Bihar", "Odisha", "Assam", "Chandigarh", "Goa",
  "Himachal Pradesh", "Jammu and Kashmir", "Jharkhand", "Uttarakhand"
];

// Vector shapes for glassware fallback
function GlassShapeSvg({ shape = "tumbler" }: { shape?: string }) {
  const s = 'fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"';
  const liq = 'fill="#C9971C" opacity="0.28"';

  const shapeMap: Record<string, React.ReactNode> = {
    bottle: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <rect x="40" y="6" width="20" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M42 16v8c-8 4-12 10-12 18v40c0 5 3 8 8 8h24c5 0 8-3 8-8V42c0-8-4-14-12-18v-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M31 54h38v28c0 4-2 6-6 6H37c-4 0-6-2-6-6z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    dw: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M28 30h44l-4 48c0 4-3 6-7 6H39c-4 0-7-2-7-6z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M34 34h32l-3 34c0 3-2 5-5 5H42c-3 0-5-2-5-5z" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.45" />
        <path d="M35 50h30l-2 18c0 3-2 5-5 5H42c-3 0-5-2-5-5z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    dwtall: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M30 14h40l-3 70c0 3-2 5-5 5H38c-3 0-5-2-5-5z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M35 18h30l-2 56c0 3-2 5-5 5H42c-3 0-5-2-5-5z" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.45" />
        <path d="M36 40h28l-2 34c0 3-2 5-5 5H43c-3 0-5-2-5-5z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    tumbler: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M28 18h44l-5 68H33z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <path d="M31 50h38l-3 34H34z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    ribbed: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M28 16h44l-4 70H32z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
        <g stroke="currentColor" strokeWidth="2.5" opacity="0.5">
          <path d="M38 20v62" />
          <path d="M50 20v64" />
          <path d="M62 20v62" />
        </g>
      </svg>
    ),
    carafe: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M42 8h16v6H42z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M44 14v18c-12 8-18 20-18 34 0 14 6 24 24 24s24-10 24-24c0-14-6-26-18-34V14" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M28 62h44c0 16-8 26-22 26S28 78 28 62z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    server: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M32 22h36l6 10-6 4c6 8 8 16 8 26 0 16-10 26-26 26S24 78 24 62c0-10 2-18 8-26z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M40 44h20" stroke="currentColor" strokeWidth="3" />
        <path d="M26 64h48c0 14-10 22-24 22S26 78 26 64z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    teapot: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M40 22h20v6H40z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M28 34h44c6 8 8 16 8 24 0 16-12 26-30 26S20 74 20 58c0-8 2-16 8-24z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M80 46c8-2 12 4 10 12-1 6-6 10-12 10" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M20 50c-8-4-14 0-14 6" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M44 34v30h12V34" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
      </svg>
    ),
    mug: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <path d="M24 18h42v62c0 4-2 6-6 6H30c-4 0-6-2-6-6z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M66 32h8c6 0 10 4 10 12v6c0 8-4 12-10 12h-8" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M26 44h38v36c0 3-2 4-5 4H31c-3 0-5-1-5-4z" fill="#C9971C" opacity="0.28" />
      </svg>
    ),
    jar: (
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', color: 'var(--r3-ink)' }} aria-hidden="true">
        <rect x="24" y="10" width="52" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M26 22h48v58c0 5-3 8-8 8H34c-5 0-8-3-8-8z" fill="none" stroke="currentColor" strokeWidth="3" />
        <path d="M24 10h52v12H24z" fill="#C9971C" opacity="0.25" />
      </svg>
    )
  };

  return shapeMap[shape] || shapeMap.tumbler;
}

export default function PublicCatalogClient({ initialProducts, categories, company, initialTitle }: Props) {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStockFilter, setSelectedStockFilter] = useState<"ALL" | "IN_STOCK" | "MADE_TO_ORDER">("ALL");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"featured" | "popular" | "price" | "margin">("featured");

  // Likes store
  const [likedSkus, setLikedSkus] = useState<Set<string>>(new Set());
  const [likedOnly, setLikedOnly] = useState(false);

  // Card quantities and box pack selections
  const [cardSelections, setCardSelections] = useState<Record<string, { qty: number; pack: number }>>({});

  // Cart state
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoCodeInput, setPromoCodeInput] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<"R3_COURIER" | "OWN_TRANSPORTER">("R3_COURIER");

  // Modals
  const [pdpProduct, setPdpProduct] = useState<Product | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isCustomDesignModalOpen, setIsCustomDesignModalOpen] = useState(false);
  const [isQuickOrderModalOpen, setIsQuickOrderModalOpen] = useState(false);
  const [quickOrderText, setQuickOrderText] = useState("R3-BT750, 60\nR3-DW080, 120\nR3-TB300, 240");

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Checkout submission
  const [buyerForm, setBuyerForm] = useState<CatalogOrderBuyerDetails>({
    businessName: "",
    contactPerson: "",
    mobile: "",
    whatsappNumber: "",
    email: "",
    gstin: "",
    shippingAddress: "",
    city: "Agra",
    state: "Uttar Pradesh",
    pincode: "282006",
    notes: "",
    buyingStream: "READY_STOCK",
    courierType: "R3_COURIER"
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Helper for pricing slabs
  const calculateSlab = (basePrice: number, qty: number) => {
    let discount = 0;
    if (qty >= 500) discount = 20;
    else if (qty >= 300) discount = 10;
    else if (qty >= 100) discount = 5;

    const rate = Math.round((basePrice * (1 - discount / 100)) * 100) / 100;
    return { discount, rate };
  };

  const calculateMargin = (rate: number, srp: number) => {
    const costWithGst = rate * 1.18;
    const marginAmount = srp - costWithGst;
    const marginPct = Math.round((marginAmount / srp) * 100);
    const markup = (srp / costWithGst).toFixed(1);
    return { costWithGst, marginAmount, marginPct, markup };
  };

  // Initialize card quantities
  useEffect(() => {
    const initMap: Record<string, { qty: number; pack: number }> = {};
    initialProducts.forEach(p => {
      const isInStock = p.stockQuantity > 0;
      const pack = (p.masterCartonQty === 12 ? 2 : 2);
      const initialQty = isInStock ? pack * 5 : (p.moq || 100);
      initMap[p.id] = { qty: initialQty, pack };
    });
    setCardSelections(initMap);
  }, [initialProducts]);

  const toggleLike = (sku: string | null) => {
    if (!sku) return;
    setLikedSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) {
        next.delete(sku);
        showToast("Removed from liked items");
      } else {
        next.add(sku);
        showToast("Added to liked items ♡");
      }
      return next;
    });
  };

  const updateCardQty = (productId: string, newQty: number, pack: number, maxStock?: number) => {
    let rounded = Math.ceil(newQty / pack) * pack;
    if (rounded < pack) rounded = pack;
    if (maxStock && maxStock > 0 && rounded > maxStock) rounded = maxStock;

    setCardSelections(prev => ({
      ...prev,
      [productId]: { qty: rounded, pack }
    }));
  };

  const updateCardPack = (productId: string, pack: number, curQty: number, maxStock?: number) => {
    let rounded = Math.ceil(curQty / pack) * pack;
    if (rounded < pack) rounded = pack;
    if (maxStock && maxStock > 0 && rounded > maxStock) rounded = maxStock;

    setCardSelections(prev => ({
      ...prev,
      [productId]: { qty: rounded, pack }
    }));
  };

  const handleAddToCart = (product: Product, quantity: number, boxOption: number) => {
    const slab = calculateSlab(product.sellingPrice, quantity);
    setCart(prev => ({
      ...prev,
      [product.id]: {
        product,
        quantity,
        boxOption,
        effectiveRate: slab.rate,
        discountPercent: slab.discount
      }
    }));
    showToast(`Added ${quantity} pcs of ${product.name} to order!`);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Group Cart items into Ready Stock and Made to Order
  const readyStockItems = useMemo(() => {
    return Object.values(cart).filter(item => item.product.stockQuantity > 0 && !item.isSample);
  }, [cart]);

  const madeToOrderItems = useMemo(() => {
    return Object.values(cart).filter(item => item.product.stockQuantity <= 0 && !item.isSample);
  }, [cart]);

  const sampleItems = useMemo(() => {
    return Object.values(cart).filter(item => item.isSample);
  }, [cart]);

  const readyStockSubtotal = readyStockItems.reduce((sum, item) => sum + (item.effectiveRate * item.quantity), 0);
  const madeToOrderSubtotal = madeToOrderItems.reduce((sum, item) => sum + (item.effectiveRate * item.quantity), 0);
  const samplesSubtotal = sampleItems.reduce((sum, item) => sum + 500, 0);

  const rawSubtotal = readyStockSubtotal + madeToOrderSubtotal + samplesSubtotal;
  const promoDiscount = appliedPromo === "R3FIRST" ? Math.round(rawSubtotal * 0.05) : 0;
  const netSubtotal = Math.max(0, rawSubtotal - promoDiscount);
  const gstAmount = Math.round(netSubtotal * 0.18);
  const grandTotal = netSubtotal + gstAmount;

  const totalCartCount = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);

  const readyStockMovMet = readyStockItems.length === 0 || readyStockSubtotal >= (company.minOrderValueReadyStock || 15000);
  const madeToOrderMovMet = madeToOrderItems.length === 0 || madeToOrderSubtotal >= (company.minOrderValueMadeToOrder || 50000);
  const canProceedToCheckout = totalCartCount > 0 && readyStockMovMet && madeToOrderMovMet;

  // Filter products
  const filteredProducts = useMemo(() => {
    return initialProducts.filter(p => {
      if (likedOnly && (!p.sku || !likedSkus.has(p.sku))) return false;

      if (selectedCategory !== "All" && p.category !== selectedCategory) return false;

      if (selectedStockFilter === "IN_STOCK" && p.stockQuantity <= 0) return false;
      if (selectedStockFilter === "MADE_TO_ORDER" && p.stockQuantity > 0) return false;

      if (selectedTagFilter !== "ALL") {
        const productTags = p.tags || [];
        if (!productTags.includes(selectedTagFilter)) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const match = p.name.toLowerCase().includes(q) ||
                      (p.sku || "").toLowerCase().includes(q) ||
                      (p.category || "").toLowerCase().includes(q) ||
                      (p.material || "").toLowerCase().includes(q) ||
                      (p.size || "").toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === "price") return a.sellingPrice - b.sellingPrice;
      if (sortBy === "margin") {
        const mA = calculateMargin(a.sellingPrice, a.mrp).marginPct;
        const mB = calculateMargin(b.sellingPrice, b.mrp).marginPct;
        return mB - mA;
      }
      return 0;
    });
  }, [initialProducts, selectedCategory, selectedStockFilter, selectedTagFilter, searchQuery, sortBy, likedOnly, likedSkus]);

  // Tag counts
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = { trending: 0, best: 0, new: 0, clear: 0 };
    initialProducts.forEach(p => {
      (p.tags || []).forEach(t => {
        if (counts[t] !== undefined) counts[t]++;
      });
    });
    return counts;
  }, [initialProducts]);

  // Quick order handler
  const handleQuickOrderAddAll = () => {
    const lines = quickOrderText.split("\n").map(l => l.trim()).filter(Boolean);
    let addedCount = 0;
    const nextCart = { ...cart };

    lines.forEach(line => {
      const parts = line.split(/[,\t]+/).map(s => s.trim());
      if (parts.length >= 2) {
        const skuQuery = parts[0].toLowerCase();
        const qty = parseInt(parts[1], 10);
        const matched = initialProducts.find(p => (p.sku || "").toLowerCase() === skuQuery);
        if (matched && !isNaN(qty) && qty > 0) {
          const slab = calculateSlab(matched.sellingPrice, qty);
          nextCart[matched.id] = {
            product: matched,
            quantity: qty,
            boxOption: 2,
            effectiveRate: slab.rate,
            discountPercent: slab.discount
          };
          addedCount++;
        }
      }
    });

    setCart(nextCart);
    setIsQuickOrderModalOpen(false);
    setIsDrawerOpen(true);
    showToast(`Added ${addedCount} products to your order pad!`);
  };

  // Submit Order to ERP
  const handleSubmitCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buyerForm.businessName.trim() || !buyerForm.contactPerson.trim() || !buyerForm.mobile.trim()) {
      alert("Please fill in Business Name, Contact Person, and Mobile Number.");
      return;
    }

    setIsSubmitting(true);
    try {
      const orderItemsPayload = Object.values(cart).map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        boxPackOption: item.boxOption
      }));

      const res = await placeCatalogOrder({
        buyer: {
          ...buyerForm,
          buyingStream: madeToOrderItems.length > 0 && readyStockItems.length === 0 ? "MADE_TO_ORDER" : "READY_STOCK",
          courierType: deliveryMethod
        },
        items: orderItemsPayload
      });

      if (res.success) {
        setOrderSuccess(res);
        setCart({});
        setIsCheckoutOpen(false);
        setIsDrawerOpen(false);
      } else {
        alert(res.error || "Failed to place order. Please try again.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="r3-catalog-root">
      {/* Toast */}
      <div className={`r3-toast ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>

      {/* Top Wholesale Strip */}
      <div className="r3-top-strip">
        <div className="r3-wrap r3-top-strip-inner">
          <span>Wholesale only. Prices per piece, GST extra. Transit breakage on shipments sent by our courier is credited on your next order, with videos.</span>
          <span>
            <a href={`mailto:${company.email || R3_COMPANY_PROFILE.email}`}>{company.email || R3_COMPANY_PROFILE.email}</a>
            &nbsp;·&nbsp;
            <a href={`tel:${(company.mobile || R3_COMPANY_PROFILE.mobile).replace(/[^0-9+]/g, '')}`}>{company.mobile || R3_COMPANY_PROFILE.mobile}</a>
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="r3-header">
        <div className="r3-wrap r3-header-row">
          <button className="r3-logo" onClick={() => { setSelectedCategory("All"); setSelectedStockFilter("ALL"); setLikedOnly(false); }}>
            <b>R3 <i>Exports</i></b>
            <span>Borosilicate glassware manufacturer, Agra</span>
          </button>

          <form className="r3-search-form" onSubmit={(e) => { e.preventDefault(); }}>
            <input 
              type="search" 
              placeholder="Search by product, capacity or SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          <div className="r3-header-actions">
            <button className="r3-pill-btn" onClick={() => setIsTermsModalOpen(true)}>
              Trade terms
            </button>
            <button 
              className={`r3-pill-btn ${likedOnly ? 'active' : ''}`}
              onClick={() => setLikedOnly(!likedOnly)}
            >
              ♡ Liked ({likedSkus.size})
            </button>
            <Link href="/price-list" className="r3-pill-btn">
              <FileSpreadsheet size={13} />
              Price list &amp; margins
            </Link>
            <button className="r3-pill-btn" onClick={() => setIsCustomDesignModalOpen(true)}>
              Custom design
            </button>
            <button className="r3-pill-btn" onClick={() => setIsQuickOrderModalOpen(true)}>
              Quick order
            </button>
            <button className="r3-cart-btn" onClick={() => setIsDrawerOpen(true)}>
              <ShoppingBag size={15} />
              Order ({totalCartCount})
            </button>
          </div>
        </div>

        {/* Category Navigation Bar */}
        <nav className="r3-cats-nav">
          <div className="r3-wrap r3-cats-nav-inner">
            {["All", "Water bottles", "Double-wall cups", "Tumblers", "Carafes & servers", "Teapots", "Mugs", "Storage jars"].map((cat) => (
              <button
                key={cat}
                className={`r3-cat-tab ${selectedCategory === cat && !likedOnly ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat); setLikedOnly(false); }}
              >
                {cat}
              </button>
            ))}
            <button 
              className="r3-cat-tab r3-cat-custom-btn"
              onClick={() => setIsCustomDesignModalOpen(true)}
            >
              + Custom design
            </button>
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="r3-wrap">
        {/* Two Buying Paths Signature Hero */}
        <section className="r3-hero-section">
          <h1 className="r3-hero-title">Borosilicate glassware, made in Agra, sold to businesses.</h1>
          <p className="r3-hero-lead">Two ways to buy. Pick from ready stock with no minimum quantity, or have any catalogue design made for your order.</p>

          <div className="r3-buying-paths">
            {/* Path 1: In Stock */}
            <div className="r3-path-card">
              <span className="r3-badge in">In stock</span>
              <h2>Buy from ready stock</h2>
              <p className="r3-path-sub">Best for trial orders, cafés and small retailers.</p>
              <dl className="r3-facts-list">
                <dt>Minimum quantity</dt><dd>None</dd>
                <dt>Minimum order value</dt><dd>₹15,000</dd>
                <dt>Payment</dt><dd>100% advance</dd>
                <dt>Dispatch</dt><dd>Within 2 days of payment</dd>
              </dl>
              <button 
                className="r3-btn" 
                onClick={() => { setSelectedStockFilter("IN_STOCK"); setLikedOnly(false); }}
              >
                Shop in-stock items
              </button>
            </div>

            {/* Path 2: Made to Order */}
            <div className="r3-path-card mto">
              <span className="r3-badge mto">Made to order</span>
              <h2>Get it made for you</h2>
              <p className="r3-path-sub">Best for hotels, gifting programmes and distributors.</p>
              <dl className="r3-facts-list">
                <dt>Catalogue designs</dt><dd>50–100 pcs per design</dd>
                <dt>Customised designs</dt><dd>100–500 pcs per design</dd>
                <dt>Minimum order value</dt><dd>₹50,000 – ₹1,00,000</dd>
                <dt>Payment</dt><dd>30% advance, 70% before dispatch</dd>
                <dt>Lead time</dt><dd>20–30 working days</dd>
              </dl>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: 'auto' }}>
                <button 
                  className="r3-btn primary"
                  onClick={() => { setSelectedStockFilter("MADE_TO_ORDER"); setLikedOnly(false); }}
                >
                  Shop made-to-order designs
                </button>
                <button 
                  className="r3-btn"
                  onClick={() => setIsCustomDesignModalOpen(true)}
                >
                  Upload your own design
                </button>
              </div>
            </div>
          </div>

          {/* 4 Buyer Persona Shortcut Tiles */}
          <div className="r3-buyers-grid">
            <button className="r3-buyer-tile" onClick={() => setSelectedCategory("Carafes & servers")}>
              <b>Hotels &amp; restaurants</b>
              <span>Tumblers, carafes, teapots</span>
            </button>
            <button className="r3-buyer-tile" onClick={() => setSelectedCategory("Double-wall cups")}>
              <b>Cafés &amp; roasters</b>
              <span>Double-wall cups, servers</span>
            </button>
            <button className="r3-buyer-tile" onClick={() => setSelectedCategory("Water bottles")}>
              <b>Corporate gifting</b>
              <span>Bottles and mugs with your logo</span>
            </button>
            <button className="r3-buyer-tile" onClick={() => setSelectedCategory("Storage jars")}>
              <b>Retailers &amp; distributors</b>
              <span>Gift-boxed 2, 4 and 6-piece sets</span>
            </button>
          </div>
        </section>

        {/* Catalogue Grid Section */}
        <section className="r3-sec">
          <div className="r3-sec-head">
            <div>
              <h2>{likedOnly ? "Your liked products" : selectedCategory === "All" ? "All products" : selectedCategory}</h2>
              <span className="r3-card-sku">
                {filteredProducts.length} {filteredProducts.length === 1 ? "product" : "products"}
                {selectedStockFilter !== "ALL" ? ` · ${selectedStockFilter === "IN_STOCK" ? "In stock items" : "Made to order"}` : ""}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Availability Filter Segment */}
              <div className="r3-seg">
                <button 
                  className={selectedStockFilter === "ALL" ? "active" : ""}
                  onClick={() => setSelectedStockFilter("ALL")}
                >
                  All
                </button>
                <button 
                  className={selectedStockFilter === "IN_STOCK" ? "active" : ""}
                  onClick={() => setSelectedStockFilter("IN_STOCK")}
                >
                  In stock
                </button>
                <button 
                  className={selectedStockFilter === "MADE_TO_ORDER" ? "active" : ""}
                  onClick={() => setSelectedStockFilter("MADE_TO_ORDER")}
                >
                  Made to order
                </button>
              </div>

              {/* Sort Selector */}
              <select 
                className="r3-sort-select"
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value)}
              >
                <option value="featured">Sort: Featured</option>
                <option value="popular">Sort: Most popular</option>
                <option value="price">Sort: Price, low to high</option>
                <option value="margin">Sort: Highest retail margin</option>
              </select>
            </div>
          </div>

          {/* Tag Filter Bar */}
          <div className="r3-tag-bar">
            <button 
              className={`r3-tag-chip-btn ${selectedTagFilter === "ALL" ? "active" : ""}`}
              onClick={() => setSelectedTagFilter("ALL")}
            >
              All tags
            </button>
            <button 
              className={`r3-tag-chip-btn ${selectedTagFilter === "trending" ? "active" : ""}`}
              onClick={() => setSelectedTagFilter("trending")}
            >
              Trending ({tagCounts.trending || 0})
            </button>
            <button 
              className={`r3-tag-chip-btn ${selectedTagFilter === "best" ? "active" : ""}`}
              onClick={() => setSelectedTagFilter("best")}
            >
              Best seller ({tagCounts.best || 0})
            </button>
            <button 
              className={`r3-tag-chip-btn ${selectedTagFilter === "new" ? "active" : ""}`}
              onClick={() => setSelectedTagFilter("new")}
            >
              New design ({tagCounts.new || 0})
            </button>
            <button 
              className={`r3-tag-chip-btn ${selectedTagFilter === "clear" ? "active" : ""}`}
              onClick={() => setSelectedTagFilter("clear")}
            >
              Clearance stock ({tagCounts.clear || 0})
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="r3-products-grid">
            {filteredProducts.map((p) => {
              const sel = cardSelections[p.id] || { qty: p.stockQuantity > 0 ? 10 : (p.moq || 100), pack: 2 };
              const currentQty = sel.qty;
              const currentPack = sel.pack;
              const isInStock = p.stockQuantity > 0;
              const slab = calculateSlab(p.sellingPrice, currentQty);
              const margin = calculateMargin(slab.rate, p.mrp);
              const isLiked = p.sku ? likedSkus.has(p.sku) : false;
              const inCartItem = cart[p.id];

              // Allowed pack options (e.g. 2, 4, 6)
              const allowedPacks = (p as any).allowedPacks || [2, 4, 6];

              return (
                <div key={p.id} className="r3-card">
                  {/* Top tags and Heart */}
                  <div className="r3-card-tags">
                    {(p.tags || []).map(t => (
                      <span key={t} className={`r3-badge-tag ${t}`}>
                        {t === "trending" ? "Trending" : t === "best" ? "Best seller" : t === "new" ? "New" : "Clearance"}
                      </span>
                    ))}
                  </div>

                  <button 
                    className={`r3-heart-btn ${isLiked ? 'liked' : ''}`}
                    onClick={() => toggleLike(p.sku)}
                    title={isLiked ? "Remove like" : "Like this product"}
                  >
                    <Heart size={13} fill={isLiked ? "currentColor" : "none"} />
                  </button>

                  {/* Picture */}
                  <div className="r3-card-pic" onClick={() => setPdpProduct(p)}>
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.name} loading="lazy" />
                    ) : (
                      <GlassShapeSvg shape={p.shape || "tumbler"} />
                    )}
                  </div>

                  {/* Stock Badge */}
                  {isInStock ? (
                    <span className="r3-badge in">In stock · {p.stockQuantity.toLocaleString("en-IN")} pcs</span>
                  ) : (
                    <span className="r3-badge mto">Made to order · 20–30 working days</span>
                  )}

                  {/* Name & SKU */}
                  <h3 onClick={() => setPdpProduct(p)}>{p.name}</h3>
                  <div className="r3-card-sku">SKU {p.sku} · {p.size || `${p.capacityMl || 350} ml`}</div>

                  {/* Base Trade Rate */}
                  <div className="r3-card-price">
                    ₹{p.sellingPrice.toLocaleString("en-IN")}
                    <small>/ piece + 18% GST</small>
                  </div>

                  {/* Suggested Retail Price & Margin */}
                  <div className="r3-srpline">
                    Suggested retail <b>₹{p.mrp.toLocaleString("en-IN")}</b> · <span className="mg">{margin.marginPct}% margin</span>
                  </div>

                  {/* Quick-Add Section */}
                  <div className="r3-qa">
                    <div className="r3-qa-lbl">Price per piece by quantity:</div>
                    
                    {/* 4-Tier Slab Grid */}
                    <div className="r3-breaks-grid">
                      {R3_TRADE_SLABS.map((s, idx) => {
                        const slabRate = Math.round(p.sellingPrice * (1 - s.off) * 100) / 100;
                        const isSelectedSlab = currentQty >= s.min && currentQty <= s.max;
                        const isNotEnoughStock = isInStock && s.min > p.stockQuantity;

                        return (
                          <div 
                            key={idx} 
                            className={`r3-break-cell ${isSelectedSlab ? 'active' : ''} ${isNotEnoughStock ? 'na' : ''}`}
                            title={isNotEnoughStock ? "Not enough ready stock for this slab" : `${s.label} pieces`}
                          >
                            <span>{s.label}</span>
                            <b>₹{slabRate.toFixed(0)}</b>
                          </div>
                        );
                      })}
                    </div>

                    {/* Box Size Pack Buttons */}
                    <div className="r3-boxsel">
                      {allowedPacks.map((packOption: number) => (
                        <button
                          key={packOption}
                          className={currentPack === packOption ? 'active' : ''}
                          onClick={() => updateCardPack(p.id, packOption, currentQty, isInStock ? p.stockQuantity : undefined)}
                        >
                          {packOption}-pc box
                        </button>
                      ))}
                    </div>

                    {/* Quantity Stepper & Line Total */}
                    <div className="r3-qarow">
                      <div className="r3-stepper">
                        <button 
                          onClick={() => updateCardQty(p.id, currentQty - currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                        >
                          −
                        </button>
                        <input 
                          type="number" 
                          value={currentQty} 
                          onChange={(e) => updateCardQty(p.id, parseInt(e.target.value, 10) || currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                        />
                        <button 
                          onClick={() => updateCardQty(p.id, currentQty + currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                        >
                          +
                        </button>
                      </div>

                      <div className="r3-qatotal">
                        ₹{Math.round(slab.rate * currentQty).toLocaleString("en-IN")} + GST
                        <small>{currentQty} pcs @ ₹{slab.rate}/pc</small>
                      </div>
                    </div>

                    {/* Smart Slab Hint / Nudge */}
                    <div className="r3-qahint">
                      {currentQty < 100 && (
                        <span className="good">Add {100 - currentQty} more pcs for ₹{(p.sellingPrice * 0.95).toFixed(0)}/pc (5% saving)</span>
                      )}
                      {currentQty >= 100 && currentQty < 300 && (
                        <span className="good">Add {300 - currentQty} more pcs for ₹{(p.sellingPrice * 0.90).toFixed(0)}/pc (10% saving)</span>
                      )}
                      {currentQty >= 300 && currentQty < 500 && (
                        <span className="good">Add {500 - currentQty} more pcs for ₹{(p.sellingPrice * 0.80).toFixed(0)}/pc (20% saving)</span>
                      )}
                      {currentQty >= 500 && (
                        <span className="good">✓ Max tier wholesale rate unlocked (20% off)</span>
                      )}
                    </div>

                    {/* Add to Order Button */}
                    <button 
                      className="r3-btn primary r3-qabtn"
                      onClick={() => handleAddToCart(p, currentQty, currentPack)}
                    >
                      Add {currentQty} pcs to order
                    </button>

                    {inCartItem && (
                      <div className="r3-incart-tag">
                        ✓ In your order: {inCartItem.quantity} pcs
                        <button onClick={() => setIsDrawerOpen(true)}>View order</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 5-Column Trade Terms Strip */}
        <section className="r3-sec">
          <div className="r3-terms-strip">
            <div>
              <h3>Samples</h3>
              <p>₹500 per piece on in-stock items, deducted from your final order value.</p>
            </div>
            <div>
              <h3>Breakage cover</h3>
              <p>Shipped by our courier? Broken pieces are credited on your next order with unboxing videos.</p>
            </div>
            <div>
              <h3>Your logo, baked on</h3>
              <p>₹30 extra per piece. 500 pcs per SKU or 1,000 pcs mixed designs.</p>
            </div>
            <div>
              <h3>Gift-ready packing</h3>
              <p>2, 4 or 6-piece boxes, depending on design. Photos and videos on request.</p>
            </div>
            <div>
              <h3>Payment</h3>
              <p>Bank transfer / TT. In stock: 100% advance. Made to order: 30% advance, 70% before dispatch.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Slide-out Order Cart Drawer */}
      <div 
        className={`r3-scrim ${isDrawerOpen ? 'open' : ''}`}
        onClick={() => setIsDrawerOpen(false)}
      />

      <aside className={`r3-drawer ${isDrawerOpen ? 'open' : ''}`}>
        <div className="r3-drawer-head">
          <h2>Your Wholesale Order</h2>
          <button className="r3-pill-btn" onClick={() => setIsDrawerOpen(false)}>
            <X size={15} />
          </button>
        </div>

        <div className="r3-drawer-body">
          {totalCartCount === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--r3-muted)' }}>
              <ShoppingBag size={48} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
              <p>Your order pad is currently empty.</p>
              <button className="r3-btn" onClick={() => setIsDrawerOpen(false)}>
                Browse catalogue items
              </button>
            </div>
          ) : (
            <>
              {/* Ready Stock Group */}
              {readyStockItems.length > 0 && (
                <div className="r3-cart-group">
                  <h3>
                    <span>In-Stock Order (Ready to Ship)</span>
                    <small>₹{readyStockSubtotal.toLocaleString("en-IN")}</small>
                  </h3>
                  <div className={`r3-prog-bar ${readyStockMovMet ? 'done' : ''}`}>
                    <i style={{ width: `${Math.min(100, (readyStockSubtotal / 15000) * 100)}%` }} />
                  </div>
                  <div className={`r3-prog-msg ${readyStockMovMet ? 'good' : ''}`}>
                    {readyStockMovMet ? (
                      "✓ Ready stock ₹15,000 minimum order value met"
                    ) : (
                      `Add ₹${(15000 - readyStockSubtotal).toLocaleString("en-IN")} more to meet ₹15,000 MOV`
                    )}
                  </div>

                  {readyStockItems.map(item => (
                    <div key={item.product.id} className="r3-cart-line">
                      <div className="r3-cart-line-pic">
                        {item.product.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt={item.product.name} />
                        ) : (
                          <GlassShapeSvg shape={item.product.shape} />
                        )}
                      </div>
                      <div>
                        <b>{item.product.name}</b>
                        <small>{item.quantity} pcs @ ₹{item.effectiveRate}/pc ({item.boxOption}-pc box)</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ display: 'block' }}>₹{Math.round(item.effectiveRate * item.quantity).toLocaleString("en-IN")}</b>
                        <button 
                          style={{ background: 'none', border: 0, color: 'var(--r3-warn)', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleRemoveFromCart(item.product.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Made to Order Group */}
              {madeToOrderItems.length > 0 && (
                <div className="r3-cart-group mto">
                  <h3>
                    <span>Made to Order (20–30 Days)</span>
                    <small>₹{madeToOrderSubtotal.toLocaleString("en-IN")}</small>
                  </h3>
                  <div className={`r3-prog-bar ${madeToOrderMovMet ? 'done' : ''}`}>
                    <i style={{ width: `${Math.min(100, (madeToOrderSubtotal / 50000) * 100)}%` }} />
                  </div>
                  <div className={`r3-prog-msg ${madeToOrderMovMet ? 'good' : ''}`}>
                    {madeToOrderMovMet ? (
                      "✓ Made to order ₹50,000 minimum order value met"
                    ) : (
                      `Add ₹${(50000 - madeToOrderSubtotal).toLocaleString("en-IN")} more to meet ₹50,000 MOV`
                    )}
                  </div>

                  {madeToOrderItems.map(item => (
                    <div key={item.product.id} className="r3-cart-line">
                      <div className="r3-cart-line-pic">
                        {item.product.images && item.product.images.length > 0 ? (
                          <img src={item.product.images[0]} alt={item.product.name} />
                        ) : (
                          <GlassShapeSvg shape={item.product.shape} />
                        )}
                      </div>
                      <div>
                        <b>{item.product.name}</b>
                        <small>{item.quantity} pcs @ ₹{item.effectiveRate}/pc ({item.boxOption}-pc box)</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ display: 'block' }}>₹{Math.round(item.effectiveRate * item.quantity).toLocaleString("en-IN")}</b>
                        <button 
                          style={{ background: 'none', border: 0, color: 'var(--r3-warn)', fontSize: '11.5px', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleRemoveFromCart(item.product.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Promo Code Input */}
              <div style={{ marginTop: '16px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="Enter discount code (e.g. R3FIRST)"
                    value={promoCodeInput}
                    onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                    style={{ flex: 1, padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', fontSize: '13px' }}
                  />
                  <button 
                    className="r3-btn" 
                    onClick={() => {
                      if (promoCodeInput.trim() === "R3FIRST") {
                        setAppliedPromo("R3FIRST");
                        showToast("5% Trade Discount Applied!");
                      } else {
                        alert("Invalid code. Try R3FIRST for 5% off introductory wholesale orders.");
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
                {appliedPromo && (
                  <div style={{ fontSize: '12px', color: 'var(--r3-ok)', marginTop: '4px', fontWeight: 600 }}>
                    ✓ Code {appliedPromo} applied (−₹{promoDiscount.toLocaleString("en-IN")})
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        {totalCartCount > 0 && (
          <div className="r3-drawer-foot">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
              <span>Subtotal (Ex-GST)</span>
              <b>₹{netSubtotal.toLocaleString("en-IN")}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13.5px', marginBottom: '4px' }}>
              <span>GST (18% Glassware)</span>
              <b>₹{gstAmount.toLocaleString("en-IN")}</b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '17px', fontWeight: 800, marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--r3-rule)' }}>
              <span>Grand Total</span>
              <span style={{ color: 'var(--r3-ink)' }}>₹{grandTotal.toLocaleString("en-IN")}</span>
            </div>

            <button 
              className="r3-btn primary" 
              style={{ width: '100%', marginTop: '12px', padding: '12px' }}
              disabled={!canProceedToCheckout}
              onClick={() => { setIsDrawerOpen(false); setIsCheckoutOpen(true); }}
            >
              {canProceedToCheckout ? "Proceed to Proforma Checkout →" : "Minimum Order Value Not Met"}
            </button>
          </div>
        )}
      </aside>

      {/* Interactive PDP Modal */}
      {pdpProduct && (
        <div className="r3-modal-overlay" onClick={() => setPdpProduct(null)}>
          <div className="r3-pdp-modal" onClick={(e) => e.stopPropagation()}>
            <button 
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 0, cursor: 'pointer' }}
              onClick={() => setPdpProduct(null)}
            >
              <X size={20} />
            </button>

            <div className="r3-pdp-grid">
              <div>
                <div style={{ background: 'var(--r3-tint)', borderRadius: '12px', aspectRatio: '1/1', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
                  {pdpProduct.images && pdpProduct.images.length > 0 ? (
                    <img src={pdpProduct.images[0]} alt={pdpProduct.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <GlassShapeSvg shape={pdpProduct.shape} />
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--r3-muted)', marginTop: '8px', textAlign: 'center' }}>
                  Made in Agra, India · Pure Borosilicate Glass
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  {pdpProduct.stockQuantity > 0 ? (
                    <span className="r3-badge in">In stock · {pdpProduct.stockQuantity} pcs</span>
                  ) : (
                    <span className="r3-badge mto">Made to order · 20–30 working days</span>
                  )}
                  <span className="r3-card-sku">SKU: {pdpProduct.sku}</span>
                </div>

                <h1 style={{ fontSize: '26px', marginBottom: '10px' }}>{pdpProduct.name}</h1>
                <p style={{ color: 'var(--r3-muted)', fontSize: '14px', margin: '0 0 16px' }}>{pdpProduct.description}</p>

                {/* Margins box */}
                <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span>Trade Rate (ex-GST): <b>₹{pdpProduct.sellingPrice}</b></span>
                    <span>Suggested Retail: <b>₹{pdpProduct.mrp}</b></span>
                  </div>
                  <div className="r3-margin-bar">
                    <i style={{ width: `${100 - calculateMargin(pdpProduct.sellingPrice, pdpProduct.mrp).marginPct}%`, background: 'var(--r3-sea)' }} />
                    <i style={{ width: `${calculateMargin(pdpProduct.sellingPrice, pdpProduct.mrp).marginPct}%`, background: 'var(--r3-ok)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--r3-muted)' }}>
                    <span>Buyer Cost incl. GST: ₹{calculateMargin(pdpProduct.sellingPrice, pdpProduct.mrp).costWithGst.toFixed(0)}</span>
                    <span style={{ color: 'var(--r3-ok)', fontWeight: 700 }}>Margin: {calculateMargin(pdpProduct.sellingPrice, pdpProduct.mrp).marginPct}%</span>
                  </div>
                </div>

                {/* 4-Tier Ladder Visual */}
                <div className="r3-ladder-chart">
                  {R3_TRADE_SLABS.map((s, idx) => {
                    const u = pdpProduct.sellingPrice * (1 - s.off);
                    const h = Math.round(50 + 50 * (u / pdpProduct.sellingPrice));
                    return (
                      <div key={idx} className="r3-rung" style={{ height: `${h}%` }}>
                        <b>₹{u.toFixed(0)}</b>
                        <span>{s.off ? `${s.off * 100}% off` : 'List price'}</span>
                        <em>{calculateMargin(u, pdpProduct.mrp).marginPct}% margin</em>
                      </div>
                    );
                  })}
                </div>

                {/* Add to order action */}
                <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  <button 
                    className="r3-btn primary" 
                    style={{ flex: 1 }}
                    onClick={() => {
                      handleAddToCart(pdpProduct, pdpProduct.stockQuantity > 0 ? 10 : 100, 2);
                      setPdpProduct(null);
                      setIsDrawerOpen(true);
                    }}
                  >
                    Add to wholesale order
                  </button>
                  <a 
                    href={`https://wa.me/919958173594?text=Hi%20Rahul,%20I%20am%20interested%20in%20${encodeURIComponent(pdpProduct.name)}%20(SKU:%20${pdpProduct.sku})`}
                    target="_blank"
                    rel="noreferrer"
                    className="r3-btn"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="r3-modal-overlay" onClick={() => setIsCheckoutOpen(false)}>
          <div className="r3-pdp-modal" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>Confirm Wholesale Order &amp; Proforma</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setIsCheckoutOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Business / Firm Name *
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Blue Tokai Roasters"
                    value={buyerForm.businessName}
                    onChange={(e) => setBuyerForm({ ...buyerForm, businessName: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Contact Person *
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Vikram Sharma"
                    value={buyerForm.contactPerson}
                    onChange={(e) => setBuyerForm({ ...buyerForm, contactPerson: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Mobile / WhatsApp *
                  <input 
                    required
                    type="tel" 
                    placeholder="+91 98765 43210"
                    value={buyerForm.mobile}
                    onChange={(e) => setBuyerForm({ ...buyerForm, mobile: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  GSTIN (Optional)
                  <input 
                    type="text" 
                    placeholder="09AAACR3333E1Z9"
                    value={buyerForm.gstin}
                    onChange={(e) => setBuyerForm({ ...buyerForm, gstin: e.target.value.toUpperCase() })}
                    style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                Delivery Address &amp; State *
                <input 
                  required
                  type="text" 
                  placeholder="Street, City, Pincode"
                  value={buyerForm.shippingAddress}
                  onChange={(e) => setBuyerForm({ ...buyerForm, shippingAddress: e.target.value })}
                  style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                />
              </label>

              {/* Delivery Choice */}
              <div style={{ border: '1px solid var(--r3-rule)', borderRadius: '8px', padding: '12px', background: 'var(--r3-tint)' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>Select Delivery Method:</div>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer', marginBottom: '6px' }}>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === "R3_COURIER"} 
                    onChange={() => setDeliveryMethod("R3_COURIER")}
                  />
                  <span><b>Ship with R3 courier partner</b> (Transit breakage covered with unboxing video)</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="delivery" 
                    checked={deliveryMethod === "OWN_TRANSPORTER"} 
                    onChange={() => setDeliveryMethod("OWN_TRANSPORTER")}
                  />
                  <span><b>Arrange my own transporter</b> (Pickup from Agra factory · Breakage not covered)</span>
                </label>
              </div>

              {/* Order total preview */}
              <div style={{ background: 'var(--r3-paper)', border: '1px solid var(--r3-rule)', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '13px', color: 'var(--r3-muted)' }}>Payable Amount (incl. 18% GST):</span>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>₹{grandTotal.toLocaleString("en-IN")}</div>
                </div>
                <button 
                  type="submit" 
                  className="r3-btn primary"
                  disabled={isSubmitting}
                  style={{ padding: '10px 20px' }}
                >
                  {isSubmitting ? "Generating Proforma..." : "Confirm Order & Get Proforma"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Success Confirmation Modal */}
      {orderSuccess && (
        <div className="r3-modal-overlay">
          <div className="r3-pdp-modal" style={{ maxWidth: '520px', textAlign: 'center' }}>
            <CheckCircle2 size={54} color="var(--r3-ok)" style={{ margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>Order Booked Successfully!</h2>
            <p style={{ color: 'var(--r3-muted)', fontSize: '14px', margin: '0 0 16px' }}>
              Your Proforma Order <b>#{orderSuccess.orderNumber}</b> has been recorded in the R3 Exports ERP.
            </p>

            <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px', marginBottom: '20px', textAlign: 'left', fontSize: '13.5px' }}>
              <div><strong>Proforma Number:</strong> {orderSuccess.piNumber}</div>
              <div><strong>Grand Total:</strong> ₹{orderSuccess.totalValue?.toLocaleString("en-IN")}</div>
              <div><strong>Factory Dispatch:</strong> Agra, Uttar Pradesh</div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {orderSuccess.whatsAppUrl && (
                <a 
                  href={orderSuccess.whatsAppUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  className="r3-btn primary"
                  style={{ flex: 1 }}
                >
                  <MessageCircle size={16} />
                  Send Order on WhatsApp
                </a>
              )}
              <button className="r3-btn" onClick={() => setOrderSuccess(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Design Request Modal */}
      {isCustomDesignModalOpen && (
        <div className="r3-modal-overlay" onClick={() => setIsCustomDesignModalOpen(false)}>
          <div className="r3-pdp-modal" style={{ maxWidth: '600px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Submit Custom Glassware Design Request</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setIsCustomDesignModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--r3-muted)', fontSize: '13.5px', marginTop: '-6px', marginBottom: '14px' }}>
              Upload pictures of the design, sketch, reference product, or logo you want made in Agra. Customised designs start at 100–500 pcs per SKU.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input type="text" placeholder="Your Name &amp; Company" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }} />
              <input type="tel" placeholder="WhatsApp / Phone Number" style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }} />
              <textarea placeholder="Describe your design (e.g. 350ml ribbed glass with gold rim and cafe logo, 200 pcs)" rows={3} style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }} />
              <div style={{ border: '2px dashed var(--r3-rule)', padding: '20px', borderRadius: '10px', textAlign: 'center', cursor: 'pointer', background: 'var(--r3-tint)' }}>
                <Upload size={24} style={{ opacity: 0.5, margin: '0 auto 6px' }} />
                <div style={{ fontSize: '13px', fontWeight: 600 }}>Tap or drag design photos here</div>
                <div style={{ fontSize: '11px', color: 'var(--r3-muted)' }}>JPG, PNG, PDF up to 15MB</div>
              </div>
              <button 
                className="r3-btn primary" 
                style={{ marginTop: '8px' }}
                onClick={() => {
                  alert("Design request sent! Our Agra factory team will connect on WhatsApp within 2 hours.");
                  setIsCustomDesignModalOpen(false);
                }}
              >
                Submit Custom Design Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Order Modal */}
      {isQuickOrderModalOpen && (
        <div className="r3-modal-overlay" onClick={() => setIsQuickOrderModalOpen(false)}>
          <div className="r3-pdp-modal" style={{ maxWidth: '540px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Quick Order Pad</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setIsQuickOrderModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <p style={{ color: 'var(--r3-muted)', fontSize: '13px', marginTop: '-6px', marginBottom: '12px' }}>
              Paste SKU and piece count per line from your Excel sheet or PO:
            </p>
            <textarea 
              rows={6}
              value={quickOrderText}
              onChange={(e) => setQuickOrderText(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', padding: '10px', borderRadius: '8px', border: '1px solid var(--r3-rule)' }}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button className="r3-btn primary" style={{ flex: 1 }} onClick={handleQuickOrderAddAll}>
                Add all to order
              </button>
              <button className="r3-btn" onClick={() => setQuickOrderText("")}>
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trade Terms Modal */}
      {isTermsModalOpen && (
        <div className="r3-modal-overlay" onClick={() => setIsTermsModalOpen(false)}>
          <div className="r3-pdp-modal" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2>R3 Exports Official Trade Terms</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setIsTermsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '13.5px' }}>
              <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Minimum Order Quantity (MOQ)</h3>
                <p style={{ margin: 0, color: 'var(--r3-muted)' }}>Catalogue designs: 50–100 pcs per design. In-stock: No minimum quantity (₹15,000 MOV).</p>
              </div>
              <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Breakage in Transit</h3>
                <p style={{ margin: 0, color: 'var(--r3-muted)' }}>Covered when shipped by R3 courier. Broken pieces credited on next order with uncut unboxing video.</p>
              </div>
              <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Logo Branding</h3>
                <p style={{ margin: 0, color: 'var(--r3-muted)' }}>Baked permanent ceramic decal: ₹30/pc. MOQ: 500 pcs per SKU or 1,000 pcs mixed.</p>
              </div>
              <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>Payment Schedule</h3>
                <p style={{ margin: 0, color: 'var(--r3-muted)' }}>In-stock: 100% advance. Made to order: 30% advance with confirmation, 70% before factory dispatch.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/919958173594?text=${encodeURIComponent("Hi Rahul, I am browsing the R3 Exports glassware catalogue and would like to connect.")}`}
        target="_blank"
        rel="noreferrer"
        className="r3-floating-wa"
      >
        <MessageCircle size={18} />
        <span>WhatsApp us</span>
      </a>

      {/* Footer */}
      <footer className="r3-footer">
        <div className="r3-wrap r3-footer-grid">
          <div>
            <h3>Get in touch</h3>
            <p><strong>R3 Exports</strong> — Borosilicate Glassware Manufacturer &amp; Exporter, Agra, India.</p>
            <p>Factory: Agra Industrial Complex, Foundry Nagar, Agra, UP 282006</p>
            <p>GSTIN: 09AAACR3333E1Z9</p>
            <p>sales@r3exports.com · +91 99581 73594</p>
          </div>
          <div>
            <h3>Shop</h3>
            <button onClick={() => { setSelectedStockFilter("IN_STOCK"); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>In-stock items</button>
            <button onClick={() => { setSelectedStockFilter("MADE_TO_ORDER"); window.scrollTo({ top: 400, behavior: 'smooth' }); }}>Made-to-order designs</button>
            <Link href="/price-list" style={{ color: 'inherit', opacity: 0.85, display: 'block', margin: '6px 0' }}>Price list and retail margins</Link>
            <button onClick={() => setIsCustomDesignModalOpen(true)}>Custom design request</button>
            <button onClick={() => setIsQuickOrderModalOpen(true)}>Quick order pad</button>
          </div>
          <div>
            <h3>Trade Terms</h3>
            <button onClick={() => setIsTermsModalOpen(true)}>MOQ and minimums</button>
            <button onClick={() => setIsTermsModalOpen(true)}>Samples (₹500 credit)</button>
            <button onClick={() => setIsTermsModalOpen(true)}>Breakage in transit</button>
            <button onClick={() => setIsTermsModalOpen(true)}>Logo branding (+₹30/pc)</button>
            <button onClick={() => setIsTermsModalOpen(true)}>Payment schedule (30/70)</button>
          </div>
          <div>
            <h3>Company</h3>
            <p>About R3 Exports</p>
            <p>Export enquiries (FOB Agra / Mumbai)</p>
            <p>Catalogue PDF download</p>
            <Link href="/login" style={{ color: 'var(--r3-gold)', display: 'block', marginTop: '10px', fontWeight: 600 }}>ERP Portal Sign In →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
