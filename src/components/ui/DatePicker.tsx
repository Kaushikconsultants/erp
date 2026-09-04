"use client";

import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';

interface CustomDatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange?: (e: any) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  minDate?: string;
  required?: boolean;
  name?: string;
  title?: string;
  onFocus?: (e: any) => void;
  onBlur?: (e: any) => void;
  defaultValue?: string;
  id?: string;
}

const parseDateString = (dateStr?: string | Date | null): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  if (typeof dateStr === 'string') {
    const trimmed = dateStr.trim();
    if (!trimmed) return null;
    
    // Check YYYY-MM-DD or YYYY/MM/DD
    if (/^\d{4}[-/]\d{2}[-/]\d{2}/.test(trimmed)) {
      const parts = trimmed.substring(0, 10).split(/[-/]/);
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const dt = new Date(y, m, d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    
    const parsed = new Date(trimmed);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
};

const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  className,
  style,
  disabled,
  minDate,
  defaultValue,
  name,
  required,
  id,
  title,
  onFocus,
  onBlur,
  ...rest
}) => {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = useState<string>(() => {
    return isControlled ? (value || '') : (defaultValue || '');
  });

  useEffect(() => {
    if (isControlled) {
      setInternalValue(value || '');
    }
  }, [value, isControlled]);

  const effectiveValue = isControlled ? (value || '') : internalValue;
  const selectedDate = parseDateString(effectiveValue);
  const minDateObj = minDate ? (parseDateString(minDate) || undefined) : undefined;

  const handleChange = (date: Date | null, event?: React.SyntheticEvent<any>) => {
    const val = date ? format(date, 'yyyy-MM-dd') : '';
    if (!isControlled) {
      setInternalValue(val);
    }
    if (onChange) {
      onChange({
        target: {
          value: val,
          name: name || id || '',
        },
        currentTarget: {
          value: val,
          name: name || id || '',
        },
        type: 'change',
        nativeEvent: event?.nativeEvent
      });
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }} className="custom-datepicker-wrapper">
      <DatePicker
        selected={selectedDate}
        onChange={handleChange}
        dateFormat="dd MMM yyyy"
        placeholderText={placeholder || "Select date"}
        className={`custom-datepicker-input ${className || ''}`}
        disabled={disabled}
        minDate={minDateObj}
        isClearable
        showPopperArrow={false}
        id={id}
        title={title}
        required={required}
        onFocus={onFocus}
        onBlur={onBlur}
        {...rest}
      />
      {name && (
        <input
          type="hidden"
          name={name}
          value={effectiveValue}
        />
      )}
    </div>
  );
};

export default CustomDatePicker;
