import { describe, it, expect } from 'vitest';
import {
  extractJSON,
  stripThinkingTrace,
} from '../src/lib/aiClient';

describe('AI Client Utilities', () => {
  describe('extractJSON', () => {
    it('parses direct JSON strings', () => {
      const raw = '{"answer": "Sales up 15%", "score": 90}';
      const parsed = extractJSON<{ answer: string; score: number }>(raw);
      expect(parsed).toEqual({ answer: 'Sales up 15%', score: 90 });
    });

    it('extracts JSON from markdown code fences', () => {
      const markdown = '```json\n{"status": "ok", "orders": [1, 2, 3]}\n```';
      const parsed = extractJSON<{ status: string; orders: number[] }>(markdown);
      expect(parsed).toEqual({ status: 'ok', orders: [1, 2, 3] });
    });

    it('extracts JSON even with conversational preamble and trailing notes', () => {
      const complex = `Based on your request, here is the executive analysis:
      {
        "answer": "Total revenue is ₹5,40,000.",
        "growth": true
      }
      Hope this helps your financial review!`;
      const parsed = extractJSON<{ answer: string; growth: boolean }>(complex);
      expect(parsed).toEqual({
        answer: 'Total revenue is ₹5,40,000.',
        growth: true,
      });
    });

    it('extracts array JSON structures', () => {
      const raw = '[{"label": "Revenue", "value": "₹1,00,000"}]';
      const parsed = extractJSON<Array<{ label: string; value: string }>>(raw);
      expect(parsed).toHaveLength(1);
      expect(parsed?.[0].label).toBe('Revenue');
    });

    it('returns null gracefully for non-JSON content', () => {
      const garbage = 'Just some arbitrary words without any JSON structure.';
      const parsed = extractJSON(garbage);
      expect(parsed).toBeNull();
    });
  });

  describe('stripThinkingTrace', () => {
    it('strips <think> XML tags from reasoning models', () => {
      const text = '<think>User wants revenue summary. Checking database numbers.</think>Today revenue is ₹45,000.';
      const cleaned = stripThinkingTrace(text);
      expect(cleaned).toBe('Today revenue is ₹45,000.');
    });

    it('handles text without thinking tags seamlessly', () => {
      const regular = 'Invoice INV-2026-001 created successfully.';
      const cleaned = stripThinkingTrace(regular);
      expect(cleaned).toBe(regular);
    });

    it('extracts JSON when preceded by chain-of-thought preamble', () => {
      const thinkingPre = `Here's a thinking process:
1. Analyze user sales
2. Calculate total
{"answer": "Processed 12 orders today"}`;
      const cleaned = stripThinkingTrace(thinkingPre);
      expect(cleaned).toBe('{"answer": "Processed 12 orders today"}');
    });
  });
});
