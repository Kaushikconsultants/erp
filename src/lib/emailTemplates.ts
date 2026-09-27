export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: "intro",
    name: "Company Intro & Glassware Catalog",
    subject: "Introduction to R3 Exports - Premium Wine Glass & Tableware Manufacturer",
    body: `Dear {{contactPerson}},\n\nGreetings from R3 Exports!\n\nWe are pleased to connect with {{companyName}}. We are a leading manufacturer and exporter specializing in premium lead-free crystal wine glasses, barware, champagne flutes, whiskey tumblers, and decorative glassware.\n\nPlease find our export catalog and FOB price sheet attached for your review. We would love to discuss custom sampling, logo etching, or bulk container orders for your upcoming requirements.\n\nWarm regards,\n{{agentName}}\nR3 Exports`
  },
  {
    id: "quote_followup",
    name: "Quotation Follow-up",
    subject: "Follow-up regarding Export Quotation {{quoteNumber}} - R3 Exports",
    body: `Dear {{contactPerson}},\n\nI hope this email finds you well.\n\nI am writing to follow up on Quotation {{quoteNumber}} shared with {{companyName}} recently. Have you had an opportunity to review the FOB pricing, MOQ, and shipping terms?\n\nPlease feel free to let me know if you would like any custom packaging, master carton adjustments, or sample evaluations.\n\nLooking forward to your feedback,\n{{agentName}}\nExport Sales Team | R3 Exports`
  },
  {
    id: "payment_reminder",
    name: "Payment Reminder / Outstanding",
    subject: "Statement of Account & Payment Reminder - {{companyName}}",
    body: `Dear {{contactPerson}},\n\nWe hope your business is doing well.\n\nThis is a friendly reminder regarding the outstanding balance of {{outstandingBalance}} on your ledger account with R3 Exports.\n\nKindly arrange for the clearance of overdue invoices at your earliest convenience to avoid any hold on subsequent export container shipments.\n\nThank you for your cooperation.\nAccounts & Finance Department | R3 Exports`
  },
  {
    id: "order_dispatch",
    name: "Order Dispatch & Shipment Notice",
    subject: "Your Shipment {{orderNumber}} has been Dispatched! - R3 Exports",
    body: `Dear {{contactPerson}},\n\nGreat news! Your order {{orderNumber}} for {{companyName}} has passed final QA inspection, packed in export-grade cartons, and dispatched.\n\nYou can track the shipment Bill of Lading / Airway Bill status and customs documents via your client portal.\n\nThank you for partnering with R3 Exports!\n\nBest regards,\nLogistics & Export Dispatch | R3 Exports`
  }
];
