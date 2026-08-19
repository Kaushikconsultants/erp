"use client";

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Star, 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Award, 
  FileText, 
  Clock, 
  ChevronRight,
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
  const [finalDecision, setFinalDecision] = useState<'HIRED' | 'REJECTED'>('HIRED');
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

      // Pre-fill ratings if evaluation already exists for this round
      const existingEvs = candidate.evaluations?.filter((e: any) => e.roundNumber === roundNum) || [];
      const initRatings: any = {};
      const initNotes: any = {};
      qRes.questions.forEach((q: any) => {
        const found = existingEvs.find((e: any) => e.questionId === q.id);
        initRatings[q.id] = found ? found.rating : 4; // default 4 stars
        initNotes[q.id] = found ? (found.notes || "") : "";
      });
      setRatings(initRatings);
      setNotes(initNotes);
    }

    // Set interviewer for active round
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
      alert(`Round ${activeRound} Evaluation Submitted Successfully! Overall Score: ${res.overallRating}/5⭐`);
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
      alert(`Candidate finalized as ${finalDecision}!`);
      onSuccess();
      onClose();
    } else {
      alert(res.error || "Failed to record final decision");
    }
  };

  // Compute live round average
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
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh'
      }} onClick={(e) => e.stopPropagation()}>

        {/* TOP CANDIDATE BANNER */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ backgroundColor: '#4f46e5', color: '#ffffff', padding: '3px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 800 }}>
                {candidate.candidateNumber}
              </span>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>
                {candidate.name}
              </h2>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.82rem', color: '#94a3b8', marginTop: '6px' }}>
              <span>Role: <strong style={{ color: '#e2e8f0' }}>{candidate.appliedRole}</strong></span>
              <span>Exp: <strong style={{ color: '#e2e8f0' }}>{candidate.experienceYears} yrs</strong></span>
              <span>Expected CTC: <strong style={{ color: '#e2e8f0' }}>{candidate.expectedSalary || 'N/A'}</strong></span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ textAlign: 'right', backgroundColor: 'rgba(255,255,255,0.08)', padding: '6px 12px', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>Overall Rating</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                ★ {candidate.overallRating || '0.0'} / 5.0
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.8, cursor: 'pointer' }}>
              <X size={20} />
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
                  padding: '14px 12px',
                  border: 'none',
                  borderBottom: isActive ? '3px solid #4f46e5' : '3px solid transparent',
                  backgroundColor: isActive ? '#ffffff' : 'transparent',
                  color: isActive ? '#4f46e5' : '#64748b',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  textAlign: 'center'
                }}
              >
                <div>{r.title}</div>
                <div style={{ fontSize: '0.72rem', color: r.interviewer ? '#15803d' : '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                  {r.interviewer ? `👤 ${r.interviewer}` : '⚠️ Unassigned'}
                  {roundSummary && ` (★ ${roundSummary.averageRating})`}
                </div>
              </button>
            );
          })}
        </div>

        {/* SCROLLABLE EVALUATION CONTENT */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* SECTION 1: ADMIN INTERVIEWER ASSIGNMENT */}
          <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <UserCheck size={20} className="text-emerald-600" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#166534' }}>
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
                style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #86efac', fontSize: '0.82rem', fontWeight: 600, backgroundColor: '#ffffff', outline: 'none' }}
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
                style={{ padding: '6px 12px', borderRadius: '8px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}
              >
                Assign
              </button>
            </div>
          </div>

          {/* SECTION 2: PRE-DEFINED QUESTIONS & 1-5 RATINGS */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Round {activeRound} Evaluation Rubric (1 - 5 Scale)
              </h3>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', backgroundColor: '#e0e7ff', padding: '4px 10px', borderRadius: '8px' }}>
                Round Average: ★ {liveRoundAvg} / 5.0
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {questions.map((q, idx) => {
                const currentRating = ratings[q.id] || 4;
                return (
                  <div
                    key={q.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#ffffff',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4f46e5', backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                            Q{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a' }}>
                            {q.question}
                          </span>
                        </div>
                        {q.category && (
                          <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '4px', fontWeight: 600 }}>
                            Category: {q.category}
                          </div>
                        )}
                      </div>

                      {/* 1 TO 5 STAR RATING INTERACTIVE WIDGET */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                              color: star <= currentRating ? '#f59e0b' : '#cbd5e1',
                              transition: 'transform 0.1s ease'
                            }}
                            title={`Rate ${star} / 5`}
                          >
                            <Star size={20} fill={star <= currentRating ? '#f59e0b' : 'none'} />
                          </button>
                        ))}
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', marginLeft: '6px', minWidth: '30px' }}>
                          {currentRating}/5
                        </span>
                      </div>
                    </div>

                    {/* Question Specific Note */}
                    <input
                      type="text"
                      placeholder="Interviewer notes / specific answer observations..."
                      value={notes[q.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [q.id]: e.target.value }))}
                      style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '8px 12px',
                        borderRadius: '8px',
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
          <div style={{ backgroundColor: '#f8fafc', padding: '18px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', textTransform: 'uppercase' }}>
              Round {activeRound} Recommendation & Feedback
            </h4>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              {[
                { id: 'ADVANCE', label: '✅ Pass & Advance to Next Round', color: '#16a34a' },
                { id: 'HOLD', label: '⏸️ Hold / Waitlist', color: '#d97706' },
                { id: 'REJECT', label: '❌ Reject Candidate', color: '#dc2626' }
              ].map((opt) => (
                <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 700, color: opt.color, cursor: 'pointer' }}>
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
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem', outline: 'none' }}
            />

            <button
              onClick={handleSubmitEvaluation}
              disabled={loading}
              style={{
                marginTop: '12px',
                padding: '10px 20px',
                borderRadius: '8px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={16} /> Submit Round {activeRound} Evaluation
            </button>
          </div>

          {/* SECTION 4: FINAL CONCLUSION & DECISION (ADMIN ONLY) */}
          <div style={{ padding: '20px', borderRadius: '16px', border: '2px solid #6366f1', backgroundColor: '#eef2ff' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <ShieldCheck size={20} className="text-indigo-600" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#312e81', textTransform: 'uppercase' }}>
                Admin Final Hiring Conclusion & Decision
              </h3>
            </div>

            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#4338ca' }}>
              Record final conclusion notes after reviewing all 3 round evaluations.
            </p>

            <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#15803d', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="finalDecision"
                  checked={finalDecision === 'HIRED'}
                  onChange={() => setFinalDecision('HIRED')}
                  style={{ accentColor: '#15803d' }}
                />
                🏆 HIRE CANDIDATE
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: '#b91c1c', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="finalDecision"
                  checked={finalDecision === 'REJECTED'}
                  onChange={() => setFinalDecision('REJECTED')}
                  style={{ accentColor: '#b91c1c' }}
                />
                🚫 REJECT CANDIDATE
              </label>
            </div>

            <textarea
              rows={3}
              placeholder="Enter final HR/Admin conclusion notes, salary agreement, and offer decision summary..."
              value={finalConclusionText}
              onChange={(e) => setFinalConclusionText(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #a5b4fc', fontSize: '0.85rem', outline: 'none', backgroundColor: '#ffffff' }}
            />

            <button
              onClick={handleFinalConclusion}
              disabled={loading}
              style={{
                marginTop: '12px',
                padding: '10px 24px',
                borderRadius: '8px',
                backgroundColor: finalDecision === 'HIRED' ? '#15803d' : '#b91c1c',
                color: '#ffffff',
                border: 'none',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}
            >
              Save Final Hiring Conclusion ({finalDecision})
            </button>
          </div>

        </div>

        {/* MODAL FOOTER */}
        <div style={{ backgroundColor: '#f8fafc', padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
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
