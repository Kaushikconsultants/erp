"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface SalesTrendProps {
  data: {
    date: string;
    revenue: number;
    orders: number;
  }[];
}

export default function SalesTrendChart({ data }: SalesTrendProps) {
  // Custom tooltip to format currency
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#1e293b' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ color: entry.color, fontSize: '0.9rem', marginBottom: '4px' }}>
              {entry.name}: {entry.name === 'Revenue' ? `₹${entry.value.toLocaleString('en-IN')}` : entry.value}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
          
          <YAxis 
            yAxisId="left" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            dx={10}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }} />
          
          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="revenue" 
            name="Revenue" 
            stroke="#4f46e5" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="orders" 
            name="Orders" 
            stroke="#f59e0b" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 6 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
