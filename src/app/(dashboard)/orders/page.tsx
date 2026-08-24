import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import CreateOrderButton from '@/components/ui/CreateOrderButton';
import OrderListClient, { UnifiedDocument } from '@/components/orders/OrderListClient';
import { calculateIncentives, OrderData } from '@/lib/incentiveEngine';
import { getOrCreateEmployee } from '@/lib/employeeHelper';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;

  let orderWhereClause: any = {};
  let customerWhereClause: any = {};

  if (userRole === 'SALES') {
    const employee = await getOrCreateEmployee(userId, session.user);
    if (employee) {
      orderWhereClause = { salespersonId: employee.id };
      customerWhereClause = { assignedSalespersonId: employee.id };
    }
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
          items: { include: { product: true } }
        }
      }),
      prisma.customer.findMany({
        where: customerWhereClause,
        select: { id: true, businessName: true },
        orderBy: { businessName: 'asc' }
      }),
      prisma.product.findMany({
        select: { id: true, name: true, sellingPrice: true },
        where: { stockQuantity: { gt: 0 } },
        orderBy: { name: 'asc' }
      }),
      (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN')
        ? prisma.employee.findMany({ include: { user: true }, orderBy: { user: { name: 'asc' } } })
        : Promise.resolve([]),
      prisma.quotation.findMany({
        where: userRole === 'SALES' ? { salespersonId: userId } : {},
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          salesperson: { include: { user: true } }
        }
      })
    ]);

    if (results[0].status === 'fulfilled') orders = results[0].value;
    if (results[1].status === 'fulfilled') customers = results[1].value;
    if (results[2].status === 'fulfilled') products = results[2].value;
    if (results[3].status === 'fulfilled') employeesRaw = results[3].value as any[];
    if (results[4].status === 'fulfilled') quotations = results[4].value;
  } catch (err) {
    console.error("Error fetching orders data:", err);
  }

  const mappedCustomers = customers.map(c => ({ id: c.id, companyName: c.businessName }));
  const mappedProducts = products.map(p => ({ id: p.id, name: p.name, price: p.sellingPrice }));
  const allEmployees = employeesRaw.map(e => ({ id: e.id, name: e.user?.name || 'Unknown' }));

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('printed') || s.includes('processing')) return { bg: '#fef9c3', color: '#854d0e' };
    if (s.includes('transit') || s.includes('ofd') || s.includes('out for delivery')) return { bg: '#cffafe', color: '#0369a1' };
    if (s.includes('delivered') || s.includes('converted')) return { bg: '#dcfce3', color: '#166534' };
    if (s.includes('pending')) return { bg: '#f1f5f9', color: '#475569' };
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

  orders.forEach(o => {
    const isCredit = o.customer?.status?.toLowerCase() === 'credit' || o.customer?.preferredPaymentMethod?.toLowerCase() === 'credit';
    const taxableAmount = o.subtotal || o.totalValue;
    const comm = getCommissionInfo(o.discount, isCredit, taxableAmount, o.salespersonId);

    let badge = '1–15% Disc.';
    if (o.discount === 0) badge = '0% (Bonus)';
    else if (o.discount > 15 || isCredit) badge = '>15% / Credit';

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
      discountColor: '#4f46e5',
      commissionValue: comm.val,
      commissionAvg: comm.avg,
      documentNumber: o.orderNumber,
      status: o.shippingStatus || o.orderStatus,
      statusColor: getStatusStyle(o.shippingStatus || o.orderStatus).color,
      statusBg: getStatusStyle(o.shippingStatus || o.orderStatus).bg,
      awbNumber: o.awbNumber,
      notes: o.notes || '-',
      isCreditCustomer: isCredit
    });
  });

  // Only include actual confirmed Sales Orders in the Orders section
  unifiedDocs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="page-container" style={{ maxWidth: '1400px', margin: '0 auto' }}>
      <div className="dashboard-header" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">Sales Orders & Invoices</h1>
          <p className="page-subtitle">Track confirmed orders, shipping statuses, and sales commissions.</p>
        </div>
        <CreateOrderButton customers={mappedCustomers} products={mappedProducts} employees={allEmployees} />
      </div>

      <OrderListClient documents={unifiedDocs} agents={allEmployees} />
    </div>
  );
}
