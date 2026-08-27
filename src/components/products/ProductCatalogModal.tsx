"use client";

import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  MessageSquare,
  BookOpen,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  QrCode,
  CheckCircle2
} from 'lucide-react';

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

  // Share Link Modal State
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

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

  // Generate public customer shareable URL
  const shareableUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/catalog';
    const baseUrl = `${window.location.origin}/catalog`;
    const params = new URLSearchParams();
    if (selectedProductIds.length > 0 && selectedProductIds.length < products.length) {
      params.set('ids', selectedProductIds.join(','));
    }
    if (catalogTitle && catalogTitle !== 'WHOLESALE APPAREL COLLECTION & LOOKBOOK') {
      params.set('title', catalogTitle);
    }
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }, [selectedProductIds, products.length, catalogTitle]);

  const handleCopyShareLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // High-performance Isolated Print without browser freeze
  const handlePrint = () => {
    setIsPrinting(true);
    
    // Create an isolated printable HTML document in a hidden iframe for instant <50ms print preview
    const catalogElement = document.getElementById('printable-catalog');
    if (!catalogElement) {
      window.print();
      setIsPrinting(false);
      return;
    }

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const doc = printFrame.contentWindow?.document;
    if (!doc) {
      window.print();
      setIsPrinting(false);
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${catalogTitle} - ${company.companyName}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; color: #0f172a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            #printable-catalog { border: none !important; box-shadow: none !important; padding: 0 !important; width: 100% !important; }
            .catalog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }
            .catalog-item-card { break-inside: avoid !important; page-break-inside: avoid !important; border: 1px solid #cbd5e1; border-radius: 8px; overflow: hidden; background: #ffffff; display: flex; flex-direction: column; }
            .image-box { width: 100%; aspect-ratio: 4 / 5; background-color: #f1f5f9; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
            .image-box img { width: 100%; height: 100%; object-fit: cover; }
            .art-badge { position: absolute; top: 6px; left: 6px; background: rgba(15, 23, 42, 0.85); color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
            .details { padding: 10px; font-size: 11px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
            .price-tag { font-size: 14px; font-weight: 700; color: #059669; }
          </style>
        </head>
        <body>
          ${catalogElement.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printFrame.contentWindow?.focus();
      printFrame.contentWindow?.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
        setIsPrinting(false);
      }, 1000);
    }, 250);
  };

  const handleWhatsAppShare = () => {
    const lines = [
      `*${catalogTitle.toUpperCase()}*`,
      `*Company:* ${company.companyName}`,
      `*Catalogue Items:* ${selectedProducts.length} Articles\n`,
      `👉 *View & Order Online Lookbook:*`,
      `${shareableUrl}\n`
    ];

    selectedProducts.slice(0, 8).forEach((p, idx) => {
      lines.push(
        `${idx + 1}. *${p.name}* (Art #${p.articleNumber || p.sku || 'N/A'})` +
        (showPrices ? ` • Rate: *₹${p.sellingPrice.toLocaleString('en-IN')}*` : '') +
        (showMoq ? ` • MOQ: 12 pcs` : '')
      );
    });

    if (selectedProducts.length > 8) {
      lines.push(`...and ${selectedProducts.length - 8} more articles.`);
    }

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
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        fontFamily: 'var(--font-family, "Inter", -apple-system, sans-serif)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '14px',
          width: '100%',
          maxWidth: '1020px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header (Screen Only) */}
        <div
          className="no-print"
          style={{
            backgroundColor: '#f8fafc',
            padding: '14px 20px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-light, #eef2ff)',
                color: 'var(--accent-primary, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <BookOpen size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                Wholesale Product Catalog & Lookbook Generator
              </h3>
              <p style={{ margin: '1px 0 0', fontSize: '0.74rem', color: '#64748b' }}>
                Standard 4:5 fashion ratio • Share direct buyer link & 1-click print PDF
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Create / Copy Share Link Button */}
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              style={{
                padding: '7px 13px',
                borderRadius: '7px',
                border: '1px solid #c7d2fe',
                backgroundColor: '#eef2ff',
                color: '#4338ca',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <LinkIcon size={14} /> Create Share Link
            </button>

            {/* WhatsApp Broadcast */}
            <button
              type="button"
              onClick={handleWhatsAppShare}
              style={{
                padding: '7px 13px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#25D366',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <MessageSquare size={14} /> Send WhatsApp Broadcast
            </button>

            {/* Fast Print PDF */}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isPrinting}
              style={{
                padding: '7px 15px',
                borderRadius: '7px',
                border: 'none',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isPrinting ? 'wait' : 'pointer'
              }}
            >
              <Printer size={14} /> {isPrinting ? 'Preparing Print...' : 'Print / Save PDF'}
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Configuration Bar (Screen Only) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          {/* Row 1: Title & Display Checkboxes */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                Catalog Title / Heading
              </label>
              <input
                type="text"
                value={catalogTitle}
                onChange={e => setCatalogTitle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  color: '#0f172a'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap', paddingTop: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={showPrices} onChange={e => setShowPrices(e.target.checked)} />
                Wholesale Price
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
                <input type="checkbox" checked={showMoq} onChange={e => setShowMoq(e.target.checked)} />
                MOQ / Set Ratio
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.76rem', color: '#334155', cursor: 'pointer', fontWeight: 500 }}>
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
                style={{ padding: '3px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', width: '130px' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--accent-primary, #4f46e5)', fontWeight: 600 }}>
                {selectedProductIds.length} Selected
              </span>
              <button
                type="button"
                onClick={handleSelectAllFiltered}
                style={{ padding: '3px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Select Filtered
              </button>
              <button
                type="button"
                onClick={handleDeselectAll}
                style={{ padding: '3px 9px', borderRadius: '5px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 500 }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Printable Catalog Preview Canvas */}
        <div style={{ padding: '24px', overflowY: 'auto', backgroundColor: '#f1f5f9' }}>
          
          {/* Official Printable Lookbook Page */}
          <div
            id="printable-catalog"
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '28px',
              color: '#0f172a',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
            }}
          >
            {/* Catalog Letterhead Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '14px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                  {company.companyName}
                </h1>
                <p style={{ margin: '3px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                  {company.address} • Phone/WhatsApp: <strong>{company.mobile}</strong>
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div
                  style={{
                    display: 'inline-block',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#334155',
                    fontWeight: 600,
                    fontSize: '0.78rem',
                    textTransform: 'uppercase'
                  }}
                >
                  Wholesale Lookbook
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px' }}>
                  Updated: {new Date().toLocaleDateString('en-IN')}
                </div>
              </div>
            </div>

            {/* Catalog Big Title */}
            <div style={{ textAlign: 'center', marginBottom: '22px' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px' }}>
                {catalogTitle}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Exclusively for Authorized Retailers & Wholesale Buyers
              </span>
            </div>

            {/* Products Grid (4:5 Ratio Fashion Lookbook) */}
            {selectedProducts.length > 0 ? (
              <div
                className="catalog-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                  gap: '18px',
                  marginBottom: '26px'
                }}
              >
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
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
                      }}
                    >
                      {/* 4:5 ASPECT RATIO IMAGE CONTAINER */}
                      <div
                        className="image-box"
                        style={{
                          width: '100%',
                          aspectRatio: '4 / 5',
                          backgroundColor: '#f1f5f9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          position: 'relative',
                          overflow: 'hidden'
                        }}
                      >
                        {imageSrc ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageSrc}
                            alt={product.name}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block'
                            }}
                          />
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                            <ImageIcon size={34} />
                            <span style={{ fontSize: '0.72rem', marginTop: '4px', fontWeight: 500 }}>4:5 Garment Photo</span>
                          </div>
                        )}

                        {/* Article Number Badge */}
                        <div
                          className="art-badge"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            backgroundColor: 'rgba(15, 23, 42, 0.85)',
                            color: '#ffffff',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            letterSpacing: '0.3px',
                            backdropFilter: 'blur(3px)'
                          }}
                        >
                          Art #{product.articleNumber || product.sku || 'N/A'}
                        </div>
                      </div>

                      {/* Product Details */}
                      <div className="details" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>
                          {product.name}
                        </div>

                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Category: <span style={{ color: '#334155', fontWeight: 500 }}>{product.category || 'Apparel'}</span>
                        </div>

                        {showSpecs && (
                          <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.35, backgroundColor: '#f8fafc', padding: '6px 8px', borderRadius: '6px' }}>
                            {product.fabric && <div>Fabric: <strong style={{ color: '#334155' }}>{product.fabric}</strong></div>}
                            <div>Sizes: <strong style={{ color: '#334155' }}>S, M, L, XL, XXL (Set Ratio)</strong></div>
                          </div>
                        )}

                        {/* Price & MOQ Footer */}
                        <div style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                          {showPrices ? (
                            <div>
                              <span style={{ fontSize: '0.65rem', color: '#64748b', display: 'block' }}>Wholesale Rate</span>
                              <span className="price-tag" style={{ fontSize: '1.05rem', fontWeight: 700, color: '#059669' }}>
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
            <div
              style={{
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
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#0f172a' }}>How to Place an Order:</div>
                <div style={{ color: '#64748b' }}>Send Article Numbers & quantities via WhatsApp to <strong>{company.mobile}</strong></div>
              </div>

              <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.72rem' }}>
                Delivery across India via Transport • Fast Dispatch
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ─── DIRECT CUSTOMER SHARE LINK MODAL ─── */}
      {showShareModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000000,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowShareModal(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '520px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              border: '1px solid #e2e8f0'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#eef2ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share2 size={16} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#0f172a' }}>
                    Share Direct Lookbook Link
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748b' }}>
                    Send this live link to retailers & wholesale buyers
                  </p>
                </div>
              </div>

              <button onClick={() => setShowShareModal(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {/* Direct Link Input Box */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                CUSTOMER SHAREABLE LINK
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  readOnly
                  value={shareableUrl}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '0.8rem',
                    backgroundColor: '#f8fafc',
                    color: '#0f172a',
                    fontWeight: 500
                  }}
                />
                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: copiedLink ? '#059669' : 'var(--accent-primary, #4f46e5)',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'background-color 0.2s ease'
                  }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  {copiedLink ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
              {copiedLink && (
                <div style={{ fontSize: '0.74rem', color: '#059669', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Link copied to clipboard! Ready to paste and send.
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={16} /> Share on WhatsApp
              </button>

              <a
                href={shareableUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontSize: '0.82rem',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <ExternalLink size={14} /> Open Lookbook
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ─── ISOLATED HIGH-PERFORMANCE PRINT STYLES ─── */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
          body * {
            visibility: hidden !important;
          }
          #printable-catalog, #printable-catalog * {
            visibility: visible !important;
          }
          #printable-catalog {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
          }
          .no-print {
            display: none !important;
          }
          .catalog-grid {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
          }
          .catalog-item-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
          }
          .image-box {
            aspect-ratio: 4 / 5 !important;
          }
        }
      `}} />
    </div>
  );
}
