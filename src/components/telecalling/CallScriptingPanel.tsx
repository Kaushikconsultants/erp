"use client";
import React, { useState } from 'react';
import { BookOpen, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export interface Objection {
  id: string;
  concern: string;
  response: string;
}

interface CallScriptingPanelProps {
  stage: string;
  scriptContent: string;
  objections: Objection[];
}

export default function CallScriptingPanel({ stage, scriptContent, objections }: CallScriptingPanelProps) {
  const [activeObjection, setActiveObjection] = useState<string | null>(null);

  return (
    <div style={{ padding: '24px', background: 'white', borderRadius: '8px', border: '1px solid var(--border)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <BookOpen size={18} style={{ color: 'var(--accent-primary)' }} /> Call Script (Stage: {stage})
      </h3>
      
      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', border: '1px solid #e2e8f0', marginBottom: '24px', whiteSpace: 'pre-wrap', color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
        {scriptContent || "No script configured for this stage. Introduce yourself and ask about their requirements."}
      </div>

      <h4 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <AlertCircle size={16} style={{ color: '#f59e0b' }} /> Common Objections
      </h4>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {objections.map((obj) => (
          <div 
            key={obj.id} 
            style={{ border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}
          >
            <button 
              onClick={() => setActiveObjection(activeObjection === obj.id ? null : obj.id)}
              style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: activeObjection === obj.id ? '#f1f5f9' : 'white', border: 'none', cursor: 'pointer', textAlign: 'left', fontWeight: 500, color: 'var(--text-primary)', fontSize: '0.9rem' }}
            >
              {obj.concern}
              {activeObjection === obj.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {activeObjection === obj.id && (
              <div style={{ padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {obj.response}
              </div>
            )}
          </div>
        ))}
        {objections.length === 0 && (
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>No standard objections configured.</p>
        )}
      </div>
    </div>
  );
}
