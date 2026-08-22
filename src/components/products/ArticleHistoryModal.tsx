"use client";

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Calendar,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Package,
  FileCheck2,
  Receipt,
  Truck,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle,
  Clock,
  User,
  Building,
  Image as ImageIcon,
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';
import { getArticleTransactionHistory, getAllArticlesForSelector } from '@/app/actions/productActions';
import { adjustInventory } from '@/app/actions/inventoryActions';
import * as XLSX from 'xlsx';
import '@/components/ui/modal.css';

interface ArticleHistoryModalProps {
  initialArticleOrId?: string;
  onClose: () => void;
  productsList?: Array<{
    id: string;
    name: string;
    sku: string | null;
    articleNumber: string | null;
    category?: string | null;
    stockQuantity?: number;
    sellingPrice?: number;
    images?: string[];
  }>;
}

export default function ArticleHistoryModal({
  initialArticleOrId = '',
  onClose,
  productsList = []
}: ArticleHistoryModalProps) {
  const [selectedIdentifier, setSelectedIdentifier] = useState<string>(initialArticleOrId);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');
  
  // Tabs: 'timeline' | 'quotations' | 'invoices' | 'adjustments' | 'purchases' | 'images'
  const [activeTab, setActiveTab] = useState<'timeline' | 'quotations' | 'invoices' | 'adjustments' | 'purchases' | 'images'>('timeline');

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  // Quick Switcher search
  const [allProducts, setAllProducts] = useState<any[]>(productsList);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);

  // Quick Stock Adjustment Form
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'IN' | 'OUT'>('IN');
  const [adjustQty, setAdjustQty] = useState('1');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [adjustLoading, setAdjustLoading] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  // Lightbox preview for images
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);

  // Fetch articles for switcher if not passed
  useEffect(() => {
    if (allProducts.length === 0) {
      getAllArticlesForSelector().then(res => {
        if (res.success && res.products) {
          setAllProducts(res.products);
          if (!selectedIdentifier && res.products.length > 0) {
            setSelectedIdentifier(res.products[0].articleNumber || res.products[0].sku || res.products[0].id);
          }
        }
      });
    }
  }, [allProducts.length, selectedIdentifier]);

  // Load article transaction history
  const loadHistory = async (identifier: string) => {
    if (!identifier) return;
    setLoading(true);
    setError('');
    const res = await getArticleTransactionHistory(identifier, {
      startDate: startDate || undefined,
      endDate: endDate || undefined
    });

    if (res.error) {
      setError(res.error);
      setData(null);
    } else {
      setData(res);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedIdentifier) {
      loadHistory(selectedIdentifier);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIdentifier, startDate, endDate]);

  // Filtered timeline
  const filteredTimeline = useMemo(() => {
    if (!data?.timeline) return [];
    if (!searchFilter.trim()) return data.timeline;
    const q = searchFilter.toLowerCase();
    return data.timeline.filter((item: any) =>
      (item.title || '').toLowerCase().includes(q) ||
      (item.docNumber || '').toLowerCase().includes(q) ||
      (item.party || '').toLowerCase().includes(q) ||
      (item.notes || '').toLowerCase().includes(q) ||
      (item.status || '').toLowerCase().includes(q)
    );
  }, [data?.timeline, searchFilter]);

  // Filtered quotations
  const filteredQuotations = useMemo(() => {
    if (!data?.quotationItems) return [];
    if (!searchFilter.trim()) return data.quotationItems;
    const q = searchFilter.toLowerCase();
    return data.quotationItems.filter((item: any) =>
      (item.quotation?.quotationNumber || '').toLowerCase().includes(q) ||
      (item.quotation?.customer?.businessName || '').toLowerCase().includes(q) ||
      (item.quotation?.customer?.contactPerson || '').toLowerCase().includes(q) ||
      (item.quotation?.status || '').toLowerCase().includes(q)
    );
  }, [data?.quotationItems, searchFilter]);

  // Filtered orders & invoices
  const filteredOrders = useMemo(() => {
    if (!data?.orderItems) return [];
    if (!searchFilter.trim()) return data.orderItems;
    const q = searchFilter.toLowerCase();
    return data.orderItems.filter((item: any) =>
      (item.order?.orderNumber || '').toLowerCase().includes(q) ||
      (item.order?.invoices?.[0]?.invoiceNumber || '').toLowerCase().includes(q) ||
      (item.order?.customer?.businessName || '').toLowerCase().includes(q) ||
      (item.order?.customer?.contactPerson || '').toLowerCase().includes(q) ||
      (item.order?.orderStatus || '').toLowerCase().includes(q) ||
      (item.order?.invoices?.[0]?.status || '').toLowerCase().includes(q)
    );
  }, [data?.orderItems, searchFilter]);

  // Filtered stock adjustments
  const filteredAdjustments = useMemo(() => {
    if (!data?.inventoryTransactions) return [];
    if (!searchFilter.trim()) return data.inventoryTransactions;
    const q = searchFilter.toLowerCase();
    return data.inventoryTransactions.filter((item: any) =>
      (item.reference || '').toLowerCase().includes(q) ||
      (item.notes || '').toLowerCase().includes(q) ||
      (item.employee?.user?.name || '').toLowerCase().includes(q) ||
      (item.warehouse?.name || '').toLowerCase().includes(q) ||
      (item.type || '').toLowerCase().includes(q)
    );
  }, [data?.inventoryTransactions, searchFilter]);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    if (!data?.purchaseOrderItems) return [];
    if (!searchFilter.trim()) return data.purchaseOrderItems;
    const q = searchFilter.toLowerCase();
    return data.purchaseOrderItems.filter((item: any) =>
      (item.purchaseOrder?.poNumber || '').toLowerCase().includes(q) ||
      (item.purchaseOrder?.vendor?.companyName || '').toLowerCase().includes(q) ||
      (item.purchaseOrder?.status || '').toLowerCase().includes(q)
    );
  }, [data?.purchaseOrderItems, searchFilter]);

  // Quick switch products filter
  const switcherList = useMemo(() => {
    if (!switcherSearch.trim()) return allProducts;
    const q = switcherSearch.toLowerCase();
    return allProducts.filter(p =>
      (p.name || '').toLowerCase().includes(q) ||
      (p.sku || '').toLowerCase().includes(q) ||
      (p.articleNumber || '').toLowerCase().includes(q)
    );
  }, [allProducts, switcherSearch]);

  // Handle quick stock adjustment
  const handleQuickAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.product) return;
    const qty = parseInt(adjustQty, 10);
    if (isNaN(qty) || qty <= 0) return;

    setAdjustLoading(true);
    setAdjustSuccessMsg('');

    const targetKey = data.product.articleNumber || data.product.sku || data.product.id;
    const res = await adjustInventory(targetKey, qty, adjustType, adjustNotes || `Quick Adjustment in Article History`);

    setAdjustLoading(false);
    if (res.success) {
      setAdjustSuccessMsg(`✓ Successfully ${adjustType === 'IN' ? 'added' : 'deducted'} ${qty} units!`);
      setTimeout(() => {
        setShowAdjustModal(false);
        setAdjustSuccessMsg('');
        setAdjustNotes('');
        loadHistory(selectedIdentifier);
      }, 1000);
    } else {
      alert(res.error || "Failed to adjust stock");
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!data?.product) return;
    const productName = data.product.name;
    const article = data.product.articleNumber || data.product.sku || 'Article';

    // Sheet 1: Summary KPIs
    const summaryData = [
      { Metric: "Product Name", Value: data.product.name },
      { Metric: "SKU", Value: data.product.sku || '-' },
      { Metric: "Article Number", Value: data.product.articleNumber || '-' },
      { Metric: "Category", Value: data.product.category || '-' },
      { Metric: "HSN Code", Value: data.product.hsnCode || '-' },
      { Metric: "Selling Price (₹)", Value: data.product.sellingPrice },
      { Metric: "Current In-Stock", Value: data.kpis.currentStock },
      { Metric: "Total Invoiced / Sold Qty", Value: data.kpis.totalInvoicedQty },
      { Metric: "Total Quoted Qty", Value: data.kpis.totalQuotedQty },
      { Metric: "Active Quoted Qty", Value: data.kpis.activeQuotedQty },
      { Metric: "Converted Quoted Qty", Value: data.kpis.convertedQuotedQty },
      { Metric: "Total Stock In Qty", Value: data.kpis.stockInTransactionsQty },
      { Metric: "Total Stock Out Qty", Value: data.kpis.stockOutTransactionsQty },
      { Metric: "Total PO Qty (Ordered)", Value: data.kpis.totalPOQty },
      { Metric: "Total PO Qty (Received)", Value: data.kpis.totalPOReceivedQty }
    ];

    // Sheet 2: Unified Timeline
    const timelineData = data.timeline.map((item: any) => ({
      Date: new Date(item.date).toLocaleString(),
      Type: item.type,
      Source: item.source,
      Title: item.title,
      'Doc / Ref No.': item.docNumber || '-',
      'Customer / Vendor / Employee': item.party || '-',
      Quantity: item.quantity,
      'Unit Rate (₹)': item.rate || '-',
      'Total (₹)': item.total || '-',
      Status: item.status || '-',
      Notes: item.notes || '-'
    }));

    // Sheet 3: Quotations
    const quotesData = data.quotationItems.map((qi: any) => ({
      'Quotation No.': qi.quotation?.quotationNumber,
      Date: new Date(qi.quotation?.date).toLocaleDateString(),
      Customer: qi.quotation?.customer?.businessName || qi.quotation?.customer?.contactPerson,
      'Quoted Qty': qi.quantity,
      'Unit Rate (₹)': qi.rate,
      'Taxable Amount (₹)': qi.taxableAmount,
      'Total Amount (₹)': qi.total,
      Status: qi.quotation?.status
    }));

    // Sheet 4: Invoices & Orders
    const ordersData = data.orderItems.map((oi: any) => ({
      'Order No.': oi.order?.orderNumber,
      'Invoice No.': oi.order?.invoices?.[0]?.invoiceNumber || 'Pending Invoice',
      Date: new Date(oi.order?.orderDate).toLocaleDateString(),
      Customer: oi.order?.customer?.businessName || oi.order?.customer?.contactPerson,
      'Ordered Qty': oi.quantity,
      'Unit Rate (₹)': oi.rate,
      'Total Amount (₹)': oi.total,
      'Order Status': oi.order?.orderStatus,
      'Invoice Status': oi.order?.invoices?.[0]?.status || '-'
    }));

    const workbook = XLSX.utils.book_new();
    const s1 = XLSX.utils.json_to_sheet(summaryData);
    const s2 = XLSX.utils.json_to_sheet(timelineData);
    const s3 = XLSX.utils.json_to_sheet(quotesData);
    const s4 = XLSX.utils.json_to_sheet(ordersData);

    XLSX.utils.book_append_sheet(workbook, s1, "Summary KPIs");
    XLSX.utils.book_append_sheet(workbook, s2, "Full Timeline");
    XLSX.utils.book_append_sheet(workbook, s3, "Quotations");
    XLSX.utils.book_append_sheet(workbook, s4, "Invoices & Orders");

    XLSX.writeFile(workbook, `Article_History_${article}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export to Print / PDF
  const handlePrintPDF = () => {
    if (!data?.product) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const p = data.product;
    const k = data.kpis;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Article Transaction Statement - ${p.articleNumber || p.sku}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #0f172a; }
            .header { border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
            .title { font-size: 20px; font-weight: 800; color: #1e1b4b; margin: 0; }
            .meta { font-size: 13px; color: #64748b; margin-top: 4px; }
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; }
            .kpi-title { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            .kpi-value { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
            th { background-color: #f1f5f9; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; font-weight: 700; }
            td { padding: 8px 10px; border: 1px solid #e2e8f0; }
            tr:nth-child(even) { background-color: #fafafa; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
            .badge-in { background: #dcfce7; color: #166534; }
            .badge-out { background: #fee2e2; color: #991b1b; }
            .badge-quote { background: #fef3c7; color: #92400e; }
            .badge-order { background: #dbeafe; color: #1e40af; }
            @media print { @page { margin: 1cm; size: landscape; } }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${p.name}</h1>
            <div class="meta">
              <strong>Article No:</strong> ${p.articleNumber || '-'} | <strong>SKU:</strong> ${p.sku || '-'} | <strong>Category:</strong> ${p.category || '-'} | <strong>HSN:</strong> ${p.hsnCode || '-'} | <strong>Price:</strong> ₹${p.sellingPrice}
            </div>
            <div class="meta">Statement Generated on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Current In-Stock</div>
              <div class="kpi-value" style="color: #10b981;">${k.currentStock} pcs</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Invoiced / Sold Qty</div>
              <div class="kpi-value" style="color: #3b82f6;">${k.totalInvoicedQty} pcs</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Quoted Qty</div>
              <div class="kpi-value" style="color: #f59e0b;">${k.totalQuotedQty} pcs</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Total Stock In / Out</div>
              <div class="kpi-value">+${k.stockInTransactionsQty} / -${k.stockOutTransactionsQty}</div>
            </div>
          </div>

          <h3 style="margin-bottom: 8px; font-size: 15px;">Transaction & Usage History</h3>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Doc / Ref #</th>
                <th>Customer / Vendor / Employee</th>
                <th>Qty</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              ${data.timeline.map((item: any) => `
                <tr>
                  <td>${new Date(item.date).toLocaleDateString()}</td>
                  <td><span class="badge ${item.source === 'QUOTATION' ? 'badge-quote' : item.source === 'INVOICE_ORDER' ? 'badge-order' : (item.type === 'IN' ? 'badge-in' : 'badge-out')}">${item.source}</span></td>
                  <td><strong>${item.docNumber || '-'}</strong></td>
                  <td>${item.party || '-'}</td>
                  <td><strong>${item.type === 'IN' ? '+' : (item.type === 'OUT' ? '-' : '')}${item.quantity}</strong></td>
                  <td>${item.status || '-'}</td>
                  <td>${item.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="modal-backdrop" style={{ zIndex: 9999 }}>
      <div
        className="modal-content glass-panel animate-in"
        style={{
          maxWidth: '1200px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff'
        }}
      >
        {/* ─── MODAL TOP HEADER ─── */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          backgroundColor: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          
          {/* Article Info & Quick Switcher Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '10px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
              <Layers size={22} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {data?.product?.name || 'Article Transaction & Usage History'}
                </h2>
                
                {/* Switcher Button */}
                <button
                  type="button"
                  onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Switch Article <ChevronDown size={12} />
                </button>
              </div>

              {/* Subtitle / Article Details */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '2px', fontSize: '0.8rem', color: '#64748b' }}>
                <span>Article: <strong style={{ color: '#0f172a' }}>{data?.product?.articleNumber || '-'}</strong></span>
                <span>•</span>
                <span>SKU: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{data?.product?.sku || '-'}</strong></span>
                <span>•</span>
                <span>Category: <strong style={{ color: '#0f172a' }}>{data?.product?.category || '-'}</strong></span>
                <span>•</span>
                <span>Price: <strong style={{ color: '#10b981' }}>₹{data?.product?.sellingPrice?.toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Switcher Dropdown Popover */}
            {isSwitcherOpen && (
              <div style={{
                position: 'absolute',
                top: '52px',
                left: 0,
                width: '340px',
                maxHeight: '380px',
                backgroundColor: '#ffffff',
                borderRadius: '10px',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search article, SKU or name..."
                      value={switcherSearch}
                      onChange={(e) => setSwitcherSearch(e.target.value)}
                      autoFocus
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                <div style={{ overflowY: 'auto', flex: 1, padding: '4px' }}>
                  {switcherList.map((p) => {
                    const identifier = p.articleNumber || p.sku || p.id;
                    const isSelected = selectedIdentifier === identifier || selectedIdentifier === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedIdentifier(identifier);
                          setIsSwitcherOpen(false);
                          setSwitcherSearch('');
                        }}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'background-color 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{p.name}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {p.articleNumber ? `Art: ${p.articleNumber}` : ''} {p.sku ? `• SKU: ${p.sku}` : ''}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: (p.stockQuantity ?? 0) > 10 ? '#16a34a' : '#dc2626'
                          }}>
                            {p.stockQuantity ?? 0} pcs
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons: Quick Stock Adjust, Export, Close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setShowAdjustModal(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#4f46e5',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(79, 70, 229, 0.2)'
              }}
            >
              <Plus size={14} /> Quick Stock In / Out
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!data?.product}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#166534',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Download Excel Report"
            >
              <FileSpreadsheet size={15} /> Excel
            </button>

            <button
              onClick={handlePrintPDF}
              disabled={!data?.product}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#fff',
                color: '#991b1b',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
              title="Print PDF Report"
            >
              <FileText size={15} /> Print / PDF
            </button>

            <button
              onClick={onClose}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                backgroundColor: '#fff',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ─── QUICK STOCK ADJUST POPUP MODAL ─── */}
        {showAdjustModal && (
          <div style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              maxWidth: '450px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
                  Quick Stock Adjustment
                </h3>
                <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={18} />
                </button>
              </div>

              {adjustSuccessMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 600 }}>
                  {adjustSuccessMsg}
                </div>
              )}

              <form onSubmit={handleQuickAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Movement Type
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setAdjustType('IN')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: adjustType === 'IN' ? '2px solid #16a34a' : '1px solid #cbd5e1',
                        backgroundColor: adjustType === 'IN' ? '#f0fdf4' : '#fff',
                        color: adjustType === 'IN' ? '#166534' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowDownLeft size={16} /> Stock In (Add)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('OUT')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: adjustType === 'OUT' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: adjustType === 'OUT' ? '#fef2f2' : '#fff',
                        color: adjustType === 'OUT' ? '#991b1b' : '#64748b',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer'
                      }}
                    >
                      <ArrowUpRight size={16} /> Stock Out (Deduct)
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                    Reference / Reason / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quotation sample, physical audit count..."
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#fff',
                      color: '#475569',
                      fontSize: '0.85rem',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustLoading}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: adjustType === 'IN' ? '#16a34a' : '#dc2626',
                      color: '#fff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      cursor: adjustLoading ? 'default' : 'pointer'
                    }}
                  >
                    {adjustLoading ? 'Updating...' : `Confirm ${adjustType === 'IN' ? 'Stock In' : 'Stock Out'}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ─── BODY SCROLLABLE CONTAINER ─── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 12px auto', color: '#4f46e5' }} />
              <p style={{ margin: 0, fontWeight: 600 }}>Loading article transaction history...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', color: '#991b1b' }}>
              <p style={{ fontWeight: 700, margin: 0 }}>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* ─── KPI METRICS CARDS STRIP ─── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px'
              }}>
                {/* In Stock */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #10b981'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Current In-Stock</span>
                    <Package size={16} color="#10b981" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', marginTop: '6px' }}>
                    {data.kpis.currentStock} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                    {data.kpis.currentStock > data.product.minimumStock ? 'Healthy Stock' : 'Low Stock Alert'}
                  </div>
                </div>

                {/* Invoiced / Sold */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Invoiced / Sold Qty</span>
                    <Receipt size={16} color="#3b82f6" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#1e40af', marginTop: '6px' }}>
                    {data.kpis.totalInvoicedQty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Across {data.kpis.totalOrdersCount} orders / invoices
                  </div>
                </div>

                {/* Quoted Qty */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #f59e0b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Quoted in Quotes</span>
                    <FileCheck2 size={16} color="#f59e0b" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b45309', marginTop: '6px' }}>
                    {data.kpis.totalQuotedQty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    {data.kpis.convertedQuotedQty} converted • {data.kpis.activeQuotedQty} active
                  </div>
                </div>

                {/* Stock In (Purchases/Scans) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #14b8a6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Stock In</span>
                    <ArrowDownLeft size={16} color="#14b8a6" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f766e', marginTop: '6px' }}>
                    +{data.kpis.stockInTransactionsQty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Restocks & manual scans
                  </div>
                </div>

                {/* Stock Out (Dispatches) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #f43f5e'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Stock Out</span>
                    <ArrowUpRight size={16} color="#f43f5e" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#be123c', marginTop: '6px' }}>
                    -{data.kpis.stockOutTransactionsQty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    Dispatches & write-offs
                  </div>
                </div>

                {/* Purchase Orders */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  borderLeft: '4px solid #8b5cf6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>PO Received</span>
                    <Truck size={16} color="#8b5cf6" />
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#6d28d9', marginTop: '6px' }}>
                    {data.kpis.totalPOReceivedQty} / {data.kpis.totalPOQty} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                    From {data.kpis.totalPOsCount} Vendor POs
                  </div>
                </div>
              </div>

              {/* ─── FILTERS & TAB NAVIGATION ─── */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid #e2e8f0',
                paddingBottom: '12px',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                {/* Tabs */}
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {[
                    { id: 'timeline', label: 'All History', icon: Layers, count: data.kpis.totalTimelineEventsCount },
                    { id: 'quotations', label: 'Quotations', icon: FileCheck2, count: data.kpis.totalQuotationsCount },
                    { id: 'invoices', label: 'Invoices & Orders', icon: Receipt, count: data.kpis.totalOrdersCount },
                    { id: 'adjustments', label: 'Stock Adjustments', icon: Package, count: data.kpis.totalTransactionsCount },
                    { id: 'purchases', label: 'Purchase Orders', icon: Truck, count: data.kpis.totalPOsCount },
                    { id: 'images', label: 'Product Gallery', icon: ImageIcon, count: data.product.images?.length || 0 }
                  ].map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as any)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          borderRadius: '8px',
                          border: isActive ? '1px solid #4f46e5' : '1px solid transparent',
                          backgroundColor: isActive ? '#eff6ff' : 'transparent',
                          color: isActive ? '#4f46e5' : '#475569',
                          fontWeight: isActive ? 700 : 500,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          transition: 'all 0.15s'
                        }}
                      >
                        <Icon size={15} />
                        {tab.label}
                        <span style={{
                          backgroundColor: isActive ? '#4f46e5' : '#e2e8f0',
                          color: isActive ? '#fff' : '#64748b',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px'
                        }}>
                          {tab.count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Date Filters & Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <Calendar size={14} color="#64748b" />
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', outline: 'none' }}
                      title="Start Date"
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.75rem', outline: 'none' }}
                      title="End Date"
                    />
                  </div>

                  <div style={{ position: 'relative', width: '200px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search this list..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 8px 6px 28px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* ─── TAB CONTENT PANELS ─── */}

              {/* TAB 1: UNIFIED TIMELINE */}
              {activeTab === 'timeline' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {filteredTimeline.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      No transaction records found matching your filters.
                    </div>
                  ) : (
                    filteredTimeline.map((item: any, idx: number) => {
                      const isStockIn = item.type === 'IN';
                      const isStockOut = item.type === 'OUT';
                      const isQuote = item.source === 'QUOTATION';
                      const isInvoice = item.source === 'INVOICE_ORDER';
                      const isPO = item.source === 'PURCHASE_ORDER';

                      return (
                        <div
                          key={item.id || idx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '12px 16px',
                            borderRadius: '10px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #f1f5f9',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                        >
                          {/* Left: Icon, Date, Details */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <div style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: isStockIn ? '#dcfce7' : (isStockOut ? '#fee2e2' : (isQuote ? '#fef3c7' : (isInvoice ? '#dbeafe' : '#ede9fe'))),
                              color: isStockIn ? '#166534' : (isStockOut ? '#991b1b' : (isQuote ? '#92400e' : (isInvoice ? '#1e40af' : '#6d28d9')))
                            }}>
                              {isStockIn && <ArrowDownLeft size={18} />}
                              {isStockOut && <ArrowUpRight size={18} />}
                              {isQuote && <FileCheck2 size={18} />}
                              {isInvoice && <Receipt size={18} />}
                              {isPO && <Truck size={18} />}
                            </div>

                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                                  {item.title}
                                </span>
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  backgroundColor: isStockIn ? '#dcfce7' : (isStockOut ? '#fee2e2' : (isQuote ? '#fef3c7' : (isInvoice ? '#dbeafe' : '#ede9fe'))),
                                  color: isStockIn ? '#166534' : (isStockOut ? '#991b1b' : (isQuote ? '#92400e' : (isInvoice ? '#1e40af' : '#6d28d9')))
                                }}>
                                  {item.status}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                                <span>{new Date(item.date).toLocaleString()}</span>
                                <span>•</span>
                                <span>Party: <strong>{item.party}</strong></span>
                                {item.warehouse && (
                                  <>
                                    <span>•</span>
                                    <span>Warehouse: <strong>{item.warehouse}</strong></span>
                                  </>
                                )}
                                {item.notes && (
                                  <>
                                    <span>•</span>
                                    <span>{item.notes}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right: Quantity impact & Amount */}
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '1.1rem',
                              fontWeight: 800,
                              color: isStockIn ? '#16a34a' : (isStockOut ? '#dc2626' : (isQuote ? '#d97706' : '#2563eb'))
                            }}>
                              {isStockIn ? `+${item.quantity}` : (isStockOut ? `-${item.quantity}` : `${item.quantity}`)} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748b' }}>pcs</span>
                            </div>
                            {item.total && (
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569' }}>
                                ₹{item.total.toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* TAB 2: QUOTATIONS */}
              {activeTab === 'quotations' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Quotation #</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Customer</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Quoted Qty</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Unit Rate</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Item Total</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredQuotations.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                            No quotation records found for this article.
                          </td>
                        </tr>
                      ) : (
                        filteredQuotations.map((qi: any) => (
                          <tr key={qi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#4f46e5' }}>
                              {qi.quotation?.quotationNumber}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                              {new Date(qi.quotation?.date).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                              {qi.quotation?.customer?.businessName || qi.quotation?.customer?.contactPerson}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#d97706' }}>
                              {qi.quantity} {qi.unit || 'pcs'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              ₹{qi.rate}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                              ₹{qi.total?.toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: qi.quotation?.status === 'Converted' || qi.quotation?.status === 'Accepted' ? '#dcfce7' : '#fef3c7',
                                color: qi.quotation?.status === 'Converted' || qi.quotation?.status === 'Accepted' ? '#166534' : '#92400e'
                              }}>
                                {qi.quotation?.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: INVOICES & ORDERS */}
              {activeTab === 'invoices' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Invoice # / Order #</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Customer</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Billed Qty</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Unit Rate</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Total</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Invoice Status</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Order Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                            No invoice or order records found for this article.
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((oi: any) => {
                          const invoice = oi.order?.invoices?.[0];
                          return (
                            <tr key={oi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '12px 16px' }}>
                                <div style={{ fontWeight: 700, color: '#2563eb' }}>
                                  {invoice?.invoiceNumber || 'Invoice Pending'}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                  Order: {oi.order?.orderNumber}
                                </div>
                              </td>
                              <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                                {new Date(oi.order?.orderDate).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                                {oi.order?.customer?.businessName || oi.order?.customer?.contactPerson}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#2563eb' }}>
                                {oi.quantity} pcs
                              </td>
                              <td style={{ padding: '12px 16px', color: '#475569' }}>
                                ₹{oi.rate}
                              </td>
                              <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>
                                ₹{oi.total?.toLocaleString()}
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 700,
                                  backgroundColor: invoice?.status === 'Paid' ? '#dcfce7' : '#fee2e2',
                                  color: invoice?.status === 'Paid' ? '#166534' : '#991b1b'
                                }}>
                                  {invoice?.status || 'Unbilled'}
                                </span>
                              </td>
                              <td style={{ padding: '12px 16px' }}>
                                <span style={{
                                  padding: '3px 8px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  backgroundColor: '#f1f5f9',
                                  color: '#334155'
                                }}>
                                  {oi.order?.orderStatus}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 4: STOCK ADJUSTMENTS & SCANS */}
              {activeTab === 'adjustments' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Date & Time</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Movement</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Quantity</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Reference</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Warehouse</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Employee / User</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAdjustments.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                            No manual adjustment or scan records found.
                          </td>
                        </tr>
                      ) : (
                        filteredAdjustments.map((t: any) => (
                          <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                              {new Date(t.date).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                backgroundColor: t.type === 'IN' ? '#dcfce7' : '#fee2e2',
                                color: t.type === 'IN' ? '#166534' : '#991b1b'
                              }}>
                                {t.type === 'IN' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                                {t.type === 'IN' ? 'Stock In' : 'Stock Out'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 800, color: t.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                              {t.type === 'IN' ? `+${t.quantity}` : `-${t.quantity}`} pcs
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                              {t.reference || 'Manual Scan'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              {t.warehouse?.name || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              {t.employee?.user?.name || 'System / Admin'}
                            </td>
                            <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.85rem' }}>
                              {t.notes || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 5: PURCHASE ORDERS */}
              {activeTab === 'purchases' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>PO #</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Date</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Vendor</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Ordered Qty</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Received Qty</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Rate</th>
                        <th style={{ padding: '12px 16px', fontSize: '0.8rem', fontWeight: 700, color: '#475569' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPOs.length === 0 ? (
                        <tr>
                          <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                            No purchase orders found for this article.
                          </td>
                        </tr>
                      ) : (
                        filteredPOs.map((poi: any) => (
                          <tr key={poi.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed' }}>
                              {poi.purchaseOrder?.poNumber}
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: '0.85rem', color: '#475569' }}>
                              {new Date(poi.purchaseOrder?.orderDate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                              {poi.purchaseOrder?.vendor?.companyName || '-'}
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#7c3aed' }}>
                              {poi.quantity} pcs
                            </td>
                            <td style={{ padding: '12px 16px', fontWeight: 700, color: '#16a34a' }}>
                              {poi.receivedQty} pcs
                            </td>
                            <td style={{ padding: '12px 16px', color: '#475569' }}>
                              ₹{poi.rate}
                            </td>
                            <td style={{ padding: '12px 16px' }}>
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                backgroundColor: poi.purchaseOrder?.status === 'Received' ? '#dcfce7' : '#ede9fe',
                                color: poi.purchaseOrder?.status === 'Received' ? '#166534' : '#6d28d9'
                              }}>
                                {poi.purchaseOrder?.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 6: PRODUCT GALLERY & MULTI-IMAGE VIEWER */}
              {activeTab === 'images' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(!data.product.images || data.product.images.length === 0) ? (
                    <div style={{ padding: '60px', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
                      <ImageIcon size={40} style={{ margin: '0 auto 10px auto', color: '#94a3b8' }} />
                      <h4 style={{ margin: '0 0 6px 0', color: '#334155' }}>No Product Images Uploaded</h4>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                        You can upload multiple high-resolution photos for this article via the "Edit Product" modal.
                      </p>
                    </div>
                  ) : (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: '16px'
                    }}>
                      {data.product.images.map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setLightboxImg(imgUrl)}
                          style={{
                            position: 'relative',
                            aspectRatio: '1 / 1',
                            borderRadius: '12px',
                            border: idx === 0 ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            overflow: 'hidden',
                            backgroundColor: '#fff',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s, box-shadow 0.2s'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`Photo ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          {idx === 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              backgroundColor: '#4f46e5',
                              color: '#fff',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '3px 8px',
                              borderRadius: '6px'
                            }}>
                              Primary Cover
                            </div>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            padding: '3px 6px',
                            borderRadius: '4px'
                          }}>
                            Photo #{idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : null}

        </div>

        {/* ─── LIGHTBOX PREVIEW MODAL ─── */}
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
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
                onClick={() => setLightboxImg(null)}
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
                <X size={18} />
              </button>
              <img
                src={lightboxImg}
                alt="Product Preview"
                style={{ maxWidth: '85vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: '8px' }}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
