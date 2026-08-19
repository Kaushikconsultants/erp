"use client";

import React, { useEffect, useState } from "react";
import { getCustomerIntelligence } from "@/app/actions/customerActions";
import { BrainCircuit, Sparkles, Flame, Snowflake, Sun, RefreshCw, Mail, PhoneCall } from "lucide-react";
import { calculateLeadScore, generateSmartFollowUp } from "@/app/actions/aiActions";

export default function CustomerIntelligencePanel({ customerId }: { customerId: string }) {
  const [intel, setIntel] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await getCustomerIntelligence(customerId);
      if (res.success) {
        setIntel(res.intelligence);
      }
      
      const aiScoreRes = await calculateLeadScore(customerId);
      if (aiScoreRes.success) {
        setIntel((prev: any) => ({ ...prev, leadScore: aiScoreRes.score, temperature: aiScoreRes.temperature }));
      }
      
      setLoading(false);
    }
    load();
  }, [customerId]);

  const [generating, setGenerating] = useState(false);
  const [aiFollowUp, setAiFollowUp] = useState<{email?: string, script?: string} | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    const res = await generateSmartFollowUp(customerId);
    if (res.success) {
      setAiFollowUp(res);
    }
    setGenerating(false);
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center', color: '#94a3b8' }}>
        Analyzing business memory & lead scoring...
      </div>
    );
  }
  if (!intel) return null;

  const TempIcon = intel.temperature === 'HOT' ? Flame : intel.temperature === 'WARM' ? Sun : Snowflake;
  const tempColor = intel.temperature === 'HOT' ? '#ef4444' : intel.temperature === 'WARM' ? '#f97316' : '#3b82f6';
  const scoreColor = (intel.leadScore || 50) >= 70 ? '#16a34a' : (intel.leadScore || 50) >= 40 ? '#d97706' : '#dc2626';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #eef2ff 0%, #faf5ff 100%)',
      padding: '24px',
      borderRadius: '20px',
      border: '1px solid #c7d2fe',
      boxShadow: '0 4px 12px rgba(99, 102, 241, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: '20px'
    }}>
      {/* Header Title */}
      <h3 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#3730a3', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
        <BrainCircuit size={20} style={{ color: '#4f46e5' }} />
        Business Memory & AI Intelligence
      </h3>
      
      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        
        {/* AI Lead Score Card */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #c7d2fe', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            AI Lead Score <Sparkles size={12} style={{ color: '#eab308' }}/>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: scoreColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
            {intel.leadScore || intel.healthScore || 60}/100
            {intel.temperature && <TempIcon size={20} style={{ color: tempColor }} />}
          </div>
        </div>
        
        {/* Lifetime Value */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Lifetime Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
            ₹{(intel.totalSpent || 0).toLocaleString()}
          </div>
        </div>

        {/* Total Orders */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Total Orders</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
            {intel.totalOrders || 0}
          </div>
        </div>

        {/* Avg Order Value */}
        <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '6px' }}>Avg Order Value</div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>
            ₹{Math.round(intel.averageOrderValue || 0).toLocaleString()}
          </div>
        </div>

      </div>

      {/* Frequently Purchased Products */}
      <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Frequently Purchased Items
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {intel.topProducts?.length ? (
            intel.topProducts.map((p: string, i: number) => (
              <span key={i} style={{ padding: '4px 12px', backgroundColor: '#e0e7ff', color: '#3730a3', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '700' }}>
                {p}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No purchase history recorded yet.</span>
          )}
        </div>
      </div>

      {/* AI Smart Follow-Up Generator */}
      <div style={{ paddingTop: '16px', borderTop: '1px solid #c7d2fe' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
            <Sparkles size={18} style={{ color: '#4f46e5' }} />
            AI Smart Follow-Up Generator
          </h4>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              fontSize: '0.8rem',
              fontWeight: '700',
              borderRadius: '10px',
              border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: generating ? 0.6 : 1,
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.2)'
            }}
          >
            {generating ? <RefreshCw style={{ animation: 'spin 1s linear infinite' }} size={14} /> : <Sparkles size={14} />}
            {generating ? 'Generating AI Script...' : 'Generate Follow-Up'}
          </button>
        </div>

        {aiFollowUp && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <Mail size={14} style={{ color: '#38bdf8' }} /> Suggested Email Draft
              </div>
              <textarea 
                style={{ width: '100%', fontSize: '0.85rem', padding: '12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#1e293b', lineHeight: '1.5', outline: 'none' }} 
                rows={6}
                readOnly
                value={aiFollowUp.email}
              />
            </div>

            <div style={{ backgroundColor: '#ffffff', padding: '16px', borderRadius: '14px', border: '1px solid #c7d2fe' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4338ca', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
                <PhoneCall size={14} style={{ color: '#4f46e5' }} /> Calling Script
              </div>
              <textarea 
                style={{ width: '100%', fontSize: '0.85rem', padding: '12px', backgroundColor: '#eef2ff', border: '1px solid #c7d2fe', borderRadius: '8px', color: '#312e81', lineHeight: '1.5', outline: 'none' }} 
                rows={6}
                readOnly
                value={aiFollowUp.script}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
