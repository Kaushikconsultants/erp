"use server";

import { prisma } from "@/lib/prisma";
import { GoogleGenAI } from "@google/genai";
import { revalidatePath } from "next/cache";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "dummy" });

export async function calculateLeadScore(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        calls: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    if (!customer) return { success: false, error: "Customer not found" };

    if (!process.env.GEMINI_API_KEY) {
       // Fallback logic if no API key
       const score = customer.totalOrders > 0 ? 80 : 40;
       const temp = score >= 70 ? "HOT" : score >= 40 ? "WARM" : "COLD";
       await prisma.customer.update({
         where: { id: customerId },
         data: { leadScore: score, temperature: temp }
       });
       revalidatePath(`/customers/${customerId}`);
       return { success: true, score, temperature: temp, message: "Rule-based score applied (No Gemini API Key)" };
    }

    const customerContext = `
      Business: ${customer.businessName}
      Type: ${customer.customerType || "N/A"}
      Status: ${customer.status}
      Total Orders: ${customer.totalOrders}
      Total Value: ₹${customer.totalPurchaseValue}
      Recent Calls:
      ${customer.calls.map(c => `- [${c.callType}] ${c.outcome}: ${c.notes}`).join("\n")}
    `;

    const prompt = `
      You are an expert CRM AI. Analyze the following customer profile and calculate a lead score out of 100.
      Score based on engagement, order history, and recent call outcomes.
      Return ONLY a JSON object with two fields:
      - score: integer from 0 to 100
      - temperature: exactly "HOT", "WARM", or "COLD"
      
      Customer Profile:
      ${customerContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        leadScore: parsed.score,
        temperature: parsed.temperature,
      }
    });

    revalidatePath(`/customers/${customerId}`);
    return { success: true, score: parsed.score, temperature: parsed.temperature };
  } catch (error) {
    console.error("Failed to calculate lead score:", error);
    return { success: false, error: "Failed to calculate lead score" };
  }
}

export async function generateSmartFollowUp(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        calls: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!customer) return { success: false, error: "Customer not found" };

    if (!process.env.GEMINI_API_KEY) {
      return { 
        success: true, 
        email: "Subject: Checking in\n\nHi there,\n\nJust wanted to follow up. Please let me know if you need anything.\n\nBest,\nSales Team",
        script: "Hi, this is calling from Espon Clothing. Am I speaking with the decision maker?"
      };
    }

    const customerContext = `
      Name: ${customer.contactPerson} (${customer.businessName})
      Category: ${customer.businessCategory || "Retail"}
      Recent Call Notes:
      ${customer.calls.map(c => `- Date: ${c.createdAt.toDateString()} | Outcome: ${c.outcome} | Notes: ${c.notes}`).join("\n")}
    `;

    const prompt = `
      You are an expert B2B Sales Assistant for a wholesale clothing brand.
      Based on the recent interactions below, generate two things:
      1. A short, professional follow-up email draft.
      2. A brief, punchy telecalling script for the sales rep to use on the next phone call.
      
      Return ONLY a JSON object with two fields:
      - email: string (the email draft)
      - script: string (the calling script)
      
      Context:
      ${customerContext}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);

    return { success: true, email: parsed.email, script: parsed.script };
  } catch (error) {
    console.error("Failed to generate follow-up:", error);
    return { success: false, error: "Failed to generate follow-up" };
  }
}
