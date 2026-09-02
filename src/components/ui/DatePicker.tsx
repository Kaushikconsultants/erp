"use client";

import React from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

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

const parseDateString = (dateStr?: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
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
  ...rest
}) => {
  const selectedDate = parseDateString(value || defaultValue);
  const minDateObj = minDate ? parseDateString(minDate) : undefined;

  const handleChange = (date: Date | null) => {
    const val = date ? format(date, 'yyyy-MM-dd') : '';
    if (onChange) {
      onChange({ target: { value: val } });
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
        minDate={minDateObj || undefined}
        isClearable
        showPopperArrow={false}
        {...rest}
      />
    </div>
  );
};

export default CustomDatePicker;
