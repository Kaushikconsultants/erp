export interface OpenDialerOptions {
  phone?: string;
  name?: string;
  customerId?: string;
  leadId?: string;
  contact?: any;
  tab?: "DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS";
}

/**
 * Universally opens the CRM's inbuilt PhoneDialerModal or triggers native tel: link on mobile.
 */
export function openPhoneDialer(options?: OpenDialerOptions) {
  if (typeof window !== "undefined") {
    // On mobile devices (<= 768px), directly trigger native mobile phone call
    if (window.innerWidth <= 768 && options?.phone) {
      const cleanPhone = options.phone.replace(/[^\d+]/g, "");
      if (cleanPhone) {
        window.location.href = `tel:${cleanPhone}`;
        return;
      }
    }

    if (typeof (window as any).openPhoneDialer === "function") {
      (window as any).openPhoneDialer(options);
    } else {
      window.dispatchEvent(new CustomEvent("open-phone-dialer", { detail: options || {} }));
    }
  }
}
