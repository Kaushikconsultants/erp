"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import PhoneDialerModal from '@/components/ui/PhoneDialerModal';
import { OpenDialerOptions } from '@/lib/dialer';

interface DialerContextType {
  openDialer: (options?: OpenDialerOptions) => void;
  closeDialer: () => void;
  isOpen: boolean;
}

const DialerContext = createContext<DialerContextType>({
  openDialer: () => {},
  closeDialer: () => {},
  isOpen: false,
});

export const useAppDialer = () => useContext(DialerContext);

export default function GlobalDialerProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [dialerPhone, setDialerPhone] = useState<string>("");
  const [dialerName, setDialerName] = useState<string>("");
  const [dialerCustomerId, setDialerCustomerId] = useState<string | undefined>(undefined);
  const [dialerLeadId, setDialerLeadId] = useState<string | undefined>(undefined);
  const [dialerTab, setDialerTab] = useState<"DIALPAD" | "CALL_LOGS" | "CONTACTS" | "POST_CALL" | "WHATSAPP" | "SCRIPTS">("DIALPAD");

  const openDialer = useCallback((options?: OpenDialerOptions) => {
    setDialerPhone(options?.phone || "");
    setDialerName(options?.name || "");
    setDialerCustomerId(options?.customerId || undefined);
    setDialerLeadId(options?.leadId || undefined);
    if (options?.tab) setDialerTab(options.tab);
    else setDialerTab("DIALPAD");
    setIsOpen(true);
  }, []);

  const closeDialer = useCallback(() => {
    setIsOpen(false);
    setDialerPhone("");
    setDialerName("");
    setDialerCustomerId(undefined);
    setDialerLeadId(undefined);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("dialer-closed"));
    }
  }, []);

  // 1. Listen for global custom event 'open-phone-dialer' and register window.openPhoneDialer
  useEffect(() => {
    const handleOpenEvent = (e: any) => {
      const detail = e.detail || {};
      openDialer(detail);
    };

    window.addEventListener('open-phone-dialer', handleOpenEvent as EventListener);
    (window as any).openPhoneDialer = openDialer;

    return () => {
      window.removeEventListener('open-phone-dialer', handleOpenEvent as EventListener);
      delete (window as any).openPhoneDialer;
    };
  }, [openDialer]);

  // 2. Global click interceptor: intercept any <a href="tel:..."> in the app and open inbuilt dialer
  useEffect(() => {
    const handleInterceptTelLinks = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest('a[href^="tel:"]');
      if (target) {
        const href = target.getAttribute('href') || '';
        const rawPhone = href.replace(/^tel:/i, '').trim();
        if (rawPhone) {
          e.preventDefault();
          e.stopPropagation();

          const nameAttr = target.getAttribute('data-name') || target.getAttribute('title') || '';
          const custId = target.getAttribute('data-customer-id') || undefined;
          const leadId = target.getAttribute('data-lead-id') || undefined;

          openDialer({
            phone: rawPhone,
            name: nameAttr,
            customerId: custId,
            leadId: leadId
          });
        }
      }
    };

    document.addEventListener('click', handleInterceptTelLinks, true);
    return () => {
      document.removeEventListener('click', handleInterceptTelLinks, true);
    };
  }, [openDialer]);

  return (
    <DialerContext.Provider value={{ openDialer, closeDialer, isOpen }}>
      {children}
      {isOpen && (
        <PhoneDialerModal
          isOpen={isOpen}
          onClose={closeDialer}
          initialPhone={dialerPhone}
          initialName={dialerName}
          initialCustomerId={dialerCustomerId}
          initialLeadId={dialerLeadId}
          initialTab={dialerTab}
        />
      )}
    </DialerContext.Provider>
  );
}
