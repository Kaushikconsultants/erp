"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
  data: { name: string; sales: number; dateStr?: string }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  const formatINR = (val: number) => `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
  const formatAxis = (val: number) => {
    if (val >= 10000000) return `₹${(val / 10000000).toFixed(1)}Cr`;
    if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)}L`;
    if (val >= 1000) return `₹${(val / 1000).toFixed(0)}k`;
    return `₹${val}`;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 25,
            left: 10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }} 
            dy={8} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }} 
            tickFormatter={formatAxis}
            dx={-6} 
          />
          <Tooltip 
            formatter={(value: any) => [formatINR(Number(value)), 'Sales Revenue']}
            labelFormatter={(label: any, payload: readonly any[]) => {
              const item = payload?.[0]?.payload;
              if (item?.dateStr) return `${label} (${item.dateStr})`;
              return label;
            }}
            contentStyle={{ 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px solid var(--border)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
            }}
            itemStyle={{ color: 'var(--text-primary)', fontWeight: 600 }}
          />
          <Line 
            type="monotone" 
            dataKey="sales" 
            stroke="var(--accent-primary)" 
            strokeWidth={3}
            dot={{ r: 4, fill: 'var(--accent-primary)', strokeWidth: 0 }}
            activeDot={{ r: 6, fill: 'var(--accent-primary)' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
