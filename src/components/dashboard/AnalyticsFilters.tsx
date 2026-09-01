"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, MapPin, Filter, ChevronDown } from 'lucide-react';

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
    <form 
      onSubmit={handleFilter} 
      className="analytics-filters-card"
    >
      <div className="analytics-filter-field">
        <label className="analytics-filter-label">
          <Calendar size={13} style={{ color: 'var(--accent-primary, #00a884)' }} />
          Timeframe
        </label>
        <div className="analytics-select-wrapper">
          <select 
            value={timeframe} 
            onChange={e => setTimeframe(e.target.value)} 
            className="analytics-select"
          >
            <option>This Month</option>
            <option>Last Month</option>
            <option>This Quarter</option>
            <option>This Year</option>
          </select>
          <ChevronDown size={16} className="analytics-select-chevron" />
        </div>
      </div>

      <div className="analytics-filter-field">
        <label className="analytics-filter-label">
          <Users size={13} style={{ color: 'var(--accent-primary, #00a884)' }} />
          Agent
        </label>
        <div className="analytics-select-wrapper">
          <select 
            value={agent} 
            onChange={e => setAgent(e.target.value)} 
            className="analytics-select"
          >
            <option value="all">All Agents</option>
            {agents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="analytics-select-chevron" />
        </div>
      </div>

      <div className="analytics-filter-field">
        <label className="analytics-filter-label">
          <MapPin size={13} style={{ color: 'var(--accent-primary, #00a884)' }} />
          State
        </label>
        <div className="analytics-select-wrapper">
          <select 
            value={stateFilter} 
            onChange={e => setStateFilter(e.target.value)} 
            className="analytics-select"
          >
            <option value="all">All States</option>
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <ChevronDown size={16} className="analytics-select-chevron" />
        </div>
      </div>

      <div>
        <button type="submit" className="analytics-filter-submit">
          <Filter size={16} /> Filter
        </button>
      </div>
    </form>
  );
}
