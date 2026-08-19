"use client";

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  HelpCircle, 
  Star, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronRight, 
  Award,
  UserCheck,
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

    // Fetch employees for Admin Interviewer assignment
    try {
      const empRes = await fetch('/api/profile'); // Or fetch employees endpoint
      // We can also fetch employees directly via standard API
      const empData = await fetch('/api/employees').then(r => r.json()).catch(() => ({ employees: [] }));
      if (empData.employees) {
        setEmployees(empData.employees);
      }
    } catch (err) {
      console.log("Employees fetch err:", err);
    }
    setLoading(false);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.candidateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.appliedRole.toLowerCase().includes(searchQuery.toLowerCase());
    
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
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.75rem', fontWeight: 700 }}>NEW APPLICANT</span>;
      case 'ROUND_1_PENDING':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.75rem', fontWeight: 700 }}>ROUND 1 (BASIC)</span>;
      case 'ROUND_1_PASSED':
      case 'ROUND_2_PENDING':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#e0e7ff', color: '#4338ca', fontSize: '0.75rem', fontWeight: 700 }}>ROUND 2 (TECH)</span>;
      case 'ROUND_2_PASSED':
      case 'ROUND_3_PENDING':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#fae8ff', color: '#86198f', fontSize: '0.75rem', fontWeight: 700 }}>ROUND 3 (FINAL)</span>;
      case 'HIRED':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '0.75rem', fontWeight: 800 }}>🏆 HIRED</span>;
      case 'REJECTED':
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', fontWeight: 700 }}>REJECTED</span>;
      default:
        return <span style={{ padding: '4px 8px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 700 }}>{status}</span>;
    }
  };

  return (
    <div style={{ backgroundColor: '#f8fafc', minHeight: '100vh', padding: '24px' }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* EXECUTIVE HERO BANNER */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          padding: '24px 32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          border: '1px solid #e2e8f0',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #4f46e5 0%, #06b6d4 100%)'
          }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Users size={28} className="text-indigo-600" />
                <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0f172a' }}>
                  Hiring & 3-Round Interview Portal
                </h1>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '0.875rem', color: '#64748b' }}>
                Conduct structured 3-round candidate evaluations (Basic fit ➔ Technical ➔ Final HR) with editable question banks and 1-5 rating rubrics.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => setIsQuestionsModalOpen(true)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                }}
              >
                <HelpCircle size={16} className="text-indigo-600" />
                Edit Pre-defined Questions
              </button>

              <button
                onClick={() => setIsAddCandidateOpen(true)}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
                  color: '#ffffff',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                <UserPlus size={16} />
                + Add Candidate
              </button>
            </div>
          </div>
        </div>

        {/* METRICS CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'Total Applicants', val: totalCandidates, icon: <Users size={20} color="#4f46e5" />, bg: '#e0e7ff' },
            { label: 'Round 1: Basic Fit', val: round1Count, icon: <Clock size={20} color="#d97706" />, bg: '#fef3c7' },
            { label: 'Round 2: Technical', val: round2Count, icon: <Award size={20} color="#2563eb" />, bg: '#dbeafe' },
            { label: 'Round 3: Final / HR', val: round3Count, icon: <Star size={20} color="#9333ea" />, bg: '#f3e8ff' },
            { label: 'Hired Candidates', val: hiredCount, icon: <CheckCircle2 size={20} color="#16a34a" />, bg: '#dcfce7' }
          ].map((m, idx) => (
            <div key={idx} style={{
              backgroundColor: '#ffffff',
              padding: '18px 20px',
              borderRadius: '14px',
              border: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  {m.label}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '4px' }}>
                  {m.val}
                </div>
              </div>
              <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: m.bg }}>
                {m.icon}
              </div>
            </div>
          ))}
        </div>

        {/* CANDIDATES TABLE PANEL */}
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)',
          overflow: 'hidden'
        }}>
          
          {/* SEARCH & FILTERS BAR */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', padding: '8px 14px', borderRadius: '10px', width: '320px' }}>
              <Search size={16} color="#64748b" />
              <input
                type="text"
                placeholder="Search candidates by name, ID or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem', width: '100%' }}
              />
            </div>

            {/* FILTER PILLS */}
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
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: statusFilter === f.id ? '#4f46e5' : '#f1f5f9',
                    color: statusFilter === f.id ? '#ffffff' : '#475569',
                    fontWeight: statusFilter === f.id ? 700 : 600,
                    fontSize: '0.78rem',
                    cursor: 'pointer'
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 20px', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Candidate Info</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Applied Role & Exp</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Interviewer Assignments</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Interview Rating</th>
                  <th style={{ padding: '14px 16px', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '14px 20px', textAlign: 'right', fontWeight: 800, color: '#475569', fontSize: '0.75rem', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      Loading candidate profiles...
                    </td>
                  </tr>
                ) : filteredCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                      No candidates found matching filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredCandidates.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s ease' }}>
                      
                      {/* Candidate Name */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px', display: 'flex', gap: '8px' }}>
                          <span style={{ fontFamily: 'monospace', color: '#4f46e5', fontWeight: 700 }}>{c.candidateNumber}</span>
                          <span>• {c.email}</span>
                        </div>
                      </td>

                      {/* Role & Experience */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: 700, color: '#334155' }}>{c.appliedRole}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          {c.experienceYears} Yrs Experience
                        </div>
                      </td>

                      {/* Interviewer Assignments */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.75rem' }}>
                          <div>R1: <span style={{ fontWeight: 600, color: c.round1Interviewer ? '#15803d' : '#94a3b8' }}>{c.round1Interviewer?.user?.name || 'Unassigned'}</span></div>
                          <div>R2: <span style={{ fontWeight: 600, color: c.round2Interviewer ? '#15803d' : '#94a3b8' }}>{c.round2Interviewer?.user?.name || 'Unassigned'}</span></div>
                          <div>R3: <span style={{ fontWeight: 600, color: c.round3Interviewer ? '#15803d' : '#94a3b8' }}>{c.round3Interviewer?.user?.name || 'Unassigned'}</span></div>
                        </div>
                      </td>

                      {/* Rating */}
                      <td style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 800, color: '#f59e0b', fontSize: '0.95rem' }}>
                          <Star size={16} fill="#f59e0b" />
                          <span>{c.overallRating > 0 ? `${c.overallRating} / 5.0` : 'Not Rated'}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px' }}>
                        {renderStatusBadge(c.status)}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedCandidateForEval(c)}
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            backgroundColor: '#4f46e5',
                            color: '#ffffff',
                            border: 'none',
                            fontWeight: 700,
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(79,70,229,0.2)'
                          }}
                        >
                          <FileText size={14} /> Conduct / Evaluate <ChevronRight size={14} />
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
