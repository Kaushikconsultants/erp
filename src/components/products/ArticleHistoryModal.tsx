"use client";

import DatePicker from '@/components/ui/DatePicker';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  Sparkles,
  Equal,
  ShieldCheck,
  AlertCircle,
  Eye,
  CheckCircle2,
  FileEdit,
  ShoppingCart
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
    const article = data.product.articleNumber || data.product.sku || 'Article';

    // Sheet 1: Summary KPIs
    const summaryData = [
      { Metric: "Product Name", Value: data.product.name },
      { Metric: "SKU", Value: data.product.sku || '-' },
      { Metric: "Article Number", Value: data.product.articleNumber || '-' },
      { Metric: "Category", Value: data.product.category || '-' },
      { Metric: "Selling Price (₹)", Value: data.product.sellingPrice },
      { Metric: "Current Available In-Stock (Units)", Value: data.kpis.currentStock },
      { Metric: "Invoiced / Sold Qty (Units)", Value: data.kpis.totalInvoicedQty },
      { Metric: "Total Revenue (₹)", Value: data.kpis.totalRevenue },
      { Metric: "Total Quoted in Quotes (Units)", Value: data.kpis.totalQuotedQty },
      { Metric: "Converted Quoted Qty", Value: data.kpis.convertedQuotedQty },
      { Metric: "Active Pipeline Demand", Value: data.kpis.activeQuotedQty },
      { Metric: "Free Uncommitted Stock", Value: data.kpis.uncommittedStock },
      { Metric: "Total Stock In (Inflow)", Value: data.kpis.totalStockIn },
      { Metric: "Total Stock Out (Outflow)", Value: data.kpis.totalStockOut },
      { Metric: "PO Qty (Ordered)", Value: data.kpis.totalPOQty },
      { Metric: "PO Qty (Received)", Value: data.kpis.totalPOReceivedQty }
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
      'Stock Delta': item.delta || 0,
      'Running Balance': item.runningBalance ?? '-',
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
              <strong>Article No:</strong> ${p.articleNumber || '-'} | <strong>SKU:</strong> ${p.sku || '-'} | <strong>Category:</strong> ${p.category || '-'} | <strong>Price:</strong> ₹${p.sellingPrice}
            </div>
            <div class="meta">Statement Generated on: ${new Date().toLocaleString()}</div>
          </div>

          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-title">Current In-Stock</div>
              <div class="kpi-value" style="color: #10b981;">${k.currentStock} units</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Invoiced / Sold Qty</div>
              <div class="kpi-value" style="color: #3b82f6;">${k.totalInvoicedQty} units</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Quoted Qty</div>
              <div class="kpi-value" style="color: #f59e0b;">${k.totalQuotedQty} units</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-title">Total Inflow / Outflow</div>
              <div class="kpi-value">+${k.totalStockIn} / -${k.totalStockOut}</div>
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
                <th>Stock Balance</th>
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
                  <td><strong>${item.runningBalance ?? '-'}</strong></td>
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
          maxWidth: '1240px',
          width: '96vw',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRadius: '16px'
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
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              backgroundColor: '#e0e7ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4f46e5',
              boxShadow: '0 2px 4px rgba(79, 70, 229, 0.15)'
            }}>
              <Layers size={24} />
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.02em' }}>
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
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                >
                  <span>Switch Article</span>
                  <ChevronDown size={14} color="#64748b" />
                </button>
              </div>

              {/* Sub-header meta strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8125rem', color: '#64748b', marginTop: '3px' }}>
                {data?.product?.articleNumber && (
                  <span>Article: <span style={{ color: '#0f172a', fontWeight: 550 }}>{data.product.articleNumber}</span></span>
                )}
                {data?.product?.sku && (
                  <>
                    <span>•</span>
                    <span>SKU: <span style={{ color: '#0f172a', fontWeight: 550 }}>{data.product.sku}</span></span>
                  </>
                )}
                {data?.product?.category && (
                  <>
                    <span>•</span>
                    <span>Category: <span style={{ color: '#4f46e5', fontWeight: 550 }}>{data.product.category}</span></span>
                  </>
                )}
                {data?.product?.sellingPrice !== undefined && (
                  <>
                    <span>•</span>
                    <span>Price: <span style={{ color: '#16a34a', fontWeight: 600 }}>₹{data.product.sellingPrice}</span></span>
                  </>
                )}
              </div>
            </div>

            {/* Quick Switcher Popover Dropdown */}
            {isSwitcherOpen && (
              <div style={{
                position: 'absolute',
                top: '56px',
                left: 0,
                width: '380px',
                maxHeight: '340px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
              }}>
                <div style={{ padding: '10px 12px', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search name, SKU, or Article No..."
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
                  {switcherList.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                      No matching articles found
                    </div>
                  ) : (
                    switcherList.map((p) => {
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
                            padding: '8px 12px',
                            borderRadius: '8px',
                            backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'background-color 0.15s',
                            margin: '2px 0'
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
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: (p.stockQuantity ?? 0) > 10 ? '#16a34a' : '#dc2626'
                            }}>
                              {p.stockQuantity ?? 0} pcs
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
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
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(79, 70, 229, 0.25)',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338ca'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4f46e5'}
            >
              <Plus size={15} /> Quick Stock In / Out
            </button>

            <button
              onClick={handleExportExcel}
              disabled={!data?.product}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#166534',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Download Complete Excel Ledger"
            >
              <FileSpreadsheet size={16} /> Excel
            </button>

            <button
              onClick={handlePrintPDF}
              disabled={!data?.product}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 13px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#991b1b',
                fontSize: '0.8125rem',
                fontWeight: 500,
                cursor: 'pointer'
              }}
              title="Print Article Statement"
            >
              <FileText size={16} /> Print / PDF
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
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f1f5f9'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
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
            backgroundColor: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}>
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                    <Layers size={18} />
                  </div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>
                    Quick Stock Adjustment
                  </h3>
                </div>
                <button onClick={() => setShowAdjustModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                  <X size={18} />
                </button>
              </div>

              {adjustSuccessMsg && (
                <div style={{ padding: '10px 14px', backgroundColor: '#ecfdf5', color: '#065f46', borderRadius: '8px', fontSize: '0.85rem', marginBottom: '14px', fontWeight: 500, border: '1px solid #a7f3d0' }}>
                  {adjustSuccessMsg}
                </div>
              )}

              <form onSubmit={handleQuickAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>
                    Movement Direction
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setAdjustType('IN')}
                      style={{
                        padding: '10px',
                        borderRadius: '8px',
                        border: adjustType === 'IN' ? '1.5px solid #16a34a' : '1px solid #cbd5e1',
                        backgroundColor: adjustType === 'IN' ? '#f0fdf4' : '#ffffff',
                        color: adjustType === 'IN' ? '#166534' : '#64748b',
                        fontWeight: 550,
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
                        border: adjustType === 'OUT' ? '1.5px solid #dc2626' : '1px solid #cbd5e1',
                        backgroundColor: adjustType === 'OUT' ? '#fef2f2' : '#ffffff',
                        color: adjustType === 'OUT' ? '#991b1b' : '#64748b',
                        fontWeight: 550,
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    Quantity (Units)
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
                      fontWeight: 600,
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                    Reference / Reason / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Quotation sample, physical audit count, batch restock..."
                    value={adjustNotes}
                    onChange={(e) => setAdjustNotes(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setShowAdjustModal(false)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      backgroundColor: '#ffffff',
                      color: '#475569',
                      fontSize: '0.85rem',
                      fontWeight: 500,
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
                      color: '#ffffff',
                      fontWeight: 550,
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {loading ? (
            <div style={{ padding: '80px', textAlign: 'center', color: '#64748b' }}>
              <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 14px auto', color: '#4f46e5' }} />
              <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>Calculating article transaction ledger...</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>Syncing quotations, orders, dispatches, and warehouse stock</p>
            </div>
          ) : error ? (
            <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#991b1b' }}>
              <AlertCircle size={32} style={{ margin: '0 auto 10px auto' }} />
              <p style={{ fontWeight: 700, margin: 0 }}>{error}</p>
            </div>
          ) : data ? (
            <>
              {/* ─── KPI METRICS CARDS STRIP ─── */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '14px'
              }}>
                {/* 1. In Stock */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #10b981',
                  position: 'relative'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Current In-Stock</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                      <Package size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#0f172a', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {data.kpis.currentStock} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#16a34a', marginTop: '4px', fontWeight: 500 }}>
                    <CheckCircle2 size={13} />
                    <span>{data.kpis.currentStock > data.product.minimumStock ? 'Physical Available Stock' : 'Low Stock Alert'}</span>
                  </div>
                </div>

                {/* 2. Invoiced / Sold */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #3b82f6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Invoiced / Sold Qty</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                      <Receipt size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#2563eb', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {data.kpis.totalInvoicedQty} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 450 }}>
                    Across {data.kpis.totalOrdersCount} orders • ₹{data.kpis.totalRevenue?.toLocaleString()}
                  </div>
                </div>

                {/* 3. Quoted Qty */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #f59e0b'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Quoted in Quotes</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                      <FileCheck2 size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#d97706', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {data.kpis.totalQuotedQty} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 450 }}>
                    {data.kpis.convertedQuotedQty} converted • {data.kpis.activeQuotedQty} active
                  </div>
                </div>

                {/* 4. Total Stock In (Inward) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #0d9488'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Stock In</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f0fdfa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d9488' }}>
                      <ArrowDownLeft size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#0f766e', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    +{data.kpis.totalStockIn} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 450 }}>
                    Initial stock, restocks & POs
                  </div>
                </div>

                {/* 5. Total Stock Out (Outward) */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #e11d48'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total Stock Out</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                      <ArrowUpRight size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#e11d48', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    -{data.kpis.totalStockOut} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 450 }}>
                    {data.kpis.totalInvoicedQty} sold • {data.kpis.manualOutQty} write-offs
                  </div>
                </div>

                {/* 6. Purchase Orders */}
                <div style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  borderLeft: '3px solid #8b5cf6'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 550, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PO Received</span>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' }}>
                      <Truck size={16} />
                    </div>
                  </div>
                  <div style={{ fontSize: '1.45rem', fontWeight: 600, color: '#7c3aed', marginTop: '6px', letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>
                    {data.kpis.totalPOReceivedQty} / {data.kpis.totalPOQty} <span style={{ fontSize: '0.8125rem', fontWeight: 400, color: '#64748b' }}>units</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontWeight: 450 }}>
                    From {data.kpis.totalPOsCount} Vendor POs
                  </div>
                </div>
              </div>

              {/* ─── INVENTORY RECONCILIATION & MATHEMATICAL BALANCE FORMULA BAR ─── */}
              <div style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '0.8125rem', color: '#334155', fontWeight: 500 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#0f766e', backgroundColor: '#ccfbf1', padding: '3px 9px', borderRadius: '6px', fontWeight: 550 }}>
                    <ArrowDownLeft size={13} /> Total Sourced In: +{data.kpis.totalStockIn}
                  </span>
                  <Minus size={13} color="#94a3b8" />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1e40af', backgroundColor: '#dbeafe', padding: '3px 9px', borderRadius: '6px', fontWeight: 550 }}>
                    <ShoppingCart size={13} /> Invoiced / Sold: {data.kpis.totalInvoicedQty}
                  </span>
                  {data.kpis.manualOutQty > 0 && (
                    <>
                      <Minus size={13} color="#94a3b8" />
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#991b1b', backgroundColor: '#fee2e2', padding: '3px 9px', borderRadius: '6px', fontWeight: 550 }}>
                        <ArrowUpRight size={13} /> Manual Write-Offs: {data.kpis.manualOutQty}
                      </span>
                    </>
                  )}
                  <Equal size={13} color="#64748b" />
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#166534', backgroundColor: '#dcfce7', padding: '3px 10px', borderRadius: '6px', fontWeight: 600, fontSize: '0.85rem' }}>
                    <Package size={14} /> Physical Available Stock: {data.kpis.currentStock} Units
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  <span style={{ color: '#64748b' }}>Pipeline Demand:</span>
                  <span style={{ fontWeight: 550, color: '#b45309', backgroundColor: '#fef3c7', padding: '2px 7px', borderRadius: '6px' }}>
                    {data.kpis.activeQuotedQty} units in active quotes
                  </span>
                  <span style={{ color: '#cbd5e1' }}>•</span>
                  <span style={{ fontWeight: 550, color: '#4338ca', backgroundColor: '#e0e7ff', padding: '2px 7px', borderRadius: '6px' }}>
                    Uncommitted: {data.kpis.uncommittedStock} units
                  </span>
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
                          padding: '7px 13px',
                          borderRadius: '8px',
                          border: isActive ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                          backgroundColor: isActive ? '#4f46e5' : '#ffffff',
                          color: isActive ? '#ffffff' : '#475569',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.8125rem',
                          cursor: 'pointer',
                          boxShadow: isActive ? '0 2px 4px rgba(79, 70, 229, 0.18)' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={14} />
                        {tab.label}
                        <span style={{
                          backgroundColor: isActive ? 'rgba(255,255,255,0.22)' : '#e2e8f0',
                          color: isActive ? '#ffffff' : '#64748b',
                          fontSize: '0.72rem',
                          fontWeight: 500,
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#ffffff', padding: '4px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                    <Calendar size={14} color="#64748b" />
                    <DatePicker
                      
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none', color: '#1e293b' }}
                      title="Start Date"
                    />
                    <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>to</span>
                    <DatePicker
                      
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      style={{ border: 'none', background: 'transparent', fontSize: '0.8rem', outline: 'none', color: '#1e293b' }}
                      title="End Date"
                    />
                  </div>

                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '6px 10px 6px 30px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        outline: 'none',
                        backgroundColor: '#ffffff'
                      }}
                    />
                  </div>

                  {(startDate || endDate || searchFilter) && (
                    <button
                      onClick={() => { setStartDate(''); setEndDate(''); setSearchFilter(''); }}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid #e2e8f0',
                        backgroundColor: '#f1f5f9',
                        color: '#475569',
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* ─── TAB CONTENT PANELS ─── */}

              {/* TAB 1: UNIFIED CHRONOLOGICAL TIMELINE */}
              {activeTab === 'timeline' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Date & Time</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Event Type</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Doc / Ref #</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer / Vendor / User</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Qty Change</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Stock Balance</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Details / Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimeline.length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                            No transaction records found matching your filters.
                          </td>
                        </tr>
                      ) : (
                        filteredTimeline.map((item: any, idx: number) => {
                          const isStockIn = item.type === 'IN';
                          const isStockOut = item.type === 'OUT' || item.source === 'INVOICE_ORDER';
                          const isQuote = item.source === 'QUOTATION';
                          const isInvoice = item.source === 'INVOICE_ORDER';
                          const isPO = item.source === 'PURCHASE_ORDER';

                          return (
                            <tr
                              key={item.id || idx}
                              style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              {/* Date */}
                              <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                                <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                                  {new Date(item.date).toLocaleDateString()}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                  {new Date(item.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toUpperCase()}
                                </div>
                              </td>

                              {/* Event Type Badge */}
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 8px',
                                  borderRadius: '6px',
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  backgroundColor: isStockIn ? '#dcfce7' : (isInvoice ? '#dbeafe' : (isQuote ? '#fef3c7' : (isPO ? '#ede9fe' : '#fee2e2'))),
                                  color: isStockIn ? '#166534' : (isInvoice ? '#1e40af' : (isQuote ? '#92400e' : (isPO ? '#6d28d9' : '#991b1b')))
                                }}>
                                  {isStockIn && <ArrowDownLeft size={13} />}
                                  {isInvoice && <ShoppingCart size={13} />}
                                  {isQuote && <FileCheck2 size={13} />}
                                  {isPO && <Truck size={13} />}
                                  {item.type === 'OUT' && !isInvoice && <ArrowUpRight size={13} />}
                                  {isQuote ? 'Quotation' : (isInvoice ? 'Sales Order' : (isPO ? 'Vendor PO' : (isStockIn ? 'Stock In' : 'Stock Out')))}
                                </span>
                              </td>

                              {/* Doc / Reference # */}
                              <td style={{ padding: '12px 14px', fontWeight: 550, fontSize: '0.8125rem', color: isInvoice ? '#2563eb' : (isQuote ? '#b45309' : '#0f172a') }}>
                                {item.orderId ? (
                                  <Link href={`/orders/${item.orderId}`} target="_blank" style={{ color: '#2563eb', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {item.docNumber} <ExternalLink size={12} />
                                  </Link>
                                ) : item.quotationId ? (
                                  <Link href={`/quotations/${item.quotationId}`} target="_blank" style={{ color: '#b45309', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    {item.docNumber} <ExternalLink size={12} />
                                  </Link>
                                ) : (
                                  item.docNumber || '-'
                                )}
                              </td>

                              {/* Customer / Vendor / Party */}
                              <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                                <div>{item.party || '-'}</div>
                                {item.warehouse && (
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>📍 {item.warehouse}</div>
                                )}
                              </td>

                              {/* Qty Change */}
                              <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: isStockIn ? '#16a34a' : (isInvoice || (item.type === 'OUT' && !isQuote) ? '#dc2626' : (isQuote ? '#d97706' : '#6d28d9'))
                                }}>
                                  {isStockIn ? `+${item.quantity}` : (isInvoice || (item.type === 'OUT' && !isQuote) ? `-${item.quantity}` : `${item.quantity}`)}
                                </span>
                                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '4px', fontWeight: 400 }}>
                                  {isQuote ? 'pcs (Quote)' : 'pcs'}
                                </span>
                              </td>

                              {/* Running Stock Balance */}
                              <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{
                                  padding: '2px 7px',
                                  borderRadius: '6px',
                                  backgroundColor: '#f0fdf4',
                                  color: '#166534',
                                  fontWeight: 600,
                                  fontSize: '0.8125rem'
                                }}>
                                  {item.runningBalance !== undefined ? `${item.runningBalance} units` : '-'}
                                </span>
                              </td>

                              {/* Status Badge */}
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  padding: '2px 7px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  backgroundColor: item.status === 'Converted' || item.status === 'Paid' || item.status === 'In Stock' || item.status === 'Received' ? '#dcfce7' : '#fef3c7',
                                  color: item.status === 'Converted' || item.status === 'Paid' || item.status === 'In Stock' || item.status === 'Received' ? '#166534' : '#92400e'
                                }}>
                                  {item.status || 'Completed'}
                                </span>
                              </td>

                              {/* Notes / Details */}
                              <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8125rem', maxWidth: '240px', fontWeight: 400 }}>
                                {item.notes || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: QUOTATIONS */}
              {activeTab === 'quotations' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#fefce8', borderRadius: '8px', border: '1px solid #fef08a' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#854d0e', fontWeight: 500 }}>
                      <span style={{ fontWeight: 600 }}>Quotation Pipeline:</span> Total <span style={{ fontWeight: 600 }}>{data.kpis.totalQuotedQty} units</span> across {data.kpis.totalQuotationsCount} quotes (<span style={{ fontWeight: 600 }}>{data.kpis.convertedQuotedQty} units converted</span> • <span style={{ fontWeight: 600 }}>{data.kpis.activeQuotedQty} active</span>)
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Quotation #</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Quoted Qty</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Unit Rate</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Item Total</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredQuotations.length === 0 ? (
                          <tr>
                            <td colSpan={8} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                              No quotation records found for this article.
                            </td>
                          </tr>
                        ) : (
                          filteredQuotations.map((qi: any) => (
                            <tr key={qi.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 550, fontSize: '0.8125rem', color: '#4f46e5' }}>
                                <Link href={`/quotations/${qi.quotation?.id}`} target="_blank" style={{ color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {qi.quotation?.quotationNumber} <ExternalLink size={12} />
                                </Link>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                                {new Date(qi.quotation?.date).toLocaleDateString()}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                                {qi.quotation?.customer?.businessName || qi.quotation?.customer?.contactPerson}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#d97706', textAlign: 'right', fontSize: '0.875rem' }}>
                                {qi.quantity} {qi.unit || 'pcs'}
                              </td>
                              <td style={{ padding: '12px 14px', color: '#475569', textAlign: 'right', fontSize: '0.8125rem' }}>
                                ₹{qi.rate}
                              </td>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', textAlign: 'right', fontSize: '0.875rem' }}>
                                ₹{qi.total?.toLocaleString()}
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <span style={{
                                  padding: '2px 7px',
                                  borderRadius: '12px',
                                  fontSize: '0.72rem',
                                  fontWeight: 500,
                                  backgroundColor: qi.quotation?.status === 'Converted' || qi.quotation?.status === 'Accepted' ? '#dcfce7' : '#fef3c7',
                                  color: qi.quotation?.status === 'Converted' || qi.quotation?.status === 'Accepted' ? '#166534' : '#92400e'
                                }}>
                                  {qi.quotation?.status}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px' }}>
                                <Link
                                  href={`/quotations/${qi.quotation?.id}`}
                                  target="_blank"
                                  style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#eff6ff',
                                    color: '#2563eb',
                                    fontSize: '0.75rem',
                                    fontWeight: 500,
                                    textDecoration: 'none'
                                  }}
                                >
                                  View <ExternalLink size={11} />
                                </Link>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: INVOICES & ORDERS */}
              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#eff6ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                    <div style={{ fontSize: '0.8125rem', color: '#1e40af', fontWeight: 500 }}>
                      <span style={{ fontWeight: 600 }}>Sales & Invoicing Summary:</span> Total <span style={{ fontWeight: 600 }}>{data.kpis.totalInvoicedQty} units sold</span> across {data.kpis.totalOrdersCount} orders (Revenue: <span style={{ fontWeight: 600 }}>₹{data.kpis.totalRevenue?.toLocaleString()}</span>)
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Invoice # / Order #</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Date</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Customer</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Billed Qty</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Unit Rate</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Total</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Invoice Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Order Status</th>
                          <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#94a3b8' }}>
                              No invoice or order records found for this article.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((oi: any) => {
                            const invoice = oi.order?.invoices?.[0];
                            return (
                              <tr key={oi.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                                <td style={{ padding: '12px 14px' }}>
                                  <div style={{ fontWeight: 550, color: '#2563eb', fontSize: '0.8125rem' }}>
                                    {invoice?.invoiceNumber || 'Invoice Pending'}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    Order: {oi.order?.orderNumber}
                                  </div>
                                </td>
                                <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                                  {new Date(oi.order?.orderDate).toLocaleDateString()}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                                  {oi.order?.customer?.businessName || oi.order?.customer?.contactPerson}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#2563eb', textAlign: 'right', fontSize: '0.875rem' }}>
                                  {oi.quantity} pcs
                                </td>
                                <td style={{ padding: '12px 14px', color: '#475569', textAlign: 'right', fontSize: '0.8125rem' }}>
                                  ₹{oi.rate}
                                </td>
                                <td style={{ padding: '12px 14px', fontWeight: 600, color: '#0f172a', textAlign: 'right', fontSize: '0.875rem' }}>
                                  ₹{(oi.total || (oi.quantity * oi.rate))?.toLocaleString()}
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    backgroundColor: invoice?.status === 'Paid' ? '#dcfce7' : '#fee2e2',
                                    color: invoice?.status === 'Paid' ? '#166534' : '#991b1b'
                                  }}>
                                    {invoice?.status || 'Unbilled'}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <span style={{
                                    padding: '2px 7px',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 500,
                                    backgroundColor: '#f1f5f9',
                                    color: '#334155'
                                  }}>
                                    {oi.order?.orderStatus}
                                  </span>
                                </td>
                                <td style={{ padding: '12px 14px' }}>
                                  <Link
                                    href={`/orders/${oi.order?.id}`}
                                    target="_blank"
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '4px 8px',
                                      borderRadius: '6px',
                                      backgroundColor: '#eff6ff',
                                      color: '#2563eb',
                                      fontSize: '0.75rem',
                                      fontWeight: 500,
                                      textDecoration: 'none'
                                    }}
                                  >
                                    View <ExternalLink size={11} />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 4: STOCK ADJUSTMENTS & SCANS */}
              {activeTab === 'adjustments' && (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Date & Time</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Movement</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Quantity</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Reference</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Warehouse</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Employee / User</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Notes</th>
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
                          <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                              {new Date(t.date).toLocaleString()}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 7px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 500,
                                backgroundColor: t.type === 'IN' ? '#dcfce7' : '#fee2e2',
                                color: t.type === 'IN' ? '#166534' : '#991b1b'
                              }}>
                                {t.type === 'IN' ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                                {t.type === 'IN' ? 'Stock In' : 'Stock Out'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: t.type === 'IN' ? '#16a34a' : '#dc2626', textAlign: 'right', fontSize: '0.875rem' }}>
                              {t.type === 'IN' ? `+${t.quantity}` : `-${t.quantity}`} pcs
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                              {t.reference || 'Manual Scan'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                              {t.warehouse?.name || 'Main Warehouse'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                              {t.employee?.user?.name || 'System / Admin'}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#64748b', fontSize: '0.8125rem', fontWeight: 400 }}>
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
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '12px', backgroundColor: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>PO #</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Date</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Vendor</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Ordered Qty</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Received Qty</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', textAlign: 'right' }}>Rate</th>
                        <th style={{ padding: '10px 14px', fontWeight: 550, color: '#64748b', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</th>
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
                          <tr key={poi.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}>
                            <td style={{ padding: '12px 14px', fontWeight: 550, color: '#7c3aed', fontSize: '0.8125rem' }}>
                              {poi.purchaseOrder?.poNumber}
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', fontSize: '0.8125rem' }}>
                              {new Date(poi.purchaseOrder?.orderDate).toLocaleDateString()}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 500, color: '#1e293b', fontSize: '0.8125rem' }}>
                              {poi.purchaseOrder?.vendor?.companyName || '-'}
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#7c3aed', textAlign: 'right', fontSize: '0.875rem' }}>
                              {poi.quantity} pcs
                            </td>
                            <td style={{ padding: '12px 14px', fontWeight: 600, color: '#16a34a', textAlign: 'right', fontSize: '0.875rem' }}>
                              {poi.receivedQty} pcs
                            </td>
                            <td style={{ padding: '12px 14px', color: '#475569', textAlign: 'right', fontSize: '0.8125rem' }}>
                              ₹{poi.rate}
                            </td>
                            <td style={{ padding: '12px 14px' }}>
                              <span style={{
                                padding: '2px 7px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 500,
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

              {/* TAB 6: PRODUCT GALLERY & PHOTOS */}
              {activeTab === 'images' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(!data.product.images || data.product.images.length === 0) ? (
                    <div style={{
                      padding: '40px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      borderRadius: '12px',
                      border: '2px dashed #cbd5e1',
                      color: '#64748b'
                    }}>
                      <ImageIcon size={40} style={{ margin: '0 auto 10px auto', color: '#94a3b8' }} />
                      <p style={{ margin: 0, fontWeight: 700, color: '#1e293b' }}>No product images uploaded yet</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                        You can upload and organize high-resolution product photos via Edit Product.
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
                            borderRadius: '12px',
                            border: idx === 0 ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                            overflow: 'hidden',
                            backgroundColor: '#ffffff',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                            position: 'relative',
                            cursor: 'pointer',
                            aspectRatio: '1 / 1'
                          }}
                        >
                          <img
                            src={imgUrl}
                            alt={`${data.product.name} - ${idx + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          {idx === 0 && (
                            <span style={{
                              position: 'absolute',
                              top: '8px',
                              left: '8px',
                              backgroundColor: '#4f46e5',
                              color: '#ffffff',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                            }}>
                              Primary Cover
                            </span>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            insetInline: 0,
                            padding: '8px 10px',
                            background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                          }}>
                            <span>Photo #{idx + 1}</span>
                            <Eye size={14} />
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

        {/* ─── FULL-SCREEN LIGHTBOX MODAL ─── */}
        {lightboxImg && (
          <div
            onClick={() => setLightboxImg(null)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              zIndex: 11000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '20px',
              cursor: 'zoom-out'
            }}
          >
            <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }}>
              <img
                src={lightboxImg}
                alt="Product Full Preview"
                style={{
                  maxWidth: '100%',
                  maxHeight: '90vh',
                  borderRadius: '12px',
                  objectFit: 'contain',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
              />
              <button
                onClick={(e) => { e.stopPropagation(); setLightboxImg(null); }}
                style={{
                  position: 'absolute',
                  top: '-12px',
                  right: '-12px',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
