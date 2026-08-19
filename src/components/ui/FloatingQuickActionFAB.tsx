"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Plus, UserPlus, PhoneCall, Calendar, ShoppingBag, FileText, X, Sparkles } from 'lucide-react';
import './FloatingQuickActionFAB.css';

export default function FloatingQuickActionFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fab-container">
      {isOpen && (
        <div 
          className="fab-backdrop" 
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {isOpen && (
        <div className="fab-menu">
          <div className="fab-menu-header">
            <Sparkles size={16} className="text-amber-500" />
            <span>Quick Actions</span>
          </div>

          <Link href="/leads" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-indigo">
              <UserPlus size={18} />
            </div>
            <span>Add Lead</span>
          </Link>

          <Link href="/customers" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-emerald">
              <UserPlus size={18} />
            </div>
            <span>Add Customer</span>
          </Link>

          <Link href="/calls" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-amber">
              <PhoneCall size={18} />
            </div>
            <span>Log Call</span>
          </Link>

          <Link href="/follow-ups" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-blue">
              <Calendar size={18} />
            </div>
            <span>Add Follow-up</span>
          </Link>

          <Link href="/orders" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-purple">
              <ShoppingBag size={18} />
            </div>
            <span>Create Order</span>
          </Link>

          <Link href="/quotations/new" className="fab-item" onClick={() => setIsOpen(false)}>
            <div className="fab-icon bg-rose">
              <FileText size={18} />
            </div>
            <span>Create Quote</span>
          </Link>
        </div>
      )}

      <button 
        className={`fab-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Quick Actions Menu"
      >
        {isOpen ? <X size={24} /> : <Plus size={24} />}
      </button>
    </div>
  );
}
