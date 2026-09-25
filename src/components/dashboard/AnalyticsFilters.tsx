"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Users, MapPin, Filter, ChevronDown, RotateCcw } from 'lucide-react';

interface AnalyticsFiltersProps {
  activeTab: string;
  selectedAgentId: string;
  selectedState: string;
  selectedTimeframe?: string;
  startDate?: string;
  endDate?: string;
  agents: { id: string; name: string }[];
  states: string[];
}

const TIMEFRAME_OPTIONS = [
  'This Month',
  'Last Month',
  'Today',
  'Yesterday',
  'Last 7 Days',
  'Last 30 Days',
  'This Quarter',
  'This Year',
  'All Time',
  'Custom Range'
];

export default function AnalyticsFilters({
  activeTab,
  selectedAgentId,
  selectedState,
  selectedTimeframe = 'This Month',
  startDate = '',
  endDate = '',
  agents,
  states
}: AnalyticsFiltersProps) {
  const router = useRouter();
  const [agent, setAgent] = useState(selectedAgentId);
  const [stateFilter, setStateFilter] = useState(selectedState);
  const [timeframe, setTimeframe] = useState(selectedTimeframe || 'This Month');
  const [customStart, setCustomStart] = useState(startDate);
  const [customEnd, setCustomEnd] = useState(endDate);

  // Sync state if props change
  useEffect(() => {
    setAgent(selectedAgentId);
    setStateFilter(selectedState);
    setTimeframe(selectedTimeframe || 'This Month');
    setCustomStart(startDate);
    setCustomEnd(endDate);
  }, [selectedAgentId, selectedState, selectedTimeframe, startDate, endDate]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (activeTab) params.set('tab', activeTab);
    if (timeframe) params.set('timeframe', timeframe);
    if (timeframe === 'Custom Range') {
      if (customStart) params.set('from', customStart);
      if (customEnd) params.set('to', customEnd);
    }
    if (agent && agent !== 'all') params.set('agent', agent);
    if (stateFilter && stateFilter !== 'all') params.set('state', stateFilter);
    
    router.push(`?${params.toString()}`);
  };

  const handleReset = () => {
    setAgent('all');
    setStateFilter('all');
    setTimeframe('This Month');
    setCustomStart('');
    setCustomEnd('');
    const params = new URLSearchParams();
    if (activeTab) params.set('tab', activeTab);
    router.push(`?${params.toString()}`);
  };

  const isFiltered = agent !== 'all' || stateFilter !== 'all' || timeframe !== 'This Month' || !!customStart || !!customEnd;

  // Defensive deduplication by name and ID
  const uniqueAgents = React.useMemo(() => {
    const seen = new Set<string>();
    return (agents || []).filter(a => {
      const nameKey = (a.name || '').trim().toLowerCase();
      if (!nameKey || seen.has(nameKey) || seen.has(a.id)) return false;
      seen.add(nameKey);
      seen.add(a.id);
      return true;
    });
  }, [agents]);

  return (
    <form 
      onSubmit={handleFilter} 
      className="analytics-filters-card"
      style={{ flexWrap: 'wrap', alignItems: 'flex-end', gap: '14px' }}
    >
      {/* Timeframe Field */}
      <div className="analytics-filter-field" style={{ minWidth: '160px', flex: '1 1 180px' }}>
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
            {TIMEFRAME_OPTIONS.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <ChevronDown size={16} className="analytics-select-chevron" />
        </div>
      </div>

      {/* Custom Date Range Pickers if 'Custom Range' selected */}
      {timeframe === 'Custom Range' && (
        <>
          <div className="analytics-filter-field" style={{ minWidth: '140px', flex: '1 1 140px' }}>
            <label className="analytics-filter-label">
              From Date
            </label>
            <input 
              type="date" 
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="analytics-select"
              style={{ padding: '7px 10px' }}
              required
            />
          </div>
          <div className="analytics-filter-field" style={{ minWidth: '140px', flex: '1 1 140px' }}>
            <label className="analytics-filter-label">
              To Date
            </label>
            <input 
              type="date" 
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="analytics-select"
              style={{ padding: '7px 10px' }}
              required
            />
          </div>
        </>
      )}

      {/* Agent Field */}
      <div className="analytics-filter-field" style={{ minWidth: '160px', flex: '1 1 180px' }}>
        <label className="analytics-filter-label">
          <Users size={13} style={{ color: 'var(--accent-primary, #00a884)' }} />
          Agent / Sales Rep
        </label>
        <div className="analytics-select-wrapper">
          <select 
            value={agent} 
            onChange={e => setAgent(e.target.value)} 
            className="analytics-select"
          >
            <option value="all">All Agents</option>
            {uniqueAgents.map(a => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          <ChevronDown size={16} className="analytics-select-chevron" />
        </div>
      </div>

      {/* State Field */}
      <div className="analytics-filter-field" style={{ minWidth: '160px', flex: '1 1 180px' }}>
        <label className="analytics-filter-label">
          <MapPin size={13} style={{ color: 'var(--accent-primary, #00a884)' }} />
          State / Region
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

      {/* Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '1px' }}>
        <button type="submit" className="analytics-filter-submit">
          <Filter size={15} /> Filter
        </button>

        {isFiltered && (
          <button 
            type="button" 
            onClick={handleReset} 
            className="analytics-btn-reset-filters"
            title="Reset all filters to default"
          >
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>
    </form>
  );
}
