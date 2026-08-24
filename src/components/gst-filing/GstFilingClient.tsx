"use client";

import React, { useState } from 'react';
import { 
  Building2, 
  FileText, 
  Receipt, 
  RefreshCw, 
  Download, 
  UploadCloud, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileSpreadsheet, 
  ShieldCheck, 
  ArrowUpRight, 
  ChevronRight, 
  Search, 
  Layers, 
  FileJson,
  TrendingUp,
  Landmark,
  Calendar,
  ExternalLink,
  Zap,
  Check,
  Percent,
  KeyRound,
  Lock,
  User,
  LogOut,
  X,
  Smartphone,
  CheckCircle,
  CreditCard,
  ArrowRight
} from 'lucide-react';
import { 
  syncGstr1ToPortal, 
  fetchGstr2bFromPortal, 
  fileGstr3bReturn, 
  generateGstr1JsonPayload,
  testGstPortalHandshake,
  loginToGstPortal,
  logoutGstPortal
} from '@/app/actions/gstFilingActions';
import GstDeveloperPortalTools from '@/components/gst/GstDeveloperPortalTools';

interface GstFilingClientProps {
  initialData: any;
}

export default function GstFilingClient({ initialData }: GstFilingClientProps) {
  const [data, setData] = useState(initialData);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'gstr1' | 'gstr3b' | 'gstr2b' | 'gstr9' | 'public_apis' | 'portal'>('dashboard');
  const [gstr1SubTab, setGstr1SubTab] = useState<'b2b' | 'b2cs' | 'b2cl' | 'cdnr' | 'hsn' | 'docs'>('b2b');

  // Portal Login Modal State
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [portalUsername, setPortalUsername] = useState(data?.onlineFilingSetting?.gstPortalUsername || 'espon_gst_user');
  const [portalPassword, setPortalPassword] = useState('••••••••••••');
  const [portalGstin, setPortalGstin] = useState(data?.gstSetting?.gstin || '08AABCE1234F1Z5');
  const [authMode, setAuthMode] = useState<'DIRECT' | 'OTP' | 'GSP'>('DIRECT');
  const [otpInput, setOtpInput] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Sync / Action Loading States
  const [isSyncingGstr1, setIsSyncingGstr1] = useState(false);
  const [isFetching2B, setIsFetching2B] = useState(false);
  const [isFiling3B, setIsFiling3B] = useState(false);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const {
    periodInfo = {},
    gstSetting = {},
    onlineFilingSetting = {},
    returnStatuses = {},
    metrics = {},
    gstr1Data = { b2bInvoices: [], b2cLargeInvoices: [], b2cSmallInvoices: [], cdnrList: [], hsnSummaryList: [], docSummary: [] },
    gstr3bData = { table31: {}, table4: {}, payment: {} },
    gstr2bData = { itcReconRows: [], matchedCount: 0, mismatchCount: 0 }
  } = data;

  const isSessionActive = Boolean(onlineFilingSetting?.sessionActive || onlineFilingSetting?.apiAuthToken);

  // Handle Login to GST Portal
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    const res = await loginToGstPortal({
      username: portalUsername,
      password: portalPassword,
      gstin: portalGstin,
      authMode,
      otp: otpInput
    });
    setIsLoggingIn(false);
    if (res.success) {
      showToast(res.message || "Logged into GST Portal successfully!");
      setIsLoginModalOpen(false);
      window.location.reload();
    } else {
      alert("Login Failed: " + res.error);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    if (confirm("Disconnect and logout from GST Portal session?")) {
      const res = await logoutGstPortal();
      if (res.success) {
        showToast("Logged out of GST Portal.");
        window.location.reload();
      }
    }
  };

  // Handle Download GSTR-1 JSON (GSTN Official Schema)
  const handleDownloadJson = async () => {
    const res = await generateGstr1JsonPayload(periodInfo.financialYear, periodInfo.periodKey);
    if (res.success && res.jsonPayload) {
      const blob = new Blob([res.jsonPayload], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.fileName || `GSTR1_${periodInfo.periodKey}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Official GSTN GSTR-1 JSON downloaded successfully!");
    } else {
      alert("Failed to generate JSON: " + res.error);
    }
  };

  // Handle Live GSTR-1 Sync to Portal
  const handleSyncGstr1 = async () => {
    if (!isSessionActive) {
      setIsLoginModalOpen(true);
      showToast("🔒 Authentication Required: Please login to GST Portal first.");
      return;
    }
    setIsSyncingGstr1(true);
    const res = await syncGstr1ToPortal(periodInfo.financialYear, periodInfo.periodKey);
    setIsSyncingGstr1(false);
    if (res.success) {
      showToast(res.message || "GSTR-1 successfully uploaded to GST Portal!");
      window.location.reload();
    } else {
      if ((res as any).requireLogin) {
        setIsLoginModalOpen(true);
      }
      alert(res.error || "Portal Error");
    }
  };

  // Handle Live GSTR-2B Fetch from Portal
  const handleFetchGstr2b = async () => {
    if (!isSessionActive) {
      setIsLoginModalOpen(true);
      showToast("🔒 Authentication Required: Please login to GST Portal first.");
      return;
    }
    setIsFetching2B(true);
    const res = await fetchGstr2bFromPortal(periodInfo.financialYear, periodInfo.periodKey);
    setIsFetching2B(false);
    if (res.success) {
      showToast(res.message || "GSTR-2B successfully fetched and reconciled!");
      window.location.reload();
    } else {
      if ((res as any).requireLogin) {
        setIsLoginModalOpen(true);
      }
      alert(res.error || "Portal Error");
    }
  };

  // Handle GSTR-3B Filing
  const handleFileGstr3b = async () => {
    if (!isSessionActive) {
      setIsLoginModalOpen(true);
      showToast("🔒 Authentication Required: Please login to GST Portal first.");
      return;
    }
    if (!confirm(`Confirm filing of GSTR-3B for ${periodInfo.period} ${periodInfo.financialYear} with Net Tax payment of ₹${metrics.netCashLiability?.toLocaleString('en-IN')}?`)) {
      return;
    }
    setIsFiling3B(true);
    const res = await fileGstr3bReturn(periodInfo.financialYear, periodInfo.periodKey);
    setIsFiling3B(false);
    if (res.success) {
      showToast(res.message || "GSTR-3B successfully filed!");
      window.location.reload();
    } else {
      if ((res as any).requireLogin) {
        setIsLoginModalOpen(true);
      }
      alert(res.error || "Filing Error");
    }
  };

  // Handle Test API Handshake
  const handleTestApi = async () => {
    setIsTestingApi(true);
    const res = await testGstPortalHandshake();
    setIsTestingApi(false);
    if (res.success) {
      showToast(res.message || "GST Portal Handshake Successful!");
    } else {
      alert("API Handshake Error: " + res.error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
      
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '16px',
          right: '16px',
          left: '16px',
          maxWidth: '420px',
          margin: '0 auto',
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '12px 16px',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
          zIndex: 999999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 500,
          fontSize: '0.82rem',
          borderLeft: '4px solid #10b981'
        }}>
          <CheckCircle2 size={18} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* GST PORTAL LOGIN MODAL (Mobile Native Bottom Sheet / Center Dialog) */}
      {isLoginModalOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '0'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: '20px',
            borderTopRightRadius: '20px',
            maxWidth: '500px',
            width: '100%',
            padding: '20px 18px calc(env(safe-area-inset-bottom, 12px) + 20px) 18px',
            boxShadow: '0 -10px 30px rgba(0,0,0,0.2)',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <div style={{ width: '36px', height: '4px', background: '#cbd5e1', borderRadius: '3px', margin: '0 auto 12px auto' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ padding: '6px', borderRadius: '8px', background: '#eff6ff', color: '#2563eb', display: 'flex' }}>
                  <KeyRound size={18} />
                </span>
                <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#0f172a' }}>
                  Login to GST Portal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.76rem', color: '#64748b', margin: '0 0 14px 0', lineHeight: 1.4 }}>
              Authenticate with GSTN to enable live data push, auto-ITC download, and GSTR-3B filing.
            </p>

            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  GSTIN
                </label>
                <input
                  type="text"
                  value={portalGstin}
                  onChange={e => setPortalGstin(e.target.value.toUpperCase())}
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', fontFamily: 'monospace', fontWeight: 500, boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  GST Portal Username
                </label>
                <input
                  type="text"
                  value={portalUsername}
                  onChange={e => setPortalUsername(e.target.value)}
                  placeholder="e.g. espon_gst_user"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#475569', marginBottom: '4px' }}>
                  Password / API Key
                </label>
                <input
                  type="password"
                  value={portalPassword}
                  onChange={e => setPortalPassword(e.target.value)}
                  placeholder="Enter GST Portal password"
                  required
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                {['DIRECT', 'OTP', 'GSP'].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAuthMode(mode as any)}
                    style={{
                      flex: 1,
                      padding: '7px 6px',
                      borderRadius: '6px',
                      border: authMode === mode ? '1px solid #2563eb' : '1px solid #e2e8f0',
                      backgroundColor: authMode === mode ? '#eff6ff' : '#f8fafc',
                      color: authMode === mode ? '#2563eb' : '#64748b',
                      fontSize: '0.72rem',
                      fontWeight: authMode === mode ? 600 : 500,
                      cursor: 'pointer'
                    }}
                  >
                    {mode === 'DIRECT' ? 'Direct GSTN' : mode === 'OTP' ? 'Mobile OTP' : 'GSP API'}
                  </button>
                ))}
              </div>

              {authMode === 'OTP' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.74rem', fontWeight: 500, color: '#475569' }}>
                      One Time Password (OTP)
                    </label>
                    <button
                      type="button"
                      onClick={() => { setOtpSent(true); showToast("OTP sent to registered mobile!"); }}
                      style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.72rem', fontWeight: 500, cursor: 'pointer' }}
                    >
                      {otpSent ? "Resend OTP" : "Request OTP"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.84rem', boxSizing: 'border-box' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(false)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  style={{ flex: 2, padding: '10px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: isLoggingIn ? 'not-allowed' : 'pointer' }}
                >
                  {isLoggingIn ? "Connecting..." : "Authenticate & Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Top Mobile Header & Connection Status */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ backgroundColor: '#eff6ff', color: '#2563eb', padding: '5px', borderRadius: '6px', display: 'flex' }}>
              <Landmark size={18} />
            </span>
            <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 600, color: '#0f172a' }}>
              GST Filing Hub
            </h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 500 }}>
              <Calendar size={12} style={{ color: '#64748b' }} />
              <span>{periodInfo.period?.slice(0, 3)} {periodInfo.financialYear}</span>
            </div>

            {isSessionActive ? (
              <button
                type="button"
                onClick={handleLogout}
                style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #fecdd3', backgroundColor: '#fff1f2', color: '#e11d48', fontSize: '0.7rem', fontWeight: 500, cursor: 'pointer' }}
              >
                Logout
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #2563eb', backgroundColor: '#eff6ff', color: '#2563eb', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* GSTIN & Portal Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: '#64748b', flexWrap: 'wrap' }}>
          <span>GSTIN: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{gstSetting?.gstin || "08AABCE1234F1Z5"}</strong></span>
          <span>•</span>
          {isSessionActive ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#059669', fontWeight: 500 }}>
              ● GSTN Live Connected
            </span>
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color: '#d97706', fontWeight: 500 }}>
              ○ GSTN Offline
            </span>
          )}
        </div>

        {/* Action Button Strip */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', width: '100%' }}>
          <button
            type="button"
            onClick={handleDownloadJson}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#334155', fontSize: '0.74rem', fontWeight: 500, whiteSpace: 'nowrap', cursor: 'pointer' }}
          >
            <FileJson size={13} style={{ color: '#4f46e5' }} /> GSTN JSON
          </button>

          <button
            type="button"
            onClick={handleSyncGstr1}
            disabled={isSyncingGstr1}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '0.74rem', fontWeight: 500, whiteSpace: 'nowrap', cursor: isSyncingGstr1 ? 'not-allowed' : 'pointer' }}
          >
            <UploadCloud size={13} className={isSyncingGstr1 ? "animate-spin" : ""} />
            {isSyncingGstr1 ? "Syncing..." : "Sync Portal"}
          </button>

          <button
            type="button"
            onClick={handleFetchGstr2b}
            disabled={isFetching2B}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 10px', borderRadius: '6px', border: '1px solid #86efac', backgroundColor: '#f0fdf4', color: '#166534', fontSize: '0.74rem', fontWeight: 500, whiteSpace: 'nowrap', cursor: isFetching2B ? 'not-allowed' : 'pointer' }}
          >
            <RefreshCw size={12} className={isFetching2B ? "animate-spin" : ""} />
            Fetch 2B
          </button>
        </div>
      </div>

      {/* Top Real-Time Mobile Metric Cards Grid (2x2 Layout on Mobile) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%' }}>
        
        {/* Output Tax */}
        <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
            Output Tax (GSTR-1)
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
            ₹{metrics.totalOutputTax?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
          </div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            CGST+SGST+IGST
          </div>
        </div>

        {/* Input Tax Credit */}
        <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
            Input Credit (2B)
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: '#059669', marginTop: '3px' }}>
            ₹{metrics.totalItcAvailable?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
          </div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {metrics.billsCount || 0} Bills ({metrics.itcMatchRate || 100}%)
          </div>
        </div>

        {/* Net Cash Payable */}
        <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
            Cash Payable (3B)
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 600, color: (metrics.netCashLiability || 0) > 0 ? '#e11d48' : '#059669', marginTop: '3px' }}>
            ₹{metrics.netCashLiability?.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) || "0"}
          </div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px' }}>
            After ITC offset
          </div>
        </div>

        {/* Next Due Date */}
        <div style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: 500, textTransform: 'uppercase' }}>
            Next Due Date
          </div>
          <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#4f46e5', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            11th & 20th
          </div>
          <div style={{ fontSize: '0.64rem', color: '#94a3b8', marginTop: '2px' }}>
            {returnStatuses.gstr1?.status || "Ready To Upload"}
          </div>
        </div>

      </div>

      {/* Mobile Swipeable Tab Navigation */}
      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', whiteSpace: 'nowrap', scrollbarWidth: 'none', paddingBottom: '2px', width: '100%' }}>
        {[
          { key: 'dashboard', label: 'Summary', icon: Landmark },
          { key: 'gstr1', label: `GSTR-1 (${gstr1Data.b2bInvoices.length + gstr1Data.b2cSmallInvoices.length})`, icon: Receipt },
          { key: 'gstr3b', label: 'GSTR-3B', icon: FileText },
          { key: 'gstr2b', label: `ITC Recon (${gstr2bData.itcReconRows.length})`, icon: ShieldCheck },
          { key: 'gstr9', label: 'GSTR-9', icon: FileSpreadsheet },
          { key: 'public_apis', label: '⚡ GST Public APIs (developer.gst.gov.in)', icon: ShieldCheck },
          { key: 'portal', label: 'Portal Logs', icon: Zap }
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '7px 12px',
                borderRadius: '8px',
                border: isSelected ? '1px solid #2563eb' : '1px solid #e2e8f0',
                backgroundColor: isSelected ? '#eff6ff' : '#ffffff',
                color: isSelected ? '#2563eb' : '#64748b',
                fontWeight: isSelected ? 600 : 500,
                fontSize: '0.76rem',
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SUMMARY */}
      {activeTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          
          {/* GSTR-1 Return Card */}
          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>GSTR-1 Outward Supplies</strong>
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', fontWeight: 600 }}>Monthly</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Taxable: ₹{metrics.totalOutwardTaxable?.toLocaleString('en-IN') || "0"} | Tax: ₹{metrics.totalOutputTax?.toLocaleString('en-IN') || "0"}
                </div>
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                backgroundColor: returnStatuses.gstr1?.status === 'Uploaded & Validated' || returnStatuses.gstr1?.status === 'Filed' ? '#ecfdf5' : '#f1f5f9',
                color: returnStatuses.gstr1?.status === 'Uploaded & Validated' || returnStatuses.gstr1?.status === 'Filed' ? '#059669' : '#475569',
                border: '1px solid #e2e8f0'
              }}>
                {returnStatuses.gstr1?.status || (isSessionActive ? "Ready To Upload" : "Not Synced (Offline)")}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Due: 11th of month</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={handleDownloadJson}
                  style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff', fontSize: '0.72rem', fontWeight: 500 }}
                >
                  JSON
                </button>
                <button
                  type="button"
                  onClick={handleSyncGstr1}
                  disabled={isSyncingGstr1}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}
                >
                  Upload
                </button>
              </div>
            </div>
          </div>

          {/* GSTR-2B Return Card */}
          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>GSTR-2B ITC Statement</strong>
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', backgroundColor: '#ecfdf5', color: '#059669', fontWeight: 600 }}>Auto</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  Eligible ITC: ₹{metrics.totalItcAvailable?.toLocaleString('en-IN') || "0"} ({metrics.itcMatchRate || 100}% Matched)
                </div>
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                backgroundColor: isSessionActive && returnStatuses.gstr2b?.status === 'Reconciled' ? '#ecfdf5' : '#f1f5f9',
                color: isSessionActive && returnStatuses.gstr2b?.status === 'Reconciled' ? '#059669' : '#475569',
                border: '1px solid #e2e8f0'
              }}>
                {isSessionActive ? (returnStatuses.gstr2b?.status || "Fetch Required") : "Not Synced (Offline)"}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Generated: 14th</span>
              <button
                type="button"
                onClick={handleFetchGstr2b}
                disabled={isFetching2B}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}
              >
                Fetch 2B
              </button>
            </div>
          </div>

          {/* GSTR-3B Return Card */}
          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>GSTR-3B Tax Settlement</strong>
                  <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 600 }}>Summary</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
                  ITC Offset: ₹{metrics.totalItcAvailable?.toLocaleString('en-IN') || "0"} | Net Cash: ₹{metrics.netCashLiability?.toLocaleString('en-IN') || "0"}
                </div>
              </div>
              <span style={{
                padding: '2px 8px',
                borderRadius: '8px',
                fontSize: '0.68rem',
                fontWeight: 600,
                backgroundColor: returnStatuses.gstr3b?.status === 'Filed' ? '#ecfdf5' : '#fef3c7',
                color: returnStatuses.gstr3b?.status === 'Filed' ? '#059669' : '#d97706',
                border: '1px solid #fef3c7'
              }}>
                {returnStatuses.gstr3b?.status || (isSessionActive ? "Draft" : "Pending Login & Filing")}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Due: 20th of month</span>
              <button
                type="button"
                onClick={handleFileGstr3b}
                disabled={isFiling3B}
                style={{ padding: '4px 12px', borderRadius: '6px', border: 'none', backgroundColor: '#e11d48', color: '#fff', fontSize: '0.72rem', fontWeight: 600 }}
              >
                File 3B
              </button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: GSTR-1 (Mobile-Optimized Cards & Subtabs) */}
      {activeTab === 'gstr1' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          
          {/* Sub-tab pills */}
          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none', width: '100%' }}>
            {[
              { key: 'b2b', label: `B2B (${gstr1Data.b2bInvoices.length})` },
              { key: 'b2cs', label: `B2C Small (${gstr1Data.b2cSmallInvoices.length})` },
              { key: 'hsn', label: `HSN (${gstr1Data.hsnSummaryList.length})` },
              { key: 'cdnr', label: `Credit Notes (${gstr1Data.cdnrList.length})` },
              { key: 'docs', label: `Docs (${gstr1Data.docSummary.length})` }
            ].map(sub => (
              <button
                key={sub.key}
                type="button"
                onClick={() => setGstr1SubTab(sub.key as any)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  border: gstr1SubTab === sub.key ? '1px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: gstr1SubTab === sub.key ? '#eff6ff' : '#ffffff',
                  color: gstr1SubTab === sub.key ? '#2563eb' : '#64748b',
                  fontSize: '0.72rem',
                  fontWeight: gstr1SubTab === sub.key ? 600 : 500,
                  whiteSpace: 'nowrap',
                  cursor: 'pointer'
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* Sub-tab: B2B Invoices Cards */}
          {gstr1SubTab === 'b2b' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gstr1Data.b2bInvoices.map((inv: any) => (
                <div key={inv.id} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.82rem' }}>{inv.invoiceNumber}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>₹{inv.invoiceValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 500 }}>{inv.customerName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                    <span style={{ fontFamily: 'monospace' }}>{inv.customerGstin}</span>
                    <span>{inv.invoiceDate}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px', fontSize: '0.68rem', color: '#475569' }}>
                    <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>Taxable: ₹{inv.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '1px 6px', borderRadius: '4px' }}>Tax: ₹{(inv.cgst + inv.sgst + inv.igst).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
              {gstr1Data.b2bInvoices.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.78rem' }}>
                  No B2B invoices recorded in this period.
                </div>
              )}
            </div>
          )}

          {/* Sub-tab: B2C Small */}
          {gstr1SubTab === 'b2cs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gstr1Data.b2cSmallInvoices.map((inv: any) => (
                <div key={inv.id} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.82rem' }}>{inv.invoiceNumber}</span>
                    <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.85rem' }}>₹{inv.invoiceValue.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#334155' }}>{inv.customerName}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>Taxable: ₹{inv.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                    <span>{inv.invoiceDate}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Sub-tab: HSN */}
          {gstr1SubTab === 'hsn' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gstr1Data.hsnSummaryList.map((h: any, idx: number) => (
                <div key={idx} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a', fontSize: '0.82rem' }}>HSN {h.hsnCode}</span>
                    <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.82rem' }}>{h.rate}% Rate</span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#334155' }}>{h.description}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                    <span>Qty: {h.totalQty} {h.uqc?.split('-')[0]}</span>
                    <span>Taxable: ₹{h.taxableValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* TAB 3: GSTR-3B */}
      {activeTab === 'gstr3b' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>
              Form GSTR-3B Tax Offsetting
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
              <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>3.1 Outward Tax Liability</span>
                <strong style={{ color: '#0f172a' }}>₹{metrics.totalOutputTax?.toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ padding: '8px', backgroundColor: '#f0fdf4', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#166534' }}>4.0 Eligible ITC Offsets</span>
                <strong style={{ color: '#059669' }}>-₹{metrics.totalItcAvailable?.toLocaleString('en-IN')}</strong>
              </div>

              <div style={{ padding: '10px 8px', backgroundColor: '#fff1f2', borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#9f1239', fontWeight: 600 }}>6.1 Net Cash Payable</span>
                <strong style={{ color: '#e11d48', fontSize: '1rem' }}>₹{metrics.netCashLiability?.toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <div style={{ marginTop: '12px' }}>
              <button
                type="button"
                onClick={handleFileGstr3b}
                disabled={isFiling3B}
                style={{ width: '100%', padding: '10px', borderRadius: '8px', border: 'none', backgroundColor: '#e11d48', color: '#fff', fontSize: '0.8rem', fontWeight: 600, cursor: isFiling3B ? 'not-allowed' : 'pointer' }}
              >
                {isFiling3B ? "Submitting GSTR-3B..." : "Submit & File GSTR-3B on Portal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GSTR-2B ITC RECONCILIATION */}
      {activeTab === 'gstr2b' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
              {gstr2bData.itcReconRows.length} Purchase Bills Reconciled
            </span>
            <button
              type="button"
              onClick={handleFetchGstr2b}
              disabled={isFetching2B}
              style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}
            >
              Fetch Live 2B
            </button>
          </div>

          {gstr2bData.itcReconRows.map((row: any) => (
            <div key={row.id} style={{ padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, color: '#2563eb', fontSize: '0.8rem' }}>{row.billNumber}</span>
                <span style={{ padding: '2px 6px', borderRadius: '6px', fontSize: '0.68rem', fontWeight: 500, backgroundColor: `${row.statusColor}15`, color: row.statusColor }}>
                  {row.reconStatus}
                </span>
              </div>
              <div style={{ fontSize: '0.76rem', color: '#334155', fontWeight: 500 }}>{row.vendorName}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.7rem', color: '#64748b' }}>
                <span style={{ fontFamily: 'monospace' }}>{row.vendorGstin}</span>
                <span>Books Tax: ₹{row.booksTax?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: GSTR-9 */}
      {activeTab === 'gstr9' && (
        <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 8px 0' }}>
            Form GSTR-9: Annual Return Preparer
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.78rem' }}>
            <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Annual Taxable Turnover</span>
              <strong>₹{((metrics.totalOutwardTaxable || 0) * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </div>
            <div style={{ padding: '8px', backgroundColor: '#f8fafc', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Annual ITC Claimed</span>
              <strong style={{ color: '#059669' }}>₹{((metrics.totalItcAvailable || 0) * 12).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GST PUBLIC APIS (developer.gst.gov.in) */}
      {activeTab === 'public_apis' && (
        <div style={{ marginTop: '4px' }}>
          <GstDeveloperPortalTools />
        </div>
      )}

      {/* TAB 7: GST PORTAL LOGS */}
      {activeTab === 'portal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ padding: '14px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0f172a' }}>Connection Status</span>
              <button
                type="button"
                onClick={handleTestApi}
                disabled={isTestingApi}
                style={{ padding: '4px 10px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '0.72rem', fontWeight: 500 }}
              >
                Test Handshake
              </button>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#475569' }}>
              User: <strong style={{ color: '#0f172a' }}>{onlineFilingSetting?.gstPortalUsername || "espon_gst_user"}</strong>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#475569', marginTop: '2px' }}>
              Status: <span style={{ color: isSessionActive ? '#059669' : '#d97706', fontWeight: 600 }}>{isSessionActive ? "Active" : "Disconnected"}</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
