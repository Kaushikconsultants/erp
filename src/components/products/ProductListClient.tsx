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
    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
      
      {/* ─── FILTERS & HEADER ACTIONS TOOLBAR ─── */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '14px', backgroundColor: '#ffffff' }}>
        
        {/* Row 1: Section Title & Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5'
            }}>
              <Layers size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                Product Catalog & Inventory
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Showing <strong>{filteredProducts.length}</strong> of <strong>{products.length}</strong> products
              </p>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* AI Dead Stock & Liquidation Insights Button */}
            <button
              onClick={() => setShowDeadStockModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                color: '#dc2626',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(220, 38, 38, 0.08)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
              title="AI Dead Stock & Inventory Liquidation Insights (Clearance Campaigns & Locked Capital)"
            >
              <Flame size={15} color="#dc2626" />
              AI Dead Stock Insights
            </button>

            {/* 1-Click Wholesale Catalog / Lookbook Generator Button */}
            <button
              onClick={() => setShowCatalogModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#2563eb',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(37, 99, 235, 0.08)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dbeafe'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eff6ff'}
              title="1-Click Generate Wholesale Product Catalog & Lookbook (PDF & WhatsApp)"
            >
              <BookOpen size={15} color="#2563eb" />
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
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #c7d2fe',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.08)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eef2ff'}
              title="Open Article Transaction History, Quotations, and Invoice Usage"
            >
              <History size={15} color="#4f46e5" />
              Article History
            </button>

            {canManage && (
              <>
                <button
                  onClick={() => setShowCategoryModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  <Scale size={15} color="#4f46e5" />
                  Manage Categories & Weights
                </button>
                <button
                  onClick={() => setShowMatrixModal(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: '1px solid #c7d2fe',
                    backgroundColor: '#eef2ff',
                    color: '#4338ca',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(79, 70, 229, 0.08)',
                    transition: 'all 0.15s ease'
                  }}
                  title="Apparel Size x Color Variant Generator (Busy Matrix Parity)"
                >
                  <Layers size={15} color="#4338ca" />
                  + Size/Color Matrix
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
          gap: '10px',
          flexWrap: 'wrap',
          backgroundColor: '#f8fafc',
          padding: '10px 12px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0'
        }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: '1', minWidth: '260px' }}>
            <Search size={15} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by product name, SKU, article no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 36px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                backgroundColor: '#ffffff',
                color: '#1e293b'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
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
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div style={{ position: 'relative', width: '180px' }}>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
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
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Status Dropdown */}
          <div style={{ position: 'relative', width: '160px' }}>
            <select 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 30px 8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
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
            <ChevronDown size={14} color="#64748b" style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters ? (
            <button 
              onClick={handleReset}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #fecaca',
                backgroundColor: '#fef2f2',
                fontSize: '0.85rem',
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
              <RotateCcw size={13} /> Reset
            </button>
          ) : (
            <button 
              onClick={handleReset}
              disabled
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#ffffff',
                fontSize: '0.85rem',
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
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', width: '60px' }}>Image</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Product Name</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>SKU / Article No.</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Category</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>HSN Code</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Price (₹)</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Stock</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>Status</th>
              <th style={{ padding: '16px 20px', fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textAlign: 'center' }}>Actions</th>
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
                  <td style={{ padding: '14px 20px', verticalAlign: 'middle' }}>
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
                        width: '46px',
                        height: '46px',
                        borderRadius: '8px',
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
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              padding: '1px 3px',
                              borderRadius: '4px 0 0 0'
                            }}>
                              +{imageCount - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <ImageIcon size={18} color="#cbd5e1" />
                      )}
                    </div>
                  </td>

                  {/* Product Name */}
                  <td style={{ padding: '16px 20px', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>
                    <div>{product.name}</div>
                    {product.description && (
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400, marginTop: '2px', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {product.description}
                      </div>
                    )}
                  </td>
                  
                  {/* SKU & Clickable Article Number */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <div
                      onClick={() => setSelectedHistoryArticle(articleIdentifier)}
                      style={{
                        cursor: 'pointer',
                        display: 'inline-flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                      title="Click to view full transaction and usage history"
                    >
                      <span style={{
                        color: '#0f172a',
                        fontWeight: 600,
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {product.sku || '-'}
                      </span>
                      <span style={{
                        color: '#4f46e5',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        Art: {product.articleNumber || '-'} <History size={11} />
                      </span>
                    </div>
                  </td>
                  
                  {/* Category */}
                  <td style={{ padding: '16px 20px', color: '#475569', verticalAlign: 'middle', fontSize: '0.9rem' }}>
                    {product.category || '-'}
                  </td>
                  
                  {/* HSN */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {product.hsnCode || '-'}
                    </span>
                  </td>
                  
                  {/* Price */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                    ₹{product.sellingPrice.toLocaleString()}
                  </td>
                  
                  {/* Stock */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a' }}>
                    {product.stockQuantity}
                  </td>
                  
                  {/* Status */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle' }}>
                    <span style={{ 
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 12px',
                      borderRadius: '16px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      backgroundColor: product.stockQuantity > 10 ? '#dcfce3' : (product.stockQuantity > 0 ? '#fef9c3' : '#fee2e2'),
                      color: product.stockQuantity > 10 ? '#166534' : (product.stockQuantity > 0 ? '#854d0e' : '#991b1b')
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: product.stockQuantity > 10 ? '#10b981' : (product.stockQuantity > 0 ? '#f59e0b' : '#ef4444') }}></span>
                      {product.stockQuantity > 10 ? 'In Stock' : (product.stockQuantity > 0 ? 'Low Stock' : 'Out of Stock')}
                    </span>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '16px 20px', verticalAlign: 'middle', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                      {/* View Article Transaction History Button */}
                      <button 
                        onClick={() => setSelectedHistoryArticle(articleIdentifier)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '32px',
                          height: '32px',
                          backgroundColor: '#eef2ff',
                          color: '#4f46e5',
                          borderRadius: '6px',
                          border: '1px solid #c7d2fe',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }} 
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'} 
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#eef2ff'} 
                        title="View Article Transaction History, Quotes & Invoices"
                      >
                        <History size={16} />
                      </button>

                      {canManage && (
                        <>
                          <button 
                            onClick={() => setPrintLabelProduct(product)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#f1f5f9', color: '#4f46e5', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }} 
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'} 
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} 
                            title="Print Barcode / QR Label"
                          >
                            <Tag size={16} />
                          </button>
                          <button 
                            onClick={() => setEditingProduct(product)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#f1f5f9', color: '#3b82f6', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'background 0.2s' }} 
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e0e7ff'} 
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} 
                            title="Edit Product & Images"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDeleteProduct(product)}
                            disabled={deletingId === product.id}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', backgroundColor: '#f1f5f9', color: '#ef4444', borderRadius: '6px', border: 'none', cursor: 'pointer', transition: 'background 0.2s', opacity: deletingId === product.id ? 0.5 : 1 }} 
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fee2e2'} 
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'} 
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
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
