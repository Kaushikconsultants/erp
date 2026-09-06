import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeleCrmMobileHub from '@/components/telecalling/TeleCrmMobileHub';
import { getCompanySettings } from '@/app/actions/companyActions';
import { getOrCreateEmployee } from '@/lib/employeeHelper';
import { getTenantOrgId } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const rawOrgId = await getTenantOrgId().catch(() => null);
  const orgId = (rawOrgId && rawOrgId !== "default-org") ? rawOrgId : undefined;
  const userRole = (session.user as any).role || 'SALES';
  const userId = (session.user as any).id;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  let callWhereClause: any = orgId ? {
    OR: [
      { customer: { organizationId: orgId } },
      { lead: { organizationId: orgId } },
      { employee: { organizationId: orgId } }
    ]
  } : {};
  let customerWhereClause: any = orgId ? { organizationId: orgId } : {};
  let leadWhereClause: any = orgId ? { organizationId: orgId } : {};

  if (!isAdmin) {
    const employee = await getOrCreateEmployee(userId, session.user).catch(() => null);
    if (employee) {
      if (orgId) {
        callWhereClause = { 
          employeeId: employee.id, 
          OR: [
            { customer: { organizationId: orgId } },
            { lead: { organizationId: orgId } },
            { employee: { organizationId: orgId } }
          ]
        };
      } else {
        callWhereClause = { employeeId: employee.id };
      }
      customerWhereClause = { assignedSalespersonId: employee.id, ...(orgId ? { organizationId: orgId } : {}) };
      leadWhereClause = { assignedSalespersonId: employee.id, ...(orgId ? { organizationId: orgId } : {}) };
    }
  }

  const [calls, customers, leads, companyRes] = await Promise.all([
    prisma.call.findMany({
      where: callWhereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        lead: true,
        employee: {
          include: { user: true }
        }
      }
    }).catch(err => {
      console.warn("CallsPage call.findMany error:", err);
      return [];
    }),
    prisma.customer.findMany({
      where: customerWhereClause,
      select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true },
      orderBy: { businessName: 'asc' }
    }).catch(err => {
      console.warn("CallsPage customer.findMany error:", err);
      return [];
    }),
    prisma.lead.findMany({
      where: leadWhereClause,
      select: { id: true, name: true, shopName: true, whatsappNumber: true },
      orderBy: { name: 'asc' }
    }).catch(err => {
      console.warn("CallsPage lead.findMany error:", err);
      return [];
    }),
    getCompanySettings().catch(() => null)
  ]);

  const mappedCustomers = [
    ...(Array.isArray(customers) ? customers : []).map(c => ({
      id: c.id,
      companyName: c.businessName || "Customer",
      contactPerson: c.contactPerson || "",
      phone: c.mobile || c.whatsappNumber || '',
      city: c.city || '',
      type: 'Customer'
    })),
    ...(Array.isArray(leads) ? leads : []).map(l => ({
      id: l.id,
      companyName: l.shopName || l.name || "Lead",
      contactPerson: l.name || "",
      phone: l.whatsappNumber || '',
      city: '',
      type: 'Lead'
    }))
  ];

  const callOutcomes = companyRes?.settings?.callOutcomes || [
    "Interested / Follow-up Needed",
    "Order Placed / Deal Closed",
    "Quotation Requested",
    "Price Negotiation / Discount Discussion",
    "No Answer / Busy",
    "Voicemail / Switched Off",
    "Callback Scheduled",
    "Not Interested / Lost",
    "Wrong / Invalid Number",
    "Support / General Inquiry"
  ];
  const callTypes = companyRes?.settings?.callTypes || ["OUTBOUND", "INBOUND", "In-person Meeting", "WhatsApp Chat"];

  return (
    <div className="page-container" style={{ padding: "16px 12px" }}>
      <TeleCrmMobileHub
        initialCalls={calls}
        availableOutcomes={callOutcomes}
        availableCallTypes={callTypes}
        customers={mappedCustomers}
        isAdmin={isAdmin}
      />
    </div>
  );
}
