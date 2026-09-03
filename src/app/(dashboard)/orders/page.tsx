import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateOrderButton from '@/components/ui/CreateOrderButton';
import OrderListClient, { UnifiedDocument } from '@/components/orders/OrderListClient';
import { calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { getTenantScope } from '@/lib/tenant';
import { ShoppingBag, ShieldCheck, UserCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin, employeeId, userName } = await getTenantScope();

  let orderWhereClause: any = { organizationId };
  let customerWhereClause: any = { organizationId };
  let quotationWhereClause: any = { organizationId };

  // Strict Scoping: Sales Candidate / Non-Admin can ONLY see orders, quotations & customers assigned to them
  if (!isAdmin) {
    const empId = employeeId || 'unassigned';
    orderWhereClause = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
      OR: [
        { salespersonId: empId },
        { customer: { assignedSalespersonId: empId } }
      ]
    };
    customerWhereClause = { 
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
      OR: [
        { assignedSalespersonId: empId },
        { quotations: { some: { salespersonId: empId } } },
        { orders: { some: { salespersonId: empId } } }
      ]
    };
    quotationWhereClause = {
      ...(organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : {}),
      OR: [
        { salespersonId: empId },
        { customer: { assignedSalespersonId: empId } }
      ]
    };
  }

  let orders: any[] = [];
  let customers: any[] = [];
  let products: any[] = [];
  let employeesRaw: any[] = [];
  let quotations: any[] = [];

  try {
    const results = await Promise.allSettled([
      prisma.order.findMany({
        where: orderWhereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          salesperson: { include: { user: true } },
          items: { include: { product: true } }
        }
      }),
      prisma.customer.findMany({
        where: customerWhereClause,
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' }
      }),
      prisma.product.findMany({
        where: { organizationId, stockQuantity: { gt: 0 } },
        select: { id: true, name: true, sellingPrice: true },
        orderBy: { name: 'asc' }
      }),
      prisma.employee.findMany({
        where: { organizationId },
        include: { user: true },
        orderBy: { user: { name: 'asc' } }
      }),
      prisma.quotation.findMany({
        where: quotationWhereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          salesperson: { include: { user: true } },
          items: { include: { product: true } }
        }
      })
    ]);

    if (results[0].status === 'fulfilled') orders = results[0].value;
    if (results[1].status === 'fulfilled') customers = results[1].value;
    if (results[2].status === 'fulfilled') products = results[2].value;
    if (results[3].status === 'fulfilled') {
      const allEmps = results[3].value as any[];
      // If non-admin, restrict available salesperson list in order creation to only themselves
      employeesRaw = isAdmin 
        ? allEmps 
        : allEmps.filter(e => e.id === employeeId || e.userId === (session.user as any)?.id);
    }
    if (results[4].status === 'fulfilled') quotations = results[4].value;
  } catch (err) {
    console.error("Error fetching orders data:", err);
  }

  const mappedCustomers = customers.map(c => ({ id: c.id, companyName: c.businessName }));
  const mappedProducts = products.map(p => ({ id: p.id, name: p.name, price: p.sellingPrice }));
  const allEmployees = employeesRaw.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }));

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('printed') || s.includes('processing')) return { bg: '#fef3c7', color: '#854d0e' };
    if (s.includes('transit') || s.includes('ofd') || s.includes('out for delivery')) return { bg: '#cffafe', color: '#0369a1' };
    if (s.includes('delivered') || s.includes('converted') || s.includes('accepted')) return { bg: '#dcfce7', color: '#166534' };
    if (s.includes('pending') || s.includes('draft')) return { bg: '#f1f5f9', color: '#475569' };
    if (s.includes('cancelled') || s.includes('declined') || s.includes('rejected')) return { bg: '#fee2e2', color: '#991b1b' };
    return { bg: '#f1f5f9', color: '#475569' };
  };

  // Compute real monthly slab rate per employee
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const startOfMonth = new Date(currentYear, currentMonth, 1);
  const endOfMonth   = new Date(currentYear, currentMonth + 1, 1);

  let monthlyOrders: any[] = [];
  try {
    monthlyOrders = await prisma.order.findMany({
      where: {
        ...orderWhereClause,
        orderDate: { gte: startOfMonth, lt: endOfMonth }
      },
      select: {
        salespersonId: true,
        subtotal: true,
        totalValue: true,
        discount: true,
        customer: { select: { status: true, preferredPaymentMethod: true } }
      }
    });
  } catch (err) {
    console.error("Monthly orders query error:", err);
  }

  const empSlabMap: Record<string, { slabRate: number; slabLabel: string }> = {};
  const empOrders: Record<string, OrderData[]> = {};
  for (const mo of monthlyOrders) {
    const empId = mo.salespersonId || '__none__';
    if (!empOrders[empId]) empOrders[empId] = [];
    const isCredit = mo.customer?.status?.toLowerCase() === 'credit' || mo.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const grossVal = mo.subtotal || mo.totalValue || 0;
    const discVal = mo.discount || 0;
    const taxableVal = Math.max(0, grossVal - discVal);
    const discountPct = grossVal > 0 && discVal > 0 ? (discVal / grossVal) * 100 : 0;
    empOrders[empId].push({
      id: empId,
      taxableValue: taxableVal,
      discount: discountPct,
      isCreditCustomer: isCredit
    });
  }
  for (const [empId, ords] of Object.entries(empOrders)) {
    const result = calculateIncentives(ords);
    empSlabMap[empId] = { slabRate: result.slabRate, slabLabel: result.currentSlab };
  }

  const getCommissionInfo = (discount: number, isCredit: boolean, taxable: number, empId: string | null) => {
    if (discount > 15 || isCredit) {
      return { val: Math.round(taxable * 0.01), avg: '1% (flat)' };
    }
    const slab = empSlabMap[empId || '__none__'] ?? { slabRate: 1, slabLabel: '1%' };
    const baseRate = slab.slabRate / 100;
    const bonusRate = discount === 0 ? 0.02 : 0;
    const totalRate = baseRate + bonusRate;
    const displayRate = parseFloat(slab.slabRate.toFixed(2));
    const avgLabel = discount === 0
      ? `${displayRate}%+2% bonus`
      : `${displayRate}% slab`;
    return { val: Math.round(taxable * totalRate), avg: avgLabel };
  };

  const unifiedDocs: UnifiedDocument[] = [];

  // Map Confirmed Sales Orders
  orders.forEach(o => {
    const isCredit = o.customer?.status?.toLowerCase() === 'credit' || o.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const grossSubtotal = o.subtotal || o.totalValue || 0;
    const discountAmt = o.discount || 0;
    const taxableAmount = Math.max(0, grossSubtotal - discountAmt);
    const discountPct = grossSubtotal > 0 && discountAmt > 0 ? (discountAmt / grossSubtotal) * 100 : 0;
    const comm = getCommissionInfo(discountPct, isCredit, taxableAmount, o.salespersonId);

    let badge = '0% (Bonus)';
    if (isCredit) {
      badge = 'Credit Customer';
    } else if (discountPct > 15) {
      badge = `${discountPct.toFixed(0)}% Disc.`;
    } else if (discountPct > 0) {
      badge = `${discountPct.toFixed(0)}% Disc.`;
    }

    let paymentType = 'Unpaid';
    if (o.paymentStatus === 'Paid') {
      paymentType = 'Prepaid';
    } else if (o.paymentStatus === 'Partially Paid' || (o.paymentReceived || 0) > 0) {
      paymentType = (o.paymentReceived || 0) > 0 ? `Token (₹${Math.round(o.paymentReceived).toLocaleString('en-IN')})` : 'Partially Paid';
    } else if (o.paymentStatus === 'Credit' || isCredit) {
      paymentType = 'Credit';
    } else if (o.paymentStatus === 'COD') {
      paymentType = 'COD';
    } else {
      paymentType = o.paymentStatus || 'Unpaid';
    }

    const statusObj = getStatusStyle(o.shippingStatus || o.orderStatus);

    unifiedDocs.push({
      id: o.id,
      type: 'Order',
      date: formatDate(o.createdAt),
      customerName: o.customer?.businessName || 'Unknown',
      customerSub: o.customer?.contactPerson || '',
      agentName: (o as any).salesperson?.user?.name || allEmployees.find(e => e.id === o.salespersonId)?.name || 'Unknown',
      totalAmount: o.totalValue,
      taxableAmount: taxableAmount,
      paymentType: paymentType,
      discountBadge: badge,
      discountColor: 'var(--accent-primary, #4f46e5)',
      commissionValue: comm.val,
      commissionAvg: comm.avg,
      documentNumber: o.orderNumber,
      status: o.shippingStatus || o.orderStatus,
      statusColor: statusObj.color,
      statusBg: statusObj.bg,
      awbNumber: o.awbNumber,
      notes: o.notes || '-',
      isCreditCustomer: isCredit
    });
  });

  // Collect quotation numbers that have already been converted into Orders to prevent duplicates
  const convertedQuoteNumbers = new Set<string>();
  orders.forEach(o => {
    const match = (o.notes || '').match(/Quotation #([A-Za-z0-9-]+)/);
    if (match && match[1]) {
      convertedQuoteNumbers.add(match[1].trim());
    }
  });

  // Map Quotations: Exclude converted quotations that are already represented as Sales Orders
  quotations.forEach(q => {
    if (q.status === 'Converted' || convertedQuoteNumbers.has((q.quotationNumber || '').trim())) {
      return;
    }

    const isCredit = q.customer?.status?.toLowerCase() === 'credit' || q.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const grossSubtotal = q.subtotal || 0;
    const itemDisc = q.itemDiscount || 0;
    const addDisc = q.additionalDiscount || 0;
    const totalDiscountAmt = itemDisc + addDisc;
    const taxableAmount = (q.taxableAmount && q.taxableAmount > 0)
      ? q.taxableAmount
      : Math.max(0, grossSubtotal - totalDiscountAmt) || q.totalValue;

    const discountPct = grossSubtotal > 0 && totalDiscountAmt > 0
      ? (totalDiscountAmt / grossSubtotal) * 100
      : (q.discountSlab === '1-15' ? 15 : (q.discountSlab === '>15' ? 16 : 0));

    const comm = getCommissionInfo(discountPct, isCredit, taxableAmount, q.salespersonId);

    let badge = '0% (Bonus)';
    if (isCredit || q.discountSlab === 'credit') {
      badge = 'Credit Customer';
    } else if (discountPct > 15 || q.discountSlab === '>15') {
      badge = `${discountPct.toFixed(0)}% Disc.`;
    } else if (discountPct > 0 || q.discountSlab === '1-15') {
      badge = `${discountPct.toFixed(0)}% Disc.`;
    }

    let paymentType = 'Unpaid';
    if (q.receivedAmount && q.receivedAmount >= q.totalValue) {
      paymentType = 'Prepaid';
    } else if (q.receivedAmount && q.receivedAmount > 0) {
      paymentType = `Token (₹${Math.round(q.receivedAmount).toLocaleString('en-IN')})`;
    } else if (isCredit || q.customer?.preferredPaymentMethod?.toLowerCase() === 'credit') {
      paymentType = 'Credit';
    } else if (q.paymentTerms?.toLowerCase().includes('advance') || q.paymentTerms?.toLowerCase().includes('prepaid')) {
      paymentType = 'Prepaid';
    } else if (q.paymentTerms?.toLowerCase().includes('cod')) {
      paymentType = 'COD';
    } else {
      paymentType = 'Unpaid';
    }

    const statusObj = getStatusStyle(q.status);

    unifiedDocs.push({
      id: q.id,
      type: 'Quotation',
      date: formatDate(q.createdAt || q.date),
      customerName: q.customer?.businessName || 'Unknown',
      customerSub: q.customer?.contactPerson || '',
      agentName: (q as any).salesperson?.user?.name || allEmployees.find(e => e.id === q.salespersonId)?.name || 'Unknown',
      totalAmount: q.totalValue,
      taxableAmount: taxableAmount,
      paymentType: paymentType,
      discountBadge: badge,
      discountColor: 'var(--accent-primary, #4f46e5)',
      commissionValue: comm.val,
      commissionAvg: `${comm.avg} (Est.)`,
      documentNumber: q.quotationNumber,
      status: q.status || 'Draft',
      statusColor: statusObj.color,
      statusBg: statusObj.bg,
      awbNumber: null,
      notes: q.notes || 'Quotation Estimate',
      isCreditCustomer: isCredit
    });
  });

  unifiedDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page-container" style={{ maxWidth: '1440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ─── PAGE HEADER WITH THEME MATCHING ─── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0, fontSize: '1.5rem', fontWeight: 600, color: '#0f172a', letterSpacing: '-0.02em' }}>
            <ShoppingBag style={{ color: "var(--accent-primary, #4f46e5)" }} size={26} />
            Sales Orders & Invoices
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            <p className="page-subtitle" style={{ margin: 0, color: '#64748b', fontSize: '0.875rem', fontWeight: 400 }}>
              Track confirmed orders, shipping statuses, and sales commissions.
            </p>
            {!isAdmin && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: 'var(--accent-light, #eff6ff)',
                color: 'var(--accent-primary, #4f46e5)',
                border: '1px solid rgba(79, 70, 229, 0.2)',
                fontSize: '0.72rem',
                fontWeight: 500
              }}>
                <UserCheck size={12} />
                My Assigned Customers ({mappedCustomers.length})
              </span>
            )}
            {isAdmin && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '9999px',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                fontSize: '0.72rem',
                fontWeight: 500
              }}>
                <ShieldCheck size={12} />
                All Organization Orders
              </span>
            )}
          </div>
        </div>

        <CreateOrderButton 
          customers={mappedCustomers} 
          products={mappedProducts} 
          employees={allEmployees} 
        />
      </div>

      {/* ─── CLIENT DATA TABLE WITH MODERN THEME SUITE ─── */}
      <OrderListClient 
        documents={unifiedDocs} 
        agents={allEmployees}
        isAdmin={isAdmin}
        currentUserEmployeeId={employeeId || undefined}
        currentUserName={userName}
      />
    </div>
  );
}
