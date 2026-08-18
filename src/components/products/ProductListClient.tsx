"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, ChevronDown, Edit, Trash2, Scale, Tag } from 'lucide-react';
import AddProductButton from '@/components/ui/AddProductButton';
import ManageCategoriesModal from '@/components/products/ManageCategoriesModal';
import EditProductModal from '@/components/ui/EditProductModal';
import BarcodeLabelModal from '@/components/products/BarcodeLabelModal';
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
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    const s = searchParams?.get('search');
    if (s !== null && s !== undefined) {
      setSearchQuery(s);
    }
  }, [searchParams]);
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedStatus, setSelectedStatus] = useState('All Statuses');
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [printLabelProduct, setPrintLabelProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  return (
    <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
      
      {/* ─── FILTERS HEADER ─── */}
      <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', flex: 1 }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1', minWidth: '250px', maxWidth: '400px' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search by product name, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          {/* Category Dropdown */}
          <div style={{ position: 'relative', width: '200px' }}>
            <select 
              value={selectedCategory} 
              onChange={e => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', appearance: 'none', backgroundColor: '#fff', outline: 'none' }}
            >
              <option value="All Categories">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          {/* Status Dropdown */}
          <div style={{ position: 'relative', width: '180px' }}>
            <select 
              value={selectedStatus} 
              onChange={e => setSelectedStatus(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', appearance: 'none', backgroundColor: '#fff', outline: 'none' }}
            >
              <option value="All Statuses">All Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
            <ChevronDown size={16} color="#64748b" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          </div>

          <button 
            onClick={handleReset}
            style={{ padding: '10px 24px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.9rem', cursor: 'pointer', fontWeight: 500, color: '#475569' }}
          >
            Reset
          </button>
        </div>

        {canManage && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              onClick={() => setShowCategoryModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#334155',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              <Scale size={16} color="#4f46e5" />
              Manage Categories & Weights
            </button>
            <AddProductButton categories={categories} />
          </div>
        )}
      </div>

      {showCategoryModal && (
        <ManageCategoriesModal
          categories={formattedCategoriesData}
          onClose={() => setShowCategoryModal(false)}
        />
      )}

      {/* ─── TABLE ─── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
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
            {filteredProducts.map((product) => (
              <tr key={product.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                
                {/* Product Name */}
                <td style={{ padding: '20px', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', verticalAlign: 'middle' }}>
                  {product.name}
                </td>
                
                {/* SKU */}
                <td style={{ padding: '20px', verticalAlign: 'middle' }}>
                  <div style={{ color: '#0f172a', fontWeight: 500 }}>{product.sku || '-'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{product.articleNumber || '-'}</div>
                </td>
                
                {/* Category */}
                <td style={{ padding: '20px', color: '#475569', verticalAlign: 'middle', fontSize: '0.9rem' }}>
                  {product.category || '-'}
                </td>
                
                {/* HSN */}
                <td style={{ padding: '20px', verticalAlign: 'middle' }}>
                  <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {product.hsnCode || '-'}
                  </span>
                </td>
                
                {/* Price */}
                <td style={{ padding: '20px', verticalAlign: 'middle', fontWeight: 700, color: '#10b981', fontSize: '1rem' }}>
                  ₹{product.sellingPrice.toLocaleString()}
                </td>
                
                {/* Stock */}
                <td style={{ padding: '20px', verticalAlign: 'middle', fontWeight: 600, color: '#0f172a' }}>
                  {product.stockQuantity}
                </td>
                
                {/* Status */}
                <td style={{ padding: '20px', verticalAlign: 'middle' }}>
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
                <td style={{ padding: '20px', verticalAlign: 'middle', textAlign: 'center' }}>
                  {canManage ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
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
                        title="Edit Product"
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
                    </div>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>No access</span>
                  )}
                </td>
              </tr>
            ))}
            
            {filteredProducts.length === 0 && (
              <tr>
                <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                  No products found matching your search or filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          categories={categories}
          onClose={() => setEditingProduct(null)}
        />
      )}

      {printLabelProduct && (
        <BarcodeLabelModal
          product={printLabelProduct}
          onClose={() => setPrintLabelProduct(null)}
        />
      )}
    </div>
  );
}
