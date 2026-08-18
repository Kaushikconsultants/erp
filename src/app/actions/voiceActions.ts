"use server";

export interface VoiceIntentResult {
  route: string;
  searchTerm?: string;
  actionText: string;
  aiExplanation: string;
}

export async function parseVoiceIntent(spokenText: string): Promise<VoiceIntentResult> {
  if (!spokenText || !spokenText.trim()) {
    return {
      route: '/customers',
      actionText: 'Search Customers',
      aiExplanation: 'Defaulting to Customers search.'
    };
  }

  const raw = spokenText.trim();
  const lower = raw.toLowerCase();

  // 1. COMPREHENSIVE FILLER STRIPPING FOR ENTITY EXTRACTION
  let cleanEntityText = lower
    .replace(/\b(create|new|add|make|build|banao|bnao|bana|nayi|naya|generate|issue|log)\b/gi, '')
    .replace(/\b(show\s+me\s+all|take\s+me\s+to|show\s+me|show\s+all|go\s+to|open\s+my|open\s+the|open|display\s+all|display|list\s+all|list|search\s+for|search|find|look\s+up|dikhao|dikhaye|dikhado|batao|bataiye|chalo|lao|dekho|deko|dekhne|karo|dhoondho|dhoondh)\b/gi, '')
    .replace(/\b(saari|saree|sari|saare|sare|sabhi|sab|saara|sara|all)\b/gi, '')
    .replace(/\b(mujhe|mujhko|muje|mujh|me|to\s+me|humko|humein|mera|meri|mere)\b/gi, '')
    .replace(/\b(quotations|quotation|quotes|quote|estimates|estimate|orders|order|sales\s+order|customers|customer|clients|client|parties|party|grahak|products|product|inventory|stock|items|item|mal|invoices|invoice|bills|bill|chalan|leads|lead|calls|call|followup|follow\s+up|expenses|expense|costs|cost|purchases|purchase|vendors|vendor|suppliers|supplier|warehouses|warehouse|godown|tasks|task|todo|to\s+do|attendance|leaves|leave|payroll|salaries|salary|analytics|reports|report|settings|organization|roles|territories|audit\s+logs|profile)\b/gi, '')
    .replace(/\b(ke\s+liye|keliye|for|of|ki|ka|ke|pe|par|p|per|ko|se|page|screen|section|in|with)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  // 2. CREATION & ACTION MODAL TRIGGERS
  const isCreateAction = /\b(create|new|add|make|build|banao|bnao|nayi|naya|generate|log)\b/i.test(lower);

  if (isCreateAction) {
    if (/\b(quote|quotation|estimate)\b/i.test(lower)) {
      if (cleanEntityText) {
        return {
          route: `/quotations/new?customer=${encodeURIComponent(cleanEntityText)}`,
          searchTerm: cleanEntityText,
          actionText: `Create Quote for "${cleanEntityText}"`,
          aiExplanation: `Opening New Quotation form for "${cleanEntityText}"...`
        };
      }
      return {
        route: '/quotations/new',
        actionText: 'Create New Quotation',
        aiExplanation: 'Opening Create New Quotation form...'
      };
    }

    if (/\b(customer|client|party|grahak)\b/i.test(lower)) {
      const paramName = cleanEntityText ? `&name=${encodeURIComponent(cleanEntityText)}` : '';
      return {
        route: `/customers?action=add${paramName}`,
        searchTerm: cleanEntityText,
        actionText: cleanEntityText ? `Add Customer "${cleanEntityText}"` : 'Add New Customer',
        aiExplanation: cleanEntityText ? `Opening Add Customer form for "${cleanEntityText}"...` : 'Opening Add Customer form...'
      };
    }

    if (/\b(product|item|stock|inventory|mal)\b/i.test(lower)) {
      return {
        route: '/products?action=add',
        actionText: 'Add New Product',
        aiExplanation: 'Opening Add Product form...'
      };
    }

    if (/\b(call|followup|follow\s+up)\b/i.test(lower)) {
      return {
        route: '/calls?action=log',
        actionText: 'Log Call',
        aiExplanation: 'Opening Log Call form...'
      };
    }

    if (/\b(order|booking|sales\s+order)\b/i.test(lower)) {
      return {
        route: cleanEntityText ? `/orders?search=${encodeURIComponent(cleanEntityText)}` : '/orders',
        searchTerm: cleanEntityText,
        actionText: cleanEntityText ? `New Order for "${cleanEntityText}"` : 'Create New Order',
        aiExplanation: cleanEntityText ? `Opening Sales Orders for "${cleanEntityText}"...` : 'Opening Sales Orders...'
      };
    }

    if (/\b(lead|prospect)\b/i.test(lower)) {
      return {
        route: '/leads',
        actionText: 'Add Lead',
        aiExplanation: 'Opening Leads pipeline...'
      };
    }
  }

  // 3. ALL CRM SOFTWARE PAGES DIRECT NAVIGATION & SEARCH MATCHING

  // A. Quotations & Estimates
  if (/\b(quotations|quotation|quotes|quote|estimates|estimate)\b/i.test(lower)) {
    if (cleanEntityText) {
      return {
        route: `/quotations?search=${encodeURIComponent(cleanEntityText)}`,
        searchTerm: cleanEntityText,
        actionText: `Search Quotes for "${cleanEntityText}"`,
        aiExplanation: `Searching Quotations for "${cleanEntityText}"...`
      };
    }
    return {
      route: '/quotations',
      actionText: 'View All Quotations',
      aiExplanation: 'Navigating to All Quotations page...'
    };
  }

  // B. Orders & Bookings
  if (/\b(orders|order|sales\s+orders|sales\s+order|bookings|booking)\b/i.test(lower)) {
    if (cleanEntityText) {
      return {
        route: `/orders?search=${encodeURIComponent(cleanEntityText)}`,
        searchTerm: cleanEntityText,
        actionText: `Search Orders for "${cleanEntityText}"`,
        aiExplanation: `Searching Sales Orders for "${cleanEntityText}"...`
      };
    }
    return {
      route: '/orders',
      actionText: 'View All Orders',
      aiExplanation: 'Navigating to All Orders page...'
    };
  }

  // C. Customers & Clients
  if (/\b(customers|customer|clients|client|parties|party|grahak)\b/i.test(lower)) {
    if (cleanEntityText) {
      return {
        route: `/customers?search=${encodeURIComponent(cleanEntityText)}`,
        searchTerm: cleanEntityText,
        actionText: `Search Customers for "${cleanEntityText}"`,
        aiExplanation: `Searching Customers for "${cleanEntityText}"...`
      };
    }
    return {
      route: '/customers',
      actionText: 'View All Customers',
      aiExplanation: 'Navigating to All Customers page...'
    };
  }

  // D. Products & Inventory
  if (/\b(products|product|inventory|stock|items|item|mal|goods|article|articles)\b/i.test(lower)) {
    if (cleanEntityText) {
      return {
        route: `/products?search=${encodeURIComponent(cleanEntityText)}`,
        searchTerm: cleanEntityText,
        actionText: `Search Products for "${cleanEntityText}"`,
        aiExplanation: `Searching Product Master for "${cleanEntityText}"...`
      };
    }
    return {
      route: '/products',
      actionText: 'View Product Master',
      aiExplanation: 'Navigating to Product Master page...'
    };
  }

  // E. Invoices & Billing
  if (/\b(invoices|invoice|bills|bill|chalan)\b/i.test(lower)) {
    return {
      route: cleanEntityText ? `/invoices?search=${encodeURIComponent(cleanEntityText)}` : '/invoices',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Invoices for "${cleanEntityText}"` : 'View All Invoices',
      aiExplanation: cleanEntityText ? `Searching Invoices for "${cleanEntityText}"...` : 'Navigating to Invoices page...'
    };
  }

  // F. Payments & Collections
  if (/\b(payments|payment|collections|collection|received|dues)\b/i.test(lower)) {
    return {
      route: '/payments',
      actionText: 'View Payments',
      aiExplanation: 'Navigating to Payments & Collections page...'
    };
  }

  // G. Leads & Prospects
  if (/\b(leads|lead|prospects|prospect|pipeline)\b/i.test(lower)) {
    return {
      route: cleanEntityText ? `/leads?search=${encodeURIComponent(cleanEntityText)}` : '/leads',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Leads for "${cleanEntityText}"` : 'View All Leads',
      aiExplanation: cleanEntityText ? `Searching Leads for "${cleanEntityText}"...` : 'Navigating to Leads page...'
    };
  }

  // H. Calls & Follow-ups
  if (/\b(calls|call|followup|followups|follow\s+up|telecalling|log)\b/i.test(lower)) {
    return {
      route: '/calls',
      actionText: 'View Calls & Follow-ups',
      aiExplanation: 'Navigating to Calls & Follow-ups page...'
    };
  }

  // I. Follow-ups calendar
  if (/\b(follow-ups|followup\s+calendar|scheduled\s+calls)\b/i.test(lower)) {
    return {
      route: '/follow-ups',
      actionText: 'View Follow-ups Calendar',
      aiExplanation: 'Navigating to Follow-ups Calendar...'
    };
  }

  // J. Dispatches & Courier Tracking
  if (/\b(dispatches|dispatch|tracking|courier|delivery|deliveries|shipment|shipments|awb|ofd|in\s+transit)\b/i.test(lower)) {
    return {
      route: cleanEntityText ? `/dispatches?search=${encodeURIComponent(cleanEntityText)}` : '/dispatches',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Dispatches for "${cleanEntityText}"` : 'View Dispatches',
      aiExplanation: cleanEntityText ? `Searching Dispatches for "${cleanEntityText}"...` : 'Navigating to Dispatches & Courier Tracking...'
    };
  }

  // K. Expenses & Costs
  if (/\b(expenses|expense|costs|cost|petty\s+cash)\b/i.test(lower)) {
    return {
      route: cleanEntityText ? `/expenses?search=${encodeURIComponent(cleanEntityText)}` : '/expenses',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Expenses for "${cleanEntityText}"` : 'View Expenses',
      aiExplanation: cleanEntityText ? `Searching Expenses for "${cleanEntityText}"...` : 'Navigating to Expenses page...'
    };
  }

  // L. Purchases & Vendors
  if (/\b(purchases|purchase|vendors|vendor|suppliers|supplier|po)\b/i.test(lower)) {
    if (lower.includes("vendor") || lower.includes("supplier")) {
      return {
        route: '/vendors',
        actionText: 'View Vendors',
        aiExplanation: 'Navigating to Vendor Master...'
      };
    }
    return {
      route: cleanEntityText ? `/purchases?search=${encodeURIComponent(cleanEntityText)}` : '/purchases',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Purchases for "${cleanEntityText}"` : 'View Purchases',
      aiExplanation: cleanEntityText ? `Searching Purchases for "${cleanEntityText}"...` : 'Navigating to Purchase Orders...'
    };
  }

  // M. Warehouses & Godown
  if (/\b(warehouses|warehouse|godown|branch|branches|stock\s+room)\b/i.test(lower)) {
    return {
      route: '/warehouses',
      actionText: 'View Warehouses & Godowns',
      aiExplanation: 'Navigating to Warehouses & Locations...'
    };
  }

  // N. Tasks & To-Do List
  if (/\b(tasks|task|todo|to\s+do|pending\s+tasks)\b/i.test(lower)) {
    return {
      route: cleanEntityText ? `/tasks?search=${encodeURIComponent(cleanEntityText)}` : '/tasks',
      searchTerm: cleanEntityText,
      actionText: cleanEntityText ? `Search Tasks for "${cleanEntityText}"` : 'View Tasks',
      aiExplanation: cleanEntityText ? `Searching Tasks for "${cleanEntityText}"...` : 'Navigating to Tasks & To-Do list...'
    };
  }

  // O. Attendance, Leaves & Payroll
  if (/\b(attendance|present|absent|check\s+in|punch)\b/i.test(lower)) {
    return {
      route: '/attendance',
      actionText: 'View Attendance',
      aiExplanation: 'Navigating to Employee Attendance page...'
    };
  }

  if (/\b(leave|leaves|chutti|holiday)\b/i.test(lower)) {
    return {
      route: '/leaves',
      actionText: 'View Leaves',
      aiExplanation: 'Navigating to Leave Requests page...'
    };
  }

  if (/\b(payroll|salary|salaries|tankhwah|payslip|incentives|commission)\b/i.test(lower)) {
    return {
      route: '/payroll',
      actionText: 'View Payroll & Salaries',
      aiExplanation: 'Navigating to Payroll page...'
    };
  }

  // P. Analytics, Reports & Dashboard Home
  if (/\b(home|main\s+page|dashboard)\b/i.test(lower) && !lower.includes("analytics")) {
    return {
      route: '/',
      actionText: 'Go to Home Dashboard',
      aiExplanation: 'Navigating to Main Home Dashboard...'
    };
  }

  if (/\b(analytics|report|reports|chart|charts|revenue|sales\s+report|performance)\b/i.test(lower)) {
    if (lower.includes("report")) {
      return {
        route: '/reports',
        actionText: 'View Reports',
        aiExplanation: 'Navigating to Detailed Reports page...'
      };
    }
    return {
      route: '/analytics',
      actionText: 'View Analytics & Performance',
      aiExplanation: 'Navigating to Sales Reports & Analytics page...'
    };
  }

  // Q. Settings, Roles, Territories, Audit Logs
  if (lower.includes("role") || lower.includes("permission")) {
    return {
      route: '/settings/roles',
      actionText: 'View Roles & Permissions',
      aiExplanation: 'Navigating to User Roles & Permissions settings...'
    };
  }

  if (lower.includes("territory") || lower.includes("territories") || lower.includes("pincode")) {
    return {
      route: '/settings/territories',
      actionText: 'View Territory Management',
      aiExplanation: 'Navigating to Sales Territories settings...'
    };
  }

  if (lower.includes("audit") || lower.includes("log") || lower.includes("history")) {
    return {
      route: '/settings/audit-logs',
      actionText: 'View Audit Logs',
      aiExplanation: 'Navigating to System Audit Logs...'
    };
  }

  if (lower.includes("setting") || lower.includes("company settings") || lower.includes("organization")) {
    return {
      route: '/settings/organization',
      actionText: 'View Company Settings',
      aiExplanation: 'Navigating to Organization Settings page...'
    };
  }

  // R. Profile & Account
  if (/\b(profile|my\s+profile|my\s+account|password|account)\b/i.test(lower)) {
    return {
      route: '/profile',
      actionText: 'View My Profile',
      aiExplanation: 'Navigating to User Profile page...'
    };
  }

  // 4. SMART FALLBACK SEARCH ACROSS CUSTOMERS
  const finalSearchKey = cleanEntityText || raw;
  return {
    route: `/customers?search=${encodeURIComponent(finalSearchKey)}`,
    searchTerm: finalSearchKey,
    actionText: `Search Customers for "${finalSearchKey}"`,
    aiExplanation: `AI processing: Searching for "${finalSearchKey}" in Customers...`
  };
}
