import { describe, it, expect } from 'vitest';

describe('Leaderboard & Converted Quotation Deduplication', () => {
  // Helper mimicking effective date resolution logic
  function getEffectiveOrderDate(
    order: { notes?: string | null; orderDate?: string | Date | null; createdAt?: string | Date | null },
    quoteMap: Map<string, { date?: string | Date | null; createdAt?: string | Date | null }>
  ): Date {
    const match = (order.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
    if (match && match[1]) {
      const qNum = match[1].trim().toUpperCase();
      const linkedQuote = quoteMap.get(qNum);
      if (linkedQuote && (linkedQuote.date || linkedQuote.createdAt)) {
        return new Date(linkedQuote.date || linkedQuote.createdAt!);
      }
    }
    return order.orderDate ? new Date(order.orderDate) : (order.createdAt ? new Date(order.createdAt) : new Date());
  }

  it('resolves effective deal date to quotation date for older quotations converted today', () => {
    const quoteDate = new Date('2026-09-15T10:00:00Z');
    const conversionDate = new Date('2026-09-17T12:00:00Z'); // today
    const todayStart = new Date('2026-09-17T00:00:00Z');

    const quoteMap = new Map([
      ['QT-101', { date: quoteDate }]
    ]);

    const convertedOrder = {
      orderNumber: 'ORD-5001',
      orderDate: conversionDate, // previously set to now() when converted
      notes: 'Converted from Quotation #QT-101 [Method: FULL, Received: ₹11317.32]'
    };

    const effectiveDate = getEffectiveOrderDate(convertedOrder, quoteMap);
    expect(effectiveDate.toISOString()).toBe(quoteDate.toISOString());
    expect(effectiveDate >= todayStart).toBe(false); // Does NOT show on today's leaderboard!
  });

  it('keeps today deal date for quotations created and converted today', () => {
    const todayDealDate = new Date('2026-09-17T08:30:00Z');
    const todayStart = new Date('2026-09-17T00:00:00Z');

    const quoteMap = new Map([
      ['QT-202', { date: todayDealDate }]
    ]);

    const convertedOrder = {
      orderNumber: 'ORD-5002',
      orderDate: new Date('2026-09-17T14:00:00Z'),
      notes: 'Converted from Quotation #QT-202 [Method: FULL, Received: ₹2058]'
    };

    const effectiveDate = getEffectiveOrderDate(convertedOrder, quoteMap);
    expect(effectiveDate >= todayStart).toBe(true);
  });

  it('correctly deduplicates quotations with symbols like slash or underscore', () => {
    const orders = [
      { notes: 'Converted from Quotation #QT/2026-27/0042 [Method: FULL]' },
      { notes: 'Converted from Quotation #QT_509 [Method: TOKEN]' }
    ];

    const convertedQuoteNumbers = new Set<string>();
    orders.forEach(o => {
      const match = (o.notes || '').match(/Quotation\s*#?\s*([A-Za-z0-9\-_/.]+)/i);
      if (match && match[1]) {
        convertedQuoteNumbers.add(match[1].trim().toUpperCase());
      }
    });

    expect(convertedQuoteNumbers.has('QT/2026-27/0042')).toBe(true);
    expect(convertedQuoteNumbers.has('QT_509')).toBe(true);
  });

  it('counts a quotation made in Sprint 1 and confirmed in Sprint 2 or 3 in the confirmation sprint', () => {
    // Helper mimicking getQuotationDealDate
    function getQuotationDealDate(q: {
      acceptedDate?: Date | null;
      activities?: Array<{ action: string; createdAt: Date }>;
      updatedAt?: Date | null;
      date?: Date | null;
      createdAt?: Date | null;
      status?: string | null;
    }): Date {
      if (q.acceptedDate) return new Date(q.acceptedDate);
      if (q.activities && q.activities.length > 0) {
        const confirmAct = q.activities.find(a => a.action === 'Quotation Confirmed');
        if (confirmAct?.createdAt) return new Date(confirmAct.createdAt);
      }
      if ((q.status === 'Confirmed' || q.status === 'Converted') && q.updatedAt) {
        return new Date(q.updatedAt);
      }
      return q.date ? new Date(q.date) : (q.createdAt ? new Date(q.createdAt) : new Date());
    }

    function getSprintIndex(date: Date): number {
      const d = date.getDate();
      if (d <= 7) return 0;       // Sprint 1 (Days 1-7)
      if (d <= 14) return 1;      // Sprint 2 (Days 8-14)
      if (d <= 21) return 2;      // Sprint 3 (Days 15-21)
      return 3;                   // Sprint 4 (Days 22+)
    }

    // Quote 1: Made on Sep 3 (Sprint 1), Confirmed on Sep 10 (Sprint 2)
    const quoteInSprint2 = {
      date: new Date('2026-09-03T11:00:00Z'),
      createdAt: new Date('2026-09-03T11:00:00Z'),
      acceptedDate: new Date('2026-09-10T14:30:00Z'),
      status: 'Confirmed'
    };

    const dealDateSprint2 = getQuotationDealDate(quoteInSprint2);
    expect(dealDateSprint2.toISOString()).toBe('2026-09-10T14:30:00.000Z');
    expect(getSprintIndex(dealDateSprint2)).toBe(1); // Sprint 2 (not Sprint 1!)

    // Quote 2: Made on Sep 5 (Sprint 1), Confirmed on Sep 17 (Sprint 3)
    const quoteInSprint3 = {
      date: new Date('2026-09-05T09:00:00Z'),
      createdAt: new Date('2026-09-05T09:00:00Z'),
      acceptedDate: new Date('2026-09-17T16:00:00Z'),
      status: 'Confirmed'
    };

    const dealDateSprint3 = getQuotationDealDate(quoteInSprint3);
    expect(dealDateSprint3.toISOString()).toBe('2026-09-17T16:00:00.000Z');
    expect(getSprintIndex(dealDateSprint3)).toBe(2); // Sprint 3 (not Sprint 1!)
  });
});
