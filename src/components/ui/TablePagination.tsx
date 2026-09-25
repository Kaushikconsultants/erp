"use client";

import React from 'react';
import { 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight 
} from 'lucide-react';

export interface TablePaginationProps {
  totalCount?: number;
  totalItems?: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemName?: string;
  pageSizeOptions?: number[];
  containerRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Enterprise standard pagination bar.
 * Matches Quotations reference design with range counter, per-page selector,
 * first/prev/numbered/next/last buttons, and auto-scroll capability.
 */
export default function TablePagination({
  totalCount,
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
  itemName = 'items',
  pageSizeOptions = [25, 50, 100, 200],
  containerRef,
  className,
  style
}: TablePaginationProps) {
  const count = totalCount ?? totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = count === 0 ? 0 : (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, count);

  const fromDisplay = count === 0 ? 0 : startIndex + 1;
  const toDisplay = endIndex;

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === safeCurrentPage) return;
    onPageChange(newPage);
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.top < 0) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safeCurrentPage > 3) {
        pages.push('...');
      }
      const start = Math.max(2, safeCurrentPage - 1);
      const end = Math.min(totalPages - 1, safeCurrentPage + 1);
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      if (safeCurrentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={className}
      style={{
        padding: '14px 20px',
        borderTop: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        fontSize: '0.85rem',
        fontFamily: 'inherit',
        ...style
      }}
    >
      {/* Left side: Range information & Page Size selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ color: '#475569', fontSize: '0.825rem', fontFamily: 'inherit' }}>
          Showing <span style={{ fontWeight: 700, color: '#0f172a' }}>{fromDisplay}</span> to{' '}
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{toDisplay}</span> of{' '}
          <span style={{ fontWeight: 700, color: '#0f172a' }}>{count}</span> {itemName}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label
            htmlFor={`page-size-selector-${itemName.replace(/\s+/g, '-')}`}
            style={{ fontSize: '0.825rem', color: '#64748b', fontWeight: 500, fontFamily: 'inherit' }}
          >
            Per page:
          </label>
          <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            <select
              id={`page-size-selector-${itemName.replace(/\s+/g, '-')}`}
              value={pageSize}
              onChange={(e) => {
                const newSize = Number(e.target.value);
                onPageSizeChange(newSize);
                onPageChange(1);
              }}
              style={{
                appearance: 'none',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                height: '34px',
                padding: '0 28px 0 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                fontSize: '0.825rem',
                fontFamily: 'inherit',
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
                transition: 'all 0.15s ease'
              }}
            >
              {pageSizeOptions.map((opt, i) => (
                <option key={opt} value={opt}>
                  {i === pageSizeOptions.length - 1 && opt >= 200
                    ? `${opt} / page (Max)`
                    : `${opt} / page (1–${opt})`}
                </option>
              ))}
            </select>
            <ChevronDown 
              size={13} 
              style={{ 
                position: 'absolute', 
                right: '8px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#64748b', 
                pointerEvents: 'none' 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Right side: Page Navigation buttons */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
          {/* First page button */}
          <button
            type="button"
            onClick={() => handlePageChange(1)}
            disabled={safeCurrentPage === 1}
            title="First Page"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: safeCurrentPage === 1 ? '#94a3b8' : '#334155',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === 1 ? 0.4 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronsLeft size={15} />
          </button>

          {/* Previous page button */}
          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            title="Previous Page"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: safeCurrentPage === 1 ? '#94a3b8' : '#334155',
              cursor: safeCurrentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === 1 ? 0.4 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronLeft size={15} />
          </button>

          {/* Page numbers */}
          {getPageNumbers().map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    width: '28px',
                    textAlign: 'center',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    fontFamily: 'inherit',
                    userSelect: 'none'
                  }}
                >
                  …
                </span>
              );
            }

            const isCurrent = p === safeCurrentPage;
            return (
              <button
                key={`page-${p}`}
                type="button"
                onClick={() => handlePageChange(Number(p))}
                style={{
                  minWidth: '32px',
                  height: '32px',
                  padding: '0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: isCurrent ? '1px solid var(--accent-primary, #4f46e5)' : '1px solid #cbd5e1',
                  backgroundColor: isCurrent ? 'var(--accent-primary, #4f46e5)' : '#ffffff',
                  color: isCurrent ? '#ffffff' : '#334155',
                  fontWeight: isCurrent ? 700 : 500,
                  fontSize: '0.825rem',
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: isCurrent ? '0 2px 4px rgba(79, 70, 229, 0.2)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next page button */}
          <button
            type="button"
            onClick={() => handlePageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPages}
            title="Next Page"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: safeCurrentPage === totalPages ? '#94a3b8' : '#334155',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === totalPages ? 0.4 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronRight size={15} />
          </button>

          {/* Last page button */}
          <button
            type="button"
            onClick={() => handlePageChange(totalPages)}
            disabled={safeCurrentPage === totalPages}
            title="Last Page"
            style={{
              width: '32px',
              height: '32px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: safeCurrentPage === totalPages ? '#94a3b8' : '#334155',
              cursor: safeCurrentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: safeCurrentPage === totalPages ? 0.4 : 1,
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
          >
            <ChevronsRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Helper to slice an array given current page and page size safely
 */
export function paginate<T>(items: T[], currentPage: number, pageSize: number): T[] {
  if (!items || items.length === 0) return [];
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);
  return items.slice(startIndex, endIndex);
}
