"use client";

import React, { useEffect, useState } from "react";
import { getCustomerIntelligence } from "@/app/actions/customerActions";
import { BrainCircuit, TrendingUp, AlertTriangle, Sparkles, Flame, Snowflake, Sun } from "lucide-react";
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
      
      // Attempt to load or calculate AI lead score
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

  if (loading) return <div className="p-4 border rounded-xl animate-pulse bg-gray-50 h-32"></div>;
  if (!intel) return null;

  const TempIcon = intel.temperature === 'HOT' ? Flame : intel.temperature === 'WARM' ? Sun : Snowflake;
  const tempColor = intel.temperature === 'HOT' ? 'text-red-500' : intel.temperature === 'WARM' ? 'text-orange-500' : 'text-blue-500';

  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100">
      <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-2 mb-4">
        <BrainCircuit size={18} />
        Business Memory & AI Intelligence
      </h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">AI Lead Score <Sparkles size={12} className="text-yellow-500"/></div>
          <div className="text-2xl font-bold flex items-center gap-2">
            <span className={intel.leadScore >= 70 ? 'text-green-600' : intel.leadScore >= 40 ? 'text-orange-500' : 'text-red-500'}>
              {intel.leadScore || intel.healthScore}/100
            </span>
            {intel.temperature && <TempIcon size={18} className={tempColor} />}
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Lifetime Value</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹{intel.totalSpent.toLocaleString()}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Total Orders</div>
          <div className="text-2xl font-bold text-gray-800">
            {intel.totalOrders}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-1">Avg Order Value</div>
          <div className="text-2xl font-bold text-gray-800">
            ₹{Math.round(intel.averageOrderValue).toLocaleString()}
          </div>
        </div>

        <div className="col-span-2 md:col-span-4 bg-white p-4 rounded-lg shadow-sm border border-indigo-50">
          <div className="text-xs text-gray-500 mb-2">Frequently Purchased</div>
          <div className="flex flex-wrap gap-2">
            {intel.topProducts?.length ? (
              intel.topProducts.map((p: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                  {p}
                </span>
              ))
            ) : (
              <span className="text-sm text-gray-400">No purchase history yet.</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-indigo-100 pt-4 mt-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-500" />
            AI Smart Follow-Up
          </h4>
          <button 
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? 'Generating...' : 'Generate Follow-Up'}
          </button>
        </div>

        {aiFollowUp && (
          <div className="bg-white p-4 rounded-lg border border-indigo-100 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Suggested Email</div>
              <textarea 
                className="w-full text-sm p-3 bg-gray-50 border rounded-md" 
                rows={6}
                readOnly
                value={aiFollowUp.email}
              />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wider">Calling Script</div>
              <textarea 
                className="w-full text-sm p-3 bg-indigo-50 border border-indigo-100 rounded-md text-indigo-900" 
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
