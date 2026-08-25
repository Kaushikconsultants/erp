"use client";

import React, { useState, useMemo } from 'react';
import { X, Printer, MessageSquare, BookOpen, Check, Image as ImageIcon, Sparkles, Filter, CheckSquare, Square, Share2 } from 'lucide-react';

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

interface ProductCatalogModalProps {
  products: Product[];
  categories?: string[];
  companySettings?: {
    companyName?: string;
    address?: string;
    city?: string;
    state?: string;
    mobile?: string;
    email?: string;
    gstin?: string;
  };
  onClose: () => void;
}

export default function ProductCatalogModal({
  products,
  categories = [],
  companySettings,
  onClose
}: ProductCatalogModalProps) {
  const [catalogTitle, setCatalogTitle] = useState('WHOLESALE APPAREL COLLECTION & LOOKBOOK');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>(
    products.slice(0, 12).map(p => p.id)
  );

  // Display Settings
  const [showPrices, setShowPrices] = useState(true);
  const [showStock, setShowStock] = useState(false);
  const [showMoq, setShowMoq] = useState(true);
  const [showSpecs, setShowSpecs] = useState(true);

  const company = companySettings || {
    companyName: 'ESPON CLOTHING PRIVATE LIMITED',
    address: 'Sco 71A, 2nd Floor, Ashoka Plaza, Delhi Road, Rohtak, Haryana',
    mobile: '+91 7206066678',
    email: 'clothingespon@gmail.com',
    gstin: '06AAHCE7721Q1Z4'
  };

  // Filter products for selection
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) || 
        (p.articleNumber || '').toLowerCase().includes(q) || 
        (p.sku || '').toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  const selectedProducts = useMemo(() => {
    return products.filter(p => selectedProductIds.includes(p.id));
  }, [products, selectedProductIds]);

  const handleToggleProduct = (id: string) => {
    if (selectedProductIds.includes(id)) {
      setSelectedProductIds(selectedProductIds.filter(pid => pid !== id));
    } else {
      setSelectedProductIds([...selectedProductIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredProducts.map(p => p.id);
    const newSet = new Set([...selectedProductIds, ...filteredIds]);
    setSelectedProductIds(Array.from(newSet));
  };

  const handleDeselectAll = () => {
    setSelectedProductIds([]);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const lines = [
      `*${catalogTitle.toUpperCase()}*`,
      `*Company:* ${company.companyName}`,
      `*Catalogue Items:* ${selectedProducts.length} Articles\n`
    ];

    selectedProducts.forEach((p, idx) => {
      lines.push(
        `${idx + 1}. *${p.name}* (Art #${p.articleNumber || p.sku || 'N/A'})\n` +
        `   • Category: ${p.category || 'Apparel'}\n` +
        (showPrices ? `   • Wholesale Rate: *₹${p.sellingPrice.toLocaleString('en-IN')} / pc*\n` : '') +
        (showMoq ? `   • Min Order: Set of 12 / 18 pcs\n` : '') +
        (p.fabric ? `   • Fabric: ${p.fabric}\n` : '')
      );
    });

    lines.push(
      `\n*For Wholesale Booking & Sample Requests:*\n` +
      `📞 WhatsApp/Call: ${company.mobile}\n` +
      `📧 Email: ${company.email}\n` +
      `Thank you!`
    );

    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      fontFamily: 'var(--font-family, "Inter", -apple-system, sans-serif)'
    }} onClick={onClose}>
      
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '960px',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>

        {/* Modal Header (Screen Only) */}
        <div className="no-print" style={{
          backgroundColor: '#f8fafc',
          padding: '14px 20px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
                Wholesale Product Catalog & Lookbook Generator
              </h3>
              <p style={{ margin: '1px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                1-Click generate shareable PDF & WhatsApp catalogue for buyers
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#25D366',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} /> Send WhatsApp Broadcast
            </button>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#1e293b',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>

            <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Screen Only) */}
        <div className="no-print" style={{
          padding: '12px 20px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Row 1: Title & Options */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Catalog Title / Heading
              </label>
              <input
                type="text"
                value={catalogTitle}
                onChange={e => setCatalogTitle(e.target.value)}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} />
                Wholesale Price
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={showMoq} onChange={e => setShowMoq(e.target.checked)} />
                MOQ / Set Ratio
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#334155', cursor: 'pointer' }}>
                <input type="checkbox" checked={showSpecs} onChange={e => setShowSpecs(e.target.checked)} />
                Fabric & Specs
              </label>
            </div>
          </div>

          {/* Row 2: Category Filter & Selection Counter */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', borderTop: '1px solid #f1f5f9', paddingTop: '8px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>Category:</span>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', color: '#334155' }}
              >
                <option value="All">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <input
                type="text"
                placeholder="Filter articles..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', width: '120px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 600 }}>
                {selectedProductIds.length} Selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.72rem', cursor: 'pointer' }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Catalog Preview Canvas */}
        <div style={{ padding: '24px', overflowY: 'auto', backgroundColor: '#f8fafc' }}>
          
          {/* Official Printable Lookbook Page */}
          <div id="printable-catalog" style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '28px',
            color: '#1e293b'
          }}>
            
            {/* Catalog Letterhead Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {company.companyName}
                </h1>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {company.address} • Phone/WhatsApp: <strong>{company.mobile}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  textTransform: 'uppercase'
                }}>
                  Wholesale Lookbook
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Updated: {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Catalog Big Title */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#1e293b', letterSpacing: '0.5px' }}>
                {catalogTitle}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Exclusively for Authorized Retailers & Wholesale Buyers
              </span>
            </div>

            {/* Products Grid (2 or 3 Columns) */}
            {selectedProducts.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
              }}>
                {selectedProducts.map(product => {
                  const imageSrc = (product.images && product.images.length > 0) ? product.images[0] : null;

                  return (
                    <div
                      key={product.id}
                      className="catalog-item-card"
                      style={{
                        backgroundColor: '#ffffff',
                        borderRadius: '10px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'border-color 0.15s ease'
                      }}
                    >
                      {/* Product Image Thumbnail */}
                      <div style={{
                        width: '100%',
                        height: '160px',
                        backgroundColor: '#f1f5f9',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden'
                      }}>
                        {imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc}
                            alt={product.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                            <ImageIcon size={28} />
                            <span style={{ fontSize: '0.68rem', marginTop: '4px' }}>Garment Photo</span>
                          </div>
                        )}

                        {/* Article Number Badge */}
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          backgroundColor: 'rgba(15, 23, 42, 0.85)',
                          color: '#ffffff',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          backdropFilter: 'blur(2px)'
                        }}>
                          Art #{product.articleNumber || product.sku || 'N/A'}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#1e293b' }}>
                          {product.name}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Category: <span style={{ color: '#334155', fontWeight: 500 }}>{product.category || 'Apparel'}</span>
                        </div>

                        {showSpecs && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.3 }}>
                            {product.fabric && <div>Fabric: <strong style={{ color: '#334155' }}>{product.fabric}</strong></div>}
                            <div>Sizes: <strong style={{ color: '#334155' }}>S, M, L, XL, XXL</strong></div>
                          </div>
                        )}

                        {/* Price & MOQ Footer */}
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          {showPrices ? (
                            <div>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Wholesale Rate</span>
                              <span style={{ fontSize: '1rem', fontWeight: 700, color: '#059669' }}>
                                ₹{product.sellingPrice.toLocaleString('en-IN')}
                              </span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.72rem', color: '#2563eb', fontWeight: 500 }}>Inquire for Rates</span>
                          )}

                          {showMoq && (
                            <span style={{ fontSize: '0.68rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '2px 6px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                              MOQ: 12 pcs
                            </span>
                          )}
                        </div>

                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                No products selected for the catalog. Please select products from the options bar above.
              </div>
            )}

            {/* Catalog Footer: Ordering CTA */}
            <div style={{
              backgroundColor: '#f8fafc',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              fontSize: '0.78rem'
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>How to Place an Order:</div>
                <div style={{ color: '#64748b' }}>Send Article Numbers & quantities via WhatsApp to <strong>{company.mobile}</strong></div>
              </div>

              <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.72rem' }}>
                Delivery across India via Transport • Fast Dispatch
              </div>
            </div>

          </div>

        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          .no-print { display: none !important; }
          body { background-color: white !important; margin: 0 !important; padding: 0 !important; }
          #printable-catalog { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; }
          .catalog-item-card { break-inside: avoid !important; page-break-inside: avoid !important; }
        }
      `}} />
    </div>
  );
}
