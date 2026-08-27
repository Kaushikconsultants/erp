"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, Bot, Sparkles, User, FileText, ShoppingBag, Package, PlusCircle, Settings, BarChart2, Phone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVoiceStore } from '@/lib/stores/voiceStore';
import { parseVoiceIntent } from '@/app/actions/voiceActions';
import { searchAllModules, SearchResultItem } from '@/app/actions/searchActions';

const QUICK_NAV = [
  { title: "Create New Quotation", subtitle: "Issue a new formal quote", url: "/quotations/new", icon: PlusCircle, color: "#4f46e5" },
  { title: "View All Quotations", subtitle: "Quotations & estimates dashboard", url: "/quotations", icon: FileText, color: "#8b5cf6" },
  { title: "Customers Directory", subtitle: "View & manage B2B accounts", url: "/customers", icon: User, color: "#3b82f6" },
  { title: "Sales Orders", subtitle: "Track orders & shipments", url: "/orders", icon: ShoppingBag, color: "#10b981" },
  { title: "Product Master", subtitle: "Inventory, stock & pricing", url: "/products", icon: Package, color: "#f59e0b" },
  { title: "Calls & Follow-ups", subtitle: "Log call history & tasks", url: "/calls", icon: Phone, color: "#ec4899" },
  { title: "Reports & Analytics", subtitle: "Revenue & sales performance", url: "/analytics", icon: BarChart2, color: "#06b6d4" },
  { title: "Company Settings", subtitle: "Organization preferences", url: "/settings/organization", icon: Settings, color: "#64748b" },
];

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchingLive, setSearchingLive] = useState(false);
  
  const router = useRouter();
  const recognitionRef = useRef<any>(null);
  const latestQueryRef = useRef<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    latestQueryRef.current = query;

    // Live search debouncer
    if (query.trim().length >= 1) {
      setSearchingLive(true);
      const timer = setTimeout(async () => {
        const results = await searchAllModules(query);
        setSearchResults(results);
        setSearchingLive(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setSearchingLive(false);
    }
  }, [query]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const executeSearch = async (searchQuery: string) => {
    setShowDropdown(false);
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setIsAiProcessing(true);
    setFeedbackMsg(`🤖 AI Processing: "${rawQuery}"...`);

    try {
      const intentResult = await parseVoiceIntent(rawQuery);
      setFeedbackMsg(`✨ AI: ${intentResult.aiExplanation}`);
      
      setTimeout(() => {
        setIsAiProcessing(false);
        setFeedbackMsg('');
        router.push(intentResult.route);
      }, 350);
    } catch (err) {
      console.error("AI Voice intent error:", err);
      setIsAiProcessing(false);
      router.push(`/customers?search=${encodeURIComponent(rawQuery)}`);
    }
  };

  const { openAssistant } = useVoiceStore();

  const startVoiceSearch = () => {
    openAssistant();
  };

  const handleSelectOption = (url: string) => {
    setShowDropdown(false);
    setQuery('');
    router.push(url);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div className="search-container" style={{ position: 'relative', paddingRight: '40px', width: '360px' }}>
        <button
          type="button"
          onClick={() => executeSearch(query)}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '10px' }}
          title="Click to Search"
        >
          <Search size={18} style={{ color: '#64748b', cursor: 'pointer' }} />
        </button>

        <input 
          type="text" 
          placeholder={isListening ? "Listening... speak now..." : "Ask AI or search software (Voice 🎙️)..."} 
          className="search-input"
          value={query}
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              executeSearch(query);
            }
          }}
          style={{ width: '100%', paddingLeft: 0, color: '#0f172a', fontWeight: 500 }}
        />

        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            style={{ position: 'absolute', right: '36px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
          >
            <X size={14} />
          </button>
        )}

        {/* AI Voice Microphone Button */}
        <button
          type="button"
          onClick={startVoiceSearch}
          title={isListening ? "Stop Listening" : "AI Voice Search (Click & Speak)"}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: isListening ? '#ef4444' : isAiProcessing ? '#8b5cf6' : 'transparent',
            border: 'none',
            borderRadius: '50%',
            width: '28px',
            height: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: (isListening || isAiProcessing) ? '#ffffff' : '#6366f1',
            transition: 'all 0.2s ease',
            boxShadow: isListening ? '0 0 0 4px rgba(239, 68, 68, 0.3)' : isAiProcessing ? '0 0 0 4px rgba(139, 92, 246, 0.3)' : 'none',
          }}
        >
          {isAiProcessing ? <Sparkles size={16} /> : isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {/* Listening / AI Status Toast */}
      {feedbackMsg && (
        <div style={{
          position: 'absolute',
          top: '110%',
          left: 0,
          right: 0,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '8px 12px',
          borderRadius: '8px',
          fontSize: '0.8rem',
          fontWeight: 600,
          zIndex: 101,
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #334155'
        }}>
          {isAiProcessing ? <Bot size={16} color="#a855f7" /> : isListening ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ef4444', display: 'inline-block' }} /> : null}
          {feedbackMsg}
        </div>
      )}

      {/* LIVE ALL-OPTIONS DROPDOWN MENU */}
      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '115%',
          left: 0,
          width: '420px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.1)',
          border: '1px solid #cbd5e1',
          zIndex: 1000,
          maxHeight: '480px',
          overflowY: 'auto',
          padding: '8px 0'
        }}>
          {/* Section 1: Live Multi-Entity Results */}
          {query.trim().length >= 1 ? (
            <div>
              <div style={{ padding: '8px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>
                {searchingLive ? "Searching software..." : searchResults.length > 0 ? `Search Results (${searchResults.length})` : `No direct matches for "${query}"`}
              </div>

              {searchResults.map(item => (
                <div 
                  key={item.id + item.type}
                  onClick={() => handleSelectOption(item.url)}
                  style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s ease' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a' }}>{item.title}</div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b' }}>{item.subtitle}</div>
                  </div>
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', backgroundColor: item.badgeColor ? `${item.badgeColor}15` : '#f1f5f9', color: item.badgeColor || '#475569', whiteSpace: 'nowrap' }}>
                    {item.type}
                  </span>
                </div>
              ))}

              <div 
                onClick={() => executeSearch(query)}
                style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: '#eef2ff', color: '#4f46e5', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Sparkles size={16} /> Run AI Search for "{query}"
              </div>
            </div>
          ) : (
            /* Section 2: Quick Navigation & All Software Options */
            <div>
              <div style={{ padding: '8px 16px', fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #f1f5f9' }}>
                All Software Quick Options
              </div>
              {QUICK_NAV.map((nav, idx) => {
                const IconComponent = nav.icon;
                return (
                  <div 
                    key={idx}
                    onClick={() => handleSelectOption(nav.url)}
                    style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', borderBottom: '1px solid #f8fafc', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', backgroundColor: `${nav.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComponent size={16} color={nav.color} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#0f172a' }}>{nav.title}</span>
                      <span style={{ fontSize: '0.74rem', color: '#64748b' }}>{nav.subtitle}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
