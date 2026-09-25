import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({
  prisma: {
    organization: {
      findFirst: vi.fn().mockResolvedValue({ id: 'test-org-123' }),
    },
    order: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'cust-123',
        ...data,
      })),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'prod-123',
        ...data,
      })),
    },
    invoice: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'inv-123',
        ...data,
      })),
    },
    accountGroup: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'grp-1' }),
      update: vi.fn().mockResolvedValue({ id: 'grp-1' }),
    },
    accountLedger: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'led-1' }),
      update: vi.fn().mockResolvedValue({ id: 'led-1' }),
    },
    ledgerAccount: {
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: 'led-1' }),
      update: vi.fn().mockResolvedValue({ id: 'led-1' }),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    companySettings: {
      findFirst: vi.fn().mockResolvedValue({ companyName: 'ESPON CLOTHING' }),
    },
    expense: {
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'exp-123',
        ...data,
      })),
    },
    attendance: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'att-123',
        ...data,
      })),
    },
    employee: {
      findFirst: vi.fn().mockResolvedValue({ id: 'emp-123', userId: 'user-1' }),
      count: vi.fn().mockResolvedValue(5),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'emp-1',
          employeeId: 'EMP001',
          designation: 'Senior Sales Executive',
          employmentStatus: 'Active',
          user: { name: 'Rahul Sharma', email: 'rahul@example.com' },
          target: 200000,
          customers: [
            {
              id: 'c1',
              leadStage: 'Won',
              status: 'Active',
              orders: [{ totalValue: 150000 }],
              quotations: []
            }
          ],
          calls: [{ id: 'call-1' }]
        }
      ]),
    },
    quotation: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock('@/lib/tenant', () => ({
  getTenantOrgId: vi.fn().mockResolvedValue('test-org-123'),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: 'user-1', role: 'ADMIN', name: 'Admin User' },
  }),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { executeVoiceCommand } from '../src/app/actions/voiceActions';
import { executeConfirmedVoiceAction } from '../src/app/actions/voiceActionExecutor';
import { sendVoiceCommand } from '../src/lib/voiceClient';

describe('Universal Voice Command Engine Tests', () => {
  describe('Invoices & Billing Voice Commands', () => {
    it('creates invoice confirmation card when customer and amount are spoken', async () => {
      const res = await executeVoiceCommand('create invoice for ABC Traders for 5000');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_INVOICE');
      expect(res.confirmationPayload?.data.customerName).toContain('ABC Traders');
      expect(res.confirmationPayload?.data.amount).toBe(5000);
      expect(res.route).toBe('/invoices');
    });

    it('creates invoice confirmation card when order number is spoken', async () => {
      const res = await executeVoiceCommand('create invoice for order ORD-1025');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_INVOICE');
      expect(res.confirmationPayload?.data.orderNumber).toBe('1025');
    });

    it('navigates to invoice creator when minimal "create invoice" is spoken', async () => {
      const res = await executeVoiceCommand('create invoice');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/invoices?action=new');
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.spokenText).toContain('invoice generator');
    });

    it('handles Hindi voice command "bill banao"', async () => {
      const res = await executeVoiceCommand('bill banao');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/invoices?action=new');
    });
  });

  describe('Customer & CRM Voice Commands', () => {
    it('prepares customer confirmation card with phone and city extracted', async () => {
      const res = await executeVoiceCommand('add customer Apex Sports phone 9876543210 from Delhi');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_CUSTOMER');
      expect(res.confirmationPayload?.data.businessName).toBe('Apex Sports');
      expect(res.confirmationPayload?.data.mobile).toBe('9876543210');
      expect(res.confirmationPayload?.data.city).toBe('Delhi');
    });

    it('navigates to customer form when minimal "add customer" is spoken', async () => {
      const res = await executeVoiceCommand('add customer');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/customers?action=new');
      expect(res.cardType).toBe('NAVIGATION');
    });
  });

  describe('Product & Inventory Voice Commands', () => {
    it('extracts product name, price, and stock quantity for product addition', async () => {
      const res = await executeVoiceCommand('add product Dry Fit Shorts price 499 stock 100');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_PRODUCT');
      expect(res.confirmationPayload?.data.name).toBe('Dry Fit Shorts');
      expect(res.confirmationPayload?.data.sellingPrice).toBe(499);
      expect(res.confirmationPayload?.data.stockQuantity).toBe(100);
    });

    it('defaults stock to 0 and does not hallucinate 50 units when stock is not specified', async () => {
      const res = await executeVoiceCommand('Add product Air Flex Shorts price 499');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_PRODUCT');
      expect(res.confirmationPayload?.data.name).toBe('Air Flex Shorts');
      expect(res.confirmationPayload?.data.sellingPrice).toBe(499);
      expect(res.confirmationPayload?.data.stockQuantity).toBe(0);
      expect(res.spokenText).not.toContain('stock of 50 units');
    });
  });

  describe('Quotations & Anti-Hallucination Voice Commands', () => {
    it('does not hallucinate ABC Traders or fake items when minimal "create new quotation" is spoken', async () => {
      const res = await executeVoiceCommand('create new quotation');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toBe('/quotations/new');
      expect(res.requiresConfirmation).toBe(false);
      expect(res.confirmationPayload).toBeUndefined();
      expect(res.spokenText).not.toContain('ABC Traders');
      expect(res.spokenText).not.toContain('Air Flex');
    });

    it('navigates to quotation builder for customer when only customer is spoken', async () => {
      const res = await executeVoiceCommand('create quotation for Apex Sports');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toContain('/quotations/new');
      expect(res.route).toContain('customer=Apex');
      expect(res.requiresConfirmation).toBe(false);
      expect(res.confirmationPayload).toBeUndefined();
      expect(res.spokenText).not.toContain('Air Flex');
    });

    it('extracts customer name when "new quotation of preet garments" is spoken', async () => {
      const res = await executeVoiceCommand('new quotation of preet garments');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toContain('/quotations/new');
      expect(res.route?.toLowerCase()).toContain('customer=preet%20garments');
      expect(res.spokenText.toLowerCase()).toContain('preet garments');
    });

    it('adds line items directly via client action when "add 50 trackpants at 450" is spoken', async () => {
      const res = await executeVoiceCommand('add 50 trackpants at 450');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.productName).toBe('trackpants');
      expect(res.clientAction?.data.quantity).toBe(50);
      expect(res.clientAction?.data.rate).toBe(450);
      expect(res.spokenText).toContain('Added 50 trackpants at ₹450');
    });

    it('adds line item verblessly: "50 lower set Rs 200"', async () => {
      const res = await executeVoiceCommand('50 lower set Rs 200');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.productName).toBe('lower set');
      expect(res.clientAction?.data.quantity).toBe(50);
      expect(res.clientAction?.data.rate).toBe(200);
    });

    it('adds line item verblessly: "100 shorts rate 300"', async () => {
      const res = await executeVoiceCommand('100 shorts rate 300');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.productName).toBe('shorts');
      expect(res.clientAction?.data.quantity).toBe(100);
      expect(res.clientAction?.data.rate).toBe(300);
    });

    it('adds line item verblessly: "25 t-shirt @ 250"', async () => {
      const res = await executeVoiceCommand('25 t-shirt @ 250');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.productName).toBe('t-shirt');
      expect(res.clientAction?.data.quantity).toBe(25);
      expect(res.clientAction?.data.rate).toBe(250);
    });

    it('adds line item in Hindi verblessly: "50 लोअर सेट 200 रुपये"', async () => {
      const res = await executeVoiceCommand('50 लोअर सेट 200 रुपये');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.quantity).toBe(50);
      expect(res.clientAction?.data.rate).toBe(200);
      expect(res.clientAction?.data.productName).toContain('लोअर सेट');
    });

    it('handles line item without price e.g. "add 20 t-shirts"', async () => {
      const res = await executeVoiceCommand('add 20 t-shirts');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.productName).toBe('t-shirts');
      expect(res.clientAction?.data.quantity).toBe(20);
    });

    it('handles customer selection for active quotation e.g. "customer Preet Garments"', async () => {
      const res = await executeVoiceCommand('customer Preet Garments');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('SET_QUOTATION_CUSTOMER');
      expect(res.clientAction?.data.customerName).toBe('Preet Garments');
    });

    it('creates confirmation card when full quotation details are spoken', async () => {
      const res = await executeVoiceCommand('create quotation for Sharma Garments with 50 Trackpants at 450');
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_QUOTATION');
      expect(res.confirmationPayload?.data.customerName).toBe('Sharma Garments');
      expect(res.confirmationPayload?.data.items[0].productName).toBe('Trackpants');
      expect(res.confirmationPayload?.data.items[0].quantity).toBe(50);
      expect(res.confirmationPayload?.data.items[0].price).toBe(450);
      expect(res.confirmationPayload?.data.items[0].totalPrice).toBe(22500);
    });

    it('handles cancellation commands cleanly without asking for item prices', async () => {
      const cancel1 = await executeVoiceCommand('cancel this quotation');
      expect(cancel1.success).toBe(true);
      expect(cancel1.cardType).toBe('GENERAL');
      expect(cancel1.spokenText).toContain('Action cancelled');
      expect(cancel1.spokenText).not.toContain('price or rate');

      const cancel2 = await executeVoiceCommand('cancel');
      expect(cancel2.success).toBe(true);
      expect(cancel2.spokenText).toContain('Action cancelled');

      const cancel3 = await executeVoiceCommand('stop');
      expect(cancel3.success).toBe(true);
      expect(cancel3.spokenText).toContain('Action cancelled');
    });

    it('handles direct keywords "customer" and "customers"', async () => {
      const res = await executeVoiceCommand('customer');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toBe('/customers');

      const res2 = await executeVoiceCommand('customers');
      expect(res2.success).toBe(true);
      expect(res2.cardType).toBe('NAVIGATION');
      expect(res2.route).toBe('/customers');
    });

    it('navigates to invoice builder instead of inventing General Customer when "create invoice for 5000" is spoken', async () => {
      const res = await executeVoiceCommand('create invoice for 5000');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toContain('/invoices?action=new');
      expect(res.route).toContain('amount=5000');
      expect(res.spokenText).not.toContain('General Customer');
    });

    it('does not hallucinate General Customer or 25 units at 799 when minimal "create order" is spoken', async () => {
      const res = await executeVoiceCommand('create order');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toBe('/orders/new');
      expect(res.requiresConfirmation).toBe(false);
      expect(res.confirmationPayload).toBeUndefined();
      expect(res.spokenText).not.toContain('General Customer');
      expect(res.spokenText).not.toContain('Sports Apparel');
    });
  });

  describe('HRMS & Attendance Voice Commands', () => {
    it('detects punch in attendance intent', async () => {
      const res = await executeVoiceCommand('punch in attendance for today');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('RECORD_ATTENDANCE');
      expect(res.confirmationPayload?.data.status).toBe('Present');
    });
  });

  describe('Universal Navigation across ERP Modules', () => {
    it('navigates to Balance Sheet', async () => {
      const res = await executeVoiceCommand('open balance sheet');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/accounting/balance-sheet');
    });

    it('navigates to Delivery Challans', async () => {
      const res = await executeVoiceCommand('open delivery challan');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/delivery-challans');
    });

    it('navigates to Quotations', async () => {
      const res = await executeVoiceCommand('open quotations');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/quotations');
    });

    it('navigates to Leaderboard Sprint', async () => {
      const res = await executeVoiceCommand('open leaderboard');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/leaderboard');
    });

    it('navigates to Settings', async () => {
      const res = await executeVoiceCommand('open settings');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/settings');
    });

    it('navigates to Billing & Subscriptions when "subscriptions" or "open subscription" is spoken', async () => {
      const res1 = await executeVoiceCommand('subscriptions');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/settings/billing');
      expect(res1.spokenText).toContain('Billing & Subscriptions');

      const res2 = await executeVoiceCommand('open subscription');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/settings/billing');

      const res3 = await executeVoiceCommand('billing plan');
      expect(res3.success).toBe(true);
      expect(res3.route).toBe('/settings/billing');
    });

    it('navigates to Credit Notes', async () => {
      const res = await executeVoiceCommand('credit notes');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/credit-notes');
    });

    it('navigates to Vendor Credits', async () => {
      const res = await executeVoiceCommand('vendor credits');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/vendor-credits');
    });

    it('navigates to Warehouses and Stock Transfers', async () => {
      const res1 = await executeVoiceCommand('warehouses');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/warehouses');

      const res2 = await executeVoiceCommand('stock transfer');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/warehouses/transfers');
    });

    it('navigates to Vendor Bills and E-Way Bills', async () => {
      const res1 = await executeVoiceCommand('bills');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/bills');

      const res2 = await executeVoiceCommand('eway bill');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/eway-bills');
    });

    it('navigates to GST Filing & Returns', async () => {
      const res = await executeVoiceCommand('gst filing');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/gst-filing');
    });

    it('navigates to Telecalling and WhatsApp Broadcasts', async () => {
      const res1 = await executeVoiceCommand('telecalling');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/calls');

      const res2 = await executeVoiceCommand('broadcasts');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/broadcasts');
    });

    it('navigates to Analytics and Production', async () => {
      const res1 = await executeVoiceCommand('analytics');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/analytics');

      const res2 = await executeVoiceCommand('production');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/production');
    });

    it('navigates to Hiring, Pipeline, Follow-ups, and Payments Made', async () => {
      const resHiring = await executeVoiceCommand('hiring');
      expect(resHiring.success).toBe(true);
      expect(resHiring.route).toBe('/hiring');

      const resPipe = await executeVoiceCommand('pipeline');
      expect(resPipe.success).toBe(true);
      expect(resPipe.route).toBe('/pipeline');

      const resFollow = await executeVoiceCommand('follow ups');
      expect(resFollow.success).toBe(true);
      expect(resFollow.route).toBe('/follow-ups');

      const resPay = await executeVoiceCommand('payments made');
      expect(resPay.success).toBe(true);
      expect(resPay.route).toBe('/payments-made');
    });

    it('navigates to Profile and Integrations', async () => {
      const res1 = await executeVoiceCommand('my profile');
      expect(res1.success).toBe(true);
      expect(res1.route).toBe('/profile');

      const res2 = await executeVoiceCommand('integrations');
      expect(res2.success).toBe(true);
      expect(res2.route).toBe('/integrations');
    });

    it("handles Attendance logs commands accurately and safely without error #441", async () => {
      const res1 = await executeVoiceCommand("show today's attendance");
      expect(res1.success).toBe(true);
      expect(res1.cardType).toBe("ATTENDANCE");
      expect(res1.route).toBe("/attendance");
      expect(res1.actionText).toBe("Attendance Logs");
      expect(res1.spokenText).toContain("attendance");

      const res2 = await executeVoiceCommand("आज की हाजिरी दिखाओ");
      expect(res2.success).toBe(true);
      expect(res2.cardType).toBe("ATTENDANCE");
      expect(res2.route).toBe("/attendance");
      expect(res2.actionText).toBe("हाजिरी लॉग");
    });
  });

  describe('Confirmed Voice Action Executor (Database Transactions)', () => {
    it('successfully executes CREATE_INVOICE action', async () => {
      const result = await executeConfirmedVoiceAction({
        actionType: 'CREATE_INVOICE',
        title: 'Create Invoice for Test Customer',
        data: {
          customerName: 'Global Sports Corp',
          amount: 15000,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Global Sports Corp');
      expect(result.message).toContain('15,000');
      expect(result.recordId).toBe('inv-123');
      expect(result.route).toBe('/invoices');
    });

    it('successfully executes CREATE_CUSTOMER action', async () => {
      const result = await executeConfirmedVoiceAction({
        actionType: 'CREATE_CUSTOMER',
        title: 'Add New Customer',
        data: {
          businessName: 'Super Star Apparel',
          mobile: '9812345678',
          city: 'Mumbai',
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Super Star Apparel');
      expect(result.recordId).toBe('cust-123');
      expect(result.route).toBe('/customers/cust-123');
    });

    it('successfully executes CREATE_PRODUCT action', async () => {
      const result = await executeConfirmedVoiceAction({
        actionType: 'CREATE_PRODUCT',
        title: 'Add New Product',
        data: {
          name: 'Thermal Running Top',
          sellingPrice: 899,
          stockQuantity: 40,
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Thermal Running Top');
      expect(result.route).toBe('/products');
    });

    it('successfully executes RECORD_ATTENDANCE action', async () => {
      const result = await executeConfirmedVoiceAction({
        actionType: 'RECORD_ATTENDANCE',
        title: 'Punch In Attendance',
        data: {
          status: 'Present',
        },
      });
      expect(result.success).toBe(true);
      expect(result.message).toContain('Present');
      expect(result.route).toBe('/hrms');
    });
  });

  describe('Hindi / Devanagari Voice AI Commands & Execution', () => {
    it('handles direct module navigation in Hindi ("कोटेशन खोलो", "स्टॉक दिखाओ", "ग्राहक सूची")', async () => {
      const qRes = await executeVoiceCommand('कोटेशन खोलो');
      expect(qRes.success).toBe(true);
      expect(qRes.route).toBe('/quotations');
      expect(qRes.cardType).toBe('NAVIGATION');

      const sRes = await executeVoiceCommand('स्टॉक दिखाओ');
      expect(sRes.success).toBe(true);
      expect(sRes.route).toBe('/products');

      const cRes = await executeVoiceCommand('ग्राहक सूची खोलो');
      expect(cRes.success).toBe(true);
      expect(cRes.route).toBe('/customers');
    });

    it('navigates to quotation builder for minimal Hindi "नया कोटेशन बनाओ"', async () => {
      const res = await executeVoiceCommand('नया कोटेशन बनाओ');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/quotations/new');
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.requiresConfirmation).toBe(false);
      expect(res.spokenText).toContain('कोटेशन फॉर्म खोला जा रहा है');
    });

    it('extracts customer name when "प्रीत गारमेंट्स का कोटेशन बनाओ" is spoken', async () => {
      const res = await executeVoiceCommand('प्रीत गारमेंट्स का कोटेशन बनाओ');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.route).toContain('/quotations/new');
      expect(res.route).toContain('customer=');
      expect(decodeURIComponent(res.route || '')).toContain('प्रीत गारमेंट्स');
      expect(res.spokenText).toContain('प्रीत गारमेंट्स');
    });

    it('adds line items via clientAction in Hindi ("50 ट्रैकपेंट 450 रुपये में जोड़ो")', async () => {
      const res = await executeVoiceCommand('50 ट्रैकपेंट 450 रुपये में जोड़ो');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.quantity).toBe(50);
      expect(res.clientAction?.data.rate).toBe(450);
      expect(res.clientAction?.data.productName).toContain('ट्रैकपेंट');
      expect(res.spokenText).toContain('कोटेशन में 50');
    });

    it('adds line items with verb first in Hindi ("जोड़ो 25 टीशर्ट 300 के भाव")', async () => {
      const res = await executeVoiceCommand('जोड़ो 25 टीशर्ट 300 के भाव');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('ADD_QUOTATION_ITEM');
      expect(res.clientAction?.data.quantity).toBe(25);
      expect(res.clientAction?.data.rate).toBe(300);
      expect(res.clientAction?.data.productName).toContain('टीशर्ट');
    });

    it('selects quotation customer in Hindi ("ग्राहक प्रीत गारमेंट्स चुनो")', async () => {
      const res = await executeVoiceCommand('ग्राहक प्रीत गारमेंट्स चुनो');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CLIENT_ACTION');
      expect(res.clientAction?.type).toBe('SET_QUOTATION_CUSTOMER');
      expect(res.clientAction?.data.customerName).toBe('प्रीत गारमेंट्स');
      expect(res.spokenText).toContain('प्रीत गारमेंट्स');
    });

    it('creates quotation confirmation card in Hindi with items and rate', async () => {
      const res = await executeVoiceCommand('प्रीत गारमेंट्स का कोटेशन बनाओ 50 ट्रैकपेंट 450 रुपये');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_QUOTATION');
      expect(res.confirmationPayload?.data.customerName).toBe('प्रीत गारमेंट्स');
      expect(res.confirmationPayload?.data.items[0].quantity).toBe(50);
      expect(res.confirmationPayload?.data.items[0].price).toBe(450);
      expect(res.confirmationPayload?.data.items[0].totalPrice).toBe(22500);
      expect(res.spokenText).toContain('22,500');
    });

    it('handles Hindi invoice creation ("प्रीत गारमेंट्स का 15000 का बिल बनाओ")', async () => {
      const res = await executeVoiceCommand('प्रीत गारमेंट्स का 15000 का बिल बनाओ');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_INVOICE');
      expect(res.confirmationPayload?.data.customerName).toBe('प्रीत गारमेंट्स');
      expect(res.confirmationPayload?.data.amount).toBe(15000);
      expect(res.spokenText).toContain('15,000');
    });

    it('handles Hindi invoice builder without customer ("नया बिल बनाओ")', async () => {
      const res = await executeVoiceCommand('नया बिल बनाओ');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/invoices?action=new');
      expect(res.cardType).toBe('NAVIGATION');
      expect(res.spokenText).toContain('नया इनवॉइस');
    });

    it('handles Hindi executive business sales summary ("आज की बिक्री कितनी है")', async () => {
      const res = await executeVoiceCommand('आज की बिक्री कितनी है');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('GENERAL');
      expect(res.spokenText).toContain('आज का व्यापार सारांश');
      expect(res.actionText).toContain('बिक्री');
    });

    it('handles Hindi attendance punch in ("हाजिरी लगाओ")', async () => {
      const res = await executeVoiceCommand('हाजिरी लगाओ');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('RECORD_ATTENDANCE');
      expect(res.spokenText).toContain('उपस्थिति (हाजिरी) दर्ज करने की पुष्टि करें');
    });

    it('handles Hindi expense logging ("500 रुपये खर्चा जोड़ो")', async () => {
      const res = await executeVoiceCommand('500 रुपये खर्चा जोड़ो');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('CONFIRMATION');
      expect(res.requiresConfirmation).toBe(true);
      expect(res.confirmationPayload?.actionType).toBe('CREATE_EXPENSE');
      expect(res.confirmationPayload?.data.amount).toBe(500);
      expect(res.spokenText).toContain('₹500 का खर्चा दर्ज करने की तैयारी');
    });

    it('handles Hindi cancellation cleanly ("रद्द करो", "कैंसल करो")', async () => {
      const res1 = await executeVoiceCommand('रद्द करो');
      expect(res1.success).toBe(true);
      expect(res1.cardType).toBe('GENERAL');
      expect(res1.spokenText).toContain('कार्य रद्द कर दिया गया है');

      const res2 = await executeVoiceCommand('कैंसल करो');
      expect(res2.success).toBe(true);
      expect(res2.spokenText).toContain('कार्य रद्द कर दिया गया है');
    });
  });

  describe('Executive BI & Agent Details Voice Commands', () => {
    it('accurately answers top performer till month query without falling back to dashboard', async () => {
      const res = await executeVoiceCommand('top performer till month');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('REPORT');
      expect(res.spokenText).toContain('Rahul Sharma');
      expect(res.spokenText).toContain('1,50,000');
      expect(res.actionText).toContain('Top Performer');
      expect(res.keyMetrics?.some(m => m.label === 'Top Performer')).toBe(true);
      expect(res.keyMetrics?.some(m => m.label === 'Achieved Sales')).toBe(true);
      expect(res.route).toBe('/sales-targets');
    });

    it('accurately handles "agents details like top performer till month"', async () => {
      const res = await executeVoiceCommand('agents details like top performer till month');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('REPORT');
      expect(res.spokenText).toContain('Rahul Sharma');
      expect(res.keyMetrics?.some(m => m.label === 'Top Performer')).toBe(true);
      expect(res.route).toBe('/sales-targets');
    });

    it('accurately answers "total sale" with canonical all-time, MTD, and today revenue', async () => {
      const res = await executeVoiceCommand('total sale');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('REPORT');
      expect(res.spokenText).toContain('Total sales across all time');
      expect(res.spokenText).toContain('Month-to-date');
      expect(res.keyMetrics?.some(m => m.label === 'Total Sales (All Time)')).toBe(true);
      expect(res.keyMetrics?.some(m => m.label === 'This Month (MTD)')).toBe(true);
      expect(res.keyMetrics?.some(m => m.label === "Today's Sales")).toBe(true);
      expect(res.route).toBe('/orders');
    });

    it('handles phonetic typo "sales fegure" gracefully without routing to dashboard', async () => {
      const res = await executeVoiceCommand('sales fegure');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('REPORT');
      expect(res.keyMetrics?.some(m => m.label === 'Total Sales (All Time)')).toBe(true);
    });

    it('accurately handles Hindi voice command "आज सबसे ज्यादा सेल किसकी थी"', async () => {
      const res = await executeVoiceCommand('आज सबसे ज्यादा सेल किसकी थी');
      expect(res.success).toBe(true);
      expect(res.cardType).toBe('REPORT');
      expect(res.route).toBe('/orders');
      expect(res.spokenText).toMatch(/(आज की सबसे बड़ी सेल|आज अभी तक कोई नया ऑर्डर दर्ज नहीं हुआ)/);
    });

    it('accurately handles Hindi voice command "आज की बिक्री कितनी है"', async () => {
      const res = await executeVoiceCommand('आज की बिक्री कितनी है');
      expect(res.success).toBe(true);
      expect(res.route).toBe('/orders');
      expect(res.spokenText).toContain('व्यापार सारांश');
    });
  });

  describe('Fault-Tolerant Voice Dispatcher (sendVoiceCommand & API route)', () => {
    it('successfully executes commands through sendVoiceCommand with fallback', async () => {
      const res = await sendVoiceCommand("show today's attendance");
      expect(res.success).toBe(true);
      expect(res.route).toBe('/attendance');
      expect(res.cardType).toBe('ATTENDANCE');
    });
  });
});
