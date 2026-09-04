"use client";

import React, { useState } from 'react';
import { 
  Landmark, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  X, 
  FileText,
  DollarSign,
  Building2,
  Users
} from 'lucide-react';
import { 
  createPostDatedCheque, 
  markPdcDeposited, 
  clearPostDatedCheque, 
  markPdcBounced 
} from '@/app/actions/pdcActions';

interface PdcClientProps {
  initialCheques: any[];
  initialMetrics: any;
  bankLedgers: any[];
  customers: any[];
  vendors: any[];
}

export default function PdcClient({
  initialCheques,
  initialMetrics,
  bankLedgers,
  customers,
  vendors
}: PdcClientProps) {
  const [cheques, setCheques] = useState<any[]>(initialCheques);
  const [metrics, setMetrics] = useState<any>(initialMetrics);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEIVED' | 'ISSUED'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [clearingCheque, setClearingCheque] = useState<any | null>(null);
  const [bouncingCheque, setBouncingCheque] = useState<any | null>(null);

  // Form states
  const [formType, setFormType] = useState<'RECEIVED' | 'ISSUED'>('RECEIVED');
  const [formChequeNumber, setFormChequeNumber] = useState('');
  const [formMaturityDate, setFormMaturityDate] = useState(new Date().toISOString().split('T')[0]);
  const [formAmount, setFormAmount] = useState('');
  const [formBankName, setFormBankName] = useState('');
  const [formPartyId, setFormPartyId] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [saving, setSaving] = useState(false);

  // Clearance form
  const [selectedBankLedgerId, setSelectedBankLedgerId] = useState(bankLedgers[0]?.id || '');
  const [clearing, setClearing] = useState(false);

  // Bounce form
  const [bounceReason, setBounceReason] = useState('Insufficient Funds');
  const [bounceCharges, setBounceCharges] = useState('0');
  const [bouncing, setBouncing] = useState(false);

  const handleCreateCheque = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formChequeNumber || !formBankName || !formAmount || !formMaturityDate) {
      alert("Please fill in all required fields.");
      return;
    }

    setSaving(true);
    const res = await createPostDatedCheque({
      type: formType,
      chequeNumber: formChequeNumber,
      chequeDate: new Date().toISOString().split('T')[0],
      maturityDate: formMaturityDate,
      amount: Number(formAmount),
      bankName: formBankName,
      customerId: formType === 'RECEIVED' ? formPartyId : undefined,
      vendorId: formType === 'ISSUED' ? formPartyId : undefined,
      notes: formNotes
    });
    setSaving(false);

    if (res.success && res.cheque) {
      setIsAddModalOpen(false);
      window.location.reload();
    } else {
      alert(res.error || "Failed to create PDC");
    }
  };

  const handleDeposit = async (chequeId: string) => {
    if (!confirm("Mark this cheque as deposited in the bank?")) return;
    const res = await markPdcDeposited(chequeId);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const handleClearSubmit = async () => {
    if (!clearingCheque || !selectedBankLedgerId) return;
    setClearing(true);
    const res = await clearPostDatedCheque({
      chequeId: clearingCheque.id,
      clearingBankLedgerId: selectedBankLedgerId
    });
    setClearing(false);
    if (res.success) {
      setClearingCheque(null);
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const handleBounceSubmit = async () => {
    if (!bouncingCheque) return;
    setBouncing(true);
    const res = await markPdcBounced({
      chequeId: bouncingCheque.id,
      bounceReason,
      bounceCharges: Number(bounceCharges)
    });
    setBouncing(false);
    if (res.success) {
      setBouncingCheque(null);
      window.location.reload();
    } else {
      alert(res.error);
    }
  };

  const filteredCheques = cheques.filter(c => {
    if (typeFilter !== 'ALL' && c.type !== typeFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const party = (c.customer?.businessName || c.vendor?.companyName || '').toLowerCase();
      const chq = c.chequeNumber.toLowerCase();
      const bnk = c.bankName.toLowerCase();
      if (!party.includes(q) && !chq.includes(q) && !bnk.includes(q)) return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* HEADER & METRICS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={20} />
            </div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Post-Dated Cheques (PDC) Register
            </h1>
          </div>
          <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Track, deposit, and clear Customer PDCs and Vendor Cheques with automated ledger clearance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            backgroundColor: '#4f46e5',
            color: '#ffffff',
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 4px rgba(79, 70, 229, 0.2)'
          }}
        >
          <Plus size={16} /> Record New PDC
        </button>
      </div>

      {/* KPI METRIC CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '14px' }}>
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Customer PDCs to Receive
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#059669', margin: '4px 0' }}>
            ₹{metrics.pendingReceivedAmt?.toLocaleString('en-IN') || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Pending clearance into bank</div>
        </div>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
          <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
            Vendor Cheques Issued
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#2563eb', margin: '4px 0' }}>
            ₹{metrics.pendingIssuedAmt?.toLocaleString('en-IN') || 0}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Post-dated payments committed</div>
        </div>

        <div style={{ backgroundColor: metrics.maturingSoonCount > 0 ? '#fffbeb' : '#ffffff', borderRadius: '12px', padding: '16px', border: `1px solid ${metrics.maturingSoonCount > 0 ? '#fde68a' : '#e2e8f0'}` }}>
          <div style={{ fontSize: '0.74rem', color: '#d97706', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Clock size={14} /> Maturing in Next 7 Days
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#b45309', margin: '4px 0' }}>
            {metrics.maturingSoonCount} Cheques (₹{metrics.maturingSoonAmt?.toLocaleString('en-IN') || 0})
          </div>
          <div style={{ fontSize: '0.72rem', color: '#78350f' }}>Ready for bank presentation</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          
          {/* Type Toggle */}
          <div style={{ display: 'flex', gap: '4px', backgroundColor: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
            {(['ALL', 'RECEIVED', 'ISSUED'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: typeFilter === t ? '#ffffff' : 'transparent',
                  color: typeFilter === t ? '#0f172a' : '#64748b',
                  fontSize: '0.78rem',
                  fontWeight: typeFilter === t ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {t === 'ALL' ? 'All Cheques' : t === 'RECEIVED' ? 'Received (Inward)' : 'Issued (Outward)'}
              </button>
            ))}
          </div>

          {/* Search & Status Filter */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ position: 'relative', minWidth: '220px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search party, cheque#, bank..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 12px 6px 30px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>

            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                outline: 'none'
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_DEPOSIT">Pending Deposit</option>
              <option value="DEPOSITED">Deposited in Bank</option>
              <option value="CLEARED">Cleared / Settled</option>
              <option value="BOUNCED">Bounced</option>
            </select>
          </div>
        </div>

        {/* CHEQUE REGISTER TABLE */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Cheque #</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Party Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Drawn On Bank</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Maturity Date</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCheques.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    No Post-Dated Cheques found matching current criteria.
                  </td>
                </tr>
              ) : (
                filteredCheques.map(c => {
                  const isReceived = c.type === 'RECEIVED';
                  const partyName = isReceived ? (c.customer?.businessName || 'Customer') : (c.vendor?.companyName || 'Vendor');
                  const maturity = new Date(c.maturityDate).toLocaleDateString('en-GB');

                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          backgroundColor: isReceived ? '#dcfce7' : '#dbeafe',
                          color: isReceived ? '#15803d' : '#1d4ed8'
                        }}>
                          {isReceived ? '↓ RECEIVED' : '↑ ISSUED'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'monospace', color: '#0f172a' }}>
                        #{c.chequeNumber}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        {partyName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#475569' }}>
                        {c.bankName}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>
                        {maturity}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                        ₹{c.amount.toLocaleString('en-IN')}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {c.status === 'CLEARED' && (
                          <span style={{ color: '#059669', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={14} /> Cleared
                          </span>
                        )}
                        {c.status === 'DEPOSITED' && (
                          <span style={{ color: '#2563eb', fontWeight: 600 }}>
                            Deposited
                          </span>
                        )}
                        {c.status === 'PENDING_DEPOSIT' && (
                          <span style={{ color: '#d97706', fontWeight: 600 }}>
                            Pending Deposit
                          </span>
                        )}
                        {c.status === 'BOUNCED' && (
                          <span style={{ color: '#dc2626', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={14} /> Bounced
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {c.status !== 'CLEARED' && c.status !== 'BOUNCED' && (
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            {c.status === 'PENDING_DEPOSIT' && (
                              <button
                                type="button"
                                onClick={() => handleDeposit(c.id)}
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid #cbd5e1',
                                  backgroundColor: '#ffffff',
                                  fontSize: '0.74rem',
                                  fontWeight: 600,
                                  color: '#2563eb'
                                }}
                              >
                                Deposit
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setClearingCheque(c)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                backgroundColor: '#059669',
                                color: '#ffffff',
                                fontSize: '0.74rem',
                                fontWeight: 600
                              }}
                            >
                              Clear
                            </button>
                            <button
                              type="button"
                              onClick={() => setBouncingCheque(c)}
                              style={{
                                padding: '4px 10px',
                                borderRadius: '6px',
                                border: '1px solid #fecaca',
                                backgroundColor: '#fff5f5',
                                color: '#dc2626',
                                fontSize: '0.74rem',
                                fontWeight: 600
                              }}
                            >
                              Bounce
                            </button>
                          </div>
                        )}
                        {c.status === 'CLEARED' && (
                          <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                            Settled on {new Date(c.clearedDate || c.updatedAt).toLocaleDateString('en-GB')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: RECORD NEW PDC */}
      {isAddModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '520px', width: '100%', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Record Post-Dated Cheque (PDC)
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ color: '#94a3b8' }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateCheque} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Type Switcher */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setFormType('RECEIVED')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: `2px solid ${formType === 'RECEIVED' ? '#059669' : '#e2e8f0'}`,
                    backgroundColor: formType === 'RECEIVED' ? '#ecfdf5' : '#ffffff',
                    color: formType === 'RECEIVED' ? '#059669' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  ↓ Received from Customer
                </button>
                <button
                  type="button"
                  onClick={() => setFormType('ISSUED')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: '8px',
                    border: `2px solid ${formType === 'ISSUED' ? '#2563eb' : '#e2e8f0'}`,
                    backgroundColor: formType === 'ISSUED' ? '#eff6ff' : '#ffffff',
                    color: formType === 'ISSUED' ? '#2563eb' : '#64748b',
                    fontWeight: 700,
                    fontSize: '0.82rem'
                  }}
                >
                  ↑ Issued to Vendor
                </button>
              </div>

              {/* Party Selector */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                  {formType === 'RECEIVED' ? 'Select Customer *' : 'Select Vendor *'}
                </label>
                <select
                  value={formPartyId}
                  onChange={e => setFormPartyId(e.target.value)}
                  required
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                >
                  <option value="">-- Choose Party --</option>
                  {formType === 'RECEIVED'
                    ? customers.map(c => <option key={c.id} value={c.id}>{c.businessName} ({c.mobile})</option>)
                    : vendors.map(v => <option key={v.id} value={v.id}>{v.companyName}</option>)
                  }
                </select>
              </div>

              {/* Cheque # & Amount */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Cheque Number *</label>
                  <input
                    type="text"
                    placeholder="e.g. 042918"
                    value={formChequeNumber}
                    onChange={e => setFormChequeNumber(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="50000"
                    value={formAmount}
                    onChange={e => setFormAmount(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </div>

              {/* Bank Name & Maturity Date */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Drawn On Bank *</label>
                  <input
                    type="text"
                    placeholder="e.g. HDFC Bank"
                    value={formBankName}
                    onChange={e => setFormBankName(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Maturity / Due Date *</label>
                  <input
                    type="date"
                    value={formMaturityDate}
                    onChange={e => setFormMaturityDate(e.target.value)}
                    required
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddModalOpen(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>Cancel</button>
                <button type="submit" disabled={saving} style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: '#4f46e5', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                  {saving ? 'Saving...' : 'Save Cheque Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLEAR CHEQUE INTO BANK LEDGER */}
      {clearingCheque && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
              Clear Cheque #{clearingCheque.chequeNumber}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
              Select the target Bank Account to credit ₹{clearingCheque.amount.toLocaleString('en-IN')} and post the clearance journal voucher:
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Deposit Into Bank Ledger</label>
              <select
                value={selectedBankLedgerId}
                onChange={e => setSelectedBankLedgerId(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.84rem' }}
              >
                {bankLedgers.map(l => (
                  <option key={l.id} value={l.id}>{l.name} (Balance: ₹{l.currentBalance?.toLocaleString('en-IN')})</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setClearingCheque(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>Cancel</button>
              <button type="button" onClick={handleClearSubmit} disabled={clearing} style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: '#059669', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                {clearing ? 'Clearing...' : 'Confirm Clearance & Post Voucher'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BOUNCE CHEQUE */}
      {bouncingCheque && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '16px', maxWidth: '460px', width: '100%', padding: '24px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.15rem', fontWeight: 700, color: '#dc2626' }}>
              Mark Cheque #{bouncingCheque.chequeNumber} as Bounced
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.82rem', color: '#64748b' }}>
              Record dishonour reason and any bank return charges for tracking:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Bounce / Return Reason</label>
                <input
                  type="text"
                  value={bounceReason}
                  onChange={e => setBounceReason(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>Bank Return Charges (₹)</label>
                <input
                  type="number"
                  value={bounceCharges}
                  onChange={e => setBounceCharges(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" onClick={() => setBouncingCheque(null)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}>Cancel</button>
              <button type="button" onClick={handleBounceSubmit} disabled={bouncing} style={{ padding: '8px 20px', borderRadius: '6px', backgroundColor: '#dc2626', color: '#fff', fontSize: '0.82rem', fontWeight: 600 }}>
                {bouncing ? 'Recording...' : 'Confirm Cheque Dishonour'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
