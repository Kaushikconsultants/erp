import React from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getTaxSettings } from '@/app/actions/taxActions';
import TaxSettingsClient from '@/components/settings/TaxSettingsClient';

export const dynamic = 'force-dynamic';

export default async function TaxesSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect('/login');

  const userRole = (session.user as any).role;
  const canManageSettings = (session.user as any).canManageSettings;

  if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && !canManageSettings) {
    redirect('/');
  }

  const res = await getTaxSettings();

  if (!res.success) {
    return (
      <div className="page-container" style={{ padding: '24px' }}>
        <div style={{ color: '#dc2626' }}>Failed to load tax settings: {res.error}</div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      <div className="dashboard-header mb-6">
        <div>
          <h1 className="page-title">Tax & GST Settings</h1>
          <p className="page-subtitle">Configure GST tax master rates, exemptions, default preferences, TDS, and online returns.</p>
        </div>
      </div>

      <TaxSettingsClient
        taxRates={res.taxRates || []}
        taxExemptions={res.taxExemptions || []}
        taxPreference={res.taxPreference}
        gstSetting={res.gstSetting}
        gstTdsSetting={res.gstTdsSetting}
        onlineFilingSetting={res.onlineFilingSetting}
        metrics={res.metrics || {
          totalOutputTaxable: 0,
          totalOutputTax: 0,
          totalCgstOutput: 0,
          totalSgstOutput: 0,
          totalIgstOutput: 0,
          totalInputTaxable: 0,
          totalItcAvailable: 0,
          totalCgstInput: 0,
          totalSgstInput: 0,
          totalIgstInput: 0,
          netTaxPayable: 0,
          activeTaxesCount: 0,
          taxGroupsCount: 0,
          exemptionsCount: 0
        }}
      />
    </div>
  );
}
