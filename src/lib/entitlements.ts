/**
 * Enterprise Multi-Tenant Entitlements & Feature Gating Engine
 *
 * Single Source of Truth (SSoT) for:
 * 1. Plan tier packaging (Starter, Growth, Enterprise).
 * 2. Granular module definitions and capability matrix.
 * 3. Tenant-specific add-ons & super-admin overrides.
 * 4. Account lifecycle states (Active, Trial, Past Due, Suspended).
 * 5. Server-action and routing security assertions.
 */

import { getTenantContext, TenantContext } from "@/lib/tenant";

export type AppModule =
  | 'TELECRM'
  | 'QUOTATIONS_INVOICING'
  | 'INVENTORY_PURCHASE'
  | 'ACCOUNTING_LEDGERS'
  | 'PRODUCTION_MANUFACTURING'
  | 'HRMS_PAYROLL'
  | 'GST_EWAYBILL'
  | 'WHATSAPP_AUTOMATION'
  | 'AI_COPILOT_SCANNER';

export interface ModuleDefinition {
  id: AppModule;
  name: string;
  shortLabel: string;
  category: 'CORE' | 'OPERATIONS' | 'FINANCE' | 'ADDON';
  description: string;
  badgeText?: string;
  badgeColor?: string;
  minTier: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
}

export const MODULE_REGISTRY: Record<AppModule, ModuleDefinition> = {
  TELECRM: {
    id: 'TELECRM',
    name: 'TeleCRM & Sales Pipeline',
    shortLabel: 'CRM',
    category: 'CORE',
    description: 'Leads, Call logs, Call reminders, Follow-ups, and Kanban Sales Pipeline',
    badgeText: 'CRM',
    badgeColor: '#8b5cf6',
    minTier: 'STARTER'
  },
  QUOTATIONS_INVOICING: {
    id: 'QUOTATIONS_INVOICING',
    name: 'Quotations & B2B Invoicing',
    shortLabel: 'Sales',
    category: 'CORE',
    description: 'Quotations, Proforma Invoices, Tax Invoices, Delivery Challans, Credit & Debit Notes',
    badgeText: 'CORE',
    badgeColor: '#2563eb',
    minTier: 'STARTER'
  },
  INVENTORY_PURCHASE: {
    id: 'INVENTORY_PURCHASE',
    name: 'Purchases & Multi-Warehouse Inventory',
    shortLabel: 'Inventory',
    category: 'OPERATIONS',
    description: 'Vendor management, Purchase Orders, Goods Receipt (GRN), Bills, and Stock Transfers',
    badgeText: 'OPS',
    badgeColor: '#059669',
    minTier: 'GROWTH'
  },
  ACCOUNTING_LEDGERS: {
    id: 'ACCOUNTING_LEDGERS',
    name: 'Double-Entry Accounting & Ledgers',
    shortLabel: 'Accounting',
    category: 'FINANCE',
    description: 'Chart of Accounts, Journal Vouchers (JV), P&L, Balance Sheet, Ageing (0-90D), BRS & PDC',
    badgeText: 'FIN',
    badgeColor: '#d97706',
    minTier: 'GROWTH'
  },
  PRODUCTION_MANUFACTURING: {
    id: 'PRODUCTION_MANUFACTURING',
    name: 'Production & Workshop Manufacturing',
    shortLabel: 'Production',
    category: 'OPERATIONS',
    description: 'Bill of Materials (BOM), Work Orders, Production runs, and Workshop progress tracking',
    badgeText: 'MFG',
    badgeColor: '#7c3aed',
    minTier: 'ENTERPRISE'
  },
  HRMS_PAYROLL: {
    id: 'HRMS_PAYROLL',
    name: 'HRMS, Attendance & Payroll Suite',
    shortLabel: 'HRMS',
    category: 'ADDON',
    description: 'Biometric attendance, Staff leaves, Salary slips, Hiring portal, and Expense approvals',
    badgeText: 'HRMS',
    badgeColor: '#db2777',
    minTier: 'ENTERPRISE'
  },
  GST_EWAYBILL: {
    id: 'GST_EWAYBILL',
    name: 'GST Direct Filing & E-Way Bills',
    shortLabel: 'GST & EWB',
    category: 'FINANCE',
    description: 'Direct GSTN Portal filing (GSTR-1, 3B, 2B) and 1-Click E-Way Bill generation',
    badgeText: 'GSTN',
    badgeColor: '#0284c7',
    minTier: 'GROWTH'
  },
  WHATSAPP_AUTOMATION: {
    id: 'WHATSAPP_AUTOMATION',
    name: 'WhatsApp AI & Customer Automation',
    shortLabel: 'WhatsApp',
    category: 'ADDON',
    description: 'Automated invoice PDFs, payment reminders, order status, and WhatsApp campaigns',
    badgeText: 'WA',
    badgeColor: '#10b981',
    minTier: 'STARTER'
  },
  AI_COPILOT_SCANNER: {
    id: 'AI_COPILOT_SCANNER',
    name: 'AI ERP Copilot & Document OCR Scanner',
    shortLabel: 'AI Suite',
    category: 'ADDON',
    description: 'Intelligent AI voice assistant, OCR invoice scanner, and AI deadstock/reorder advisor',
    badgeText: 'AI',
    badgeColor: '#6366f1',
    minTier: 'ENTERPRISE'
  }
};

/**
 * Baseline plan tier module entitlements
 */
export const TIER_DEFAULT_MODULES: Record<string, AppModule[]> = {
  STARTER: [
    'TELECRM',
    'QUOTATIONS_INVOICING',
    'WHATSAPP_AUTOMATION'
  ],
  GROWTH: [
    'TELECRM',
    'QUOTATIONS_INVOICING',
    'INVENTORY_PURCHASE',
    'ACCOUNTING_LEDGERS',
    'GST_EWAYBILL',
    'WHATSAPP_AUTOMATION'
  ],
  ENTERPRISE: [
    'TELECRM',
    'QUOTATIONS_INVOICING',
    'INVENTORY_PURCHASE',
    'ACCOUNTING_LEDGERS',
    'PRODUCTION_MANUFACTURING',
    'HRMS_PAYROLL',
    'GST_EWAYBILL',
    'WHATSAPP_AUTOMATION',
    'AI_COPILOT_SCANNER'
  ],
  CUSTOM: [
    'TELECRM',
    'QUOTATIONS_INVOICING',
    'INVENTORY_PURCHASE',
    'ACCOUNTING_LEDGERS',
    'PRODUCTION_MANUFACTURING',
    'HRMS_PAYROLL',
    'GST_EWAYBILL',
    'WHATSAPP_AUTOMATION',
    'AI_COPILOT_SCANNER'
  ]
};

export interface TenantEntitlements {
  plan: string;
  status: string;
  isHardLocked: boolean;
  isSoftLocked: boolean;
  trialDaysRemaining: number | null;
  modules: Record<AppModule, boolean>;
}

/**
 * Resolves an organization's active entitlements by combining:
 * 1. Plan tier baseline
 * 2. Tenant lifecycle status (Active, Trial, Past Due, Expired)
 * 3. Tenant-specific granular toggle overrides
 */
export function resolveTenantEntitlements(org: {
  subscriptionPlan?: string | null;
  subscriptionStatus?: string | null;
  trialEndsAt?: Date | string | null;
  isGstEnabled?: boolean | null;
  isWhatsAppEnabled?: boolean | null;
  isEWayBillEnabled?: boolean | null;
  isHrmsEnabled?: boolean | null;
  isProductionEnabled?: boolean | null;
  isAiScannerEnabled?: boolean | null;
  isTeleCrmEnabled?: boolean | null;
  isInventoryEnabled?: boolean | null;
  isAccountingEnabled?: boolean | null;
  isQuotationsEnabled?: boolean | null;
}): TenantEntitlements {
  const plan = (org.subscriptionPlan || 'GROWTH').toUpperCase();
  const rawStatus = (org.subscriptionStatus || 'ACTIVE').toUpperCase();
  const now = new Date();

  let isTrialExpired = false;
  let trialDaysRemaining: number | null = null;

  if (rawStatus === 'TRIAL') {
    if (org.trialEndsAt) {
      const trialEnd = new Date(org.trialEndsAt);
      const diffMs = trialEnd.getTime() - now.getTime();
      trialDaysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      if (diffMs <= 0) {
        isTrialExpired = true;
      }
    } else {
      trialDaysRemaining = 14;
    }
  }

  const isHardLocked = 
    rawStatus === 'EXPIRED' || 
    rawStatus === 'SUSPENDED' || 
    rawStatus === 'CANCELLED' || 
    isTrialExpired;

  const isSoftLocked = rawStatus === 'PAST_DUE';

  // Base tier entitlements
  const tierDefaults = new Set<AppModule>(TIER_DEFAULT_MODULES[plan] || TIER_DEFAULT_MODULES.GROWTH);

  // Helper to resolve individual toggle: explicit DB boolean takes precedence over tier default
  const resolveModule = (
    moduleKey: AppModule, 
    customFlag?: boolean | null
  ): boolean => {
    if (customFlag !== undefined && customFlag !== null) {
      return customFlag;
    }
    return tierDefaults.has(moduleKey);
  };

  const modules: Record<AppModule, boolean> = {
    TELECRM: resolveModule('TELECRM', org.isTeleCrmEnabled),
    QUOTATIONS_INVOICING: resolveModule('QUOTATIONS_INVOICING', org.isQuotationsEnabled),
    INVENTORY_PURCHASE: resolveModule('INVENTORY_PURCHASE', org.isInventoryEnabled),
    ACCOUNTING_LEDGERS: resolveModule('ACCOUNTING_LEDGERS', org.isAccountingEnabled),
    PRODUCTION_MANUFACTURING: resolveModule('PRODUCTION_MANUFACTURING', org.isProductionEnabled),
    HRMS_PAYROLL: resolveModule('HRMS_PAYROLL', org.isHrmsEnabled),
    GST_EWAYBILL: resolveModule('GST_EWAYBILL', (org.isGstEnabled !== undefined || org.isEWayBillEnabled !== undefined) ? (Boolean(org.isGstEnabled) || Boolean(org.isEWayBillEnabled)) : undefined),
    WHATSAPP_AUTOMATION: resolveModule('WHATSAPP_AUTOMATION', org.isWhatsAppEnabled),
    AI_COPILOT_SCANNER: resolveModule('AI_COPILOT_SCANNER', org.isAiScannerEnabled),
  };

  return {
    plan,
    status: isTrialExpired ? 'EXPIRED' : rawStatus,
    isHardLocked,
    isSoftLocked,
    trialDaysRemaining,
    modules
  };
}

/**
 * Route protection: Maps application path prefix to required module
 */
export function getRequiredModuleForPath(pathname: string): AppModule | null {
  if (pathname.startsWith('/production')) return 'PRODUCTION_MANUFACTURING';
  if (pathname.startsWith('/payroll') || pathname.startsWith('/attendance') || pathname.startsWith('/leaves') || pathname.startsWith('/hiring')) {
    return 'HRMS_PAYROLL';
  }
  if (
    pathname.startsWith('/purchases') || 
    pathname.startsWith('/vendors') || 
    pathname.startsWith('/bills') || 
    pathname.startsWith('/payments-made') || 
    pathname.startsWith('/vendor-credits') || 
    pathname.startsWith('/warehouses')
  ) {
    return 'INVENTORY_PURCHASE';
  }
  if (pathname.startsWith('/accounting')) return 'ACCOUNTING_LEDGERS';
  if (pathname.startsWith('/gst-filing') || pathname.startsWith('/eway-bills')) return 'GST_EWAYBILL';
  if (
    pathname.startsWith('/leads') || 
    pathname.startsWith('/calls') || 
    pathname.startsWith('/follow-ups') || 
    pathname.startsWith('/pipeline') || 
    pathname.startsWith('/tasks')
  ) {
    return 'TELECRM';
  }
  return null;
}

/**
 * Server-side guard: Call inside Server Actions to prevent unauthorized execution
 */
export async function assertTenantModuleAccess(moduleKey: AppModule): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) {
    throw new Error("Authentication required to perform this action.");
  }

  // Platform root super-admin bypasses plan limits
  if (ctx.isPlatformOwner) {
    return ctx;
  }

  // Check account hard lockout
  if (ctx.isHardLocked) {
    throw new Error("Your subscription has expired or is suspended. Please renew your plan in Settings > Billing.");
  }

  // Check module entitlement
  const hasAccess = ctx.enabledModules?.[moduleKey] ?? true;
  if (!hasAccess) {
    const meta = MODULE_REGISTRY[moduleKey];
    throw new Error(
      `Access Denied: The "${meta.name}" module is not included in your organization's subscription plan. Please upgrade to ${meta.minTier} or contact support to enable this add-on.`
    );
  }

  return ctx;
}
