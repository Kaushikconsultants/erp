export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "intro",
    name: "Company Intro & Product Catalog",
    subject: "Introduction to Espon Clothing - Premium Garment Manufacturer",
    body: `Dear {{contactPerson}},\n\nGreetings from Espon Clothing!\n\nWe are pleased to connect with {{companyName}}. We are a leading apparel manufacturer specializing in premium knitwear, polo shirts, and activewear with high-standard fabrication and timely dispatch.\n\nPlease find our catalog and price sheet attached for your review. We would love to discuss a sample order for your upcoming requirements.\n\nWarm regards,\n{{agentName}}\nEspon Clothing Private Limited`
  },
  {
    id: "quote_followup",
    name: "Quotation Follow-up",
    subject: "Follow-up regarding Quotation {{quoteNumber}} - Espon Clothing",
    body: `Dear {{contactPerson}},\n\nI hope this email finds you well.\n\nI am writing to follow up on Quotation {{quoteNumber}} shared with {{companyName}} recently. Have you had an opportunity to review the pricing and terms?\n\nPlease feel free to let me know if you would like any customizations or revisions to the quantities.\n\nLooking forward to your feedback,\n{{agentName}}\nSales Team | Espon Clothing`
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder / Outstanding",
    subject: "Statement of Account & Payment Reminder - {{companyName}}",
    body: `Dear {{contactPerson}},\n\nWe hope your business is doing well.\n\nThis is a friendly reminder regarding the outstanding balance of ₹{{outstandingBalance}} on your ledger account with Espon Clothing.\n\nKindly arrange for the clearance of overdue invoices at your earliest convenience to avoid any hold on subsequent order dispatches.\n\nBank Account Details:\nBank: ICICI Bank\nAccount: 016805006415\nIFSC: ICIC0000168\nUPI: 7206066678@OKBIZAXIS\n\nThank you for your cooperation.\nAccounts Department | Espon Clothing`
  },
  {
    id: "order_dispatch",
    name: "Order Dispatch & Tracking Notice",
    subject: "Your Order {{orderNumber}} has been Dispatched! - Espon Clothing",
    body: `Dear {{contactPerson}},\n\nGreat news! Your order {{orderNumber}} for {{companyName}} has been packed and dispatched through our logistics partner.\n\nYou can track the shipment status and e-way bill via your customer portal.\n\nThank you for placing your trust in Espon Clothing!\n\nBest regards,\nDispatch Team | Espon Clothing`
  }
];
