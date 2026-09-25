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
  CheckCircle2,
  Loader2
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

  // Layout density: 4 (2x2) or 6 (3x2) items per page (defaults to 4 per page)
  const [itemsPerPage, setItemsPerPage] = useState<'4' | '6'>('4');

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

  // Clean up any background print frame on unmount
  React.useEffect(() => {
    return () => {
      const existingFrame = document.getElementById('catalog-print-frame');
      if (existingFrame) existingFrame.remove();
    };
  }, []);

  // Chunk selected products into exact pages so every page has at least 4 items (2x2 or 3x2)
  const pages = useMemo(() => {
    const size = itemsPerPage === '6' ? 6 : 4;
    const chunks: Product[][] = [];
    for (let i = 0; i < selectedProducts.length; i += size) {
      chunks.push(selectedProducts.slice(i, i + size));
    }
    return chunks;
  }, [selectedProducts, itemsPerPage]);

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

  // High-performance Isolated Print with Direct DOM Injection (Zero UI Freeze, Fast Preview)
  const handlePrint = () => {
    if (isPrinting) return;
    setIsPrinting(true);

    // Yield execution to next tick so React paints the "Preparing Print..." button state immediately
    setTimeout(async () => {
      try {
        const catalogElement = document.getElementById('printable-catalog');
        if (!catalogElement) {
          window.print();
          setIsPrinting(false);
          return;
        }

        // 1. Create/re-create an isolated iframe with standard A4 dimensions (prevents Chromium 0x0 layout stall)
        let printFrame = document.getElementById('catalog-print-frame') as HTMLIFrameElement;
        if (printFrame) {
          printFrame.remove();
        }
        printFrame = document.createElement('iframe');
        printFrame.id = 'catalog-print-frame';
        printFrame.style.position = 'fixed';
        printFrame.style.top = '0';
        printFrame.style.left = '0';
        printFrame.style.width = '210mm';
        printFrame.style.height = '297mm';
        printFrame.style.border = 'none';
        printFrame.style.opacity = '0';
        printFrame.style.pointerEvents = 'none';
        printFrame.style.zIndex = '-99999';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);

        const doc = printFrame.contentWindow?.document;
        if (!doc) {
          window.print();
          setIsPrinting(false);
          return;
        }

        // 2. Write minimal HTML shell with print styles (fast string with ZERO large Base64 images!)
        doc.open();
        doc.write(`<!DOCTYPE html>
<html>
  <head>
    <title>${catalogTitle} - ${company.companyName}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 8mm;
      }
      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        margin: 0;
        padding: 0;
        color: #0f172a;
        background: #ffffff;
      }
      #printable-catalog {
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
        width: 100% !important;
        background: transparent !important;
      }
      .catalog-page-container {
        width: 100%;
        page-break-after: always !important;
        break-after: page !important;
        display: flex;
        flex-direction: column;
        min-height: calc(297mm - 18mm);
        justify-content: space-between;
        padding: 4px 0 !important;
        margin-bottom: 0 !important;
        border-bottom: none !important;
      }
      .catalog-page-container:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      .catalog-grid-2x2 {
        display: grid !important;
        grid-template-columns: repeat(2, 1fr) !important;
        gap: 12px !important;
        margin-bottom: 10px !important;
      }
      .catalog-grid-3x2 {
        display: grid !important;
        grid-template-columns: repeat(3, 1fr) !important;
        gap: 10px !important;
        margin-bottom: 8px !important;
      }
      .catalog-item-card {
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        overflow: hidden;
        background: #ffffff;
        display: flex;
        flex-direction: column;
      }
      .image-box {
        width: 100%;
        aspect-ratio: 4 / 5 !important;
        background-color: #f1f5f9;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
      }
      .catalog-grid-2x2 .image-box {
        max-height: 310px !important;
      }
      .catalog-grid-3x2 .image-box {
        max-height: 270px !important;
      }
      .image-box img {
        width: 100%;
        height: 100%;
        object-fit: cover !important;
        display: block !important;
      }
      .art-badge {
        position: absolute;
        top: 6px;
        left: 6px;
        background: rgba(15, 23, 42, 0.88);
        color: #ffffff;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
      }
      .details {
        padding: 8px 10px;
        font-size: 11px;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .price-tag {
        font-size: 13px;
        font-weight: 700;
        color: #059669;
      }
      .no-print {
        display: none !important;
      }
    </style>
  </head>
  <body></body>
</html>`);
        doc.close();

        // 3. Clone catalog element directly into iframe body (instant native DOM pointer clone, ZERO string serialization!)
        const clonedCatalog = catalogElement.cloneNode(true) as HTMLElement;
        clonedCatalog.querySelectorAll('img').forEach(img => {
          img.setAttribute('loading', 'eager');
          img.setAttribute('decoding', 'async');
        });
        doc.body.appendChild(clonedCatalog);

        // 4. Quick non-blocking decode check (if images already rendered, takes 0ms)
        const iframeImgs = Array.from(doc.images);
        const unreadyImgs = iframeImgs.filter(img => !img.complete || img.naturalWidth === 0);
        if (unreadyImgs.length > 0) {
          await Promise.race([
            Promise.all(unreadyImgs.map(img => img.decode().catch(() => {}))),
            new Promise(resolve => setTimeout(resolve, 300))
          ]);
        }

        // 5. Trigger print preview smoothly without UI thread freeze
        requestAnimationFrame(() => {
          setTimeout(() => {
            try {
              printFrame.contentWindow?.focus();
              printFrame.contentWindow?.print();
            } catch (err) {
              console.error('Print trigger failed:', err);
              window.print();
            } finally {
              setIsPrinting(false);
            }
          }, 50);
        });
      } catch (err) {
        console.error('Failed to prepare print preview:', err);
        setIsPrinting(false);
      }
    }, 40);
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
        fontFamily: 'var(--font-family, "Outfit", -apple-system, sans-serif)'
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
                backgroundColor: isPrinting ? '#334155' : '#0f172a',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isPrinting ? 'wait' : 'pointer',
                opacity: isPrinting ? 0.85 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              {isPrinting ? (
                <>
                  <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Preparing Print...
                </>
              ) : (
                <>
                  <Printer size={14} /> Print / Save PDF
                </>
              )}
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
              {/* Page Density Toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Layout:
                </span>
                <div style={{ display: 'flex', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setItemsPerPage('4')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      backgroundColor: itemsPerPage === '4' ? '#0f172a' : '#f8fafc',
                      color: itemsPerPage === '4' ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    4 / Page (2×2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemsPerPage('6')}
                    style={{
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      border: 'none',
                      borderLeft: '1px solid #cbd5e1',
                      backgroundColor: itemsPerPage === '6' ? '#0f172a' : '#f8fafc',
                      color: itemsPerPage === '6' ? '#ffffff' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    6 / Page (3×2)
                  </button>
                </div>
              </div>

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
            {pages.length > 0 ? (
              pages.map((pageProducts, pageIdx) => {
                const isFirstPage = pageIdx === 0;
                const isLastPage = pageIdx === pages.length - 1;

                return (
                  <div
                    key={pageIdx}
                    className="catalog-page-container"
                    style={{
                      pageBreakAfter: isLastPage ? 'auto' : 'always',
                      breakAfter: isLastPage ? 'auto' : 'page',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      minHeight: '850px',
                      marginBottom: isLastPage ? '0' : '36px',
                      paddingBottom: isLastPage ? '0' : '28px',
                      borderBottom: isLastPage ? 'none' : '2px dashed #cbd5e1'
                    }}
                  >
                    {/* Top Header */}
                    {isFirstPage ? (
                      <div>
                        {/* Catalog Letterhead Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0f172a', paddingBottom: '12px', marginBottom: '16px' }}>
                          <div>
                            <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.01em' }}>
                              {company.companyName}
                            </h1>
                            <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b' }}>
                              {company.address} • Phone/WhatsApp: <strong>{company.mobile}</strong>
                            </p>
                          </div>

                          <div style={{ textAlign: 'right' }}>
                            <div
                              style={{
                                display: 'inline-block',
                                padding: '3px 9px',
                                borderRadius: '6px',
                                backgroundColor: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                color: '#334155',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                textTransform: 'uppercase'
                              }}
                            >
                              Wholesale Lookbook
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '3px' }}>
                              Updated: {new Date().toLocaleDateString('en-IN')}
                            </div>
                          </div>
                        </div>

                        {/* Catalog Big Title */}
                        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                          <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', letterSpacing: '0.5px' }}>
                            {catalogTitle}
                          </h2>
                          <span style={{ fontSize: '0.73rem', color: '#64748b' }}>
                            Exclusively for Authorized Retailers & Wholesale Buyers
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Running Header for Page 2+ */
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cbd5e1', paddingBottom: '8px', marginBottom: '16px' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>
                          {company.companyName} <span style={{ fontWeight: 400, color: '#64748b' }}>• {catalogTitle}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                          Page {pageIdx + 1} of {pages.length}
                        </div>
                      </div>
                    )}

                    {/* Products Grid (4:5 Ratio Fashion Lookbook) */}
                    <div
                      className={itemsPerPage === '6' ? 'catalog-grid-3x2' : 'catalog-grid-2x2'}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: itemsPerPage === '6' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                        gap: itemsPerPage === '6' ? '12px' : '16px',
                        marginBottom: '16px',
                        flex: 1
                      }}
                    >
                      {pageProducts.map(product => {
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
                              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                              maxWidth: itemsPerPage === '6' ? '240px' : '310px',
                              margin: '0 auto',
                              width: '100%'
                            }}
                          >
                            {/* 4:5 ASPECT RATIO IMAGE CONTAINER */}
                            <div
                              className="image-box"
                              style={{
                                width: '100%',
                                aspectRatio: '4 / 5',
                                maxHeight: itemsPerPage === '6' ? '250px' : '295px',
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
                                  loading="eager"
                                  decoding="async"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                />
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#94a3b8' }}>
                                  <ImageIcon size={30} />
                                  <span style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: 500 }}>4:5 Garment Photo</span>
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
                            <div className="details" style={{ padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {product.name}
                              </div>

                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                Category: <span style={{ color: '#334155', fontWeight: 500 }}>{product.category || 'Apparel'}</span>
                              </div>

                              {showSpecs && (
                                <div style={{ fontSize: '0.68rem', color: '#64748b', lineHeight: 1.3, backgroundColor: '#f8fafc', padding: '4px 6px', borderRadius: '5px' }}>
                                  {product.fabric && <div>Fabric: <strong style={{ color: '#334155' }}>{product.fabric}</strong></div>}
                                  <div>Sizes: <strong style={{ color: '#334155' }}>S, M, L, XL, XXL (Set Ratio)</strong></div>
                                </div>
                              )}

                              {/* Price & MOQ Footer */}
                              <div style={{ marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                {showPrices ? (
                                  <div>
                                    <span style={{ fontSize: '0.62rem', color: '#64748b', display: 'block' }}>Wholesale Rate</span>
                                    <span className="price-tag" style={{ fontSize: '0.98rem', fontWeight: 700, color: '#059669' }}>
                                      ₹{product.sellingPrice.toLocaleString('en-IN')}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 500 }}>Inquire for Rates</span>
                                )}

                                {showMoq && (
                                  <span style={{ fontSize: '0.65rem', color: '#64748b', backgroundColor: '#f8fafc', padding: '2px 5px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                                    MOQ: 12 pcs
                                  </span>
                                )}
                              </div>

                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Page Footer */}
                    {isLastPage ? (
                      /* Catalog Footer: Ordering CTA */
                      <div
                        style={{
                          backgroundColor: '#f8fafc',
                          padding: '10px 16px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          gap: '8px',
                          fontSize: '0.75rem',
                          marginTop: 'auto'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>How to Place an Order:</div>
                          <div style={{ color: '#64748b' }}>Send Article Numbers & quantities via WhatsApp to <strong>{company.mobile}</strong></div>
                        </div>

                        <div style={{ textAlign: 'right', color: '#64748b', fontSize: '0.7rem' }}>
                          Page {pageIdx + 1} of {pages.length} • Delivery across India via Transport
                        </div>
                      </div>
                    ) : (
                      /* Intermediate Page Footer */
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          borderTop: '1px solid #e2e8f0',
                          paddingTop: '6px',
                          marginTop: 'auto',
                          fontSize: '0.7rem',
                          color: '#94a3b8'
                        }}
                      >
                        <span>For wholesale orders & samples: {company.mobile}</span>
                        <span>Page {pageIdx + 1} of {pages.length}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '36px', textAlign: 'center', color: '#94a3b8' }}>
                No products selected for the catalog. Please select products from the options bar above.
              </div>
            )}

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
          .catalog-page-container {
            width: 100% !important;
            page-break-after: always !important;
            break-after: page !important;
            min-height: 98vh !important;
            max-height: 100vh !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: 2px 0 !important;
            border-bottom: none !important;
            margin-bottom: 0 !important;
          }
          .catalog-page-container:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .catalog-grid-2x2 {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 10px !important;
          }
          .catalog-grid-3x2 {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 10px !important;
            margin-bottom: 8px !important;
          }
          .catalog-item-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            overflow: hidden !important;
            background: #ffffff !important;
            display: flex !important;
            flex-direction: column !important;
          }
          .image-box {
            width: 100% !important;
            aspect-ratio: 4 / 5 !important;
            background-color: #f1f5f9 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            position: relative !important;
            overflow: hidden !important;
          }
          .catalog-grid-2x2 .image-box {
            max-height: 295px !important;
          }
          .catalog-grid-3x2 .image-box {
            max-height: 250px !important;
          }
          .image-box img {
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            display: block !important;
          }
          .art-badge {
            position: absolute !important;
            top: 6px !important;
            left: 6px !important;
            background: rgba(15, 23, 42, 0.88) !important;
            color: #ffffff !important;
            padding: 2px 6px !important;
            border-radius: 4px !important;
            font-size: 10px !important;
            font-weight: 700 !important;
          }
          .details {
            padding: 8px 10px !important;
            font-size: 11px !important;
          }
          .price-tag {
            font-size: 13px !important;
            font-weight: 700 !important;
            color: #059669 !important;
          }
        }
      `}} />
    </div>
  );
}
