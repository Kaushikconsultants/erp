"use client";

import React from 'react';
import DatePicker from 'react-datepicker';
import { format } from 'date-fns';
import { Calendar } from 'lucide-react';

interface DateRangeFilterProps {
  startDate: string; // YYYY-MM-DD
  endDate: string;
  onStartDateChange: (val: string) => void;
  onEndDateChange: (val: string) => void;
}

const parseDateString = (dateStr: string) => {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('-');
  return new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange
}) => {
  const start = parseDateString(startDate);
  const end = parseDateString(endDate);

  const handleStartChange = (date: Date | null) => {
    onStartDateChange(date ? format(date, 'yyyy-MM-dd') : '');
  };

  const handleEndChange = (date: Date | null) => {
    onEndDateChange(date ? format(date, 'yyyy-MM-dd') : '');
  };

  return (
    <div className="date-range-filter-wrapper">
      <Calendar size={13} className="date-range-icon" />
      <DatePicker
        selected={start}
        onChange={handleStartChange}
        selectsStart
        startDate={start}
        endDate={end}
        placeholderText="Start Date"
        className="date-range-input"
        dateFormat="dd MMM yyyy"
        isClearable
        showPopperArrow={false}
      />
      <span className="date-range-separator">-</span>
      <DatePicker
        selected={end}
        onChange={handleEndChange}
        selectsEnd
        startDate={start}
        endDate={end}
        minDate={start || undefined}
        placeholderText="End Date"
        className="date-range-input"
        dateFormat="dd MMM yyyy"
        isClearable
        showPopperArrow={false}
      />
    </div>
  );
};

export default DateRangeFilter;
