"use server";

import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

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

  // If there's no GEMINI API Key, fallback to a simple basic regex
  if (!process.env.GEMINI_API_KEY) {
    const isCreateAction = /\b(create|new|add)\b/i.test(raw);
    if (isCreateAction && /\b(quote|quotation)\b/i.test(raw)) {
      return { route: '/quotations/new', actionText: 'Create New Quotation', aiExplanation: 'Opening Create Quotation...' };
    }
    return {
      route: `/customers?search=${encodeURIComponent(raw)}`,
      searchTerm: raw,
      actionText: `Search Customers for "${raw}"`,
      aiExplanation: `Searching Customers...`
    };
  }

  try {
    const prompt = `
      You are a smart AI routing assistant for an ERP & CRM system.
      The user has spoken a voice command: "${raw}"

      Your job is to understand the user's intent and return a JSON object with the routing instructions.
      The CRM has the following main routes:
      - / (Home Dashboard)
      - /customers (View Customers), /customers?search=[name] (Search), /customers?action=add (Add)
      - /leads (View Leads), /leads?search=[name] (Search)
      - /orders (View Orders), /orders?search=[name] (Search), /orders?add_product=[name]&action=add (Add Product to Order)
      - /quotations (View Quotes), /quotations/new (Create Quote), /quotations/new?customer=[name] (Create Quote for Customer), /quotations/new?add_product=[name] (Add product to quote)
      - /invoices (View Invoices)
      - /products (View Products), /products?search=[name] (Search), /products?action=add (Add Product)
      - /calls (Log calls), /calls?action=log
      - /follow-ups (Follow-ups Calendar)
      - /dispatches (Courier tracking)
      - /tasks (To-Do List)
      - /analytics (Reports)
      - /attendance (Employee Attendance)
      - /payroll (Salary)
      - /settings/organization (Settings)
      - /settings/roles (Roles)

      Figure out the best route based on their command. Handle hindi/hinglish filler words gracefully (like 'dikhao', 'batao', 'naya', 'banao').
      Extract any relevant search terms or entity names.

      Return ONLY a JSON object with exactly these 4 fields:
      - "route": The URL path to navigate to (e.g. "/customers?search=Acme")
      - "searchTerm": The extracted search query (if any), otherwise empty string ""
      - "actionText": A short UI label for what we are doing (e.g. "Search Customers for Acme")
      - "aiExplanation": A short user-friendly explanation (e.g. "Searching for Acme in your customers...")
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    return {
      route: parsed.route || '/customers',
      searchTerm: parsed.searchTerm || undefined,
      actionText: parsed.actionText || 'Process Voice Command',
      aiExplanation: parsed.aiExplanation || 'Routing via AI...'
    };
  } catch (err) {
    console.error("AI Routing failed, falling back", err);
    return {
      route: `/customers?search=${encodeURIComponent(raw)}`,
      searchTerm: raw,
      actionText: `Search Customers for "${raw}"`,
      aiExplanation: `Searching Customers for "${raw}"...`
    };
  }
}

