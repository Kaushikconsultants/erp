/**
 * Cashfree GSTIN Verification Service (https://sandbox.cashfree.com/verification/gstin)
 * Official Developer Documentation: https://docs.cashfree.com/docs/gstin-verification
 */

export interface CashfreeGstResult {
  success: boolean;
  valid?: boolean;
  referenceId?: number | string;
  gstin?: string;
  legalName?: string;
  tradeName?: string;
  companyName?: string;
  address?: string;
  city?: string;
  state?: string;
  stateCode?: string;
  pincode?: string;
  status?: string; // 'Active', 'Cancelled', 'Suspended'
  taxpayerType?: string; // 'Regular', 'Composition', etc.
  dateOfRegistration?: string;
  pan?: string;
  contactPerson?: string;
  rawResponse?: any;
  error?: string;
}

export interface CashfreeGstConfig {
  clientId?: string;
  clientSecret?: string;
  isSandbox?: boolean;
}

/**
 * Parse a full Indian address string into street, city, state, pincode
 */
export function parseIndianAddress(fullAddress: string, fallbackState: string = "") {
  if (!fullAddress) return { street: "", city: "", state: fallbackState, pincode: "" };

  // 1. Extract 6-digit Pincode
  const pinMatch = fullAddress.match(/\b([1-9][0-9]{5})\b/);
  const pincode = pinMatch ? pinMatch[1] : "";

  // 2. Remove Pincode from text for cleaner parsing
  const cleanAddr = fullAddress.replace(/\b([1-9][0-9]{5})\b/g, '').replace(/,\s*,/g, ',').trim();
  const parts = cleanAddr.split(',').map(s => s.trim()).filter(Boolean);

  let state = fallbackState;
  let city = "";
  let street = cleanAddr;

  if (parts.length >= 3) {
    state = parts[parts.length - 1] || fallbackState;
    city = parts[parts.length - 2] || "";
    street = parts.slice(0, parts.length - 2).join(", ");
  } else if (parts.length === 2) {
    city = parts[0];
    state = parts[1] || fallbackState;
    street = parts[0];
  }

  return {
    street: street || fullAddress,
    city: city || state,
    state: state || fallbackState,
    pincode
  };
}

/**
 * Verify GSTIN using Cashfree Verification API (Sandbox or Production)
 */
export async function verifyCashfreeGstin(
  rawGstin: string,
  config?: CashfreeGstConfig
): Promise<CashfreeGstResult> {
  const gstin = (rawGstin || "").trim().toUpperCase();

  if (!gstin || gstin.length !== 15) {
    return { success: false, error: "Please provide a valid 15-digit GSTIN." };
  }

  const clientId = config?.clientId || process.env.CASHFREE_CLIENT_ID || "";
  const clientSecret = config?.clientSecret || process.env.CASHFREE_CLIENT_SECRET || "";
  const isSandbox = config?.isSandbox ?? (process.env.CASHFREE_ENVIRONMENT !== "production");

  if (!clientId || !clientSecret) {
    return {
      success: false,
      error: "Cashfree Client ID and Client Secret are not configured. Please configure them in Settings > Taxes > Online Filing & Portal Sync or .env."
    };
  }

  const baseUrl = isSandbox
    ? "https://sandbox.cashfree.com/verification/gstin"
    : "https://api.cashfree.com/verification/gstin";

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": clientId,
        "x-client-secret": clientSecret
      },
      body: JSON.stringify({
        GSTIN: gstin
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    const json = await response.json();

    if (!response.ok || json.type === "authentication_error" || json.code) {
      return {
        success: false,
        error: json.message || json.error || `Cashfree API returned error (${response.status})`
      };
    }

    const legalName = json.legal_name_of_business || json.legalName || "";
    const tradeName = json.trade_name || json.tradeName || legalName;
    const companyName = tradeName || legalName || `M/S ${gstin.slice(2, 12)}`;
    const fullAddress = json.principal_place_address || json.principal_place_of_business_fields?.principal_place_address || "";
    const stateCode = gstin.slice(0, 2);
    const pan = gstin.slice(2, 12);

    const parsedAddr = parseIndianAddress(fullAddress);

    return {
      success: true,
      valid: json.valid !== false,
      referenceId: json.reference_id,
      gstin,
      legalName,
      tradeName,
      companyName,
      address: parsedAddr.street || fullAddress,
      city: parsedAddr.city,
      state: parsedAddr.state,
      stateCode,
      pincode: parsedAddr.pincode,
      status: json.gst_in_status || "Active",
      taxpayerType: json.taxpayer_type || "Regular",
      dateOfRegistration: json.date_of_registration || "",
      pan,
      contactPerson: legalName !== tradeName ? legalName : "",
      rawResponse: json
    };
  } catch (err: any) {
    if (err.name === "AbortError") {
      return { success: false, error: "Cashfree verification API request timed out." };
    }
    return { success: false, error: err.message || "Failed to reach Cashfree verification service." };
  }
}
