"use client";

import React, { useState } from "react";

export default function ReportCenterClient({ 
  salesData, 
  inventoryData, 
  financialData,
  productSales 
}: { 
  salesData: any[];
  inventoryData: any;
  financialData: any;
  productSales: any;
}) {
  const [activeReport, setActiveReport] = useState<"sales" | "inventory" | "financials" | "products">("sales");

  // CSV Exporter
  function exportToCSV(filename: string, rows: Record<string, any>[]) {
    if (!rows.length) {
      alert("No data available to export.");
      return;
    }
    const headers = Object.keys(rows[0]);
    const csvContent = [
      headers.join(","),
      ...rows.map(row => headers.map(h => `"${(row[h] ?? "").toString().replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleExportCurrent() {
    if (activeReport === "sales") {
      const rows = salesData.map(s => ({
        "Order #": s.orderNumber,
        "Customer": s.customer?.businessName || "",
        "Salesperson": s.salesperson?.user?.name || "",
        "Order Date": new Date(s.orderDate).toLocaleDateString(),
        "Subtotal (₹)": s.subtotal,
        "GST (₹)": s.tax,
        "Total Value (₹)": s.totalValue,
        "Payment Status": s.paymentStatus,
        "Order Status": s.orderStatus,
      }));
      exportToCSV("Sales_Report", rows);
    } else if (activeReport === "inventory") {
      const rows = (inventoryData.products || []).map((p: any) => ({
        "Product Name": p.name,
        "SKU": p.sku || "",
        "Article #": p.articleNumber || "",
        "Category": p.category || "",
        "HSN Code": p.hsnCode || "",
        "Selling Price (₹)": p.sellingPrice,
        "Stock Qty": p.stockQuantity,
        "Stock Value (₹)": p.stockQuantity * p.sellingPrice,
        "Status": p.stockQuantity <= (p.minimumStock || 10) ? "Low Stock" : "Normal",
      }));
      exportToCSV("Inventory_Report", rows);
    } else if (activeReport === "financials") {
      const rows = (financialData.invoices || []).map((i: any) => ({
        "Invoice #": i.invoiceNumber,
        "Customer": i.customer?.businessName || "",
        "Invoice Date": new Date(i.invoiceDate).toLocaleDateString(),
        "Due Date": i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "",
        "Total Amount (₹)": i.totalAmount,
        "Amount Paid (₹)": i.amountPaid,
        "Amount Due (₹)": i.amountDue,
        "Status": i.status,
      }));
      exportToCSV("Financials_Report", rows);
    } else if (activeReport === "products") {
      const rows = Object.entries(productSales || {}).map(([name, data]: any) => ({
        "Product Name": name,
        "Quantity Sold": data.qty,
        "Total Revenue (₹)": data.value,
      }));
      exportToCSV("Product_Sales_Report", rows);
    }
  }

  return (
    <div>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{salesData.length}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Inventory Stock Qty</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>{inventoryData.totalStockQty || 0}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Collected</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>₹{(financialData.totalCollected || 0).toLocaleString()}</div>
        </div>
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Total Outstanding</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>₹{(financialData.totalOutstanding || 0).toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs & Export Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: "sales", label: "Sales & Orders" },
            { id: "inventory", label: "Inventory Stock" },
            { id: "financials", label: "Invoices & Payments" },
            { id: "products", label: "Product Performance" },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveReport(t.id as any)}
              className={activeReport === t.id ? "primary-btn" : "action-btn"}
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button className="primary-btn" onClick={handleExportCurrent} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          📥 Export CSV ({activeReport.toUpperCase()})
        </button>
      </div>

      {/* Report Tables */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        {activeReport === "sales" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Salesperson</th>
                  <th>Date</th>
                  <th>Total Value</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {salesData.map((o: any) => (
                  <tr key={o.id}>
                    <td>
                      <strong>{o.orderNumber}</strong>
                      {o.isQuotation && (
                        <span style={{ marginLeft: '6px', fontSize: '0.65rem', backgroundColor: '#e0e7ff', color: '#4338ca', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                          Quote
                        </span>
                      )}
                    </td>
                    <td>{o.customer?.businessName || 'Unknown'}</td>
                    <td>{o.salesperson?.user?.name || o.salesperson?.name || 'Unassigned'}</td>
                    <td>{o.orderDate ? new Date(o.orderDate).toLocaleDateString() : '-'}</td>
                    <td style={{ fontWeight: 700 }}>₹{Number(o.totalValue || 0).toLocaleString('en-IN')}</td>
                    <td>
                      <span className={`status-badge ${o.paymentStatus === 'Paid' ? 'active' : o.paymentStatus === 'Partially Paid' ? 'warning' : 'inactive'}`}>{o.paymentStatus}</span>
                    </td>
                    <td>
                      <span className={`status-badge ${o.orderStatus === 'Delivered' || o.orderStatus === 'Confirmed Deal' ? 'active' : 'inactive'}`}>{o.orderStatus}</span>
                    </td>
                  </tr>
                ))}
                {salesData.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>No sales records found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === "inventory" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Stock Qty</th>
                  <th>Total Stock Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(inventoryData.products || []).map((p: any) => (
                  <tr key={p.id}>
                    <td><strong>{p.name}</strong></td>
                    <td>{p.sku || '-'}</td>
                    <td>{p.category || '-'}</td>
                    <td>₹{p.sellingPrice.toLocaleString()}</td>
                    <td style={{ fontWeight: 700 }}>{p.stockQuantity}</td>
                    <td>₹{(p.stockQuantity * p.sellingPrice).toLocaleString()}</td>
                    <td>
                      <span className={`status-badge ${p.stockQuantity > (p.minimumStock || 10) ? 'active' : 'danger'}`}>
                        {p.stockQuantity > (p.minimumStock || 10) ? 'In Stock' : 'Low Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === "financials" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Invoice Date</th>
                  <th>Due Date</th>
                  <th>Total Amount</th>
                  <th>Amount Paid</th>
                  <th>Amount Due</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(financialData.invoices || []).map((i: any) => (
                  <tr key={i.id}>
                    <td><strong>{i.invoiceNumber}</strong></td>
                    <td>{i.customer?.businessName}</td>
                    <td>{new Date(i.invoiceDate).toLocaleDateString()}</td>
                    <td>{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : '-'}</td>
                    <td>₹{i.totalAmount.toLocaleString()}</td>
                    <td style={{ color: 'var(--success)' }}>₹{i.amountPaid.toLocaleString()}</td>
                    <td style={{ color: i.amountDue > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 700 }}>₹{i.amountDue.toLocaleString()}</td>
                    <td><span className={`status-badge ${i.status === 'Paid' ? 'active' : 'warning'}`}>{i.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeReport === "products" && (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity Sold</th>
                  <th>Total Revenue</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(productSales || {}).map(([name, data]: any) => (
                  <tr key={name}>
                    <td><strong>{name}</strong></td>
                    <td>{data.qty}</td>
                    <td style={{ fontWeight: 700, color: 'var(--success)' }}>₹{data.value.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
