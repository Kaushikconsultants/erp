"use client";

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface RepPerformanceChartProps {
  data: { name: string; sales: number; calls: number }[];
}

export default function RepPerformanceChart({ data }: RepPerformanceChartProps) {
  return (
    <div style={{ width: '100%', height: 400 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dy={10} />
          <YAxis yAxisId="left" orientation="left" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dx={-10} />
          <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)' }} dx={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
            itemStyle={{ color: 'var(--text-primary)' }}
            cursor={{ fill: 'rgba(0,0,0,0.05)' }}
          />
          <Legend verticalAlign="top" height={36} />
          <Bar yAxisId="left" dataKey="sales" name="Total Sales (₹)" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="right" dataKey="calls" name="Calls Logged" fill="var(--warning)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
