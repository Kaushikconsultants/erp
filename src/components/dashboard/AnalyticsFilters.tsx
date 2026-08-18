"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, Users, MapPin, Search } from 'lucide-react';

interface AnalyticsFiltersProps {
  activeTab: string;
  selectedAgentId: string;
  selectedState: string;
  agents: { id: string; name: string }[];
  states: string[];
}

export default function AnalyticsFilters({
  activeTab,
  selectedAgentId,
  selectedState,
  agents,
  states
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const [agent, setAgent] = useState(selectedAgentId);
  const [stateFilter, setStateFilter] = useState(selectedState);
  const [timeframe, setTimeframe] = useState('This Month');

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeTab) params.set('tab', activeTab);
    if (agent !== 'all') params.set('agent', agent);
    if (stateFilter !== 'all') params.set('state', stateFilter);
    
    router.push(`?${params.toString()}`);
  };

  return (
    <form onSubmit={handleFilter} style={{ backgroundColor: '#fff', padding: '16px 24px', borderRadius: '12px', display: 'flex', gap: '20px', alignItems: 'flex-end', marginBottom: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)' }}>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}><Clock size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/>Timeframe</label>
        <select value={timeframe} onChange={e => setTimeframe(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
          <option>This Month</option>
          <option>Last Month</option>
          <option>This Quarter</option>
          <option>This Year</option>
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}><Users size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/>Agent</label>
        <select value={agent} onChange={e => setAgent(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
          <option value="all">All Agents</option>
          {agents.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div style={{ flex: 1 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}><MapPin size={14} style={{display:'inline', verticalAlign:'middle', marginRight:'4px'}}/>State</label>
        <select value={stateFilter} onChange={e => setStateFilter(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
          <option value="all">All States</option>
          {states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
        <button type="submit" style={{ backgroundColor: 'var(--accent-primary)', color: 'white', padding: '10px 24px', borderRadius: '6px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', height: '40px' }}>
          <Search size={16} /> Filter
        </button>
      </div>
    </form>
  );
}
