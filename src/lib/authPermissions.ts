import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const canUserAccessSection = cache(async function canUserAccessSection(sessionUser: any, sectionKey: string): Promise<boolean> {
  if (!sessionUser) return false;
  const role = sessionUser.role;
  if (role === 'SUPER_ADMIN' || role === 'ADMIN') return true;

  const dbUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { role: true, allowedSections: true, roleId: true }
  });

  if (!dbUser) return false;

  // Check custom role permissions if assigned
  if (dbUser.roleId) {
    const customRole = await prisma.role.findUnique({ where: { id: dbUser.roleId } });
    if (customRole?.permissions) {
      try {
        const perms = JSON.parse(customRole.permissions) as string[];
        const match = perms.some(p => {
          const lower = p.toLowerCase();
          if (sectionKey === 'credit_notes' || sectionKey === 'credit-notes') return lower.includes('credit');
          if (sectionKey === 'eway_bills' || sectionKey === 'eway-bills') return lower.includes('eway') || lower.includes('e-way');
          if (sectionKey === 'gst_filing' || sectionKey === 'gst-filing') return lower.includes('gst');
          if (sectionKey === 'hiring') return lower.includes('hiring') || lower.includes('interview');
          if (sectionKey === 'accounting') {
            return lower.includes('account') || lower.includes('invoice') || lower.includes('ledger') || lower.includes('voucher') || lower.includes('financial');
          }
          if (sectionKey === 'delivery_challans' || sectionKey === 'delivery-challans') {
            return lower.includes('dispatch') || lower.includes('challan') || lower.includes('shipment') || lower.includes('delivery');
          }
          if (sectionKey === 'purchases' || sectionKey === 'procurement') {
            return lower.includes("purchase") || lower.includes("procurement") || lower.includes("bill") || lower.includes("vendor");
          }
          if (sectionKey === 'production' || sectionKey === 'manufacturing') {
            return lower.includes('production') || lower.includes('manufacturing') || lower.includes('workshop') || lower.includes('factory');
          }
          return lower.includes(sectionKey.toLowerCase());
        });
        if (match) return true;
      } catch {}
    }
  }

  // Check allowedSections if configured
  if (dbUser.allowedSections) {
    try {
      let allowed: string[] = [];
      if (dbUser.allowedSections.startsWith('[')) {
        allowed = JSON.parse(dbUser.allowedSections);
      } else {
        allowed = dbUser.allowedSections.split(',').map(s => s.trim());
      }
      return (
        allowed.includes(sectionKey) ||
        (sectionKey === 'credit_notes' && allowed.includes('credit-notes')) ||
        (sectionKey === 'credit-notes' && allowed.includes('credit_notes')) ||
        (sectionKey === 'eway_bills' && (allowed.includes('eway-bills') || allowed.includes('eway'))) ||
        (sectionKey === 'eway-bills' && (allowed.includes('eway_bills') || allowed.includes('eway'))) ||
        (sectionKey === 'gst_filing' && (allowed.includes('gst-filing') || allowed.includes('gst') || allowed.includes('gst_filings'))) ||
        (sectionKey === 'gst-filing' && (allowed.includes('gst_filing') || allowed.includes('gst') || allowed.includes('gst_filings'))) ||
        (sectionKey === 'delivery_challans' && (allowed.includes('delivery-challans') || allowed.includes('dispatches'))) ||
        (sectionKey === 'delivery-challans' && (allowed.includes('delivery_challans') || allowed.includes('dispatches'))) ||
        (sectionKey === 'accounting' && (allowed.includes('invoices') || allowed.includes('payments') || allowed.includes('accounting'))) ||
        (sectionKey === 'purchases' && allowed.includes('procurement')) ||
        (sectionKey === 'procurement' && allowed.includes('purchases'))
      );
    } catch {}
  }

  // Fallback defaults for standard roles
  if (dbUser.role === 'PURCHASE' || dbUser.role === 'WAREHOUSE') {
    return ['purchases', 'procurement', 'products', 'dashboard', 'eway_bills', 'eway-bills', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
  }
  if (dbUser.role === 'SALES') {
    // Sales person ONLY has access to standard sales workflow (NO credit_notes, eway, gst_filing, hiring)
    return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
  }
  if (dbUser.role === 'DISPATCH') {
    return ['dashboard', 'dispatches', 'eway_bills', 'eway-bills', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
  }
  if (dbUser.role === 'ACCOUNTS') {
    return ['dashboard', 'accounting', 'invoices', 'payments', 'orders', 'hrms', 'purchases', 'procurement', 'credit_notes', 'credit-notes', 'gst_filing', 'gst-filing', 'reports', 'delivery-challans', 'delivery_challans'].includes(sectionKey);
  }
  if (dbUser.role === 'HR') {
    return ['dashboard', 'hrms', 'hiring'].includes(sectionKey);
  }
  if (dbUser.role === 'SUPPORT') {
    return ['dashboard', 'customers', 'calls_tasks'].includes(sectionKey);
  }

  return false;
});
