"use client";

import React, { useRef } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Calendar, RotateCcw } from 'lucide-react';

export default function MonthPicker({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);

  const currentMonth = defaultValue || (() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  })();

  const today = new Date();
  const thisMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const isThisMonth = currentMonth === thisMonthStr;

  // Format human-readable string: e.g., "August 2026"
  const formattedMonth = (() => {
    try {
      const [y, m] = currentMonth.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return currentMonth;
    }
  })();

  function navigateToMonth(monthVal: string) {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '');
    params.set('month', monthVal);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handlePrevMonth() {
    try {
      const [y, m] = currentMonth.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 2, 1);
      const prevVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      navigateToMonth(prevVal);
    } catch {
      // fallback
    }
  }

  function handleNextMonth() {
    try {
      const [y, m] = currentMonth.split('-');
      const d = new Date(parseInt(y, 10), parseInt(m, 10), 1);
      const nextVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      navigateToMonth(nextVal);
    } catch {
      // fallback
    }
  }

  function handleThisMonth() {
    navigateToMonth(thisMonthStr);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) {
      navigateToMonth(e.target.value);
    }
  }

  function triggerPicker() {
    if (inputRef.current) {
      if (typeof (inputRef.current as any).showPicker === 'function') {
        try {
          (inputRef.current as any).showPicker();
          return;
        } catch {
          // fallback to focus
        }
      }
      inputRef.current.focus();
    }
  }

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '10px',
        padding: '3px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        userSelect: 'none'
      }}
    >
      {/* Prev Month Button */}
      <button
        type="button"
        onClick={handlePrevMonth}
        title="Previous Month"
        style={{
          width: 32,
          height: 32,
          borderRadius: '7px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.color = '#0f172a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#475569';
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {/* Main Month Button (Clickable to open calendar) */}
      <div
        onClick={triggerPicker}
        title="Click to jump to another month"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '0 12px',
          height: 32,
          borderRadius: '7px',
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#eef2ff';
          e.currentTarget.style.borderColor = '#c7d2fe';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#f8fafc';
          e.currentTarget.style.borderColor = '#e2e8f0';
        }}
      >
        <Calendar size={14} style={{ color: 'var(--accent-primary, #4f46e5)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
          {formattedMonth}
        </span>

        {/* Hidden Native Input */}
        <input
          ref={inputRef}
          type="month"
          value={currentMonth}
          onChange={handleInputChange}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer'
          }}
        />
      </div>

      {/* Next Month Button */}
      <button
        type="button"
        onClick={handleNextMonth}
        title="Next Month"
        style={{
          width: 32,
          height: 32,
          borderRadius: '7px',
          border: 'none',
          backgroundColor: 'transparent',
          color: '#475569',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f1f5f9';
          e.currentTarget.style.color = '#0f172a';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#475569';
        }}
      >
        <ChevronRight size={16} />
      </button>

      {/* Quick Jump to Current Month (when viewing past/future) */}
      {!isThisMonth && (
        <button
          type="button"
          onClick={handleThisMonth}
          title="Jump to Current Month"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '0 8px',
            height: 28,
            fontSize: '0.72rem',
            fontWeight: 700,
            borderRadius: '6px',
            border: '1px solid #c7d2fe',
            backgroundColor: '#eef2ff',
            color: 'var(--accent-primary, #4f46e5)',
            cursor: 'pointer',
            marginLeft: '2px',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#e0e7ff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#eef2ff';
          }}
        >
          <RotateCcw size={11} /> This Month
        </button>
      )}
    </div>
  );
}
