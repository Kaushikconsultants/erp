import { prisma } from "@/lib/prisma";

export async function canUserAccessSection(sessionUser: any, sectionKey: string): Promise<boolean> {
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
        if (sectionKey === 'purchases' || sectionKey === 'procurement') {
          if (perms.some(p => p.toLowerCase().includes("purchase") || p.toLowerCase().includes("procurement") || p.toLowerCase().includes("bill") || p.toLowerCase().includes("vendor"))) {
            return true;
          }
        }
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
        (sectionKey === 'purchases' && allowed.includes('procurement')) ||
        (sectionKey === 'procurement' && allowed.includes('purchases'))
      );
    } catch {}
  }

  // Fallback defaults for standard roles
  if (dbUser.role === 'PURCHASE' || dbUser.role === 'WAREHOUSE') {
    return ['purchases', 'procurement', 'products', 'dashboard'].includes(sectionKey);
  }
  if (dbUser.role === 'SALES') {
    // Sales person does NOT have access to purchases unless granted in allowedSections
    return ['dashboard', 'customers', 'calls_tasks', 'orders', 'quotations', 'products'].includes(sectionKey);
  }
  if (dbUser.role === 'DISPATCH') {
    return ['dashboard', 'dispatches'].includes(sectionKey);
  }
  if (dbUser.role === 'ACCOUNTS') {
    return ['dashboard', 'invoices', 'payments', 'orders', 'hrms', 'purchases', 'procurement', 'gst-filing', 'reports'].includes(sectionKey);
  }
  if (dbUser.role === 'HR') {
    return ['dashboard', 'hrms'].includes(sectionKey);
  }
  if (dbUser.role === 'SUPPORT') {
    return ['dashboard', 'customers', 'calls_tasks'].includes(sectionKey);
  }

  return false;
}
