"use client";

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SalesChartProps {
  data: { name: string; sales: number }[];
}

export default function SalesChart({ data }: SalesChartProps) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
          <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dx={-10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
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
