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
    empOrders[empId].push({
      id: empId,
      taxableValue: mo.subtotal || mo.totalValue,
      discount: mo.discount || 0,
      isCreditCustomer: isCredit
    });
  }
  for (const [empId, ords] of Object.entries(empOrders)) {
    const result = calculateIncentives(ords);
    empSlabMap[empId] = { slabRate: result.slabRate, slabLabel: result.currentSlab };
  }

  const getCommissionInfo = (discount: number, isCredit: boolean, taxable: number, empId: string | null) => {
    if (discount > 15 || isCredit) {
      return { val: taxable * 0.01, avg: '1% (flat)' };
    }
    const slab = empSlabMap[empId || '__none__'] ?? { slabRate: 1, slabLabel: '1%' };
    const baseRate = slab.slabRate / 100;
    const bonusRate = discount === 0 ? 0.02 : 0;
    const totalRate = baseRate + bonusRate;
    const displayRate = parseFloat(slab.slabRate.toFixed(2));
    const avgLabel = discount === 0
      ? `${displayRate}%+2% bonus`
      : `${displayRate}% slab`;
    return { val: taxable * totalRate, avg: avgLabel };
  };

  const unifiedDocs: UnifiedDocument[] = [];

  // Map Confirmed Sales Orders
  orders.forEach(o => {
    const isCredit = o.customer?.status?.toLowerCase() === 'credit' || o.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const taxableAmount = o.subtotal || o.totalValue;
    const comm = getCommissionInfo(o.discount || 0, isCredit, taxableAmount, o.salespersonId);

    let badge = '1–15% Disc.';
    if (o.discount === 0) badge = '0% (Bonus)';
    else if (o.discount > 15 || isCredit) badge = '>15% / Credit';

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
      paymentType: o.paymentStatus === 'Paid' ? 'Prepaid' : (o.paymentStatus || 'COD'),
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

  // Map Quotations for the Quotations Tab
  quotations.forEach(q => {
    const isCredit = q.customer?.status?.toLowerCase() === 'credit' || q.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const taxableAmount = q.subtotal || q.totalValue;
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
      paymentType: 'Quotation',
      discountBadge: `${q.discount || 0}% Disc.`,
      discountColor: 'var(--accent-primary, #4f46e5)',
      commissionValue: 0,
      commissionAvg: 'Estimate',
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
