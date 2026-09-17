import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/prisma";
import { getTenantOrgId } from "@/lib/tenant";

export interface TenantGeminiConfig {
  apiKey: string;
  isConfigured: boolean;
  model: string;
  source: "tenant" | "environment" | "fallback";
}

export const FALLBACK_DUMMY_KEY = "00000000000000000000000000000000000000000000000000000";

/**
 * Retrieves the organization-scoped Gemini API configuration.
 * Priority:
 * 1. Tenant's own Gemini API key saved in AppIntegration (providerId: "gemini")
 * 2. System-level environment variable (process.env.GEMINI_API_KEY)
 * 3. Fallback placeholder (triggers safe rule-based fallbacks)
 */
export async function getTenantGeminiConfig(specificOrgId?: string | null): Promise<TenantGeminiConfig> {
  let orgId = specificOrgId;
  if (!orgId) {
    try {
      orgId = await getTenantOrgId();
    } catch {
      orgId = null;
    }
  }

  // 1. Tenant-specific Gemini integration
  if (orgId) {
    try {
      const integration = await prisma.appIntegration.findFirst({
        where: {
          organizationId: orgId,
          providerId: "gemini",
          isEnabled: true,
        },
      });

      if (integration?.credentials) {
        let creds: any = {};
        try {
          creds = JSON.parse(integration.credentials);
        } catch {}

        const apiKey = (creds.apiKey || "").trim();
        if (apiKey && apiKey !== "dummy" && !apiKey.startsWith("000000")) {
          return {
            apiKey,
            isConfigured: true,
            model: creds.model || "gemini-2.5-flash",
            source: "tenant",
          };
        }
      }
    } catch (e) {
      console.error("[Gemini] Error fetching tenant Gemini configuration:", e);
    }
  }

  // 2. Global environment variable fallback
  const envKey = (process.env.GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
  if (envKey && envKey !== "dummy" && !envKey.startsWith("000000")) {
    return {
      apiKey: envKey,
      isConfigured: true,
      model: "gemini-2.5-flash",
      source: "environment",
    };
  }

  // 3. Fallback dummy
  return {
    apiKey: FALLBACK_DUMMY_KEY,
    isConfigured: false,
    model: "gemini-2.5-flash",
    source: "fallback",
  };
}

/**
 * Returns an instantiated GoogleGenAI client configured with the current tenant's API key.
 */
export async function getTenantAIClient(specificOrgId?: string | null) {
  const config = await getTenantGeminiConfig(specificOrgId);
  return {
    ai: new GoogleGenAI({ apiKey: config.apiKey }),
    config,
    apiKey: config.apiKey,
    isConfigured: config.isConfigured,
    model: config.model,
    source: config.source,
  };
}
