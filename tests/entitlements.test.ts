import { describe, it, expect } from 'vitest';
import { 
  resolveTenantEntitlements, 
  getRequiredModuleForPath, 
  TIER_DEFAULT_MODULES,
  MODULE_REGISTRY 
} from '../src/lib/entitlements';

describe('Enterprise Multi-Tenant Entitlements Engine', () => {

  describe('Module Registry Integrity', () => {
    it('contains metadata for all core and addon modules', () => {
      expect(MODULE_REGISTRY.TELECRM).toBeDefined();
      expect(MODULE_REGISTRY.QUOTATIONS_INVOICING).toBeDefined();
      expect(MODULE_REGISTRY.INVENTORY_PURCHASE).toBeDefined();
      expect(MODULE_REGISTRY.ACCOUNTING_LEDGERS).toBeDefined();
      expect(MODULE_REGISTRY.PRODUCTION_MANUFACTURING).toBeDefined();
      expect(MODULE_REGISTRY.HRMS_PAYROLL).toBeDefined();
      expect(MODULE_REGISTRY.GST_EWAYBILL).toBeDefined();
      expect(MODULE_REGISTRY.WHATSAPP_AUTOMATION).toBeDefined();
      expect(MODULE_REGISTRY.AI_COPILOT_SCANNER).toBeDefined();
    });

    it('specifies the correct minTier per module', () => {
      expect(MODULE_REGISTRY.TELECRM.minTier).toBe('STARTER');
      expect(MODULE_REGISTRY.INVENTORY_PURCHASE.minTier).toBe('GROWTH');
      expect(MODULE_REGISTRY.PRODUCTION_MANUFACTURING.minTier).toBe('ENTERPRISE');
      expect(MODULE_REGISTRY.HRMS_PAYROLL.minTier).toBe('ENTERPRISE');
    });
  });

  describe('Tier Baseline Entitlements', () => {
    it('resolves STARTER plan to basic CRM and Invoicing only', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'STARTER',
        subscriptionStatus: 'ACTIVE',
      });

      expect(entitlements.modules.TELECRM).toBe(true);
      expect(entitlements.modules.QUOTATIONS_INVOICING).toBe(true);
      expect(entitlements.modules.WHATSAPP_AUTOMATION).toBe(true);

      // Enterprise and Growth features locked
      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(false);
      expect(entitlements.modules.HRMS_PAYROLL).toBe(false);
      expect(entitlements.modules.ACCOUNTING_LEDGERS).toBe(false);
      expect(entitlements.modules.INVENTORY_PURCHASE).toBe(false);
    });

    it('resolves GROWTH plan to include purchases, GST, and basic accounting', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
      });

      expect(entitlements.modules.TELECRM).toBe(true);
      expect(entitlements.modules.QUOTATIONS_INVOICING).toBe(true);
      expect(entitlements.modules.INVENTORY_PURCHASE).toBe(true);
      expect(entitlements.modules.ACCOUNTING_LEDGERS).toBe(true);
      expect(entitlements.modules.GST_EWAYBILL).toBe(true);

      // Enterprise modules locked by default
      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(false);
      expect(entitlements.modules.HRMS_PAYROLL).toBe(false);
      expect(entitlements.modules.AI_COPILOT_SCANNER).toBe(false);
    });

    it('resolves ENTERPRISE plan with all modules unlocked', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
      });

      expect(entitlements.modules.TELECRM).toBe(true);
      expect(entitlements.modules.QUOTATIONS_INVOICING).toBe(true);
      expect(entitlements.modules.INVENTORY_PURCHASE).toBe(true);
      expect(entitlements.modules.ACCOUNTING_LEDGERS).toBe(true);
      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(true);
      expect(entitlements.modules.HRMS_PAYROLL).toBe(true);
      expect(entitlements.modules.GST_EWAYBILL).toBe(true);
      expect(entitlements.modules.WHATSAPP_AUTOMATION).toBe(true);
      expect(entitlements.modules.AI_COPILOT_SCANNER).toBe(true);
    });
  });

  describe('Custom Overrides and Standalone Addons', () => {
    it('allows a STARTER tenant to have Production enabled via custom flag', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'STARTER',
        subscriptionStatus: 'ACTIVE',
        isProductionEnabled: true,
      });

      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(true);
      expect(entitlements.modules.HRMS_PAYROLL).toBe(false); // Other enterprise modules remain locked
    });

    it('allows revoking an individual module for an ENTERPRISE tenant', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'ACTIVE',
        isHrmsEnabled: false,
      });

      expect(entitlements.modules.HRMS_PAYROLL).toBe(false);
      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(true);
    });

    it('allows enabling Inventory and Accounting as add-ons for STARTER tenant', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'STARTER',
        subscriptionStatus: 'ACTIVE',
        isInventoryEnabled: true,
        isAccountingEnabled: true,
      });

      expect(entitlements.modules.INVENTORY_PURCHASE).toBe(true);
      expect(entitlements.modules.ACCOUNTING_LEDGERS).toBe(true);
      expect(entitlements.modules.PRODUCTION_MANUFACTURING).toBe(false);
    });
  });

  describe('Account Lifecycle & Lockout Rules', () => {
    it('flags ACTIVE accounts as fully accessible', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'ACTIVE',
      });

      expect(entitlements.isHardLocked).toBe(false);
      expect(entitlements.isSoftLocked).toBe(false);
    });

    it('flags PAST_DUE accounts with a soft lock warning', () => {
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'PAST_DUE',
      });

      expect(entitlements.isSoftLocked).toBe(true);
      expect(entitlements.isHardLocked).toBe(false);
    });

    it('flags EXPIRED and SUSPENDED accounts with a hard lockout', () => {
      const expired = resolveTenantEntitlements({
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'EXPIRED',
      });
      expect(expired.isHardLocked).toBe(true);

      const suspended = resolveTenantEntitlements({
        subscriptionPlan: 'ENTERPRISE',
        subscriptionStatus: 'SUSPENDED',
      });
      expect(suspended.isHardLocked).toBe(true);
    });

    it('computes days left in trial for an active TRIAL account', () => {
      const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'TRIAL',
        trialEndsAt: inSevenDays,
      });

      expect(entitlements.isHardLocked).toBe(false);
      expect(entitlements.trialDaysRemaining).toBeGreaterThanOrEqual(6);
      expect(entitlements.trialDaysRemaining).toBeLessThanOrEqual(8);
    });

    it('locks out TRIAL account whose trial period has elapsed', () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const entitlements = resolveTenantEntitlements({
        subscriptionPlan: 'GROWTH',
        subscriptionStatus: 'TRIAL',
        trialEndsAt: yesterday,
      });

      expect(entitlements.isHardLocked).toBe(true);
      expect(entitlements.status).toBe('EXPIRED');
    });
  });

  describe('Path to Module Mapping', () => {
    it('correctly maps route paths to their required module keys', () => {
      expect(getRequiredModuleForPath('/production')).toBe('PRODUCTION_MANUFACTURING');
      expect(getRequiredModuleForPath('/production/bom')).toBe('PRODUCTION_MANUFACTURING');
      expect(getRequiredModuleForPath('/payroll')).toBe('HRMS_PAYROLL');
      expect(getRequiredModuleForPath('/attendance')).toBe('HRMS_PAYROLL');
      expect(getRequiredModuleForPath('/accounting')).toBe('ACCOUNTING_LEDGERS');
      expect(getRequiredModuleForPath('/accounting/vouchers')).toBe('ACCOUNTING_LEDGERS');
      expect(getRequiredModuleForPath('/purchases')).toBe('INVENTORY_PURCHASE');
      expect(getRequiredModuleForPath('/vendors')).toBe('INVENTORY_PURCHASE');
      expect(getRequiredModuleForPath('/gst-filing')).toBe('GST_EWAYBILL');
      expect(getRequiredModuleForPath('/eway-bills')).toBe('GST_EWAYBILL');
      expect(getRequiredModuleForPath('/leads')).toBe('TELECRM');
      expect(getRequiredModuleForPath('/calls')).toBe('TELECRM');
      expect(getRequiredModuleForPath('/')).toBeNull();
      expect(getRequiredModuleForPath('/settings')).toBeNull();
    });
  });
});
