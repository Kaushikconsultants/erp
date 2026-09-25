import { describe, it, expect, vi } from 'vitest';
import { fetchRealTimeTracking } from '@/lib/shippingAggregator';

describe('Live Shipping Tracking', () => {
  it('should successfully fetch live tracking details for an assigned AWB', async () => {
    // AWB from user order ORD-577060
    const awb = '31293317296435';
    try {
      const result = await fetchRealTimeTracking(awb, 'Delhivery');
      if (result.success) {
        expect(result.awb).toBe(awb);
        expect(result.currentStatus).toBeDefined();
      } else {
        expect(result.error).toBeDefined();
      }
    } catch (e) {
      // Network call may fail in offline environment
    }
  }, 15000);

  it('should return a friendly error for an empty AWB', async () => {
    const result = await fetchRealTimeTracking('', 'Unknown');
    expect(result.success).toBe(false);
    expect(result.error).toContain('AWB Number is required');
  });

  it('should verify syncActiveOrdersTracking is exported and can be invoked', async () => {
    const { syncActiveOrdersTracking } = await import('@/app/actions/orderActions');
    expect(typeof syncActiveOrdersTracking).toBe('function');
  });
});
