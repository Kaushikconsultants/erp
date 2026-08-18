"use client";

import React, { useState } from 'react';
import { Download } from 'lucide-react';

interface DownloadPdfButtonProps {
  elementId?: string;
  filename?: string;
}

export default function DownloadPdfButton({
  elementId = "printable-quote",
  filename = "document.pdf"
}: DownloadPdfButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const element = document.getElementById(elementId);
      if (!element) {
        alert("Printable document area not found.");
        setDownloading(false);
        return;
      }

      // Dynamically load html2pdf if not available
      if (!(window as any).html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }

      const opt = {
        margin: [5, 5, 5, 5],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await (window as any).html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback to print dialog if html2pdf fails
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownloadPdf}
      disabled={downloading}
      style={{
        padding: '8px 16px',
        backgroundColor: '#16a34a',
        color: 'white',
        borderRadius: '6px',
        border: 'none',
        fontWeight: 600,
        fontSize: '13px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)'
      }}
      className="no-print hover:bg-green-700 transition-colors"
    >
      <Download size={16} /> {downloading ? "Generating PDF..." : "Download PDF"}
    </button>
  );
}
