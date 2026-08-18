"use client";

import React from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

interface CustomerGrowthProps {
  data: {
    date: string;
    newCustomers: number;
    matured: number;
  }[];
}

export default function CustomerGrowthChart({ data }: CustomerGrowthProps) {
  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
          
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: '#64748b' }} 
            dx={-10}
          />
          
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)', fontSize: '0.9rem' }}
            itemStyle={{ fontWeight: 500 }}
          />
          <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '0.85rem' }} />
          
          <Bar dataKey="newCustomers" name="New Customers" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
          <Bar dataKey="matured" name="Matured (1st Order)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
