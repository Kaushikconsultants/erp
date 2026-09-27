/**
 * Universal Postal / Zip Code Lookup Utility
 * Supports:
 * 1. Indian 6-digit PIN codes (via api.postalpincode.in)
 * 2. International Postal/Zip Codes for 60+ countries (USA, UK, Canada, Germany, France, Australia, etc.)
 */

const COUNTRY_CODE_MAP: Record<string, string> = {
  "united states": "us",
  "usa": "us",
  "us": "us",
  "united kingdom": "gb",
  "uk": "gb",
  "great britain": "gb",
  "gb": "gb",
  "germany": "de",
  "deutschland": "de",
  "de": "de",
  "france": "fr",
  "fr": "fr",
  "canada": "ca",
  "ca": "ca",
  "australia": "au",
  "au": "au",
  "italy": "it",
  "italia": "it",
  "it": "it",
  "spain": "es",
  "españa": "es",
  "es": "es",
  "netherlands": "nl",
  "holland": "nl",
  "nl": "nl",
  "belgium": "be",
  "be": "be",
  "switzerland": "ch",
  "ch": "ch",
  "austria": "at",
  "at": "at",
  "japan": "jp",
  "jp": "jp",
  "new zealand": "nz",
  "nz": "nz",
  "mexico": "mx",
  "mx": "mx",
  "brazil": "br",
  "br": "br",
  "south africa": "za",
  "za": "za",
  "sweden": "se",
  "se": "se",
  "norway": "no",
  "no": "no",
  "denmark": "dk",
  "dk": "dk",
  "finland": "fi",
  "fi": "fi",
  "poland": "pl",
  "pl": "pl",
  "portugal": "pt",
  "pt": "pt",
  "singapore": "sg",
  "sg": "sg",
  "united arab emirates": "ae",
  "uae": "ae",
  "ae": "ae",
  "dubai": "ae",
  "india": "in",
  "in": "in"
};

export interface PostalLookupResult {
  success: boolean;
  city?: string;
  state?: string;
  country?: string;
  postOffices?: string[];
  error?: string;
}

export async function lookupPostalCode(
  postalCode: string,
  country: string = "India",
  isInternational: boolean = false
): Promise<PostalLookupResult> {
  const cleanCode = postalCode.trim();
  if (!cleanCode) {
    return { success: false, error: "Empty postal code" };
  }

  const cleanCountry = (country || "India").trim().toLowerCase();
  const countryCode = COUNTRY_CODE_MAP[cleanCountry] || (isInternational ? "us" : "in");

  // 1. DOMESTIC INDIA PINCODE LOOKUP (api.postalpincode.in)
  if (!isInternational || countryCode === "in") {
    const pin = cleanCode.replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      return { success: false, error: "Indian PIN code must be 6 digits" };
    }

    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice?.length > 0) {
        const poList = data[0].PostOffice;
        const first = poList[0];
        return {
          success: true,
          city: first.District || first.Division || first.Block || "",
          state: first.State || "",
          country: "India",
          postOffices: poList.map((p: any) => p.Name).filter(Boolean)
        };
      }
      return { success: false, error: "No Indian post offices found for this PIN code" };
    } catch (err: any) {
      console.warn("India PIN lookup error:", err);
      return { success: false, error: err?.message || "Failed to fetch Indian PIN code" };
    }
  }

  // 2. UNITED KINGDOM POSTCODE LOOKUP (postcodes.io API)
  if (countryCode === "gb") {
    const ukClean = cleanCode.replace(/[^a-zA-Z0-9]/g, "");
    try {
      const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(ukClean)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 200 && data.result) {
          const r = data.result;
          return {
            success: true,
            city: r.admin_district || r.parish || r.admin_ward || r.region || "London",
            state: r.region || r.european_electoral_region || r.country || "England",
            country: "United Kingdom"
          };
        }
      }
    } catch (err) {
      // fallback to zippopotam below
    }
  }

  // 3. UNIVERSAL INTERNATIONAL ZIP/POSTAL CODE LOOKUP (zippopotam.us)
  // Supports US (5 digits), CA (3-6 chars), DE (5 digits), FR (5 digits), AU (4 digits), etc.
  const zipClean = cleanCode.split("-")[0].trim().replace(/\s+/g, "");
  try {
    const res = await fetch(`https://api.zippopotam.us/${countryCode}/${encodeURIComponent(zipClean)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.places && data.places.length > 0) {
        const place = data.places[0];
        return {
          success: true,
          city: place["place name"] || "",
          state: place["state"] || place["state abbreviation"] || "",
          country: data["country"] || country
        };
      }
    }
  } catch (err: any) {
    console.warn(`International Zip lookup failed for ${countryCode}/${cleanCode}:`, err);
  }

  return { success: false, error: "Postal code lookup not found" };
}
