"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
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
  ExternalLink,
  Globe,
  User,
  LogIn,
  LogOut,
  ChevronDown,
  Building2,
  Lock,
  Loader2,
  Eye,
  EyeOff
} from "lucide-react";
import { signIn, signOut } from "next-auth/react";
import { placeCatalogOrder, CatalogOrderBuyerDetails } from "@/app/actions/catalogActions";
import { 
  getCustomerSessionData, 
  registerCustomerPortalAccount, 
  submitCustomDesignRequest 
} from "@/app/actions/portalActions";
import { lookupPostalCode } from "@/lib/postalLookup";
import { R3_TRADE_SLABS, R3_COMPANY_PROFILE } from "@/lib/dummyProducts";
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
  exportPriceUsd?: number | null;
  exportPriceEur?: number | null;
  exportPriceGbp?: number | null;
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

type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string; flag: string }[] = [
  { code: "INR", label: "India (INR ₹)", symbol: "₹", flag: "🇮🇳" },
  { code: "USD", label: "Global / US (USD $)", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", label: "Europe (EUR €)", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", label: "UK (GBP £)", symbol: "£", flag: "🇬🇧" }
];

// Vector shapes for glassware fallback
function GlassShapeSvg({ shape = "tumbler" }: { shape?: string }) {
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

  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("INR");
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const currencyRef = useRef<HTMLDivElement>(null);

  // Customer Session & Auth
  const [customerSession, setCustomerSession] = useState<{
    isLoggedIn: boolean;
    customer?: any;
    userName?: string | null;
    userEmail?: string | null;
    userRole?: string;
  }>({ isLoggedIn: false });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"SIGN_IN" | "REGISTER">("SIGN_IN");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regForm, setRegForm] = useState({
    businessName: "",
    contactPerson: "",
    mobile: "",
    email: "",
    password: "",
    shippingAddress: "",
    city: "Agra",
    state: "Uttar Pradesh",
    pincode: "282006",
    gstin: ""
  });

  // Pincode lookup state for Registration
  const [regPinLoading, setRegPinLoading] = useState(false);
  const [regAvailablePostOffices, setRegAvailablePostOffices] = useState<string[]>([]);
  const [regSelectedPostOffice, setRegSelectedPostOffice] = useState("");

  const handleRegPincodeChange = async (pinInput: string) => {
    const cleanPin = pinInput.replace(/\D/g, "").slice(0, 6);
    setRegForm(prev => ({ ...prev, pincode: cleanPin }));

    if (cleanPin.length === 6) {
      setRegPinLoading(true);
      try {
        const res = await lookupPostalCode(cleanPin, "India", false);
        if (res.success) {
          setRegForm(prev => ({
            ...prev,
            city: res.city || prev.city,
            state: res.state || prev.state
          }));
          if (res.postOffices && res.postOffices.length > 0) {
            setRegAvailablePostOffices(res.postOffices);
            setRegSelectedPostOffice(res.postOffices[0]);
          } else {
            setRegAvailablePostOffices([]);
            setRegSelectedPostOffice("");
          }
        }
      } catch (err) {
        console.error("Postal lookup error:", err);
      } finally {
        setRegPinLoading(false);
      }
    } else {
      setRegAvailablePostOffices([]);
      setRegSelectedPostOffice("");
    }
  };

  // Likes store
  const [likedSkus, setLikedSkus] = useState<Set<string>>(new Set());
  const [likedOnly, setLikedOnly] = useState(false);

  // Card selections
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

  // Custom Design Request Form state
  const [customDesignForm, setCustomDesignForm] = useState({
    name: "",
    company: "",
    mobile: "",
    email: "",
    requestType: "New custom design",
    sku: "",
    description: "",
    pictures: [] as string[],
    expectedQty: "100–249 pcs",
    timeline: "Within 1 month"
  });
  const [customDesignLoading, setCustomDesignLoading] = useState(false);
  const [customDesignSuccess, setCustomDesignSuccess] = useState<any>(null);

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

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (currencyRef.current && !currencyRef.current.contains(event.target as Node)) {
        setIsCurrencyDropdownOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Detect Country / Timezone on initial mount
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
      if (tz.includes("America") || tz.includes("US")) {
        setSelectedCurrency("USD");
      } else if (tz.includes("London") || tz.includes("Europe/London") || tz.includes("GB")) {
        setSelectedCurrency("GBP");
      } else if (tz.includes("Europe") || tz.includes("Paris") || tz.includes("Berlin")) {
        setSelectedCurrency("EUR");
      } else {
        setSelectedCurrency("INR");
      }
    } catch {}
  }, []);

  // Fetch customer session data
  useEffect(() => {
    async function loadSession() {
      const res = await getCustomerSessionData();
      if (res.isLoggedIn) {
        setCustomerSession(res);
        if (res.customer) {
          setBuyerForm({
            businessName: res.customer.businessName || "",
            contactPerson: res.customer.contactPerson || "",
            mobile: res.customer.mobile || "",
            whatsappNumber: res.customer.whatsappNumber || res.customer.mobile || "",
            email: res.customer.email || "",
            gstin: res.customer.gstNumber || "",
            shippingAddress: res.customer.shippingAddress || res.customer.billingAddress || "",
            city: res.customer.city || "Agra",
            state: res.customer.state || "Uttar Pradesh",
            pincode: res.customer.pincode || "282006",
            notes: "",
            buyingStream: "READY_STOCK",
            courierType: "R3_COURIER"
          });
        }
      }
    }
    loadSession();
  }, []);

  // Initialize card quantities
  useEffect(() => {
    const initMap: Record<string, { qty: number; pack: number }> = {};
    initialProducts.forEach(p => {
      const isInStock = p.stockQuantity > 0;
      const pack = 2;
      const initialQty = isInStock ? pack * 5 : (p.moq || 100);
      initMap[p.id] = { qty: initialQty, pack };
    });
    setCardSelections(initMap);
  }, [initialProducts]);

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
        discountPercent: slab.discount,
        isSample: false
      }
    }));
    showToast(`Added ${quantity} pcs of ${product.name} to order!`);
  };

  const handleAddSampleToCart = (product: Product) => {
    const samplePrice = 500;
    setCart(prev => ({
      ...prev,
      [`sample_${product.id}`]: {
        product: { ...product, name: `[Sample Piece] ${product.name}` },
        quantity: 1,
        boxOption: 1,
        effectiveRate: samplePrice,
        discountPercent: 0,
        isSample: true
      }
    }));
    showToast(`Sample piece of ${product.name} added (₹500 auto-credited on next bulk order)!`);
    setIsDrawerOpen(true);
  };

  const handleRemoveFromCart = (productId: string) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  // Group Cart items into Ready Stock, Made to Order, and Samples
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
  const sampleSubtotal = sampleItems.reduce((sum, item) => sum + (item.effectiveRate * item.quantity), 0);
  const rawSubtotal = readyStockSubtotal + madeToOrderSubtotal + sampleSubtotal;
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

  // Handle Sign In
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email: loginIdentifier.trim(),
        password: loginPassword
      });

      if (res?.error) {
        setAuthError(res.error || "Invalid mobile/email or password.");
      } else {
        showToast("Signed in successfully!");
        setIsAuthModalOpen(false);
        const sessionRes = await getCustomerSessionData();
        if (sessionRes.isLoggedIn) {
          setCustomerSession(sessionRes);
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to sign in.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      let finalShippingAddress = regForm.shippingAddress;
      if (regSelectedPostOffice && !finalShippingAddress.includes(regSelectedPostOffice)) {
        finalShippingAddress = `${finalShippingAddress}, PO: ${regSelectedPostOffice}`;
      }
      const res = await registerCustomerPortalAccount({
        ...regForm,
        shippingAddress: finalShippingAddress
      });
      if (res.success) {
        showToast("Account created successfully!");
        // Auto sign in
        await signIn("credentials", {
          redirect: false,
          email: regForm.mobile.trim(),
          password: regForm.password
        });
        setIsAuthModalOpen(false);
        const sessionRes = await getCustomerSessionData();
        if (sessionRes.isLoggedIn) {
          setCustomerSession(sessionRes);
        }
      } else {
        setAuthError(res.error || "Registration failed.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Failed to create account.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Custom Design Submit
  const handleCustomDesignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCustomDesignLoading(true);

    try {
      const res = await submitCustomDesignRequest(customDesignForm);
      if (res.success) {
        setCustomDesignSuccess(res);
      } else {
        alert(res.error || "Failed to submit request.");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setCustomDesignLoading(false);
    }
  };

  // Convert & compress image files to persistent Base64 Data URLs
  const compressImageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type === "application/pdf") {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string || "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1200;
          let width = img.width;
          let height = img.height;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL("image/jpeg", 0.82));
          } else {
            resolve(e.target?.result as string || "");
          }
        };
        img.onerror = () => resolve(e.target?.result as string || "");
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  // Handle picture upload into persistent data URLs
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const base64Promises = Array.from(files).map(file => compressImageToBase64(file));
      const base64List = (await Promise.all(base64Promises)).filter(Boolean);
      setCustomDesignForm(prev => ({
        ...prev,
        pictures: [...prev.pictures, ...base64List]
      }));
    }
  };

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

  const activeCurrency = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  return (
    <div className="r3-catalog-root">
      {/* Toast Notification */}
      <div className={`r3-toast ${toastMessage ? 'show' : ''}`}>
        {toastMessage}
      </div>

      {/* Top Wholesale Strip */}
      <div className="r3-top-strip">
        <div className="r3-wrap r3-top-strip-inner">
          <span>Wholesale &amp; Export only. Prices per piece, GST extra. Transit breakage on shipments sent by our courier is credited on your next order, with videos.</span>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>Agra Factory Dispatch</span>
            <span>
              <a href={`mailto:${company.email || R3_COMPANY_PROFILE.email}`}>{company.email || R3_COMPANY_PROFILE.email}</a>
              &nbsp;·&nbsp;
              <a href={`tel:${(company.mobile || R3_COMPANY_PROFILE.mobile).replace(/[^0-9+]/g, '')}`}>{company.mobile || R3_COMPANY_PROFILE.mobile}</a>
            </span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <header className="r3-header">
        <div className="r3-wrap r3-header-row">
          <button className="r3-logo" onClick={() => { setSelectedCategory("All"); setSelectedStockFilter("ALL"); setLikedOnly(false); }}>
            <b>R3 <i>Exports</i></b>
            <span>Borosilicate glassware manufacturer, Agra</span>
          </button>

          {/* Search Form */}
          <form className="r3-search-form" onSubmit={(e) => { e.preventDefault(); }}>
            <input 
              type="search" 
              placeholder="Search by product, capacity or SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit">Search</button>
          </form>

          {/* Header Actions */}
          <div className="r3-header-actions">
            
            {/* Country / Currency Switcher Dropdown */}
            <div style={{ position: 'relative' }} ref={currencyRef}>
              <button 
                type="button"
                className="r3-pill-btn"
                onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                title="Switch currency & export view"
              >
                <span>{activeCurrency.flag}</span>
                <span>{activeCurrency.code} ({activeCurrency.symbol})</span>
                <ChevronDown size={12} />
              </button>

              {isCurrencyDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  right: 0,
                  backgroundColor: '#ffffff',
                  border: '1px solid var(--r3-rule)',
                  borderRadius: '10px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  minWidth: '200px',
                  zIndex: 60,
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '8px 12px', fontSize: '11.5px', fontWeight: 700, color: 'var(--r3-muted)', borderBottom: '1px solid var(--r3-rule)', backgroundColor: 'var(--r3-tint)' }}>
                    SELECT CURRENCY &amp; MARKET
                  </div>
                  {CURRENCIES.map(c => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setSelectedCurrency(c.code); setIsCurrencyDropdownOpen(false); showToast(`Switched currency to ${c.label}`); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        width: '100%',
                        padding: '9px 12px',
                        border: 0,
                        background: selectedCurrency === c.code ? 'var(--r3-gold-soft)' : 'none',
                        color: 'var(--r3-ink)',
                        fontSize: '13px',
                        fontWeight: selectedCurrency === c.code ? 700 : 500,
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <span>{c.flag} {c.label}</span>
                      {selectedCurrency === c.code && <Check size={14} color="var(--r3-gold-ink)" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

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

            {/* Customer Login / My Account Button */}
            {customerSession.isLoggedIn ? (
              <div style={{ position: 'relative' }} ref={userMenuRef}>
                <button
                  type="button"
                  className="r3-pill-btn"
                  style={{ backgroundColor: 'var(--r3-gold-soft)', borderColor: 'var(--r3-gold)', fontWeight: 700 }}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <User size={13} />
                  <span>{customerSession.customer?.businessName || customerSession.userName || "My Account"}</span>
                  <ChevronDown size={12} />
                </button>

                {isUserMenuOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    backgroundColor: '#ffffff',
                    border: '1px solid var(--r3-rule)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    minWidth: '220px',
                    zIndex: 60,
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--r3-rule)', backgroundColor: 'var(--r3-tint)' }}>
                      <b style={{ display: 'block', fontSize: '13px' }}>{customerSession.customer?.businessName || customerSession.userName}</b>
                      <span style={{ fontSize: '11.5px', color: 'var(--r3-muted)' }}>{customerSession.customer?.contactPerson}</span>
                    </div>
                    <Link
                      href="/portal"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--r3-ink)', textDecoration: 'none', borderBottom: '1px solid var(--r3-rule)' }}
                    >
                      <Package size={14} /> My Orders &amp; Invoices ({customerSession.customer?.orderCount || 0})
                    </Link>
                    <button
                      type="button"
                      onClick={() => { signOut({ redirect: false }); setCustomerSession({ isLoggedIn: false }); setIsUserMenuOpen(false); showToast("Signed out successfully."); }}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--r3-warn)', border: 0, background: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
                    >
                      <LogOut size={14} /> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                type="button"
                className="r3-pill-btn"
                style={{ backgroundColor: 'var(--r3-ink)', color: 'var(--r3-glass)', borderColor: 'var(--r3-ink)', fontWeight: 600 }}
                onClick={() => { setIsAuthModalOpen(true); setAuthTab("SIGN_IN"); }}
              >
                <LogIn size={13} />
                <span>Client Login</span>
              </button>
            )}

            {/* Cart Order Button */}
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
                {selectedCurrency !== "INR" ? ` · Export FOB ${selectedCurrency} pricing active` : ""}
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
              const allowedPacks = (p as any).allowedPacks || [2, 4, 6];

              // Multi-currency rates
              let exportPriceDisplay = "";
              if (selectedCurrency === "USD") {
                exportPriceDisplay = `$${(p.exportPriceUsd || (p.sellingPrice / 75)).toFixed(2)} / pc FOB`;
              } else if (selectedCurrency === "EUR") {
                exportPriceDisplay = `€${(p.exportPriceEur || (p.sellingPrice / 80)).toFixed(2)} / pc FOB`;
              } else if (selectedCurrency === "GBP") {
                exportPriceDisplay = `£${(p.exportPriceGbp || (p.sellingPrice / 92)).toFixed(2)} / pc FOB`;
              }

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
                    <Heart size={14} fill={isLiked ? "currentColor" : "none"} />
                  </button>

                  {/* Picture */}
                  <div className="r3-card-pic" onClick={() => setPdpProduct(p)}>
                    {p.images && p.images.length > 0 ? (
                      <img src={p.images[0]} alt={p.name} loading="lazy" />
                    ) : (
                      <GlassShapeSvg shape={p.shape || "tumbler"} />
                    )}
                    <div className="r3-quick-view-overlay">
                      <button className="r3-quick-view-btn" type="button">
                        <Eye size={13} /> Quick Specs
                      </button>
                    </div>
                  </div>

                  {/* Stock Badge */}
                  {isInStock ? (
                    <span className="r3-badge in">In stock · {p.stockQuantity.toLocaleString("en-IN")} pcs</span>
                  ) : (
                    <span className="r3-badge mto">Made to order · 20–30 working days</span>
                  )}

                  {/* Name & SKU */}
                  <h3 onClick={() => setPdpProduct(p)} title={p.name}>{p.name}</h3>
                  <div className="r3-card-sku">SKU {p.sku} · {p.size || `${p.capacityMl || 350} ml`}</div>

                  {/* Price display (INR vs Multi-Currency Export) */}
                  <div className="r3-card-price-block">
                    {selectedCurrency === "INR" ? (
                      <>
                        <div className="r3-card-price">
                          ₹{p.sellingPrice.toLocaleString("en-IN")}
                          <small>/ pc + 18% GST</small>
                        </div>
                        <div className="r3-srpline">
                          <span>SRP: <b>₹{p.mrp.toLocaleString("en-IN")}</b></span>
                          <span className="r3-margin-pill">{margin.marginPct}% Margin</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="r3-card-price" style={{ color: 'var(--r3-sea)' }}>
                          {exportPriceDisplay}
                        </div>
                        <div className="r3-srpline">
                          <span>Carton: <b>{p.masterCartonQty || 24} pcs</b></span>
                          <span className="r3-margin-pill">MOQ {p.moq || 100} pcs</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Quick-Add Section */}
                  <div className="r3-qa">
                    <div className="r3-qa-header">
                      <span>Wholesale Quantity Tiers</span>
                      <span style={{ color: 'var(--r3-gold)', fontWeight: 700 }}>Click tier to select</span>
                    </div>
                    
                    {/* 4-Tier Horizontal Matrix */}
                    <div className="r3-tier-pills-grid">
                      {R3_TRADE_SLABS.map((s, idx) => {
                        const slabRate = Math.round(p.sellingPrice * (1 - s.off) * 100) / 100;
                        const isSelectedSlab = currentQty >= s.min && currentQty <= s.max;
                        const isNotEnoughStock = isInStock && s.min > p.stockQuantity;

                        let displayVal = `₹${slabRate.toFixed(0)}`;
                        if (selectedCurrency === "USD") displayVal = `$${((p.exportPriceUsd || 4.2) * (1 - s.off)).toFixed(2)}`;
                        if (selectedCurrency === "EUR") displayVal = `€${((p.exportPriceEur || 3.9) * (1 - s.off)).toFixed(2)}`;
                        if (selectedCurrency === "GBP") displayVal = `£${((p.exportPriceGbp || 3.3) * (1 - s.off)).toFixed(2)}`;

                        return (
                          <div 
                            key={idx} 
                            className={`r3-tier-pill ${isSelectedSlab ? 'active' : ''} ${isNotEnoughStock ? 'na' : ''}`}
                            title={isNotEnoughStock ? "Not enough ready stock for this slab" : `Set order quantity to ${s.min} pcs (${s.off > 0 ? (s.off * 100) + '% off' : 'Base trade price'})`}
                            onClick={() => {
                              if (!isNotEnoughStock) {
                                updateCardQty(p.id, s.min, currentPack, isInStock ? p.stockQuantity : undefined);
                              }
                            }}
                          >
                            <span>{s.label}</span>
                            <b>{displayVal}</b>
                          </div>
                        );
                      })}
                    </div>

                    {/* Box Size & Quantity Stepper Controls */}
                    <div className="r3-config-row">
                      <div className="r3-pack-chips">
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginRight: '2px' }}>Box:</span>
                        {allowedPacks.map((packOption: number) => (
                          <button
                            key={packOption}
                            type="button"
                            className={`r3-pack-chip-btn ${currentPack === packOption ? 'active' : ''}`}
                            onClick={() => updateCardPack(p.id, packOption, currentQty, isInStock ? p.stockQuantity : undefined)}
                            title={`Packed in ${packOption}-piece master box`}
                          >
                            {packOption}-pc
                          </button>
                        ))}
                      </div>

                      <div className="r3-stepper">
                        <button 
                          type="button"
                          onClick={() => updateCardQty(p.id, currentQty - currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                          title={`Decrease by ${currentPack} pcs`}
                        >
                          −
                        </button>
                        <input 
                          type="number" 
                          value={currentQty} 
                          onChange={(e) => updateCardQty(p.id, parseInt(e.target.value, 10) || currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                        />
                        <button 
                          type="button"
                          onClick={() => updateCardQty(p.id, currentQty + currentPack, currentPack, isInStock ? p.stockQuantity : undefined)}
                          title={`Increase by ${currentPack} pcs`}
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Smart Upsell Nudge */}
                    {currentQty < 100 && (
                      <div className="r3-upsell-nudge">
                        💡 Add {100 - currentQty} more pcs to get ₹{(p.sellingPrice * 0.95).toFixed(0)}/pc (5% saving)
                      </div>
                    )}
                    {currentQty >= 100 && currentQty < 300 && (
                      <div className="r3-upsell-nudge">
                        💡 Add {300 - currentQty} more pcs to get ₹{(p.sellingPrice * 0.90).toFixed(0)}/pc (10% saving)
                      </div>
                    )}
                    {currentQty >= 300 && currentQty < 500 && (
                      <div className="r3-upsell-nudge">
                        💡 Add {500 - currentQty} more pcs to get ₹{(p.sellingPrice * 0.80).toFixed(0)}/pc (20% saving)
                      </div>
                    )}
                    {currentQty >= 500 && (
                      <div className="r3-upsell-nudge max">
                        ✓ Max wholesale tier applied (20% off)
                      </div>
                    )}

                    {/* Single Full-Width Primary CTA with Live Total */}
                    <button 
                      type="button"
                      className="r3-cta-btn"
                      onClick={() => handleAddToCart(p, currentQty, currentPack)}
                    >
                      <ShoppingBag size={15} />
                      <span>Add {currentQty} pcs • ₹{Math.round(slab.rate * currentQty).toLocaleString("en-IN")}</span>
                    </button>

                    {/* Secondary Sample Link */}
                    <button 
                      type="button"
                      className="r3-sample-link-btn"
                      onClick={() => handleAddSampleToCart(p)}
                    >
                      Order 1 pc sample (₹500 auto-credited) →
                    </button>

                    {inCartItem && (
                      <div className="r3-in-order-badge">
                        <span>✓ In your order: <strong>{inCartItem.quantity} pcs</strong></span>
                        <button type="button" onClick={() => setIsDrawerOpen(true)}>View Order →</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dedicated Factory Verification & Direct Contact Desk */}
        <section className="r3-sec">
          <div className="r3-factory-card">
            <div className="r3-factory-grid">
              <div>
                <span className="r3-factory-badge">Direct Agra Factory Works &amp; B2B Export Desk</span>
                <h2 className="r3-factory-title">Need custom branding, container quotes, or a factory visit?</h2>
                <p className="r3-factory-desc">
                  Connect directly with Rahul Gupta and our Agra production engineering team. We manufacture 100% food-grade borosilicate glassware for luxury hotels, cafés, corporate gifting, and overseas distributors.
                </p>

                <div className="r3-contact-items-grid">
                  <div className="r3-contact-item-box">
                    <span>Direct Call &amp; WhatsApp</span>
                    <strong><a href="tel:+919958173594">+91 99581 73594</a></strong>
                  </div>

                  <div className="r3-contact-item-box">
                    <span>Official Email</span>
                    <strong><a href="mailto:sales@r3exports.com">sales@r3exports.com</a></strong>
                  </div>

                  <div className="r3-contact-item-box">
                    <span>Factory Works Location</span>
                    <strong>Agra Industrial Complex, Foundry Nagar, Agra, UP 282006</strong>
                  </div>

                  <div className="r3-contact-item-box">
                    <span>GSTIN &amp; Export Ports</span>
                    <strong>09AAACR3333E1Z9 · FOB Agra / Mumbai (JNPT)</strong>
                  </div>
                </div>
              </div>

              <div className="r3-factory-actions-column">
                <h3>Connect in 60 Seconds</h3>
                <p>Have a custom sketch or logo reference? Chat with our Agra master moulds team on WhatsApp for instant quote &amp; lead time.</p>
                
                <a 
                  href={`https://wa.me/919958173594?text=${encodeURIComponent("Hi Rahul, I am looking to place a B2B glassware inquiry with R3 Exports Agra factory.")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="r3-btn primary"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px' }}
                >
                  <MessageCircle size={18} />
                  Chat on WhatsApp (+91 99581 73594)
                </a>

                <button 
                  type="button"
                  className="r3-btn"
                  onClick={() => setIsCustomDesignModalOpen(true)}
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Sparkles size={16} color="var(--r3-gold)" />
                  Submit Custom Mould Request
                </button>

                <Link
                  href="/price-list"
                  className="r3-btn"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}
                >
                  <FileText size={16} color="var(--r3-gold)" />
                  Download Full Wholesale Price List
                </Link>
              </div>
            </div>
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

              {/* Sample Evaluation Group */}
              {sampleItems.length > 0 && (
                <div className="r3-cart-group" style={{ borderColor: 'var(--r3-sea)', background: 'rgba(47, 111, 115, 0.05)' }}>
                  <h3>
                    <span>Evaluation Samples (₹500 / pc)</span>
                    <small>₹{sampleSubtotal.toLocaleString("en-IN")}</small>
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--r3-sea)', fontWeight: 600, margin: '4px 0 8px' }}>
                    ✓ 100% of sample fees (₹{sampleSubtotal.toLocaleString("en-IN")}) will be credited on your next bulk wholesale order!
                  </div>

                  {sampleItems.map(item => (
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
                        <small>{item.quantity} sample pc @ ₹{item.effectiveRate} (Individual Safety Packaging)</small>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <b style={{ display: 'block' }}>₹{item.effectiveRate}</b>
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

      {/* Customer Login & Registration Modal */}
      {isAuthModalOpen && (
        <div className="r3-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="r3-pdp-modal" style={{ maxWidth: '480px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>{authTab === "SIGN_IN" ? "Client Portal Login" : "Register Wholesale Client Profile"}</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => setIsAuthModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '2px solid var(--r3-rule)', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setAuthTab("SIGN_IN"); setAuthError(""); }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 0,
                  borderBottom: authTab === "SIGN_IN" ? '3px solid var(--r3-gold)' : 'none',
                  fontWeight: authTab === "SIGN_IN" ? 700 : 500,
                  color: authTab === "SIGN_IN" ? 'var(--r3-ink)' : 'var(--r3-muted)',
                  cursor: 'pointer'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthTab("REGISTER"); setAuthError(""); }}
                style={{
                  padding: '10px',
                  background: 'none',
                  border: 0,
                  borderBottom: authTab === "REGISTER" ? '3px solid var(--r3-gold)' : 'none',
                  fontWeight: authTab === "REGISTER" ? 700 : 500,
                  color: authTab === "REGISTER" ? 'var(--r3-ink)' : 'var(--r3-muted)',
                  cursor: 'pointer'
                }}
              >
                Create Account
              </button>
            </div>

            {authError && (
              <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', color: '#e11d48', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', marginBottom: '14px' }}>
                {authError}
              </div>
            )}

            {authTab === "SIGN_IN" ? (
              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Mobile Number or Email
                  <input
                    required
                    type="text"
                    placeholder="e.g. 9876543210 or sales@mycompany.com"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    style={{ padding: '9px 12px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>

                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                  Password
                  <div style={{ position: 'relative', marginTop: '4px' }}>
                    <input
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: '7px', border: '1px solid var(--r3-rule)' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, cursor: 'pointer', color: 'var(--r3-muted)' }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </label>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="r3-btn primary"
                  style={{ marginTop: '8px', padding: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  {authLoading ? <Loader2 size={16} className="animate-spin" /> : "Sign In to Client Portal"}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '72vh', overflowY: 'auto', paddingRight: '4px' }}>
                {/* 2-Column Responsive Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    Business / Company Name *
                    <input
                      required
                      type="text"
                      placeholder="e.g. Blue Tokai Roasters"
                      value={regForm.businessName}
                      onChange={(e) => setRegForm({ ...regForm, businessName: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    Contact Person Name *
                    <input
                      required
                      type="text"
                      placeholder="e.g. Vikram Sharma"
                      value={regForm.contactPerson}
                      onChange={(e) => setRegForm({ ...regForm, contactPerson: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    WhatsApp Mobile Number *
                    <input
                      required
                      type="tel"
                      placeholder="10-digit mobile number"
                      value={regForm.mobile}
                      onChange={(e) => setRegForm({ ...regForm, mobile: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    Email Address (Optional)
                    <input
                      type="email"
                      placeholder="procurement@company.com"
                      value={regForm.email}
                      onChange={(e) => setRegForm({ ...regForm, email: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    Create Password *
                    <input
                      required
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={regForm.password}
                      onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    GSTIN (Optional)
                    <input
                      type="text"
                      placeholder="09AAACR3333E1Z9"
                      value={regForm.gstin}
                      onChange={(e) => setRegForm({ ...regForm, gstin: e.target.value.toUpperCase() })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                </div>

                {/* Pincode & City/State Auto Lookup */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    Delivery Pincode *
                    <div style={{ position: 'relative', marginTop: '4px' }}>
                      <input
                        required
                        type="text"
                        maxLength={6}
                        placeholder="e.g. 282006"
                        value={regForm.pincode}
                        onChange={(e) => handleRegPincodeChange(e.target.value)}
                        style={{ width: '100%', padding: '8px 32px 8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)' }}
                      />
                      {regPinLoading && (
                        <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)' }}>
                          <Loader2 size={15} className="animate-spin" color="var(--r3-gold)" />
                        </span>
                      )}
                    </div>
                  </label>

                  {/* Selectable Post Office if available */}
                  {regAvailablePostOffices.length > 0 ? (
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                      Select Post Office (Branch)
                      <select
                        value={regSelectedPostOffice}
                        onChange={(e) => setRegSelectedPostOffice(e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                      >
                        {regAvailablePostOffices.map((po, idx) => (
                          <option key={idx} value={po}>{po}</option>
                        ))}
                      </select>
                    </label>
                  ) : (
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                      City / District *
                      <input
                        required
                        type="text"
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                      />
                    </label>
                  )}
                </div>

                {regAvailablePostOffices.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                      City / District *
                      <input
                        required
                        type="text"
                        value={regForm.city}
                        onChange={(e) => setRegForm({ ...regForm, city: e.target.value })}
                        style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                      />
                    </label>
                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                      State *
                      <input
                        required
                        type="text"
                        value={regForm.state}
                        onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                        style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                      />
                    </label>
                  </div>
                )}

                {regAvailablePostOffices.length === 0 && (
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                    State *
                    <input
                      required
                      type="text"
                      value={regForm.state}
                      onChange={(e) => setRegForm({ ...regForm, state: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    />
                  </label>
                )}

                <label style={{ display: 'flex', flexDirection: 'column', fontSize: '12.5px', fontWeight: 600 }}>
                  Delivery / Billing Address *
                  <input
                    required
                    type="text"
                    placeholder="Shop/Unit No., Street name, Area landmark"
                    value={regForm.shippingAddress}
                    onChange={(e) => setRegForm({ ...regForm, shippingAddress: e.target.value })}
                    style={{ padding: '8px 10px', borderRadius: '7px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                  />
                </label>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="r3-btn primary"
                  style={{ marginTop: '8px', padding: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                >
                  {authLoading ? <Loader2 size={16} className="animate-spin" /> : "Create Account & Sign In"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

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
                  Made in Agra, India · Pure High Borosilicate Glass
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
        <div className="r3-modal-overlay" onClick={() => { setIsCustomDesignModalOpen(false); setCustomDesignSuccess(null); }}>
          <div className="r3-pdp-modal" style={{ maxWidth: '820px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h2>Have a design in mind? Show us.</h2>
              <button style={{ background: 'none', border: 0, cursor: 'pointer' }} onClick={() => { setIsCustomDesignModalOpen(false); setCustomDesignSuccess(null); }}>
                <X size={20} />
              </button>
            </div>

            {customDesignSuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <CheckCircle2 size={54} color="var(--r3-ok)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: '22px', marginBottom: '8px' }}>Design Request Submitted!</h3>
                <p style={{ color: 'var(--r3-muted)', fontSize: '14px', maxWidth: '480px', margin: '0 auto 18px' }}>
                  {customDesignSuccess.message}
                </p>

                <div style={{ background: 'var(--r3-tint)', padding: '14px', borderRadius: '10px', maxWidth: '420px', margin: '0 auto 20px', textAlign: 'left' }}>
                  <div><strong>Reference Number:</strong> {customDesignSuccess.referenceNumber}</div>
                  <div><strong>Saved to ERP:</strong> Enquiries &amp; Leads Desk</div>
                  <div><strong>Response Time:</strong> Within 2–4 hours</div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {customDesignSuccess.whatsAppUrl && (
                    <a
                      href={customDesignSuccess.whatsAppUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="r3-btn primary"
                    >
                      <MessageCircle size={16} />
                      Send Photos on WhatsApp
                    </a>
                  )}
                  <button className="r3-btn" onClick={() => { setIsCustomDesignModalOpen(false); setCustomDesignSuccess(null); }}>
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '24px', alignItems: 'start' }}>
                <form onSubmit={handleCustomDesignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  
                  {/* Request Type Chips */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>What do you need? *</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {["New custom design", "Change existing design", "Logo branding", "Special packaging", "Other"].map(t => (
                        <button
                          key={t}
                          type="button"
                          className={`r3-tag-chip-btn ${customDesignForm.requestType === t ? 'active' : ''}`}
                          onClick={() => setCustomDesignForm({ ...customDesignForm, requestType: t })}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* SKU Selector (Optional) */}
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                    Based on one of our catalogue products? (Optional)
                    <select
                      value={customDesignForm.sku}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, sku: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px' }}
                    >
                      <option value="">None (Entirely new design)</option>
                      {initialProducts.map(p => (
                        <option key={p.id} value={p.sku || p.name}>{p.name} ({p.sku})</option>
                      ))}
                    </select>
                  </label>

                  {/* Description */}
                  <label style={{ display: 'flex', flexDirection: 'column', fontSize: '13px', fontWeight: 600 }}>
                    Describe your design or requirements *
                    <textarea
                      required
                      rows={3}
                      maxLength={2000}
                      placeholder="e.g. 350ml double-wall tumbler with our cafe logo baked in gold rim, 300 pcs, amber tint"
                      value={customDesignForm.description}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, description: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)', marginTop: '4px', fontFamily: 'inherit' }}
                    />
                  </label>

                  {/* Pictures Upload */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>
                      Pictures of the design / logo (Optional, up to 5)
                    </label>
                    <label style={{
                      border: '2px dashed var(--r3-rule)',
                      borderRadius: '10px',
                      padding: '16px',
                      display: 'block',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: 'var(--r3-tint)'
                    }}>
                      <Upload size={22} style={{ margin: '0 auto 4px', opacity: 0.6 }} />
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>Tap or drag photos here</div>
                      <div style={{ fontSize: '11px', color: 'var(--r3-muted)' }}>Photos, sketches, logo files in JPG, PNG, PDF up to 15MB</div>
                      <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
                    </label>

                    {customDesignForm.pictures.length > 0 && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
                        {customDesignForm.pictures.map((pic, idx) => (
                          <div key={idx} style={{ width: '56px', height: '56px', borderRadius: '6px', overflow: 'hidden', position: 'relative', border: '1px solid var(--r3-rule)' }}>
                            <img src={pic} alt="Upload preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            <button
                              type="button"
                              onClick={() => setCustomDesignForm(prev => ({ ...prev, pictures: prev.pictures.filter((_, i) => i !== idx) }))}
                              style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 0, borderRadius: '50%', width: '16px', height: '16px', fontSize: '10px', cursor: 'pointer', display: 'grid', placeItems: 'center' }}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quantity Chips */}
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Expected quantity band *</label>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {["100–249 pcs", "250–499 pcs", "500–999 pcs", "1,000+ pcs"].map(q => (
                        <button
                          key={q}
                          type="button"
                          className={`r3-tag-chip-btn ${customDesignForm.expectedQty === q ? 'active' : ''}`}
                          onClick={() => setCustomDesignForm({ ...customDesignForm, expectedQty: q })}
                        >
                          {q}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Contact Fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      required
                      type="text"
                      placeholder="Your Name *"
                      value={customDesignForm.name}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, name: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }}
                    />
                    <input
                      type="text"
                      placeholder="Company / Brand"
                      value={customDesignForm.company}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, company: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <input
                      required
                      type="tel"
                      placeholder="WhatsApp / Phone Number *"
                      value={customDesignForm.mobile}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, mobile: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }}
                    />
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={customDesignForm.email}
                      onChange={(e) => setCustomDesignForm({ ...customDesignForm, email: e.target.value })}
                      style={{ padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--r3-rule)' }}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={customDesignLoading}
                    className="r3-btn primary"
                    style={{ marginTop: '6px', padding: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                  >
                    {customDesignLoading ? <Loader2 size={16} className="animate-spin" /> : "Send Design Request to Agra Factory"}
                  </button>
                </form>

                {/* Right Side Info Box */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ background: 'var(--r3-tint)', padding: '16px', borderRadius: '12px', border: '1px solid var(--r3-rule)' }}>
                    <h3 style={{ fontSize: '15.5px', marginBottom: '8px' }}>How it works</h3>
                    <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.55, color: 'var(--r3-ink)' }}>
                      <li>Upload pictures and describe what you need.</li>
                      <li>Our Agra factory team reviews feasibility and mould requirements.</li>
                      <li>You get a quote with MOQ, piece rate and lead time on WhatsApp.</li>
                      <li>Confirm with a 30% advance; production takes 20–30 days.</li>
                    </ol>
                  </div>

                  <div style={{ background: 'var(--r3-gold-soft)', padding: '16px', borderRadius: '12px', border: '1px solid var(--r3-gold)' }}>
                    <h3 style={{ fontSize: '15.5px', marginBottom: '8px' }}>Good to know</h3>
                    <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '13px', lineHeight: 1.55, color: 'var(--r3-ink)' }}>
                      <li>Customised designs: 100–500 pcs MOQ per design.</li>
                      <li>Logo ceramic baked decals: +₹30 per piece.</li>
                      <li>Packaging in 2, 4 or 6-piece gift boxes.</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
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

      {/* Sticky Mobile Cart Bar */}
      {totalCartCount > 0 && (
        <div className="r3-mobile-cart-bar">
          <div className="r3-mobile-cart-info">
            <b>🛒 {totalCartCount} pcs in order</b>
            <small>Total: ₹{grandTotal.toLocaleString("en-IN")} (incl. GST)</small>
          </div>
          <button 
            type="button"
            className="r3-mobile-cart-action"
            onClick={() => setIsDrawerOpen(true)}
          >
            Review Order →
          </button>
        </div>
      )}

      {/* Floating WhatsApp Button */}
      <a 
        href={`https://wa.me/919958173594?text=${encodeURIComponent("Hi Rahul, I am browsing the R3 Exports glassware catalogue and would like to connect.")}`}
        target="_blank"
        rel="noreferrer"
        className="r3-floating-wa"
        style={{ bottom: totalCartCount > 0 ? '70px' : '24px' }}
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
            <h3>Client Account</h3>
            {customerSession.isLoggedIn ? (
              <>
                <p>Logged in as: <strong>{customerSession.customer?.businessName || customerSession.userName}</strong></p>
                <Link href="/portal" style={{ color: 'var(--r3-gold)', display: 'block', marginTop: '6px', fontWeight: 600 }}>Open Client Portal Dashboard →</Link>
              </>
            ) : (
              <>
                <button onClick={() => { setIsAuthModalOpen(true); setAuthTab("SIGN_IN"); }} style={{ color: 'var(--r3-gold)', fontWeight: 600 }}>Client Sign In →</button>
                <button onClick={() => { setIsAuthModalOpen(true); setAuthTab("REGISTER"); }}>Register Wholesale Profile</button>
              </>
            )}
            <Link href="/login" style={{ color: '#94a3b8', display: 'block', marginTop: '10px', fontSize: '12px' }}>Staff ERP Login →</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
