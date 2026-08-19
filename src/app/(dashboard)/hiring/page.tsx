"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  HelpCircle, 
  Star, 
  Search, 
  CheckCircle2, 
  Clock, 
  ChevronRight, 
  Award,
  FileText
} from 'lucide-react';
import { getCandidates } from '@/app/actions/hiringActions';
import ManageQuestionsModal from '@/components/hiring/ManageQuestionsModal';
import AddCandidateModal from '@/components/hiring/AddCandidateModal';
import InterviewEvaluationModal from '@/components/hiring/InterviewEvaluationModal';

export default function HiringPage() {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modals
  const [isQuestionsModalOpen, setIsQuestionsModalOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [selectedCandidateForEval, setSelectedCandidateForEval] = useState<any | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const res = await getCandidates();
    if (res.success && res.candidates) {
      setCandidates(res.candidates);
    }

    try {
      const empData = await fetch('/api/employees').then(r => r.json()).catch(() => ({ employees: [] }));
      if (empData.employees) {
        setEmployees(empData.employees);
      }
    } catch (err) {
      console.log("Employees fetch err:", err);
    }
    setLoading(false);
  };

  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.candidateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.appliedRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (c.referenceName && c.referenceName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (statusFilter === "ALL") return true;
    if (statusFilter === "NEW") return c.status === "NEW";
    if (statusFilter === "ROUND_1") return c.status.includes("ROUND_1");
    if (statusFilter === "ROUND_2") return c.status.includes("ROUND_2");
    if (statusFilter === "ROUND_3") return c.status.includes("ROUND_3");
    if (statusFilter === "HIRED") return c.status === "HIRED";
    if (statusFilter === "REJECTED") return c.status === "REJECTED";
    return true;
  });

  const totalCandidates = candidates.length;
  const round1Count = candidates.filter(c => c.status.includes("ROUND_1") || c.status === "NEW").length;
  const round2Count = candidates.filter(c => c.status.includes("ROUND_2")).length;
  const round3Count = candidates.filter(c => c.status.includes("ROUND_3")).length;
  const hiredCount = candidates.filter(c => c.status === "HIRED").length;

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'NEW':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: 'var(--accent-light, #eff6ff)', color: 'var(--accent-primary, #1d4ed8)', fontSize: '0.75rem', fontWeight: 600 }}>NEW APPLICANT</span>;
      case 'ROUND_1_PENDING':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 600 }}>ROUND 1 (BASIC)</span>;
      case 'ROUND_1_PASSED':
      case 'ROUND_2_PENDING':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: 600 }}>ROUND 2 (TECH)</span>;
      case 'ROUND_2_PASSED':
      case 'ROUND_3_PENDING':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#fae8ff', color: '#86198f', fontSize: '0.75rem', fontWeight: 600 }}>ROUND 3 (FINAL)</span>;
      case 'HIRED':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 700 }}>🏆 HIRED</span>;
      case 'REJECTED':
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 600 }}>REJECTED</span>;
      default:
        return <span style={{ padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>{status}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fc', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* STANDARD SOFTWARE HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0, fontFamily: 'inherit' }}>
              Hiring & Interviews
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '4px 0 0 0' }}>
              Structured 3-round candidate evaluation portal with pre-defined editable questions and interviewer assignments.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsQuestionsModalOpen(true)}
              style={{
                padding: '9px 16px',
                borderRadius: 'var(--radius-md, 8px)',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#334155',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <HelpCircle size={16} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
              Edit Question Bank
            </button>

            <button
              onClick={() => setIsAddCandidateOpen(true)}
              style={{
                padding: '9px 18px',
                borderRadius: 'var(--radius-md, 8px)',
                backgroundColor: 'var(--accent-primary, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              <UserPlus size={16} />
              + Add Candidate
            </button>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Applicants', val: totalCandidates, icon: <Users size={18} style={{ color: 'var(--accent-primary)' }} />, bg: 'var(--accent-light, #e0e7ff)' },
            { label: 'Round 1: Basic Fit', val: round1Count, icon: <Clock size={18} color="#d97706" />, bg: '#fef3c7' },
            { label: 'Round 2: Technical', val: round2Count, icon: <Award size={18} color="#2563eb" />, bg: '#dbeafe' },
            { label: 'Round 3: Final / HR', val: round3Count, icon: <Star size={18} color="#9333ea" />, bg: '#f3e8ff' },
            { label: 'Hired Candidates', val: hiredCount, icon: <CheckCircle2 size={18} color="#16a34a" />, bg: '#dcfce7' }
          ].map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: '#ffffff',
              padding: '16px 20px',
              borderRadius: 'var(--radius-lg, 12px)',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
                  {m.val}
                </div>
              </div>
              <div style={{ padding: '8px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: m.bg }}>
                {m.icon}
              </div>
            </div>
          ))}
        </div>

        {/* CANDIDATES TABLE PANEL */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: 'var(--radius-lg, 12px)',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          overflow: 'hidden'
        }}>
          
          {/* SEARCH & FILTERS BAR */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '7px 12px', borderRadius: 'var(--radius-md, 8px)', width: '320px' }}>
              <Search size={15} color="#64748b" />
              <input
                type="text"
                placeholder="Search by candidate name, ID, role, reference..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%', color: '#0f172a' }}
              />
            </div>

            {/* FILTER PILLS USING THEME ACCENT COLOR */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: 'All Candidates' },
                { id: 'NEW', label: 'New' },
                { id: 'ROUND_1', label: 'Round 1 (Basic)' },
                { id: 'ROUND_2', label: 'Round 2 (Tech)' },
                { id: 'ROUND_3', label: 'Round 3 (Final)' },
                { id: 'HIRED', label: 'Hired' },
                { id: 'REJECTED', label: 'Rejected' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setStatusFilter(f.id)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-md, 6px)',
                    border: 'none',
                    backgroundColor: statusFilter === f.id ? 'var(--accent-primary, #4f46e5)' : '#f1f5f9',
                    color: statusFilter === f.id ? '#ffffff' : '#475569',
                    fontWeight: statusFilter === f.id ? 700 : 500,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Candidate Info</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Applied Role & Exp</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Reference / Source</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Interviewer Assignments</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Rating</th>
                  <th style={{ padding: '12px 16px', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#475569', fontSize: '0.78rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      Loading candidate profiles...
                    </td>
                  </tr>
                ) : filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No candidates found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      
                      {/* Candidate Name & ID */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '6px' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--accent-primary, #4f46e5)', fontWeight: 600 }}>{c.candidateNumber}</span>
                          <span>• {c.email}</span>
                        </div>
                      </td>

                      {/* Role & Experience */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.appliedRole}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {c.experienceYears} Yrs Exp
                        </div>
                      </td>

                      {/* REFERENCE / REFERRED BY COLUMN */}
                      <td style={{ padding: '14px 16px' }}>
                        {c.referenceName ? (
                          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-primary, #4338ca)', backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)' }}>
                            👤 {c.referenceName}
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Direct / Self</span>
                        )}
                      </td>

                      {/* Interviewer Assignments */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem' }}>
                          <div>R1: <span style={{ fontWeight: 600, color: c.round1Interviewer ? '#16a34a' : '#94a3b8' }}>{c.round1Interviewer?.user?.name || 'Unassigned'}</span></div>
                          <div>R2: <span style={{ fontWeight: 600, color: c.round2Interviewer ? '#16a34a' : '#94a3b8' }}>{c.round2Interviewer?.user?.name || 'Unassigned'}</span></div>
                          <div>R3: <span style={{ fontWeight: 600, color: c.round3Interviewer ? '#16a34a' : '#94a3b8' }}>{c.round3Interviewer?.user?.name || 'Unassigned'}</span></div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#d97706', fontSize: '0.85rem' }}>
                          <Star size={14} fill="#f59e0b" color="#f59e0b" />
                          <span>{c.overallRating > 0 ? `${c.overallRating} / 5.0` : 'Not Rated'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '14px 16px' }}>
                        {renderStatusBadge(c.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedCandidateForEval(c)}
                          style={{
                            padding: '7px 14px',
                            borderRadius: 'var(--radius-md, 6px)',
                            backgroundColor: 'var(--accent-primary, #4f46e5)',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 600,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <FileText size={13} /> Conduct / Evaluate <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      </div>

      {/* MODALS */}
      <ManageQuestionsModal
        isOpen={isQuestionsModalOpen}
        onClose={() => setIsQuestionsModalOpen(false)}
      />

      <AddCandidateModal
        isOpen={isAddCandidateOpen}
        onClose={() => setIsAddCandidateOpen(false)}
        onSuccess={loadData}
      />

      {selectedCandidateForEval && (
        <InterviewEvaluationModal
          candidate={selectedCandidateForEval}
          employees={employees}
          isOpen={!!selectedCandidateForEval}
          onClose={() => setSelectedCandidateForEval(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
