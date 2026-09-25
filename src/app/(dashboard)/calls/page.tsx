import React from 'react';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import TeleCrmMobileHub from '@/components/telecalling/TeleCrmMobileHub';
import { getCompanySettings } from '@/app/actions/companyActions';
import { getTenantScope } from '@/lib/tenant';

export const dynamic = 'force-dynamic';

export default async function CallsPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    redirect('/login');
  }

  const { organizationId, isAdmin, employeeId } = await getTenantScope();
  const orgId = (organizationId && organizationId !== "default-org" && organizationId !== "UNAUTHENTICATED") ? organizationId : undefined;
  const empId = employeeId || "no-match";

  let callWhereClause: any = {
    AND: [
      ...(orgId ? [{
        OR: [
          { customer: { organizationId: orgId } },
          { lead: { organizationId: orgId } },
          { employee: { organizationId: orgId } }
        ]
      }] : []),
      ...(!isAdmin ? [{
        OR: [
          { employeeId: empId },
          { customer: { assignedSalespersonId: empId } },
          { lead: { assignedSalespersonId: empId } }
        ]
      }] : [])
    ]
  };

  let customerWhereClause: any = {
    ...(orgId ? { organizationId: orgId } : {}),
    ...(!isAdmin ? { assignedSalespersonId: empId } : {})
  };

  let leadWhereClause: any = {
    ...(orgId ? { organizationId: orgId } : {}),
    ...(!isAdmin ? { assignedSalespersonId: empId } : {})
  };

  const [calls, customers, leads, companyRes] = await Promise.all([
    prisma.call.findMany({
      where: callWhereClause,
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: {
          select: {
            id: true,
            businessName: true,
            contactPerson: true,
            mobile: true,
            whatsappNumber: true,
            city: true,
            state: true
          }
        },
        lead: {
          select: {
            id: true,
            name: true,
            shopName: true,
            whatsappNumber: true
          }
        },
        employee: {
          select: {
            id: true,
            user: { select: { id: true, name: true } }
          }
        }
      }
    }).catch(err => {
      console.warn("CallsPage call.findMany error:", err);
      return [];
    }),
    prisma.customer.findMany({
      where: customerWhereClause,
      select: { id: true, businessName: true, contactPerson: true, mobile: true, whatsappNumber: true, city: true },
      take: 150,
      orderBy: { businessName: 'asc' }
    }).catch(err => {
      console.warn("CallsPage customer.findMany error:", err);
      return [];
    }),
    prisma.lead.findMany({
      where: leadWhereClause,
      select: { id: true, name: true, shopName: true, whatsappNumber: true },
      take: 150,
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
        currentEmployeeId={employeeId}
      />
    </div>
  );
}
