"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Search, Mic, MicOff, Bot, Sparkles, User, FileText, ShoppingBag, Package, PlusCircle, Settings, BarChart2, Phone, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
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

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {}
      }
    };
  }, []);

  const executeSearch = async (searchQuery: string) => {
    setShowDropdown(false);
    const rawQuery = searchQuery.trim();
    if (!rawQuery) return;

    setIsAiProcessing(true);
    setFeedbackMsg(`🤖 AI Processing: "${rawQuery}"...`);

    try {
      const intentResult = await parseVoiceIntent(rawQuery);
      setFeedbackMsg(`✨ ${intentResult.aiExplanation}`);

      setTimeout(() => {
        setIsAiProcessing(false);
        setFeedbackMsg('');
        setQuery('');
        // Use window.location.href so ?action= params properly trigger page useEffects
        window.location.href = intentResult.route;
      }, 500);
    } catch (err) {
      console.error("AI Voice intent error:", err);
      setIsAiProcessing(false);
      setFeedbackMsg('');
      window.location.href = `/customers?search=${encodeURIComponent(rawQuery)}`;
    }
  };

  const toggleVoiceSearch = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
      setIsListening(false);
      setFeedbackMsg('');
      return;
    }

    // Check browser speech recognition support
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      setFeedbackMsg('⚠️ Speech recognition is not supported in this browser. Please type your search.');
      setTimeout(() => setFeedbackMsg(''), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-IN';

      recognition.onstart = () => {
        setIsListening(true);
        setFeedbackMsg('🎙️ Listening... speak now (e.g. "Create quotation", "Sonu Garments", "Pending orders")...');
        setShowDropdown(false);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setQuery(transcript);
        latestQueryRef.current = transcript;
        if (event.results[0] && event.results[0].isFinal) {
          setFeedbackMsg(`✨ Voice captured: "${transcript}"`);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error === 'not-allowed') {
          setFeedbackMsg('⚠️ Microphone permission was denied. Please allow microphone access in your browser.');
        } else if (event.error !== 'aborted') {
          setFeedbackMsg(`⚠️ Voice error (${event.error}). Please try again.`);
        }
        setTimeout(() => setFeedbackMsg(''), 4000);
      };

      recognition.onend = () => {
        setIsListening(false);
        const finalSpeech = latestQueryRef.current.trim();
        if (finalSpeech) {
          setFeedbackMsg(`🤖 Processing: "${finalSpeech}"...`);
          executeSearch(finalSpeech);
        } else {
          setFeedbackMsg('');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start voice recognition:', err);
      setIsListening(false);
      setFeedbackMsg('⚠️ Failed to start microphone. Please check your mic settings.');
      setTimeout(() => setFeedbackMsg(''), 4000);
    }
  };

  const handleSelectOption = (url: string) => {
    setShowDropdown(false);
    setQuery('');
    router.push(url);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <div 
        className="search-container" 
        style={{ 
          position: 'relative', 
          paddingRight: '42px', 
          width: '380px',
          borderColor: isListening ? '#10b981' : undefined,
          boxShadow: isListening ? '0 0 0 3px rgba(16, 185, 129, 0.25)' : undefined
        }}
      >
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

        {query && !isListening && (
          <button
            type="button"
            onClick={() => { setQuery(''); latestQueryRef.current = ''; }}
            style={{ position: 'absolute', right: '40px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
            title="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {/* Direct AI Voice Microphone Button */}
        <button
          type="button"
          onClick={toggleVoiceSearch}
          title={isListening ? "Listening... Click to stop" : "AI Voice Search (Click & Speak)"}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: isListening ? '#10b981' : isAiProcessing ? 'var(--accent-primary, #4f46e5)' : 'transparent',
            border: isListening ? 'none' : 'none',
            borderRadius: '50%',
            width: '30px',
            height: '30px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: (isListening || isAiProcessing) ? '#ffffff' : 'var(--accent-primary, #6366f1)',
            transition: 'all 0.2s ease',
            boxShadow: isListening ? '0 0 0 4px rgba(16, 185, 129, 0.35)' : isAiProcessing ? '0 0 0 4px rgba(79, 70, 229, 0.25)' : 'none',
          }}
        >
          {isAiProcessing ? <Sparkles size={16} /> : isListening ? <MicOff size={16} /> : <Mic size={18} />}
        </button>
      </div>

      {/* Listening / AI Status Toast */}
      {feedbackMsg && (
        <div style={{
          position: 'absolute',
          top: '115%',
          left: 0,
          right: 0,
          backgroundColor: '#0f172a',
          color: '#ffffff',
          padding: '9px 14px',
          borderRadius: '8px',
          fontSize: '0.82rem',
          fontWeight: 500,
          zIndex: 1001,
          boxShadow: '0 10px 20px -3px rgba(0,0,0,0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          border: '1px solid #334155',
          animation: 'fadeIn 0.2s ease'
        }}>
          {isAiProcessing ? <Bot size={16} color="#a855f7" /> : isListening ? <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} /> : null}
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* LIVE ALL-OPTIONS DROPDOWN MENU */}
      {showDropdown && !isListening && (
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
                style={{ padding: '12px 16px', textAlign: 'center', backgroundColor: '#eef2ff', color: 'var(--accent-primary, #4f46e5)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
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
