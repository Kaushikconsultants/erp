"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  Area,
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
        <div style={{ 
          backgroundColor: '#ffffff', 
          border: '1px solid var(--border, #e2e8f0)', 
          padding: '12px 16px', 
          borderRadius: 'var(--radius-md, 8px)', 
          boxShadow: '0 8px 20px -4px rgba(0, 0, 0, 0.08)',
          minWidth: '150px'
        }}>
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary, #0f172a)', fontSize: '0.85rem' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', fontSize: '0.82rem', marginBottom: index !== payload.length - 1 ? '4px' : 0 }}>
              <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 400 }}>{entry.name}:</span>
              <span style={{ color: entry.color, fontWeight: 600 }}>
                {entry.name === 'Revenue' ? `₹${entry.value.toLocaleString('en-IN')}` : entry.value}
              </span>
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
        <ComposedChart data={data} margin={{ top: 15, right: 15, left: 10, bottom: 5 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--accent-primary, #00a884)" stopOpacity={0.12}/>
              <stop offset="95%" stopColor="var(--accent-primary, #00a884)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 400 }} 
            dy={10} 
          />
          
          <YAxis 
            yAxisId="left" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 400 }} 
            tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            dx={-10}
          />
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b', fontWeight: 400 }} 
            dx={10}
          />
          
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ paddingTop: '16px', fontSize: '0.82rem', fontWeight: 500 }} />
          
          <Area 
            yAxisId="left"
            type="monotone"
            dataKey="revenue"
            fill="url(#revenueGradient)"
            stroke="none"
          />

          <Line 
            yAxisId="left" 
            type="monotone" 
            dataKey="revenue" 
            name="Revenue" 
            stroke="var(--accent-primary, #00a884)" 
            strokeWidth={2.5} 
            dot={{ r: 3.5, fill: 'var(--accent-primary, #00a884)', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 5, fill: 'var(--accent-primary, #00a884)', stroke: '#fff', strokeWidth: 2 }} 
          />
          <Line 
            yAxisId="right" 
            type="monotone" 
            dataKey="orders" 
            name="Orders" 
            stroke="#f59e0b" 
            strokeWidth={2.5} 
            dot={{ r: 3.5, fill: '#f59e0b', strokeWidth: 2, stroke: '#fff' }} 
            activeDot={{ r: 5, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2 }} 
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
