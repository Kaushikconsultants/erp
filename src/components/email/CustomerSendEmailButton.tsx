"use client";

import React, { useState } from 'react';
import { Mail } from 'lucide-react';
import SendEmailModal from './SendEmailModal';

interface CustomerSendEmailButtonProps {
  customerId?: string;
  leadId?: string;
  recipientEmail?: string | null;
  contactPerson?: string;
  companyName?: string;
  outstandingBalance?: number | string;
}

export default function CustomerSendEmailButton({
  customerId,
  leadId,
  recipientEmail,
  contactPerson,
  companyName,
  outstandingBalance
}: CustomerSendEmailButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 14px',
          borderRadius: '8px',
          backgroundColor: '#e0f2fe',
          color: '#0284c7',
          border: '1px solid #bae6fd',
          fontWeight: 700,
          fontSize: '0.84rem',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        title="Send email or quotation to client"
      >
        <Mail size={15} />
        <span>Send Email</span>
      </button>

      {isOpen && (
        <SendEmailModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          customerId={customerId}
          leadId={leadId}
          defaultRecipientEmail={recipientEmail || ''}
          contactPerson={contactPerson || 'Customer'}
          companyName={companyName || 'Valued Business'}
          outstandingBalance={outstandingBalance || '0'}
          onEmailSent={() => {
            window.location.reload();
          }}
        />
      )}
    </>
  );
}
