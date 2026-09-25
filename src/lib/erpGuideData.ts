export interface GuideStep {
  stepNumber: number;
  instruction: string;
  instructionHindi?: string;
  targetSelector?: string;
  route?: string;
}

export interface GuideArticle {
  id: string;
  moduleKey: string;
  title: string;
  titleHindi?: string;
  summary: string;
  steps: GuideStep[];
  targetRoute: string;
  keywords: string[];
  suggestedActions?: { label: string; href: string }[];
}

export interface GuideSearchResult {
  success: boolean;
  article?: GuideArticle;
  aiExplanation?: string;
  matches: { title: string; targetRoute: string; summary: string }[];
  provider?: string;
  error?: string;
}

// Built-in Knowledge Base for Instant Zero-Latency Guidance
export const SYSTEM_GUIDE_ARTICLES: GuideArticle[] = [
  {
    id: "guide-full-software-overview",
    moduleKey: "overview",
    title: "Complete ERP Software Guide & Navigation Walkthrough",
    titleHindi: "पूरा ERP सॉफ्टवेयर गाइड और इस्तेमाल का तरीका",
    summary: "Comprehensive master guide for all ERP operations: Sales, Quotations, Invoicing, Godowns, Inventory, Payments, and Staff Attendance.",
    targetRoute: "/dashboard",
    keywords: [
      "guide", "full software", "guide full software", "software guide", "how to use", "overview", "help",
      "walkthrough", "tutorial", "failed to guide", "software", "सॉफ्टवेयर", "गाइड", "सॉफ्टवेयर गाइड",
      "गाइड करो", "सीखो", "all modules", "onboarding", "how to operate", "explain software", "full guide",
      "guide me", "start", "all features", "erp", "erp guide", "system guide", "tour"
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: "Quotations & Sales: Open /quotations/new to create formal customer estimates with WhatsApp sharing or speak 'Create quotation'.",
        instructionHindi: "कोटेशन और सेल्स: /quotations पर कोटेशन बनाएं या वॉइस में बोलें 'कोटेशन बनाओ'।",
        targetSelector: "#menu-quotations",
        route: "/quotations"
      },
      {
        stepNumber: 2,
        instruction: "Tax Invoicing & Billing: Convert approved quotes or generate GST invoices under /orders/new with automatic warehouse stock deduction.",
        instructionHindi: "GST इनवॉइस और बिलिंग: /orders में बिल बनाएं जिससे स्टॉक अपने आप कम हो जाता है।",
        targetSelector: "#menu-orders",
        route: "/orders"
      },
      {
        stepNumber: 3,
        instruction: "Products & Stock Transfers: Manage catalog, articles, barcodes, and godown-to-godown transit under /products and /transfers.",
        instructionHindi: "स्टॉक और गोदाम: /products और /transfers में माल का स्टॉक और ट्रांसफर ट्रैक करें।",
        targetSelector: "#menu-products",
        route: "/products"
      },
      {
        stepNumber: 4,
        instruction: "Accounts & Bank Reconciliation: Manage party ledgers, payment receipts, and auto-match bank statements under /accounting.",
        instructionHindi: "खाते और बैंक: /accounting में ग्राहक लेजर और बैंक स्टेटमेंट मैच करें।",
        targetSelector: "#menu-accounting",
        route: "/accounting"
      },
      {
        stepNumber: 5,
        instruction: "Staff Attendance & Payroll: Track tailor piece-rate work and daily biometric attendance under /attendance and /payroll.",
        instructionHindi: "हाजिरी और सैलरी: /attendance में कारीगरों और स्टाफ की हाजिरी दर्ज करें।",
        targetSelector: "#menu-attendance",
        route: "/attendance"
      }
    ],
    suggestedActions: [
      { label: "📊 Open Dashboard", href: "/dashboard" },
      { label: "📝 Create Quotation", href: "/quotations/new" },
      { label: "🧾 New Invoice", href: "/orders/new" },
      { label: "🚚 Stock Transfers", href: "/transfers" },
      { label: "💳 Accounts Ledger", href: "/accounting/vouchers" }
    ]
  },
  {
    id: "guide-customer-create",
    moduleKey: "customers",
    title: "How to Add a Customer / Buyer / Party",
    titleHindi: "नया ग्राहक या पार्टी कैसे जोड़ें",
    summary: "Register new wholesale buyers, retail shops, contact persons, GSTIN, and credit limits.",
    targetRoute: "/customers/new",
    keywords: ["customer", "customers", "add customer", "new customer", "how to add customer", "create customer", "party", "parties", "buyer", "buyers", "client", "clients", "customer kaise banaye", "customer kaise add kare", "ग्राहक", "पार्टी", "कस्टमर", "नया ग्राहक", "ग्राहक कैसे जोड़ें"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Open Customers menu and click '+ Add Customer' or speak: 'Add customer [Name] phone [Number]'.",
        instructionHindi: "कस्टमर मेनू में '+ नया ग्राहक' दबाएं या बोलें 'Add customer...'",
        targetSelector: "#btn-add-customer",
        route: "/customers/new"
      },
      {
        stepNumber: 2,
        instruction: "Enter Business Name, Contact Person, Phone, and State/City for GST tax auto-calculation.",
        instructionHindi: "पार्टी का नाम, मोबाइल नंबर और शहर/राज्य दर्ज करें।",
        targetSelector: "#customer-name-input"
      },
      {
        stepNumber: 3,
        instruction: "Optional: Set GSTIN for B2B billing and assign credit limit / payment terms.",
        instructionHindi: "यदि GSTIN है तो दर्ज करें और पेमेंट समय सीमा तय करें।",
        targetSelector: "#customer-gstin-input"
      },
      {
        stepNumber: 4,
        instruction: "Click 'Save Customer'. You can now immediately issue quotations or invoices to this account.",
        instructionHindi: "'Save' पर क्लिक करें। अब आप इस ग्राहक के लिए बिल बना सकते हैं।",
        targetSelector: "#btn-save-customer"
      }
    ],
    suggestedActions: [
      { label: "👤 Add Customer", href: "/customers/new" },
      { label: "👥 All Customers", href: "/customers" }
    ]
  },
  {
    id: "guide-product-create",
    moduleKey: "products",
    title: "How to Add a Product / Article / SKU",
    titleHindi: "नया प्रोडक्ट या आर्टिकल कैसे जोड़ें",
    summary: "Create articles with purchase cost, wholesale selling rate, HSN code, GST slab, and initial stock.",
    targetRoute: "/products/new",
    keywords: ["product", "products", "add product", "new product", "how to add product", "create product", "item", "items", "article", "articles", "sku", "skus", "rate", "product kaise add kare", "सामान", "आइटम", "प्रोडक्ट", "नया प्रोडक्ट", "स्टॉक", "सामान कैसे जोड़ें"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Navigate to Products and click '+ Add Product' or speak: 'Add product [Name] price [Amount]'.",
        instructionHindi: "प्रोडक्ट्स स्क्रीन पर जाएं और '+ नया प्रोडक्ट' दबाएं।",
        targetSelector: "#btn-add-product",
        route: "/products/new"
      },
      {
        stepNumber: 2,
        instruction: "Enter Article Name/Style Code, Category (e.g. Lower, Shorts, T-Shirt), and Fabric details.",
        instructionHindi: "आर्टिकल का नाम और कैटेगरी चुनें।",
        targetSelector: "#product-name-input"
      },
      {
        stepNumber: 3,
        instruction: "Define Selling Price, Purchase Price, HSN Code, and GST Rate (5%, 12%, or 18%).",
        instructionHindi: "रेट (Price), HSN कोड और GST टैक्स रेट दर्ज करें।",
        targetSelector: "#product-price-input"
      },
      {
        stepNumber: 4,
        instruction: "Enter opening stock in your godown and click 'Save Product'.",
        instructionHindi: "गोदाम में शुरुआती पीस की संख्या डालें और 'Save' दबाएं।",
        targetSelector: "#btn-save-product"
      }
    ],
    suggestedActions: [
      { label: "📦 Add Product", href: "/products/new" },
      { label: "📋 Products Catalog", href: "/products" }
    ]
  },
  {
    id: "guide-quotation-create",
    moduleKey: "quotations",
    title: "How to Create a New Quotation / Estimate",
    titleHindi: "कोटेशन (Quotation) कैसे बनाएं",
    summary: "Create a formal sales estimate with products, custom rates, payment terms, and WhatsApp sharing.",
    targetRoute: "/quotations/new",
    keywords: ["quotation", "quotations", "quote", "quotes", "estimate", "estimates", "how to make quotation", "how to make quotations", "how to make quote", "how can i make quotation", "make quotation", "make quotations", "create quotation", "create quote", "quotation kaise banaye", "quote kaise banaye", "कोटेशन", "कोटेशन कैसे बनाएं", "कोटेशन बनाना", "रेट", "rate", "customer quote", "bhav"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Open Quotation creator or speak: 'Create quotation for [Customer Name]'",
        instructionHindi: "नया कोटेशन खोलें या वॉइस में बोलें: 'क्रिएट कोटेशन'",
        targetSelector: "#btn-create-quotation",
        route: "/quotations/new"
      },
      {
        stepNumber: 2,
        instruction: "Select the Customer or type their phone/company name to auto-fill GST and billing details.",
        instructionHindi: "ग्राहक (Customer) चुनें या नया ग्राहक नाम दर्ज करें।",
        targetSelector: "#quotation-customer-select"
      },
      {
        stepNumber: 3,
        instruction: "Add Line Items by speaking e.g. '50 lower set Rs 200' or picking from the catalog.",
        instructionHindi: "सामान जोड़ें: बोलें '50 लोअर सेट 200 रुपये' या लिस्ट से सिलेक्ट करें।",
        targetSelector: "#btn-add-quotation-item"
      },
      {
        stepNumber: 4,
        instruction: "Review tax (CGST/SGST/IGST), discount, and click 'Save & Send via WhatsApp'.",
        instructionHindi: "टैक्स और डिस्काउंट चेक करें और 'सेव' या 'व्हाट्सएप भेजें' पर क्लिक करें।",
        targetSelector: "#btn-save-quotation"
      }
    ],
    suggestedActions: [
      { label: "➕ Create Quotation", href: "/quotations/new" },
      { label: "📋 View All Quotations", href: "/quotations" }
    ]
  },
  {
    id: "guide-invoice-create",
    moduleKey: "invoicing",
    title: "How to Create a Tax Invoice / Billing",
    titleHindi: "टैक्स इनवॉइस (GST बिल) कैसे बनाएं",
    summary: "Generate GST compliant tax invoice, deduct warehouse stock automatically, and generate E-Way bill.",
    targetRoute: "/orders/new",
    keywords: ["invoice", "invoices", "tax invoice", "bill", "bills", "billing", "gst bill", "how to make invoice", "how to create invoice", "make invoice", "create invoice", "invoice kaise banaye", "बिल", "इनवॉइस", "बिल कैसे बनाएं", "जीएसटी बिल"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Navigate to Orders / Invoices and click '+ Create Invoice'.",
        instructionHindi: "ऑर्डर्स/बिलिंग स्क्रीन पर जाएं और '+ नया इनवॉइस' पर क्लिक करें।",
        targetSelector: "#btn-create-invoice",
        route: "/orders/new"
      },
      {
        stepNumber: 2,
        instruction: "Select Customer and dispatch warehouse to automatically track inventory reduction.",
        instructionHindi: "ग्राहक और गोदाम (Warehouse) चुनें ताकि स्टॉक ऑटो-कम हो सके।",
        targetSelector: "#invoice-warehouse-select"
      },
      {
        stepNumber: 3,
        instruction: "Add products, verify HSN code, tax rate (5%, 12%, 18%), and transport details.",
        instructionHindi: "आर्टिकल और HSN कोड चेक करें, ट्रांसपोर्ट और गाड़ी नंबर डालें।",
        targetSelector: "#invoice-items-table"
      },
      {
        stepNumber: 4,
        instruction: "Save and generate PDF. Print thermal slip or send digital PDF directly to customer WhatsApp.",
        instructionHindi: "इनवॉइस सेव करें और सीधे व्हाट्सएप या प्रिंट आउट निकालें।",
        targetSelector: "#btn-save-invoice"
      }
    ],
    suggestedActions: [
      { label: "🧾 New Invoice", href: "/orders/new" },
      { label: "📑 Invoice History", href: "/orders" }
    ]
  },
  {
    id: "guide-stock-transfer",
    moduleKey: "transfers",
    title: "How to Transfer Stock Between Godowns / Warehouses",
    titleHindi: "गोदामों के बीच स्टॉक ट्रांसफर कैसे करें",
    summary: "Safely move goods between factory, main warehouse, and retail branches with transit tracking.",
    targetRoute: "/transfers/new",
    keywords: ["transfer", "transfers", "stock transfer", "godown transfer", "गोदाम", "warehouse", "warehouses", "transit", "how to transfer stock", "stock transfer kaise kare", "ट्रांसफर कैसे करें"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Go to Stock Transfers and click 'New Transfer Challan'.",
        instructionHindi: "स्टॉक ट्रांसफर मेनू में जाएं और 'नया ट्रांसफर' दबाएं।",
        targetSelector: "#btn-new-transfer",
        route: "/transfers/new"
      },
      {
        stepNumber: 2,
        instruction: "Select Source Godown (from where goods leave) and Destination Godown (receiving site).",
        instructionHindi: "भेजने वाला गोदाम (Source) और पाने वाला गोदाम (Destination) चुनें।",
        targetSelector: "#select-source-warehouse"
      },
      {
        stepNumber: 3,
        instruction: "Add article quantities, vehicle/transporter details, and click 'Dispatch Transfer'.",
        instructionHindi: "माल की मात्रा और गाड़ी नंबर दर्ज करके 'Dispatch' पर क्लिक करें।",
        targetSelector: "#btn-dispatch-transfer"
      },
      {
        stepNumber: 4,
        instruction: "When goods arrive at the destination, open the transfer and click 'Mark Received'.",
        instructionHindi: "माल पहुंचने पर डेस्टिनेशन गोदाम में 'Receive' कन्फर्म करें।",
        targetSelector: "#btn-receive-transfer"
      }
    ],
    suggestedActions: [
      { label: "🚚 New Stock Transfer", href: "/transfers/new" },
      { label: "📦 Inventory Levels", href: "/products" }
    ]
  },
  {
    id: "guide-bank-reconciliation",
    moduleKey: "accounting",
    title: "How to Reconcile Bank Statements & Ledger",
    titleHindi: "बैंक रीकंसीलिएशन (Bank Reconciliation) कैसे करें",
    summary: "Match your bank statement entries with customer receipts and vendor payments in one click.",
    targetRoute: "/accounting/bank-reconciliation",
    keywords: ["bank", "reconciliation", "statement", "statements", "reconcile", "how to reconcile", "bank reconciliation kaise kare", "बैंक", "खाता", "passbook", "बैंक समाधान"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Navigate to Accounting > Bank Reconciliation.",
        instructionHindi: "अकाउंटिंग में 'Bank Reconciliation' स्क्रीन खोलें।",
        targetSelector: "#menu-bank-reconciliation",
        route: "/accounting/bank-reconciliation"
      },
      {
        stepNumber: 2,
        instruction: "Select your active Bank Account (e.g. HDFC, ICICI, SBI Current Account).",
        instructionHindi: "अपना बैंक खाता सेलेक्ट करें।",
        targetSelector: "#select-bank-account"
      },
      {
        stepNumber: 3,
        instruction: "Upload Bank Statement (CSV / Excel) or view auto-fetched bank transactions.",
        instructionHindi: "बैंक स्टेटमेंट (Excel/CSV) अपलोड करें।",
        targetSelector: "#upload-bank-statement"
      },
      {
        stepNumber: 4,
        instruction: "Click 'Auto-Match' to reconcile vouchers by amount and UTR/Cheque number, then click Reconcile.",
        instructionHindi: "'Auto-Match' दबाएं ताकि सिस्टम खुद-ब-खुद वाउचर मैच कर ले।",
        targetSelector: "#btn-auto-reconcile"
      }
    ],
    suggestedActions: [
      { label: "🏦 Bank Reconciliation", href: "/accounting/bank-reconciliation" },
      { label: "💳 Accounting Vouchers", href: "/accounting/vouchers" }
    ]
  },
  {
    id: "guide-attendance-hrms",
    moduleKey: "attendance",
    title: "How to Record Staff Attendance & Biometrics",
    titleHindi: "स्टाफ और कारीगरों की हाजिरी (Attendance) कैसे लगाएं",
    summary: "Punch daily attendance, mark leaves, half-days, or record piece-rate production for tailors/workers.",
    targetRoute: "/attendance",
    keywords: ["attendance", "punch", "staff", "salary", "payroll", "हाजिरी", "वेतन", "absent", "leave", "how to mark attendance", "attendance kaise lagaye", "हाजिरी कैसे लगाएं"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Open Attendance module or speak: 'Punch attendance for today'.",
        instructionHindi: "हाजिरी स्क्रीन खोलें या बोलें: 'पंच हाजिरी'",
        targetSelector: "#menu-attendance",
        route: "/attendance"
      },
      {
        stepNumber: 2,
        instruction: "Select today's date and branch/department.",
        instructionHindi: "तारीख और डिपार्टमेंट चुनें।",
        targetSelector: "#attendance-date-picker"
      },
      {
        stepNumber: 3,
        instruction: "Mark status: Present (P), Absent (A), Half-Day (HD), or Overtime (OT).",
        instructionHindi: "प्रेजेंट (P), एब्सेंट (A) या हाफ-डे (HD) मार्क करें।",
        targetSelector: "#attendance-table"
      },
      {
        stepNumber: 4,
        instruction: "Click 'Save Attendance'. Daily salaries and overtime will calculate automatically in payroll.",
        instructionHindi: "'Save' पर क्लिक करें। महीने के अंत में सैलरी अपने आप तैयार हो जाएगी।",
        targetSelector: "#btn-save-attendance"
      }
    ],
    suggestedActions: [
      { label: "⏱️ Mark Attendance", href: "/attendance" },
      { label: "💼 Payroll Summary", href: "/payroll" }
    ]
  },
  {
    id: "guide-document-numbering",
    moduleKey: "settings",
    title: "How to Customize Bill / Invoice Number Prefixes",
    titleHindi: "बिल और इनवॉइस नंबर का फॉर्मेट (Prefix) कैसे सेट करें",
    summary: "Set custom numbering sequences like 'EXP/24-25/0001' for Quotations, Invoices, and Delivery Challans.",
    targetRoute: "/settings/numbering",
    keywords: ["numbering", "prefix", "invoice number", "sequence", "सीक्वेंस", "नंबरिंग", "format", "how to set prefix", "bill numbering", "numbering sequence"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Go to Settings > Document Numbering.",
        instructionHindi: "सेटिंग्स > डॉक्यूमेंट नंबरिंग में जाएं।",
        targetSelector: "#menu-numbering-settings",
        route: "/settings/numbering"
      },
      {
        stepNumber: 2,
        instruction: "Select Document Type (Invoice, Quotation, Delivery Challan, Receipt).",
        instructionHindi: "डॉक्यूमेंट का प्रकार चुनें (इनवॉइस, कोटेशन आदि)।",
        targetSelector: "#select-doc-type"
      },
      {
        stepNumber: 3,
        instruction: "Set Prefix (e.g. 'INV-2024-'), Starting Number (e.g. 1001), and Number of Digits (4).",
        instructionHindi: "अपनी पसंद का प्रिफिक्स (जैसे INV-) और शुरुआती नंबर दर्ज करें।",
        targetSelector: "#input-prefix"
      },
      {
        stepNumber: 4,
        instruction: "Click 'Save Sequence'. All new documents will automatically follow this numbering.",
        instructionHindi: "'सेव' पर क्लिक करें। अब हर नया बिल इसी नंबर से बनेगा।",
        targetSelector: "#btn-save-sequence"
      }
    ],
    suggestedActions: [
      { label: "⚙️ Numbering Settings", href: "/settings/numbering" },
      { label: "🏢 Company Profile", href: "/settings" }
    ]
  },
  {
    id: "guide-change-password",
    moduleKey: "settings",
    title: "How to Change User Password & Sign Out of Devices",
    titleHindi: "पासवर्ड कैसे बदलें और सभी डिवाइस से लॉग आउट करें",
    summary: "Update administrator or staff login password, auto-generate credentials, see active logged-in devices, and sign out all sessions.",
    targetRoute: "/settings/roles",
    keywords: [
      "password", "change password", "reset password", "update password", "pass", "new password",
      "पासवर्ड", "पासवर्ड कैसे बदलें", "नया पासवर्ड", "लॉगिन पासवर्ड", "पासवर्ड बदलो", "पासवर्ड चेंज",
      "logout all devices", "active devices", "logged in devices", "sign out devices", "devices",
      "credentials", "user password", "admin password", "forgot password"
    ],
    steps: [
      {
        stepNumber: 1,
        instruction: "Navigate to Settings > Users & Roles Directory (/settings/roles) or click 'Open Password Settings' below.",
        instructionHindi: "सेटिंग्स > यूजर्स और रोल्स डायरेक्टरी (/settings/roles) खोलें या नीचे दिए बटन पर क्लिक करें।",
        targetSelector: "#menu-roles-settings",
        route: "/settings/roles"
      },
      {
        stepNumber: 2,
        instruction: "Find the user account (e.g. Admin User) and click the green key icon 'Change Password'.",
        instructionHindi: "यूजर अकाउंट ढूंढें और हरे रंग के चाबी आइकन 'Change Password' पर क्लिक करें।",
        targetSelector: ".btn-change-password"
      },
      {
        stepNumber: 3,
        instruction: "Enter your new password or click 'Auto-Generate' to generate a secure random password.",
        instructionHindi: "नया पासवर्ड टाइप करें या 'Auto-Generate' दबाकर सुरक्षित पासवर्ड बनाएं।",
        targetSelector: "#input-new-password"
      },
      {
        stepNumber: 4,
        instruction: "Check 'Sign out of all devices after changing password' to immediately invalidate all other active sessions.",
        instructionHindi: "अन्य सभी कंप्यूटर/फोन से तुरंत लॉग आउट करने के लिए 'Sign out of all devices' पर टिक रखें।",
        targetSelector: "#chk-sign-out-all"
      },
      {
        stepNumber: 5,
        instruction: "Click 'Update Password'. Your new password is now active and the old password is permanently revoked.",
        instructionHindi: "'Update Password' पर क्लिक करें। नया पासवर्ड तुरंत लागू हो जाएगा।",
        targetSelector: "#btn-update-password"
      }
    ],
    suggestedActions: [
      { label: "🔑 Open Password Settings", href: "/settings/roles" },
      { label: "⚙️ Company Settings", href: "/settings" }
    ]
  },
  {
    id: "guide-leads-pipeline",
    moduleKey: "leads",
    title: "How to Manage Leads & Sales CRM Pipeline",
    titleHindi: "लीड्स और सेल्स पाइपलाइन कैसे मैनेज करें",
    summary: "Capture inquiries, assign telecallers, log call follow-ups, and convert prospective leads into buyers.",
    targetRoute: "/leads",
    keywords: ["lead", "leads", "pipeline", "telecaller", "prospect", "लीड", "लीड्स", "कस्टमर लीड", "फॉलोअप", "follow up", "crm"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Open CRM > Leads (/leads) and click '+ Add Lead' or speak 'Add lead for [Name] phone [Number]'.",
        instructionHindi: "CRM > लीड्स खोलें और '+ Add Lead' दबाएं या वॉइस में बोलें।",
        route: "/leads"
      },
      {
        stepNumber: 2,
        instruction: "Fill in contact info, interest category, lead source, and assigned sales executive.",
        instructionHindi: "ग्राहक की जानकारी, उत्पाद में रुचि और सेल्समैन का नाम चुनें।",
        route: "/leads"
      },
      {
        stepNumber: 3,
        instruction: "Set next follow-up date and stage (New, Contacted, Qualified, Won).",
        instructionHindi: "अगली बात करने की तारीख और स्टेटस सेट करें।",
        route: "/leads"
      }
    ],
    suggestedActions: [
      { label: "🎯 Open Leads CRM", href: "/leads" },
      { label: "📞 Telecaller Calls", href: "/calls" }
    ]
  },
  {
    id: "guide-expense-management",
    moduleKey: "expenses",
    title: "How to Record Business Expenses & Petty Cash",
    titleHindi: "बिजनेस खर्चे और पेटी कैश कैसे दर्ज करें",
    summary: "Track operational expenses like tea, fuel, rent, stationery, and machine maintenance with receipt uploads.",
    targetRoute: "/expenses",
    keywords: ["expense", "expenses", "petty cash", "खर्चा", "खर्चे", "expense record", "add expense", "खर्च", "daily expenses"],
    steps: [
      {
        stepNumber: 1,
        instruction: "Go to Expenses (/expenses) and click '+ Record Expense' or speak 'Record expense 500 for tea'.",
        instructionHindi: "Expenses में जाएं और '+ Record Expense' दबाएं या वॉइस में बोलें।",
        route: "/expenses"
      },
      {
        stepNumber: 2,
        instruction: "Select Category (Office, Factory, Transport, Refreshments), enter Amount, and Payment Mode.",
        instructionHindi: "खर्च की श्रेणी चुनें, रकम और पेमेंट का माध्यम (Cash/Bank) दर्ज करें।",
        route: "/expenses"
      },
      {
        stepNumber: 3,
        instruction: "Attach bill photo/receipt and click 'Save Expense'.",
        instructionHindi: "बिल की फोटो जोड़ें और सेव करें।",
        route: "/expenses"
      }
    ],
    suggestedActions: [
      { label: "💸 View Expenses", href: "/expenses" },
      { label: "📊 Expense Reports", href: "/reports" }
    ]
  }
];
