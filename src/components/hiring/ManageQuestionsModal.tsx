"use client";

import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit2, Save, HelpCircle, CheckCircle2 } from 'lucide-react';
import { getQuestionsByRound, addQuestion, updateQuestion, deleteQuestion } from '@/app/actions/hiringActions';

interface ManageQuestionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageQuestionsModal({ isOpen, onClose }: ManageQuestionsModalProps) {
  const [selectedRound, setSelectedRound] = useState<number>(1);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newCategory, setNewCategory] = useState("General");

  useEffect(() => {
    if (isOpen) {
      loadQuestions(selectedRound);
    }
  }, [isOpen, selectedRound]);

  const loadQuestions = async (roundNum: number) => {
    setLoading(true);
    const res = await getQuestionsByRound(roundNum);
    if (res.success && res.questions) {
      setQuestions(res.questions);
    }
    setLoading(false);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestionText.trim()) return;

    setLoading(true);
    const res = await addQuestion(selectedRound, newQuestionText, newCategory);
    if (res.success) {
      setNewQuestionText("");
      loadQuestions(selectedRound);
    } else {
      alert(res.error || "Failed to add question");
    }
    setLoading(false);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editText.trim()) return;
    setLoading(true);
    const res = await updateQuestion(id, editText);
    if (res.success) {
      setEditingId(null);
      loadQuestions(selectedRound);
    } else {
      alert(res.error || "Failed to update question");
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    setLoading(true);
    const res = await deleteQuestion(id);
    if (res.success) {
      loadQuestions(selectedRound);
    } else {
      alert(res.error || "Failed to delete question");
    }
    setLoading(false);
  };

  if (!isOpen) return null;

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
        maxWidth: '680px',
        borderRadius: '20px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
          color: '#ffffff',
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.15)' }}>
              <HelpCircle size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#ffffff' }}>
                Pre-defined Interview Questions Manager
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                Add, edit, or customize interview questions for each round
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#ffffff', opacity: 0.8, cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* ROUND TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc', padding: '0 16px' }}>
          {[
            { id: 1, label: 'Round 1: Basic Fit' },
            { id: 2, label: 'Round 2: Technical' },
            { id: 3, label: 'Round 3: Final / HR' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedRound(tab.id)}
              style={{
                flex: 1,
                padding: '14px 12px',
                border: 'none',
                borderBottom: selectedRound === tab.id ? '3px solid #4f46e5' : '3px solid transparent',
                backgroundColor: 'transparent',
                color: selectedRound === tab.id ? '#4f46e5' : '#64748b',
                fontWeight: selectedRound === tab.id ? 700 : 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* ADD QUESTION FORM */}
          <form onSubmit={handleAddQuestion} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={`Add new question for Round ${selectedRound}...`}
              value={newQuestionText}
              onChange={(e) => setNewQuestionText(e.target.value)}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
            <input
              type="text"
              placeholder="Category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              style={{
                width: '130px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
            <button
              type="submit"
              disabled={loading || !newQuestionText.trim()}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} /> Add
            </button>
          </form>

          {/* QUESTIONS LIST */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {questions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8', fontSize: '0.9rem' }}>
                No questions configured for Round {selectedRound} yet.
              </div>
            ) : (
              questions.map((q, idx) => (
                <div
                  key={q.id}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4f46e5', backgroundColor: '#e0e7ff', width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px' }}>
                      {idx + 1}
                    </span>
                    {editingId === q.id ? (
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid #4f46e5',
                          fontSize: '0.875rem',
                          outline: 'none'
                        }}
                      />
                    ) : (
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#0f172a' }}>
                          {q.question}
                        </div>
                        {q.category && (
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', marginTop: '4px', display: 'inline-block' }}>
                            {q.category}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {editingId === q.id ? (
                      <button
                        onClick={() => handleSaveEdit(q.id)}
                        style={{ padding: '6px 10px', borderRadius: '6px', backgroundColor: '#10b981', color: '#ffffff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        <Save size={14} /> Save
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingId(q.id); setEditText(q.question); }}
                        style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer' }}
                        title="Edit Question"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(q.id)}
                      style={{ padding: '6px 8px', borderRadius: '6px', backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', cursor: 'pointer' }}
                      title="Delete Question"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{ backgroundColor: '#f8fafc', padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
