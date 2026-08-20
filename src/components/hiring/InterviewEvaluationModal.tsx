"use client";

import React, { useState, useEffect } from 'react';
import { 
  Star, 
  UserCheck, 
  CheckCircle2, 
  ShieldCheck
} from 'lucide-react';
import { 
  getQuestionsByRound, 
  submitRoundEvaluation, 
  assignInterviewerToRound, 
  finalizeCandidateDecision 
} from '@/app/actions/hiringActions';

interface InterviewEvaluationModalProps {
  candidate: any;
  employees: any[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function InterviewEvaluationModal({
  candidate,
  employees,
  isOpen,
  onClose,
  onSuccess
}: InterviewEvaluationModalProps) {
  const [activeRound, setActiveRound] = useState<number>(1);
  const [questions, setQuestions] = useState<any[]>([]);
  const [ratings, setRatings] = useState<{ [questionId: string]: number }>({});
  const [notes, setNotes] = useState<{ [questionId: string]: string }>({});
  const [recommendation, setRecommendation] = useState<'ADVANCE' | 'REJECT' | 'HOLD'>('ADVANCE');
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedInterviewerId, setSelectedInterviewerId] = useState<string>("");

  // Final Conclusion State
  const [finalDecision, setFinalDecision] = useState<'HIRED' | 'REJECTED' | 'ON_HOLD'>(
    candidate?.status === 'ON_HOLD' || candidate?.status === 'HOLD' ? 'ON_HOLD' : candidate?.status === 'REJECTED' ? 'REJECTED' : 'HIRED'
  );
  const [finalConclusionText, setFinalConclusionText] = useState(candidate?.finalConclusion || "");

  useEffect(() => {
    if (candidate && isOpen) {
      loadRoundData(activeRound);
    }
  }, [candidate, activeRound, isOpen]);

  const loadRoundData = async (roundNum: number) => {
    setLoading(true);
    const qRes = await getQuestionsByRound(roundNum);
    if (qRes.success && qRes.questions) {
      setQuestions(qRes.questions);

      const existingEvs = candidate.evaluations?.filter((e: any) => e.roundNumber === roundNum) || [];
      const initRatings: any = {};
      const initNotes: any = {};
      qRes.questions.forEach((q: any) => {
        const found = existingEvs.find((e: any) => e.questionId === q.id);
        initRatings[q.id] = found ? found.rating : 4;
        initNotes[q.id] = found ? (found.notes || "") : "";
      });
      setRatings(initRatings);
      setNotes(initNotes);
    }

    const existingSummary = candidate.roundSummaries?.find((s: any) => s.roundNumber === roundNum);
    if (existingSummary) {
      setRecommendation(existingSummary.recommendation || 'ADVANCE');
      setFeedbackNotes(existingSummary.feedbackNotes || "");
    } else if (candidate.status === 'ON_HOLD' || candidate.status === 'HOLD') {
      setRecommendation('HOLD');
      setFeedbackNotes(candidate.finalConclusion || "");
    } else {
      setRecommendation('ADVANCE');
      setFeedbackNotes("");
    }

    if (roundNum === 1) setSelectedInterviewerId(candidate.round1InterviewerId || "");
    else if (roundNum === 2) setSelectedInterviewerId(candidate.round2InterviewerId || "");
    else if (roundNum === 3) setSelectedInterviewerId(candidate.round3InterviewerId || "");

    setLoading(false);
  };

  if (!isOpen || !candidate) return null;

  const handleStarClick = (questionId: string, star: number) => {
    setRatings(prev => ({ ...prev, [questionId]: star }));
  };

  const handleAssignInterviewer = async () => {
    if (!selectedInterviewerId) return alert("Select an interviewer from the list.");
    setLoading(true);
    const res = await assignInterviewerToRound(candidate.id, activeRound, selectedInterviewerId);
    setLoading(false);
    if (res.success) {
      alert(`Assigned interviewer for Round ${activeRound}!`);
      onSuccess();
    } else {
      alert(res.error || "Failed to assign interviewer.");
    }
  };

  const handleSubmitEvaluation = async () => {
    const ratingsArray = Object.keys(ratings).map(qId => ({
      questionId: qId,
      rating: ratings[qId] || 3,
      notes: notes[qId] || ""
    }));

    if (ratingsArray.length === 0) return alert("Please rate the candidate on questions.");

    setLoading(true);
    const assignedInterviewer = employees.find(e => e.id === selectedInterviewerId);
    const interviewerName = assignedInterviewer ? assignedInterviewer.user?.name : "Admin";

    const res = await submitRoundEvaluation(
      candidate.id,
      activeRound,
      ratingsArray,
      recommendation,
      feedbackNotes,
      interviewerName
    );

    setLoading(false);
    if (res.success) {
      alert(`Round ${activeRound} Evaluation Submitted! Overall Score: ${res.overallRating}/5⭐`);
      onSuccess();
    } else {
      alert(res.error || "Failed to submit evaluation");
    }
  };

  const handleFinalConclusion = async () => {
    if (!finalConclusionText.trim()) return alert("Please enter final conclusion notes.");
    setLoading(true);
    const res = await finalizeCandidateDecision(candidate.id, finalDecision, finalConclusionText);
    setLoading(false);
    if (res.success) {
      alert(`Candidate decision saved as ${finalDecision}!`);
      onSuccess();
      onClose();
    } else {
      alert(res.error || "Failed to record final decision");
    }
  };

  const ratingValues = Object.values(ratings);
  const liveRoundAvg = ratingValues.length > 0 
    ? (ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length).toFixed(1) 
    : '0.0';

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }} onClick={onClose}>
      <div style={{
        backgroundColor: '#ffffff',
        width: '100%',
        maxWidth: '850px',
        borderRadius: 'var(--radius-lg, 16px)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }} onClick={(e) => e.stopPropagation()}>

        {/* TOP CANDIDATE BANNER */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: 'var(--accent-light, #e0e7ff)', color: 'var(--accent-primary, #4f46e5)', padding: '3px 8px', borderRadius: 'var(--radius-sm, 6px)', fontSize: '0.75rem', fontWeight: 700 }}>
                {candidate.candidateNumber}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>
                {candidate.name}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '0.82rem', color: '#64748b', marginTop: '4px', flexWrap: 'wrap' }}>
              <span>Role: <strong style={{ color: '#1e293b' }}>{candidate.appliedRole}</strong></span>
              <span>Exp: <strong style={{ color: '#1e293b' }}>{candidate.experienceYears} yrs</strong></span>
              {candidate.referenceName && (
                <span style={{ color: 'var(--accent-primary, #4f46e5)', fontWeight: 600 }}>
                  👤 Referred by: <strong>{candidate.referenceName}</strong>
                </span>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right', backgroundColor: '#f8fafc', padding: '6px 12px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Overall Score</div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ★ {candidate.overallRating || '0.0'} / 5.0
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', fontSize: '1.25rem', lineHeight: 1 }}>
              ×
            </button>
          </div>
        </div>

        {/* 3-ROUND STEPPER TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
          {[
            { round: 1, title: 'Round 1: Basic Fit', interviewer: candidate.round1Interviewer?.user?.name },
            { round: 2, title: 'Round 2: Technical', interviewer: candidate.round2Interviewer?.user?.name },
            { round: 3, title: 'Round 3: Final / HR', interviewer: candidate.round3Interviewer?.user?.name }
          ].map((r) => {
            const isActive = activeRound === r.round;
            const roundSummary = candidate.roundSummaries?.find((s: any) => s.roundNumber === r.round);
            
            return (
              <button
                key={r.round}
                onClick={() => setActiveRound(r.round)}
                style={{
                  flex: 1,
                  padding: '12px 10px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid var(--accent-primary, #4f46e5)' : '3px solid transparent',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? 'var(--accent-primary, #4f46e5)' : '#64748b',
                  fontWeight: isActive ? 700 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div>{r.title}</div>
                <div style={{ fontSize: '0.72rem', color: r.interviewer ? '#16a34a' : '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                  {r.interviewer ? `👤 ${r.interviewer}` : '⚠️ Unassigned'}
                  {roundSummary && ` (★ ${roundSummary.averageRating})`}
                </div>
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE EVALUATION CONTENT */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* SECTION 1: ADMIN INTERVIEWER ASSIGNMENT */}
          <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md, 8px)', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={18} color="#16a34a" />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                  Admin Interviewer Assignment (Round {activeRound})
                </div>
                <div style={{ fontSize: '0.75rem', color: '#15803d' }}>
                  Admin decides which team member handles this round.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <select
                value={selectedInterviewerId}
                onChange={(e) => setSelectedInterviewerId(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid #86efac', fontSize: '0.82rem', fontWeight: 600, backgroundColor: '#ffffff', outline: 'none' }}
              >
                <option value="">-- Select Interviewer --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.user?.name} ({emp.designation || emp.department || 'Staff'})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAssignInterviewer}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-sm, 6px)', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 600, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Assign
              </button>
            </div>
          </div>

          {/* SECTION 2: PRE-DEFINED QUESTIONS & 1-5 RATINGS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Round {activeRound} Evaluation Rubric (1 - 5 Scale)
              </h3>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-primary, #4f46e5)', backgroundColor: 'var(--accent-light, #e0e7ff)', padding: '3px 10px', borderRadius: 'var(--radius-sm, 6px)' }}>
                Round Score: ★ {liveRoundAvg} / 5.0
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {questions.map((q, idx) => {
                const currentRating = ratings[q.id] || 4;
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-primary, #4f46e5)', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            Q{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>
                            {q.question}
                          </span>
                        </div>
                        {q.category && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                            Category: {q.category}
                          </div>
                        )}
                      </div>

                      {/* 1 TO 5 STAR RATING INTERACTIVE WIDGET */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => handleStarClick(q.id, star)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '2px',
                              color: star <= currentRating ? '#f59e0b' : '#cbd5e1'
                            }}
                            title={`Rate ${star} / 5`}
                          >
                            <Star size={18} fill={star <= currentRating ? '#f59e0b' : 'none'} />
                          </button>
                        ))}
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1e293b', marginLeft: '6px', minWidth: '28px' }}>
                          {currentRating}/5
                        </span>
                      </div>
                    </div>

                    <input
                      type="text"
                      placeholder="Interviewer notes / specific answer observations..."
                      value={notes[q.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: '8px',
                        padding: '7px 10px',
                        borderRadius: 'var(--radius-sm, 6px)',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 3: ROUND RECOMMENDATION & FEEDBACK */}
          <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: 'var(--radius-md, 8px)', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
              Round {activeRound} Recommendation & Feedback
            </h4>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
              {[
                { id: 'ADVANCE', label: '✅ Pass & Advance to Next Round', color: '#16a34a' },
                { id: 'HOLD', label: '⏸️ Hold / Waitlist', color: '#d97706' },
                { id: 'REJECT', label: '❌ Reject Candidate', color: '#dc2626' }
              ].map((opt) => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, color: opt.color, cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="roundRecommendation"
                    checked={recommendation === opt.id}
                    onChange={() => setRecommendation(opt.id as any)}
                    style={{ accentColor: opt.color }}
                  />
                  {opt.label}
                </label>
              ))}
            </div>

            <textarea
              rows={2}
              placeholder="Overall round assessment notes, candidate strengths, and areas of concern..."
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />

            <button
              onClick={handleSubmitEvaluation}
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '9px 18px',
                borderRadius: 'var(--radius-md, 6px)',
                backgroundColor: 'var(--accent-primary, #4f46e5)',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={15} /> Submit Round {activeRound} Evaluation
            </button>
          </div>

          {/* SECTION 4: FINAL CONCLUSION & DECISION */}
          <div style={{ padding: '16px', borderRadius: 'var(--radius-lg, 12px)', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} style={{ color: 'var(--accent-primary, #4f46e5)' }} />
              <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase' }}>
                Admin Final Hiring Conclusion & Decision
              </h3>
            </div>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#16a34a', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="finalDecision"
                  checked={finalDecision === 'HIRED'}
                  onChange={() => setFinalDecision('HIRED')}
                  style={{ accentColor: '#16a34a' }}
                />
                🏆 HIRE CANDIDATE
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#d97706', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="finalDecision"
                  checked={finalDecision === 'ON_HOLD'}
                  onChange={() => setFinalDecision('ON_HOLD')}
                  style={{ accentColor: '#d97706' }}
                />
                ⏸️ HOLD / WAITLIST CANDIDATE
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: '#dc2626', cursor: 'pointer', fontSize: '0.85rem' }}>
                <input
                  type="radio"
                  name="finalDecision"
                  checked={finalDecision === 'REJECTED'}
                  onChange={() => setFinalDecision('REJECTED')}
                  style={{ accentColor: '#dc2626' }}
                />
                🚫 REJECT CANDIDATE
              </label>
            </div>

            <textarea
              rows={2}
              placeholder="Enter final HR/Admin conclusion notes, salary agreement, and offer decision summary..."
              value={finalConclusionText}
              onChange={(e) => setFinalConclusionText(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm, 6px)', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />

            <button
              onClick={handleFinalConclusion}
              disabled={loading}
              style={{
                marginTop: '10px',
                padding: '9px 20px',
                borderRadius: 'var(--radius-md, 6px)',
                backgroundColor: finalDecision === 'HIRED' ? '#16a34a' : finalDecision === 'ON_HOLD' ? '#d97706' : '#dc2626',
                color: '#ffffff',
                border: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              Save Final Hiring Conclusion ({finalDecision})
            </button>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div style={{ backgroundColor: '#f8fafc', padding: '12px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: 'var(--radius-md, 6px)',
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
