"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  Search, 
  ChevronDown, 
  Edit, 
  Trash2, 
  Scale, 
  Tag, 
  History, 
  Image as ImageIcon, 
  Layers, 
  RotateCcw, 
  X, 
  BookOpen, 
  Flame, 
  Download, 
  TrendingUp, 
  DollarSign, 
  Package, 
  AlertTriangle, 
  ArrowUpRight, 
  ArrowDownRight,
  Zap,
  SlidersHorizontal,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import AddProductButton from '@/components/ui/AddProductButton';
import ManageCategoriesModal from '@/components/products/ManageCategoriesModal';
import EditProductModal from '@/components/ui/EditProductModal';
import BarcodeLabelModal from '@/components/products/BarcodeLabelModal';
import ArticleHistoryModal from '@/components/products/ArticleHistoryModal';
import ProductCatalogModal from '@/components/products/ProductCatalogModal';
import ProductMatrixModal from '@/components/inventory/ProductMatrixModal';
import DeadStockInsightsModal from '@/components/products/DeadStockInsightsModal';
import { deleteProduct, quickAdjustStock } from '@/app/actions/productActions';

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  articleNumber: string | null;
  category: string | null;
  subCategory?: string | null;
  hsnCode: string | null;
  fabric?: string | null;
  color?: string | null;
  size?: string | null;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number | null;
  stockQuantity: number;
  minimumStock?: number | null;
  weight?: number | null;
  description?: string | null;
  images?: string[];
  createdAt?: string | Date;
}

interface ProductListClientProps {
  products: Product[];
  categories: string[];
  categoriesData?: { name: string; weight: number; description?: string | null }[];
  canManage: boolean;
}

export default function ProductListClient({ products, categories, categoriesData = [], canManage }: ProductListClientProps) {
  const searchParams = useSearchParams();
  const initialSearch = searchParams?.get('search') || '';
  const initialArticle = searchParams?.get('article') || searchParams?.get('history') || null;

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedHistoryArticle, setSelectedHistoryArticle] = useState<string | null>(initialArticle);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showDeadStockModal, setShowDeadStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printLabelProduct, setPrintLabelProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Quick Stock Adjustment Modal State
  const [quickAdjustProduct, setQuickAdjustProduct] = useState<Product | null>(null);
  const [adjustType, setAdjustType] = useState<"IN" | "OUT" | "SET">("IN");
  const [adjustQty, setAdjustQty] = useState<number>(10);
  const [adjustReason, setAdjustReason] = useState<string>("Purchase Inward");
  const [adjustNotes, setAdjustNotes] = useState<string>("");
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState<string | null>(null);

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) {
      setSearchQuery(s);
    }
    const art = searchParams?.get('article') || searchParams?.get('history');
    if (art) {
      setSelectedHistoryArticle(art);
    }
    const act = searchParams?.get('action');
    if (act === 'barcode' && products.length > 0) {
      setPrintLabelProduct(products[0]);
    } else if (act === 'deadstock') {
      setShowDeadStockModal(true);
    } else if (act === 'catalog') {
      setShowCatalogModal(true);
    } else if (act === 'matrix') {
      setShowMatrixModal(true);
    }
    const flt = searchParams?.get('filter');
    if (flt === 'low_stock') {
      setSelectedStatus('Low Stock');
    }
  }, [searchParams, products]);

  // Overall Inventory & Valuation KPIs
  const inventoryAnalytics = useMemo(() => {
    let totalUnits = 0;
    let totalCostValuation = 0;
    let totalRetailValuation = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let highMarginCount = 0;
    let lowMarginCount = 0;

    products.forEach(p => {
      const qty = p.stockQuantity || 0;
      const cost = p.purchasePrice !== undefined && p.purchasePrice !== null ? p.purchasePrice : (p.sellingPrice * 0.7);
      const sell = p.sellingPrice || 0;
      const minStock = p.minimumStock !== undefined && p.minimumStock !== null ? p.minimumStock : 10;

      totalUnits += qty;
      totalCostValuation += qty * cost;
      totalRetailValuation += qty * sell;

      if (qty <= 0) {
        outOfStockCount++;
      } else if (qty <= minStock) {
        lowStockCount++;
      } else {
        inStockCount++;
      }

      const unitMargin = sell > 0 ? ((sell - cost) / sell) * 100 : 0;
      if (unitMargin >= 30) highMarginCount++;
      if (unitMargin < 15) lowMarginCount++;
    });

    const potentialGrossProfit = totalRetailValuation - totalCostValuation;
    const overallMargin = totalRetailValuation > 0 ? ((potentialGrossProfit / totalRetailValuation) * 100).toFixed(1) : "0.0";

    return {
      totalProducts: products.length,
      totalUnits,
      totalCostValuation,
      totalRetailValuation,
      potentialGrossProfit,
      overallMargin,
      inStockCount,
      lowStockCount,
      outOfStockCount,
      highMarginCount,
      lowMarginCount
    };
  }, [products]);

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete product "${product.name}"?`)) return;
    setDeletingId(product.id);
    const res = await deleteProduct(product.id);
    if (res.error) {
      alert(res.error);
    }
    setDeletingId(null);
  };

  const handleQuickAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdjustProduct || adjustQty <= 0) return;

    setAdjustLoading(true);
    setAdjustSuccess(null);

    const res = await quickAdjustStock(
      quickAdjustProduct.id,
      adjustQty,
      adjustType,
      adjustReason,
      adjustNotes
    );

    if (res.error) {
      alert(res.error);
    } else {
      setAdjustSuccess(`Stock updated! New balance: ${res.newStock} units`);
      setTimeout(() => {
        setQuickAdjustProduct(null);
        setAdjustSuccess(null);
        setAdjustNotes("");
      }, 1200);
    }
    setAdjustLoading(false);
  };

  const formattedCategoriesData = useMemo(() => {
    if (categoriesData.length > 0) return categoriesData;
    return categories.map(c => ({ name: c, weight: 0 }));
  }, [categoriesData, categories]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!product.name.toLowerCase().includes(q) &&
            !(product.sku || '').toLowerCase().includes(q) &&
            !(product.articleNumber || '').toLowerCase().includes(q) &&
            !(product.category || '').toLowerCase().includes(q) &&
            !(product.fabric || '').toLowerCase().includes(q) &&
            !(product.color || '').toLowerCase().includes(q)) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All Categories' && product.category !== selectedCategory) {
        return false;
      }

      // Status & Margin Filters
      if (selectedStatus !== 'All Statuses') {
        const stock = product.stockQuantity;
        const min = product.minimumStock !== undefined && product.minimumStock !== null ? product.minimumStock : 10;
        const cost = product.purchasePrice || (product.sellingPrice * 0.7);
        const sell = product.sellingPrice || 0;
        const marginPct = sell > 0 ? ((sell - cost) / sell) * 100 : 0;

        if (selectedStatus === 'In Stock' && stock <= min) return false;
        if (selectedStatus === 'Low Stock' && (stock <= 0 || stock > min)) return false;
        if (selectedStatus === 'Out of Stock' && stock > 0) return false;
        if (selectedStatus === 'High Margin (>30%)' && marginPct < 30) return false;
        if (selectedStatus === 'Low Margin (<15%)' && marginPct >= 15) return false;
      }

      return true;
    });
  }, [products, searchQuery, selectedCategory, selectedStatus]);

  const handleReset = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedStatus('All Statuses');
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'All Categories' || selectedStatus !== 'All Statuses';

  const exportInventoryCSV = () => {
    if (filteredProducts.length === 0) {
      alert("No products available to export.");
      return;
    }

    const headers = [
      "SKU",
      "Article Number",
      "Product Name",
      "Category",
      "HSN Code",
      "Stock Qty (Units)",
      "Min Stock Buffer",
      "Purchase Cost (INR)",
      "Selling Price (INR)",
      "MRP (INR)",
      "Unit Gross Profit (INR)",
      "Gross Margin (%)",
      "Total Stock Cost Value (INR)",
      "Total Stock Retail Value (INR)",
      "Stock Status"
    ];

    const rows = filteredProducts.map(p => {
      const cost = p.purchasePrice !== undefined && p.purchasePrice !== null ? p.purchasePrice : (p.sellingPrice * 0.7);
      const sell = p.sellingPrice || 0;
      const mrp = p.mrp || (sell * 1.2);
      const profit = sell - cost;
      const margin = sell > 0 ? ((profit / sell) * 100).toFixed(1) : "0.0";
      const min = p.minimumStock || 10;
      const status = p.stockQuantity <= 0 ? "Out of Stock" : (p.stockQuantity <= min ? "Low Stock (Reorder)" : "In Stock");

      return [
        `"${p.sku || ''}"`,
        `"${p.articleNumber || ''}"`,
        `"${p.name.replace(/"/g, '""')}"`,
        `"${p.category || ''}"`,
        `"${p.hsnCode || ''}"`,
        p.stockQuantity,
        min,
        cost.toFixed(2),
        sell.toFixed(2),
        mrp.toFixed(2),
        profit.toFixed(2),
        margin,
        (p.stockQuantity * cost).toFixed(2),
        (p.stockQuantity * sell).toFixed(2),
        `"${status}"`
      ].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_master_valuation_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ─── 1. TOP INVENTORY VALUATION & KPI SUMMARY METRICS ─── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '12px'
      }}>
        {/* KPI 1: Cost Valuation */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Stock Value (Cost)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
              ₹{inventoryAnalytics.totalCostValuation.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Across <strong>{inventoryAnalytics.totalUnits.toLocaleString('en-IN')}</strong> stock units
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={20} />
          </div>
        </div>

        {/* KPI 2: Retail Valuation */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Stock Value (Retail / Selling)
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#2563eb', margin: '4px 0 2px 0' }}>
              ₹{inventoryAnalytics.totalRetailValuation.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              Potential gross sales realization
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={20} />
          </div>
        </div>

        {/* KPI 3: Potential Gross Profit */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Potential Gross Profit
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#059669', margin: '4px 0 2px 0' }}>
              +₹{inventoryAnalytics.potentialGrossProfit.toLocaleString('en-IN')}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>
              {inventoryAnalytics.overallMargin}% Aggregate Margin
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={20} />
          </div>
        </div>

        {/* KPI 4: Stock Health & Reorder Alerts */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
        }}>
          <div>
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Catalog & Buffer Health
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', margin: '4px 0 2px 0' }}>
              {inventoryAnalytics.totalProducts} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>Total SKUs</span>
            </div>
            <div style={{ fontSize: '0.72rem', display: 'flex', gap: '8px', marginTop: '2px' }}>
              <span style={{ color: '#059669', fontWeight: 600 }}>✓ {inventoryAnalytics.inStockCount} Optimal</span>
              <span style={{ color: '#d97706', fontWeight: 600 }}>⚠️ {inventoryAnalytics.lowStockCount} Low</span>
              <span style={{ color: '#dc2626', fontWeight: 600 }}>✗ {inventoryAnalytics.outOfStockCount} Out</span>
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fffbeb', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={20} />
          </div>
        </div>
      </div>

      {/* ─── 2. FILTERS & HEADER ACTIONS TOOLBAR ─── */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff' }}>
          
          {/* Row 1: Title, Export & Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb'
              }}>
                <Layers size={16} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  Product Master & Inventory Valuations
                </h3>
                <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                  Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products with live profit margins & purchase costs
                </p>
              </div>
            </div>

            {/* Action Buttons Group */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              {/* CSV Export Button */}
              <button
                onClick={exportInventoryCSV}
                style={{
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 11px',
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                title="Export complete Inventory & Valuation Register to CSV"
              >
                <Download size={13} color="#475569" />
                Export CSV
              </button>

              {/* AI Dead Stock & Liquidation Insights Button */}
              <button
                onClick={() => setShowDeadStockModal(true)}
                style={{
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 11px',
                  borderRadius: '7px',
                  border: '1px solid #fecdd3',
                  backgroundColor: '#fff1f2',
                  color: '#e11d48',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffe4e6'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fff1f2'}
                title="AI Dead Stock & Inventory Liquidation Insights"
              >
                <Flame size={13} color="#e11d48" />
                AI Dead Stock
              </button>

              {/* 1-Click Wholesale Catalog / Lookbook Generator Button */}
              <button
                onClick={() => setShowCatalogModal(true)}
                style={{
                  height: '32px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '0 11px',
                  borderRadius: '7px',
                  border: '1px solid #bae6fd',
                  backgroundColor: '#f0f9ff',
                  color: '#0284c7',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0f2fe'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                title="Generate Wholesale Product Catalog & Lookbook"
              >
                <BookOpen size={13} color="#0284c7" />
                Wholesale Catalog
              </button>

              {canManage && (
                <>
                  <button
                    onClick={() => setShowCategoryModal(true)}
                    style={{
                      height: '32px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0 11px',
                      borderRadius: '7px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                  >
                    <Scale size={13} color="#475569" />
                    Categories & Weights
                  </button>
                  <button
                    onClick={() => setShowMatrixModal(true)}
                    style={{
                      height: '32px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '0 11px',
                      borderRadius: '7px',
                      border: '1px solid #ddd6fe',
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ede9fe'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f5f3ff'}
                    title="Apparel Size x Color Variant Generator"
                  >
                    <Layers size={13} color="#6d28d9" />
                    Size/Color Matrix
                  </button>
                  <AddProductButton categories={categories} />
                </>
              )}
            </div>
          </div>

          {/* Row 2: Search & Filter Controls */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            backgroundColor: '#f8fafc',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                placeholder="Search by product name, SKU, article no, fabric, color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 28px 0 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a'
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#cbd5e1'}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <div style={{ position: 'relative', width: '160px' }}>
              <select 
                value={selectedCategory} 
                onChange={e => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 26px 0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  appearance: 'none',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <option value="All Categories">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={13} color="#64748b" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Status & Margin Dropdown */}
            <div style={{ position: 'relative', width: '180px' }}>
              <select 
                value={selectedStatus} 
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  padding: '0 26px 0 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  appearance: 'none',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                  color: '#334155',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                <option value="All Statuses">All Stock & Margins</option>
                <option value="In Stock">✓ In Stock (Optimal)</option>
                <option value="Low Stock">⚠️ Low Stock (Reorder Alert)</option>
                <option value="Out of Stock">✗ Out of Stock (0 units)</option>
                <option value="High Margin (>30%)">🔥 High Margin (&gt;30%)</option>
                <option value="Low Margin (<15%)">⚠️ Slim Margin (&lt;15%)</option>
              </select>
              <ChevronDown size={13} color="#64748b" style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters ? (
              <button 
                onClick={handleReset}
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  fontSize: '0.76rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#dc2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              >
                <RotateCcw size={12} /> Reset
              </button>
            ) : (
              <button 
                onClick={handleReset}
                disabled
                style={{
                  height: '32px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: '#ffffff',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                  cursor: 'default'
                }}
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {showCategoryModal && (
          <ManageCategoriesModal
            categories={formattedCategoriesData}
            onClose={() => setShowCategoryModal(false)}
          />
        )}

        {/* ─── 3. ENHANCED INVENTORY & PROFIT DATA TABLE ─── */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1080px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '50px' }}>Image</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Details</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKU / Article</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category & HSN</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Cost Price (₹)</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Selling Price (₹)</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Margin & Profit</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'right' }}>Stock on Hand</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Stock Status</th>
                <th style={{ padding: '10px 12px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const primaryImg = product.images && product.images.length > 0 ? product.images[0] : null;
                const imageCount = product.images?.length || 0;
                const articleIdentifier = product.articleNumber || product.sku || product.id;

                const cost = product.purchasePrice !== undefined && product.purchasePrice !== null ? product.purchasePrice : (product.sellingPrice * 0.7);
                const sell = product.sellingPrice || 0;
                const unitProfit = sell - cost;
                const marginPercent = sell > 0 ? ((unitProfit / sell) * 100).toFixed(1) : "0.0";
                const minStock = product.minimumStock !== undefined && product.minimumStock !== null ? product.minimumStock : 10;
                const totalStockCostValuation = (product.stockQuantity || 0) * cost;

                const isLowStock = product.stockQuantity > 0 && product.stockQuantity <= minStock;
                const isOutOfStock = product.stockQuantity <= 0;

                return (
                  <tr
                    key={product.id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Product Image Thumbnail */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div
                        onClick={() => {
                          if (primaryImg) {
                            setPreviewImage(primaryImg);
                          } else if (canManage) {
                            setEditingProduct(product);
                          }
                        }}
                        style={{
                          position: 'relative',
                          width: '38px',
                          height: '38px',
                          borderRadius: '6px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: primaryImg ? 'pointer' : 'default',
                          overflow: 'hidden'
                        }}
                        title={primaryImg ? `View image (${imageCount} photos)` : 'No images'}
                      >
                        {primaryImg ? (
                          <>
                            <img
                              src={primaryImg}
                              alt={product.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                            {imageCount > 1 && (
                              <div style={{
                                position: 'absolute',
                                bottom: 0,
                                right: 0,
                                backgroundColor: 'rgba(79, 70, 229, 0.9)',
                                color: '#fff',
                                fontSize: '0.55rem',
                                fontWeight: 800,
                                padding: '1px 3px',
                                borderRadius: '3px 0 0 0'
                              }}>
                                +{imageCount - 1}
                              </div>
                            )}
                          </>
                        ) : (
                          <ImageIcon size={15} color="#94a3b8" />
                        )}
                      </div>
                    </td>

                    {/* Product Name & Variants */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{product.name}</div>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                        {product.fabric && (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 5px', borderRadius: '4px' }}>
                            {product.fabric}
                          </span>
                        )}
                        {product.color && (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '1px 5px', borderRadius: '4px' }}>
                            {product.color}
                          </span>
                        )}
                        {product.size && (
                          <span style={{ fontSize: '0.68rem', backgroundColor: '#eff6ff', color: '#2563eb', padding: '1px 5px', borderRadius: '4px' }}>
                            {product.size}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* SKU & Clickable Article Number */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      <div
                        onClick={() => setSelectedHistoryArticle(articleIdentifier)}
                        style={{
                          cursor: 'pointer',
                          display: 'inline-flex',
                          flexDirection: 'column',
                          gap: '1px'
                        }}
                        title="Click to view full transaction and usage history"
                      >
                        <span style={{
                          color: '#0f172a',
                          fontWeight: 600,
                          fontFamily: 'monospace',
                          fontSize: '0.78rem'
                        }}>
                          {product.sku || '-'}
                        </span>
                        <span style={{
                          color: '#4f46e5',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          Art: {product.articleNumber || '-'} <History size={10} />
                        </span>
                      </div>
                    </td>
                    
                    {/* Category & HSN */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', fontSize: '0.76rem' }}>
                      <div style={{ color: '#334155', fontWeight: 500 }}>{product.category || '-'}</div>
                      {product.hsnCode && (
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                          HSN: {product.hsnCode}
                        </span>
                      )}
                    </td>
                    
                    {/* Cost / Purchase Price */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ fontWeight: 600, color: '#475569', fontSize: '0.82rem' }}>
                        ₹{cost.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Cost Rate</div>
                    </td>

                    {/* Selling Price */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.84rem' }}>
                        ₹{sell.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                      </div>
                      {product.mrp && product.mrp > sell && (
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                          MRP: ₹{product.mrp.toLocaleString('en-IN')}
                        </div>
                      )}
                    </td>

                    {/* Unit Margin & Profit */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        color: unitProfit >= 0 ? '#059669' : '#dc2626'
                      }}>
                        {unitProfit >= 0 ? `+₹${unitProfit.toFixed(0)}` : `-₹${Math.abs(unitProfit).toFixed(0)}`}
                      </div>
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: Number(marginPercent) >= 30 ? '#eff6ff' : (Number(marginPercent) >= 15 ? '#ecfdf5' : '#fffbeb'),
                        color: Number(marginPercent) >= 30 ? '#2563eb' : (Number(marginPercent) >= 15 ? '#059669' : '#d97706')
                      }}>
                        {marginPercent}% margin
                      </span>
                    </td>
                    
                    {/* Stock on Hand & Cost Valuation */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, color: isOutOfStock ? '#dc2626' : (isLowStock ? '#d97706' : '#0f172a'), fontSize: '0.84rem' }}>
                        {product.stockQuantity} <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#64748b' }}>pcs</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                        Asset: ₹{totalStockCostValuation.toLocaleString('en-IN')}
                      </div>
                    </td>
                    
                    {/* Status Badge */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <span style={{ 
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '12px',
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        backgroundColor: !isLowStock && !isOutOfStock ? '#ecfdf5' : (isLowStock ? '#fffbeb' : '#fef2f2'),
                        color: !isLowStock && !isOutOfStock ? '#065f46' : (isLowStock ? '#854d0e' : '#991b1b')
                      }}>
                        <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: !isLowStock && !isOutOfStock ? '#10b981' : (isLowStock ? '#f59e0b' : '#ef4444') }}></span>
                        {!isLowStock && !isOutOfStock ? 'In Stock' : (isLowStock ? 'Low Stock' : 'Out of Stock')}
                      </span>
                      {isLowStock && (
                        <div style={{ fontSize: '0.64rem', color: '#d97706', marginTop: '1px' }}>
                          Buffer: {minStock}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        {/* Quick Stock Adjustment Trigger */}
                        {canManage && (
                          <button
                            onClick={() => {
                              setQuickAdjustProduct(product);
                              setAdjustType("IN");
                              setAdjustQty(10);
                              setAdjustReason("Purchase Inward");
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              backgroundColor: '#f0fdf4',
                              color: '#16a34a',
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#dcfce7'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f0fdf4'; }}
                            title="Quick Stock In / Stock Out / Audit Adjustment"
                          >
                            <Zap size={14} />
                          </button>
                        )}

                        {/* View Article Transaction History Button */}
                        <button 
                          onClick={() => setSelectedHistoryArticle(articleIdentifier)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '28px',
                            height: '28px',
                            backgroundColor: '#f8fafc',
                            color: '#4f46e5',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }} 
                          onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }} 
                          onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} 
                          title="View Article Transaction History, Quotes & Invoices"
                        >
                          <History size={14} />
                        </button>

                        {canManage && (
                          <>
                            <button 
                              onClick={() => setPrintLabelProduct(product)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                backgroundColor: '#f8fafc',
                                color: '#4f46e5',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }} 
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef2ff'; e.currentTarget.style.borderColor = '#c7d2fe'; }} 
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} 
                              title="Print Barcode / QR Label"
                            >
                              <Tag size={14} />
                            </button>
                            <button 
                              onClick={() => setEditingProduct(product)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                backgroundColor: '#f8fafc',
                                color: '#2563eb',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }} 
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }} 
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} 
                              title="Edit Product Master"
                            >
                              <Edit size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteProduct(product)}
                              disabled={deletingId === product.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '28px',
                                height: '28px',
                                backgroundColor: '#f8fafc',
                                color: '#dc2626',
                                borderRadius: '6px',
                                border: '1px solid #e2e8f0',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                opacity: deletingId === product.id ? 0.5 : 1
                              }} 
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }} 
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }} 
                              title="Delete Product"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    No products found matching your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── 4. QUICK STOCK ADJUSTMENT MODAL ─── */}
      {quickAdjustProduct && (
        <div className="modal-backdrop" style={{ zIndex: 99999 }}>
          <div className="modal-content glass-panel animate-in" style={{ maxWidth: '480px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Zap size={16} color="#16a34a" /> Quick Stock Adjustment
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                  {quickAdjustProduct.name} ({quickAdjustProduct.sku || 'No SKU'})
                </p>
              </div>
              <button className="close-btn" onClick={() => setQuickAdjustProduct(null)}>×</button>
            </div>

            <form onSubmit={handleQuickAdjustSubmit} style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {adjustSuccess && (
                <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', color: '#059669', padding: '10px', borderRadius: '6px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={16} /> {adjustSuccess}
                </div>
              )}

              {/* Current Stock Banner */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                fontSize: '0.82rem'
              }}>
                <div>Current Stock: <strong style={{ fontSize: '1rem', color: '#0f172a' }}>{quickAdjustProduct.stockQuantity}</strong> units</div>
                <div>Cost Rate: <strong>₹{(quickAdjustProduct.purchasePrice || (quickAdjustProduct.sellingPrice * 0.7)).toFixed(0)}</strong></div>
              </div>

              {/* Adjustment Mode Selector */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("IN");
                    setAdjustReason("Purchase Inward");
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: adjustType === "IN" ? '2px solid #16a34a' : '1px solid #e2e8f0',
                    backgroundColor: adjustType === "IN" ? '#ecfdf5' : '#ffffff',
                    color: adjustType === "IN" ? '#065f46' : '#475569'
                  }}
                >
                  📥 Stock In (+)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("OUT");
                    setAdjustReason("Manual Dispatch");
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: adjustType === "OUT" ? '2px solid #dc2626' : '1px solid #e2e8f0',
                    backgroundColor: adjustType === "OUT" ? '#fef2f2' : '#ffffff',
                    color: adjustType === "OUT" ? '#991b1b' : '#475569'
                  }}
                >
                  📤 Stock Out (-)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustType("SET");
                    setAdjustReason("Physical Stock Audit");
                  }}
                  style={{
                    padding: '8px 4px',
                    borderRadius: '6px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: adjustType === "SET" ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: adjustType === "SET" ? '#eff6ff' : '#ffffff',
                    color: adjustType === "SET" ? '#1e40af' : '#475569'
                  }}
                >
                  🎯 Physical Audit
                </button>
              </div>

              {/* Quantity Input */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  {adjustType === "SET" ? "Exact Physical Stock Count" : "Quantity to Adjust (Units)"}
                </label>
                <input
                  type="number"
                  min={adjustType === "SET" ? "0" : "1"}
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value, 10) || 0)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>

              {/* Reason Selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Adjustment Reason
                </label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    backgroundColor: '#ffffff',
                    outline: 'none'
                  }}
                >
                  {adjustType === "IN" && (
                    <>
                      <option value="Purchase Inward">Purchase Inward (Vendor Receipt)</option>
                      <option value="Sales Return">Customer Sales Return</option>
                      <option value="Sample Returned">Sample Returned from Client</option>
                      <option value="Production Restock">Finished Goods Production Restock</option>
                    </>
                  )}
                  {adjustType === "OUT" && (
                    <>
                      <option value="Manual Dispatch">Manual Dispatch / Offline Sale</option>
                      <option value="Damaged / Scrap">Damaged / Scrap / Fabric Defect</option>
                      <option value="Sample Given">Sample Given to Buyer</option>
                      <option value="Inventory Loss">Inventory Shrinkage / Loss</option>
                    </>
                  )}
                  {adjustType === "SET" && (
                    <>
                      <option value="Physical Stock Audit">Physical Warehouse Verification</option>
                      <option value="Year-End Inventory Reset">Annual Inventory Audit Reset</option>
                    </>
                  )}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '4px' }}>
                  Notes / Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-8902 or Rack A-12 recount"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Projected Result */}
              <div style={{
                padding: '8px 12px',
                backgroundColor: '#f1f5f9',
                borderRadius: '6px',
                fontSize: '0.78rem',
                color: '#475569',
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <span>Projected New Balance:</span>
                <strong style={{ color: '#0f172a' }}>
                  {adjustType === "IN" 
                    ? quickAdjustProduct.stockQuantity + adjustQty 
                    : (adjustType === "OUT" ? Math.max(0, quickAdjustProduct.stockQuantity - adjustQty) : adjustQty)} units
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setQuickAdjustProduct(null)}
                  style={{
                    padding: '8px 14px',
                    borderRadius: '6px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustLoading}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: adjustType === "OUT" ? '#dc2626' : '#16a34a',
                    color: '#ffffff',
                    fontWeight: 600,
                    fontSize: '0.82rem',
                    cursor: 'pointer'
                  }}
                >
                  {adjustLoading ? "Applying..." : "Confirm Stock Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── 5. OTHER MODALS ─── */}

      {/* Article Transaction & Usage History Modal */}
      {selectedHistoryArticle && (
        <ArticleHistoryModal
          initialArticleOrId={selectedHistoryArticle}
          productsList={products}
          onClose={() => setSelectedHistoryArticle(null)}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {/* Print Label Modal */}
      {printLabelProduct && (
        <BarcodeLabelModal
          product={printLabelProduct}
          onClose={() => setPrintLabelProduct(null)}
        />
      )}

      {/* Wholesale Product Catalog / Lookbook Modal */}
      {showCatalogModal && (
        <ProductCatalogModal
          products={products}
          categories={categories}
          onClose={() => setShowCatalogModal(false)}
        />
      )}

      {/* AI Dead Stock & Liquidation Insights Modal */}
      {showDeadStockModal && (
        <DeadStockInsightsModal
          onClose={() => setShowDeadStockModal(false)}
        />
      )}

      {/* Image Lightbox Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.85)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{ position: 'relative', maxWidth: '85vw', maxHeight: '85vh' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              style={{
                position: 'absolute',
                top: '-16px',
                right: '-16px',
                backgroundColor: '#fff',
                color: '#0f172a',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
              }}
            >
              ×
            </button>
            <img
              src={previewImage}
              alt="Preview"
              style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
            />
          </div>
        </div>
      )}

      {showMatrixModal && (
        <ProductMatrixModal
          isOpen={showMatrixModal}
          onClose={() => setShowMatrixModal(false)}
          categories={categories}
        />
      )}
    </div>
  );
}
