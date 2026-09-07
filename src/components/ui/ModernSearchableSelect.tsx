"use client";

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check, X, Plus } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  icon?: React.ReactNode;
}

interface ModernSearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  icon?: React.ReactNode;
  allowClear?: boolean;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  menuMaxHeight?: number;
  onAddNew?: (searchQuery?: string) => void;
  addNewLabel?: string;
}

export default function ModernSearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search options...",
  icon,
  allowClear = false,
  disabled = false,
  style,
  menuMaxHeight = 220,
  onAddNew,
  addNewLabel = "+ Add New Item"
}: ModernSearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Focus search when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const selectedOption = options.find((o) => o.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.subLabel && opt.subLabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", minWidth: 0, ...style }}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          minWidth: 0,
          height: "38px",
          boxSizing: "border-box",
          padding: "0 12px",
          backgroundColor: disabled ? "#f1f5f9" : "#ffffff",
          border: isOpen ? "1.5px solid var(--accent-primary, #4f46e5)" : "1px solid #cbd5e1",
          borderRadius: "8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          textAlign: "left",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: isOpen ? "0 0 0 3px rgba(79, 70, 229, 0.14)" : "0 1px 2px rgba(0, 0, 0, 0.03)",
          transition: "all 0.15s ease",
          fontSize: "0.84rem",
          color: selectedOption ? "#0f172a" : "#64748b"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", minWidth: 0, flex: 1 }}>
          {icon && <span style={{ color: "#64748b", display: "flex", alignItems: "center", flexShrink: 0 }}>{icon}</span>}
          <span style={{ fontWeight: selectedOption ? 500 : 400, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: selectedOption ? "#0f172a" : "#94a3b8", display: "block" }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
          {allowClear && selectedOption && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              style={{ color: "#94a3b8", cursor: "pointer", padding: "2px", display: "flex", alignItems: "center" }}
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              color: "#94a3b8",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
              flexShrink: 0
            }}
          />
        </div>
      </button>

      {/* Floating Menu */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            border: "1px solid #cbd5e1",
            boxShadow: "0 12px 30px -4px rgba(0, 0, 0, 0.16), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
            zIndex: 999999,
            overflow: "hidden"
          }}
        >
          {/* Search Field (if more than 4 options or onAddNew is available) */}
          {(options.length > 4 || onAddNew) && (
            <div style={{ padding: "8px 10px", borderBottom: "1px solid #f1f5f9", position: "relative", backgroundColor: "#f8fafc" }}>
              <Search size={14} style={{ position: "absolute", left: "20px", top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  width: "100%",
                  padding: "7px 10px 7px 32px",
                  fontSize: "0.82rem",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#ffffff",
                  outline: "none",
                  color: "#0f172a"
                }}
              />
            </div>
          )}

          {/* Options List */}
          <div
            style={{
              maxHeight: `${menuMaxHeight}px`,
              overflowY: "auto",
              padding: "4px"
            }}
          >
            {filteredOptions.map((option) => {
              const isSelected = option.value === value;
              return (
                <div
                  key={option.value}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? "#eef2ff" : "transparent",
                    color: isSelected ? "#4f46e5" : "#1e293b",
                    fontSize: "0.8rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    transition: "background-color 0.1s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "#f8fafc";
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: "2px", overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {option.icon}
                      <span style={{ fontWeight: isSelected ? 600 : 500, color: isSelected ? "#4f46e5" : "#0f172a" }}>
                        {option.label}
                      </span>
                      {option.badge && (
                        <span
                          style={{
                            fontSize: "0.68rem",
                            padding: "1px 6px",
                            borderRadius: "4px",
                            backgroundColor: "#f1f5f9",
                            color: "#64748b",
                            fontWeight: 500
                          }}
                        >
                          {option.badge}
                        </span>
                      )}
                    </div>
                    {option.subLabel && (
                      <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 400 }}>
                        {option.subLabel}
                      </span>
                    )}
                  </div>

                  {isSelected && <Check size={14} style={{ color: "#4f46e5", flexShrink: 0 }} />}
                </div>
              );
            })}

            {filteredOptions.length === 0 && (
              <div style={{ padding: "14px 12px", textAlign: "center", fontSize: "0.8rem", color: "#64748b" }}>
                <div>No matching options found</div>
                {onAddNew && search.trim() && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsOpen(false);
                      onAddNew(search.trim());
                    }}
                    style={{
                      marginTop: "8px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "6px 12px",
                      borderRadius: "6px",
                      backgroundColor: "#eef2ff",
                      color: "#4f46e5",
                      border: "1px solid #c7d2fe",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={13} />
                    <span>Create &quot;{search.trim()}&quot;</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Add New Item Action Footer */}
          {onAddNew && (
            <div
              style={{
                borderTop: "1px solid #f1f5f9",
                padding: "4px",
                backgroundColor: "#f8fafc"
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onAddNew(search.trim() || undefined);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "transparent",
                  color: "var(--accent-primary, #4f46e5)",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "background-color 0.15s ease"
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#eef2ff")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <Plus size={14} />
                <span>{addNewLabel}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
