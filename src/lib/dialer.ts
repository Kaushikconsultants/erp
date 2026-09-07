export interface OpenDialerOptions {
  phone?: string;
  name?: string;
  customerId?: string;
  leadId?: string;
  contact?: any;
  tab?: "DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS";
}

/**
 * Universally opens the CRM's inbuilt PhoneDialerModal with contact details pre-filled.
 */
export function openPhoneDialer(options?: OpenDialerOptions) {
  if (typeof window !== "undefined") {
    if (typeof (window as any).openPhoneDialer === "function") {
      (window as any).openPhoneDialer(options);
    } else {
      window.dispatchEvent(new CustomEvent("open-phone-dialer", { detail: options || {} }));
    }
  }
}
