"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ChevronDown, Edit, Trash2, Scale, Tag, History, Image as ImageIcon, Eye, Layers, RotateCcw, X, Filter, BookOpen, Sparkles, Flame } from 'lucide-react';
import AddProductButton from '@/components/ui/AddProductButton';
import ManageCategoriesModal from '@/components/products/ManageCategoriesModal';
import EditProductModal from '@/components/ui/EditProductModal';
import BarcodeLabelModal from '@/components/products/BarcodeLabelModal';
import ArticleHistoryModal from '@/components/products/ArticleHistoryModal';
import ProductCatalogModal from '@/components/products/ProductCatalogModal';
import ProductMatrixModal from '@/components/inventory/ProductMatrixModal';
import DeadStockInsightsModal from '@/components/products/DeadStockInsightsModal';
import { deleteProduct } from '@/app/actions/productActions';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  articleNumber: string | null;
  category: string | null;
  hsnCode: string | null;
  sellingPrice: number;
  stockQuantity: number;
  weight?: number | null;
  description?: string | null;
  images?: string[];
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

  const handleDeleteProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to delete product "${product.name}"?`)) return;
    setDeletingId(product.id);
    const res = await deleteProduct(product.id);
    if (res.error) {
      alert(res.error);
    }
    setDeletingId(null);
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
            !(product.articleNumber || '').toLowerCase().includes(q)) {
          return false;
        }
      }

      // Category
      if (selectedCategory !== 'All Categories' && product.category !== selectedCategory) {
        return false;
      }

      // Status
      if (selectedStatus !== 'All Statuses') {
        const stock = product.stockQuantity;
        if (selectedStatus === 'In Stock' && stock <= 10) return false;
        if (selectedStatus === 'Low Stock' && (stock <= 0 || stock > 10)) return false;
        if (selectedStatus === 'Out of Stock' && stock > 0) return false;
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

  return (
    <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
      
      {/* ─── FILTERS & HEADER ACTIONS TOOLBAR ─── */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px', backgroundColor: '#ffffff' }}>
        
        {/* Row 1: Section Title & Action Buttons */}
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
                Product Catalog & Inventory
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
              </p>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
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

            {/* Article Transaction History & Usage Button */}
            <button
              onClick={() => {
                if (products.length > 0) {
                  const first = products[0];
                  setSelectedHistoryArticle(first.articleNumber || first.sku || first.id);
                }
              }}
              style={{
                height: '32px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '0 11px',
                borderRadius: '7px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
              title="Open Article Transaction History, Quotations, and Invoice Usage"
            >
              <History size={13} color="#475569" />
              Article History
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
          <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by product name, SKU, article no..."
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

          {/* Status Dropdown */}
          <div style={{ position: 'relative', width: '140px' }}>
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
              <option value="All Statuses">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
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

      {/* ─── TABLE ─── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '950px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '56px' }}>Image</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Product Name</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>SKU / Article No.</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Category</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>HSN Code</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Price (₹)</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Stock</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Status</th>
              <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const primaryImg = product.images && product.images.length > 0 ? product.images[0] : null;
              const imageCount = product.images?.length || 0;
              const articleIdentifier = product.articleNumber || product.sku || product.id;

              return (
                <tr
                  key={product.id}
                  style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Product Image Thumbnail */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
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

                  {/* Product Name */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>{product.name}</div>
                    {product.description && (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 400, marginTop: '1px', maxWidth: '260px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.description}
                      </div>
                    )}
                  </td>
                  
                  {/* SKU & Clickable Article Number */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
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
                        fontSize: '0.78rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
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
                  
                  {/* Category */}
                  <td style={{ padding: '8px 14px', color: '#475569', verticalAlign: 'middle', fontSize: '0.78rem' }}>
                    {product.category || '-'}
                  </td>
                  
                  {/* HSN */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600 }}>
                      {product.hsnCode || '-'}
                    </span>
                  </td>
                  
                  {/* Price */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle', fontWeight: 700, color: '#059669', fontSize: '0.84rem' }}>
                    ₹{product.sellingPrice.toLocaleString()}
                  </td>
                  
                  {/* Stock */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>
                    {product.stockQuantity}
                  </td>
                  
                  {/* Status */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 8px',
                      borderRadius: '12px',
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      backgroundColor: product.stockQuantity > 10 ? '#ecfdf5' : (product.stockQuantity > 0 ? '#fef9c3' : '#fef2f2'),
                      color: product.stockQuantity > 10 ? '#065f46' : (product.stockQuantity > 0 ? '#854d0e' : '#991b1b')
                    }}>
                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: product.stockQuantity > 10 ? '#10b981' : (product.stockQuantity > 0 ? '#f59e0b' : '#ef4444') }}></span>
                      {product.stockQuantity > 10 ? 'In Stock' : (product.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '8px 14px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
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
                            title="Edit Product & Images"
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
                <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No products found matching your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MODALS ─── */}

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
