"use client";

import React, { useState } from 'react';
import { 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Edit2, 
  RefreshCw, 
  FileText, 
  ShieldCheck, 
  Receipt, 
  Building2, 
  Percent, 
  Search,
  IndianRupee,
  Layers,
  ArrowUpRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import { 
  createTaxRate, 
  updateTaxRate, 
  toggleTaxRateStatus, 
  deleteTaxRate,
  createTaxExemption,
  deleteTaxExemption,
  updateTaxPreference,
  updateGstSetting,
  updateGstTdsSetting,
  updateOnlineFilingSetting,
  syncGstReturns
} from '@/app/actions/taxActions';
import NewTaxModal from './NewTaxModal';
import NewTaxGroupModal from './NewTaxGroupModal';
import NewExemptionModal from './NewExemptionModal';
import EditTaxModal from './EditTaxModal';

interface TaxSettingsClientProps {
  taxRates: any[];
  taxExemptions: any[];
  taxPreference: any;
  gstSetting: any;
  gstTdsSetting: any;
  onlineFilingSetting: any;
  metrics: {
    totalOutputTaxable: number;
    totalOutputTax: number;
    totalCgstOutput: number;
    totalSgstOutput: number;
    totalIgstOutput: number;
    totalInputTaxable: number;
    totalItcAvailable: number;
    totalCgstInput: number;
    totalSgstInput: number;
    totalIgstInput: number;
    netTaxPayable: number;
    activeTaxesCount: number;
    taxGroupsCount: number;
    exemptionsCount: number;
  };
}

export default function TaxSettingsClient({
  taxRates,
  taxExemptions,
  taxPreference,
  gstSetting,
  gstTdsSetting,
  onlineFilingSetting,
  metrics
}: TaxSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<
    'rates' | 'exemptions' | 'preferences' | 'gst' | 'tds' | 'filing'
  >('rates');

  // Filter state for Tax Rates table
  const [rateFilter, setRateFilter] = useState<'active' | 'inactive' | 'groups' | 'all'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTaxIds, setSelectedTaxIds] = useState<string[]>([]);

  // Modals state
  const [isNewTaxModalOpen, setIsNewTaxModalOpen] = useState(false);
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [isNewExemptionModalOpen, setIsNewExemptionModalOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<any | null>(null);

  // Forms state
  const [prefForm, setPrefForm] = useState(taxPreference || {
    taxPreference: "Taxable",
    intraStateTaxRateId: "",
    interStateTaxRateId: "",
    itemTaxInclusiveness: "Tax Exclusive",
    defaultHsn: "6109",
    enableReverseCharge: false
  });

  const [gstForm, setGstForm] = useState(gstSetting || {
    gstin: "08AABCE1234F1Z5",
    legalName: "ESPON GLOBAL INDUSTRIES PVT LTD",
    tradeName: "ESPON CRM",
    registeredState: "Rajasthan",
    stateCode: "08",
    isComposition: false,
    enableRcm: false,
    eWayBillThreshold: 50000,
    enableEInvoicing: true,
    eInvoicingThreshold: 50000000,
    filingFrequency: "Monthly"
  });

  const [tdsForm, setTdsForm] = useState(gstTdsSetting || {
    enableGstTds: false,
    tdsSection: "Section 51",
    tdsRate: 2.0,
    thresholdAmount: 250000,
    deductorType: "Government Authority / PSU",
    tanNumber: "JPRG12345F"
  });

  const [filingForm, setFilingForm] = useState(onlineFilingSetting || {
    gstPortalUsername: "espon_tax_admin",
    gstPortalApiEnabled: true,
    autoSyncGstr1: true,
    autoSyncGstr3b: true,
    autoSyncGstr2b: true,
    sandboxMode: true
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Filtered Tax Rates
  const filteredTaxes = taxRates.filter(t => {
    if (rateFilter === 'active' && t.status !== 'Active') return false;
    if (rateFilter === 'inactive' && t.status !== 'Inactive') return false;
    if (rateFilter === 'groups' && !t.isGroup) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        t.type.toLowerCase().includes(q) ||
        String(t.rate).includes(q)
      );
    }
    return true;
  });

  const toggleSelectAll = () => {
    if (selectedTaxIds.length === filteredTaxes.length) {
      setSelectedTaxIds([]);
    } else {
      setSelectedTaxIds(filteredTaxes.map(t => t.id));
    }
  };

  const toggleSelectTax = (id: string) => {
    setSelectedTaxIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    await toggleTaxRateStatus(id, nextStatus);
    showToast(`Tax rate marked as ${nextStatus}.`);
  };

  const handleDeleteTax = async (id: string, name: string) => {
    if (!confirm(`Delete tax rate "${name}"?`)) return;
    const res = await deleteTaxRate(id);
    if (res.success) {
      showToast(`Tax rate deleted.`);
    }
  };

  const handleDeleteExemption = async (id: string, name: string) => {
    if (!confirm(`Delete tax exemption "${name}"?`)) return;
    const res = await deleteTaxExemption(id);
    if (res.success) {
      showToast(`Tax exemption deleted.`);
    }
  };

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateTaxPreference(prefForm);
    setIsSaving(false);
    if (res.success) showToast("Default Tax Preferences saved.");
  };

  const handleSaveGst = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateGstSetting(gstForm);
    setIsSaving(false);
    if (res.success) showToast("GST Settings updated successfully.");
  };

  const handleSaveTds = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateGstTdsSetting(tdsForm);
    setIsSaving(false);
    if (res.success) showToast("GST TDS Settings saved.");
  };

  const handleSaveFiling = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const res = await updateOnlineFilingSetting(filingForm);
    setIsSaving(false);
    if (res.success) showToast("Online Filing Settings updated.");
  };

  const handleSyncGst = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    const res = await syncGstReturns();
    setIsSyncing(false);
    if (res.success) {
      setSyncMessage(res.message);
      showToast("Live GST Returns reconciled successfully.");
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Toast Notification */}
      {successToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#10b981',
          color: '#ffffff',
          padding: '10px 18px',
          borderRadius: '8px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.15)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontWeight: 500,
          fontSize: '0.84rem'
        }}>
          <CheckCircle2 size={16} /> {successToast}
        </div>
      )}

      {/* Real-time GST & Tax Metrics Bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Output GST (Sales)
            </span>
            <span style={{ padding: '2px 7px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', fontSize: '0.68rem', fontWeight: 500 }}>
              GSTR-1
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary, #0f172a)', marginTop: '6px' }}>
            ₹{metrics.totalOutputTax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
            CGST: ₹{metrics.totalCgstOutput.toLocaleString('en-IN', { maximumFractionDigits: 2 })} | SGST: ₹{metrics.totalSgstOutput.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Input Tax Credit (ITC)
            </span>
            <span style={{ padding: '2px 7px', borderRadius: '10px', background: '#ecfdf5', color: '#059669', fontSize: '0.68rem', fontWeight: 500 }}>
              GSTR-2B
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#059669', marginTop: '6px' }}>
            ₹{metrics.totalItcAvailable.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
            Eligible purchase credits across bills
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Net GST Payable
            </span>
            <span style={{ padding: '2px 7px', borderRadius: '10px', background: '#fff1f2', color: '#e11d48', fontSize: '0.68rem', fontWeight: 500 }}>
              GSTR-3B
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: metrics.netTaxPayable > 0 ? '#e11d48' : '#059669', marginTop: '6px' }}>
            ₹{metrics.netTaxPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
            Output Tax minus ITC balance
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '16px 18px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted, #64748b)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Active Rates & Groups
            </span>
            <span style={{ padding: '2px 7px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', fontSize: '0.68rem', fontWeight: 500 }}>
              GST Master
            </span>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#4f46e5', marginTop: '6px' }}>
            {metrics.activeTaxesCount} Rates ({metrics.taxGroupsCount} Groups)
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '3px' }}>
            {metrics.exemptionsCount} standard exemption clauses
          </div>
        </div>
      </div>

      {/* Main Taxes Configuration Panel */}
      <div className="glass-panel" style={{ display: 'grid', gridTemplateColumns: '230px 1fr', minHeight: '600px', borderRadius: '14px', overflow: 'hidden', border: '1px solid var(--border, #e2e8f0)', backgroundColor: '#ffffff' }}>
        
        {/* Left Sub-Sidebar */}
        <div style={{ borderRight: '1px solid var(--border, #e2e8f0)', backgroundColor: '#f8fafc', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 18px 14px 18px', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Taxes</h2>
            <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0' }}>GST compliance & tax engine</p>
          </div>

          <nav style={{ padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {[
              { key: 'rates', label: 'Tax Rates', icon: Percent },
              { key: 'exemptions', label: 'Tax Exemptions', icon: ShieldCheck },
              { key: 'preferences', label: 'Default Tax Preference', icon: Receipt },
              { key: 'gst', label: 'GST Settings', icon: Building2 },
              { key: 'tds', label: 'GST TDS Settings', icon: FileText },
              { key: 'filing', label: 'Online Filing Settings', icon: RefreshCw }
            ].map(item => {
              const Icon = item.icon;
              const isSelected = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key as any)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isSelected ? '#ffffff' : 'transparent',
                    color: isSelected ? '#4f46e5' : '#475569',
                    fontWeight: isSelected ? 600 : 450,
                    fontSize: '0.81rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Icon size={15} style={{ color: isSelected ? '#4f46e5' : '#94a3b8' }} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Content View */}
        <div style={{ padding: '22px', overflowY: 'auto' }}>
          
          {/* TAB 1: TAX RATES */}
          {activeTab === 'rates' && (
            <div>
              {/* Header Controls matching screenshot */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <select
                    value={rateFilter}
                    onChange={(e: any) => setRateFilter(e.target.value)}
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      border: 'none',
                      backgroundColor: 'transparent',
                      cursor: 'pointer',
                      outline: 'none',
                      padding: 0
                    }}
                  >
                    <option value="active">Active taxes ▾</option>
                    <option value="inactive">Inactive taxes ▾</option>
                    <option value="groups">Tax Groups ▾</option>
                    <option value="all">All Taxes ▾</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {/* Search Bar */}
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input
                      type="text"
                      placeholder="Search taxes..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      style={{ padding: '6px 10px 6px 30px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.8rem', width: '170px' }}
                    />
                  </div>

                  {/* New Tax Button Dropdown */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => setIsNewTaxModalOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.81rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      <Plus size={14} /> New Tax
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => setIsNewGroupModalOpen(true)}
                      title="Create Tax Group (e.g. CGST + SGST)"
                      style={{
                        backgroundColor: '#eff6ff',
                        color: '#2563eb',
                        border: '1px solid #bfdbfe',
                        padding: '7px 12px',
                        borderRadius: '8px',
                        fontSize: '0.81rem',
                        fontWeight: 500,
                        cursor: 'pointer'
                      }}
                    >
                      + Tax Group
                    </button>
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div style={{ overflowX: 'auto', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <th style={{ width: '38px', padding: '10px 14px' }}>
                        <input
                          type="checkbox"
                          checked={filteredTaxes.length > 0 && selectedTaxIds.length === filteredTaxes.length}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TAX NAME
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        TAX TYPE
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'right' }}>
                        RATE (%)
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                        STATUS
                      </th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'center' }}>
                        ACTIONS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTaxes.map(tax => (
                      <tr key={tax.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 14px' }}>
                          <input
                            type="checkbox"
                            checked={selectedTaxIds.includes(tax.id)}
                            onChange={() => toggleSelectTax(tax.id)}
                          />
                        </td>
                        <td style={{ padding: '11px 14px' }}>
                          <button
                            type="button"
                            onClick={() => setEditingTax(tax)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#2563eb',
                              fontWeight: 500,
                              fontSize: '0.84rem',
                              cursor: 'pointer',
                              padding: 0,
                              textAlign: 'left'
                            }}
                          >
                            {tax.name}
                            {tax.isGroup && (
                              <span style={{ marginLeft: '6px', fontSize: '0.7rem', color: '#16a34a', fontWeight: 400 }}>
                                (Tax Group)
                              </span>
                            )}
                          </button>
                          {tax.description && (
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '1px' }}>
                              {tax.description}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.81rem', color: '#475569' }}>
                          {tax.type}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.84rem', fontWeight: 500, color: '#0f172a', textAlign: 'right' }}>
                          {tax.rate}%
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(tax.id, tax.status)}
                            style={{
                              padding: '2px 8px',
                              borderRadius: '10px',
                              border: 'none',
                              fontSize: '0.7rem',
                              fontWeight: 500,
                              backgroundColor: tax.status === 'Active' ? '#ecfdf5' : '#f1f5f9',
                              color: tax.status === 'Active' ? '#059669' : '#64748b',
                              cursor: 'pointer'
                            }}
                          >
                            {tax.status}
                          </button>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                            <button
                              type="button"
                              onClick={() => setEditingTax(tax)}
                              title="Edit Tax"
                              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteTax(tax.id, tax.name)}
                              title="Delete Tax"
                              style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {filteredTaxes.length === 0 && (
                      <tr>
                        <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem' }}>
                          No taxes match the current criteria. Click "+ New Tax" to add one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: TAX EXEMPTIONS */}
          {activeTab === 'exemptions' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>Tax Exemption Reasons</h3>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>Configure non-taxable reasons for SEZ, exports, and special statutory supplies</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewExemptionModalOpen(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    border: 'none',
                    padding: '7px 14px',
                    borderRadius: '8px',
                    fontSize: '0.81rem',
                    fontWeight: 500,
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} /> Add Exemption Reason
                </button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border, #e2e8f0)' }}>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>REASON NAME</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>TYPE</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>STATUTORY REASON</th>
                      <th style={{ padding: '10px 14px', fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', textAlign: 'center' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {taxExemptions.map(ex => (
                      <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 500, color: '#0f172a', fontSize: '0.84rem' }}>
                          {ex.name}
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.81rem', color: '#475569' }}>
                          <span style={{ padding: '2px 7px', borderRadius: '8px', background: '#f1f5f9', fontSize: '0.7rem', fontWeight: 500 }}>
                            {ex.type}
                          </span>
                        </td>
                        <td style={{ padding: '11px 14px', fontSize: '0.81rem', color: '#64748b' }}>
                          {ex.reason}
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDeleteExemption(ex.id, ex.name)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: DEFAULT TAX PREFERENCES */}
          {activeTab === 'preferences' && (
            <form onSubmit={handleSavePreferences} style={{ maxWidth: '580px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>Default Tax Preferences</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>Configure global tax behavior for sales orders, quotes and invoices</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '5px' }}>
                    Tax Preference *
                  </label>
                  <div style={{ display: 'flex', gap: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 450 }}>
                      <input 
                        type="radio" 
                        name="taxPreference" 
                        value="Taxable" 
                        checked={prefForm.taxPreference === "Taxable"}
                        onChange={e => setPrefForm({ ...prefForm, taxPreference: e.target.value })}
                      />
                      <span>Taxable (Standard)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 450 }}>
                      <input 
                        type="radio" 
                        name="taxPreference" 
                        value="Tax Exempt" 
                        checked={prefForm.taxPreference === "Tax Exempt"}
                        onChange={e => setPrefForm({ ...prefForm, taxPreference: e.target.value })}
                      />
                      <span>Tax Exempt</span>
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '5px' }}>
                    Default Intra-State Tax Rate (Same State)
                  </label>
                  <select
                    value={prefForm.intraStateTaxRateId || ''}
                    onChange={e => setPrefForm({ ...prefForm, intraStateTaxRateId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  >
                    {taxRates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '5px' }}>
                    Default Inter-State Tax Rate (Outside State)
                  </label>
                  <select
                    value={prefForm.interStateTaxRateId || ''}
                    onChange={e => setPrefForm({ ...prefForm, interStateTaxRateId: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  >
                    {taxRates.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '5px' }}>
                    Item Tax Inclusiveness
                  </label>
                  <select
                    value={prefForm.itemTaxInclusiveness}
                    onChange={e => setPrefForm({ ...prefForm, itemTaxInclusiveness: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  >
                    <option value="Tax Exclusive">Tax Exclusive (Tax is added on top of item rate)</option>
                    <option value="Tax Inclusive">Tax Inclusive (Item rate already includes GST)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '5px' }}>
                    Default Product HSN Code
                  </label>
                  <input
                    type="text"
                    value={prefForm.defaultHsn || ''}
                    onChange={e => setPrefForm({ ...prefForm, defaultHsn: e.target.value })}
                    placeholder="e.g. 6109"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '0.82rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {isSaving ? "Saving..." : "Save Preferences"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 4: GST SETTINGS */}
          {activeTab === 'gst' && (
            <form onSubmit={handleSaveGst} style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>GST Registration & Policies</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>Manage GSTIN identifier, state jurisdiction, E-Way Bill and E-Invoicing limits</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>GSTIN *</label>
                    <input
                      type="text"
                      required
                      value={gstForm.gstin || ''}
                      onChange={e => setGstForm({ ...gstForm, gstin: e.target.value.toUpperCase() })}
                      placeholder="08AABCE1234F1Z5"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>State Code *</label>
                    <input
                      type="text"
                      required
                      value={gstForm.stateCode || ''}
                      onChange={e => setGstForm({ ...gstForm, stateCode: e.target.value })}
                      placeholder="08"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>Legal Registered Name *</label>
                  <input
                    type="text"
                    required
                    value={gstForm.legalName || ''}
                    onChange={e => setGstForm({ ...gstForm, legalName: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>E-Way Bill Threshold (₹)</label>
                    <input
                      type="number"
                      value={gstForm.eWayBillThreshold || 50000}
                      onChange={e => setGstForm({ ...gstForm, eWayBillThreshold: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>Filing Frequency</label>
                    <select
                      value={gstForm.filingFrequency || 'Monthly'}
                      onChange={e => setGstForm({ ...gstForm, filingFrequency: e.target.value })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    >
                      <option value="Monthly">Monthly (Regular)</option>
                      <option value="Quarterly">Quarterly (QRMP Scheme)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={gstForm.isComposition || false}
                      onChange={e => setGstForm({ ...gstForm, isComposition: e.target.checked })}
                    />
                    <span>Registered under GST Composition Scheme</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={gstForm.enableRcm || false}
                      onChange={e => setGstForm({ ...gstForm, enableRcm: e.target.checked })}
                    />
                    <span>Enable Reverse Charge Mechanism (RCM) on Purchases</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={gstForm.enableEInvoicing || false}
                      onChange={e => setGstForm({ ...gstForm, enableEInvoicing: e.target.checked })}
                    />
                    <span>Enable GST E-Invoicing (IRN & QR Code Generation)</span>
                  </label>
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '0.82rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {isSaving ? "Saving..." : "Save GST Settings"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 5: GST TDS SETTINGS */}
          {activeTab === 'tds' && (
            <form onSubmit={handleSaveTds} style={{ maxWidth: '580px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>GST TDS Compliance (Section 51)</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>Configure statutory tax deduction at source for government contracts</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={tdsForm.enableGstTds || false}
                    onChange={e => setTdsForm({ ...tdsForm, enableGstTds: e.target.checked })}
                  />
                  <span>Enable GST TDS Deductions</span>
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>TDS Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={tdsForm.tdsRate || 2.0}
                      onChange={e => setTdsForm({ ...tdsForm, tdsRate: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>Contract Threshold (₹)</label>
                    <input
                      type="number"
                      value={tdsForm.thresholdAmount || 250000}
                      onChange={e => setTdsForm({ ...tdsForm, thresholdAmount: Number(e.target.value) })}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>TAN Number</label>
                  <input
                    type="text"
                    value={tdsForm.tanNumber || ''}
                    onChange={e => setTdsForm({ ...tdsForm, tanNumber: e.target.value.toUpperCase() })}
                    placeholder="e.g. JPRG12345F"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ padding: '8px 20px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '0.82rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {isSaving ? "Saving..." : "Save TDS Settings"}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 6: ONLINE FILING SETTINGS */}
          {activeTab === 'filing' && (
            <div style={{ maxWidth: '600px' }}>
              <div style={{ marginBottom: '18px' }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, color: '#0f172a' }}>GST Portal API & Auto-Filing</h3>
                <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '2px 0 0' }}>Reconcile returns directly with GSTN server via connected GSP pipeline</p>
              </div>

              {syncMessage && (
                <div style={{ padding: '10px 14px', backgroundColor: '#eff6ff', color: '#1d4ed8', borderRadius: '8px', marginBottom: '14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={15} /> {syncMessage}
                </div>
              )}

              <form onSubmit={handleSaveFiling} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontSize: '0.81rem', fontWeight: 500, color: '#1e293b', marginBottom: '4px' }}>GST Portal Username</label>
                  <input
                    type="text"
                    value={filingForm.gstPortalUsername || ''}
                    onChange={e => setFilingForm({ ...filingForm, gstPortalUsername: e.target.value })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={filingForm.autoSyncGstr1 || false}
                      onChange={e => setFilingForm({ ...filingForm, autoSyncGstr1: e.target.checked })}
                    />
                    <span>Auto-Sync GSTR-1 Sales Invoices to GST Portal</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={filingForm.autoSyncGstr2b || false}
                      onChange={e => setFilingForm({ ...filingForm, autoSyncGstr2b: e.target.checked })}
                    />
                    <span>Auto-Reconcile GSTR-2B Input Tax Credit (ITC) with Purchase Bills</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.81rem', fontWeight: 450 }}>
                    <input
                      type="checkbox"
                      checked={filingForm.autoSyncGstr3b || false}
                      onChange={e => setFilingForm({ ...filingForm, autoSyncGstr3b: e.target.checked })}
                    />
                    <span>Auto-Compute Monthly GSTR-3B Tax Liability</span>
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                  <button
                    type="submit"
                    disabled={isSaving}
                    style={{ padding: '8px 18px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '0.82rem', cursor: isSaving ? 'not-allowed' : 'pointer' }}
                  >
                    {isSaving ? "Saving..." : "Save Connection"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncGst}
                    disabled={isSyncing}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', backgroundColor: '#059669', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 500, fontSize: '0.82rem', cursor: isSyncing ? 'not-allowed' : 'pointer' }}
                  >
                    <RefreshCw size={13} className={isSyncing ? "animate-spin" : ""} />
                    {isSyncing ? "Syncing..." : "Reconcile Live GST Returns"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>

      {/* Modals */}
      {isNewTaxModalOpen && (
        <NewTaxModal onClose={() => setIsNewTaxModalOpen(false)} />
      )}

      {isNewGroupModalOpen && (
        <NewTaxGroupModal 
          allTaxes={taxRates.filter(t => !t.isGroup)} 
          onClose={() => setIsNewGroupModalOpen(false)} 
        />
      )}

      {isNewExemptionModalOpen && (
        <NewExemptionModal onClose={() => setIsNewExemptionModalOpen(false)} />
      )}

      {editingTax && (
        <EditTaxModal tax={editingTax} onClose={() => setEditingTax(null)} />
      )}

    </div>
  );
}
