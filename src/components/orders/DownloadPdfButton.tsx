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
    let cloneContainer: HTMLDivElement | null = null;

    try {
      const sourceElement = document.getElementById(elementId);
      if (!sourceElement) {
        alert("Printable document area not found.");
        setDownloading(false);
        return;
      }

      // Dynamically load html2pdf if not available
      if (!(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load html2pdf script"));
          document.body.appendChild(script);
        });
      }

      // Ensure all custom fonts are completely ready before canvas rendering
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Create an isolated container to ensure exact A4 printable width and prevent cropping from sidebar/screen offsets
      cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'fixed';
      cloneContainer.style.top = '0';
      cloneContainer.style.left = '0';
      cloneContainer.style.width = '800px';
      cloneContainer.style.zIndex = '-9999';
      cloneContainer.style.backgroundColor = '#ffffff';
      cloneContainer.style.pointerEvents = 'none';

      const clone = sourceElement.cloneNode(true) as HTMLElement;
      clone.id = `${elementId}-pdf-export`;
      clone.style.maxWidth = '800px';
      clone.style.width = '800px';
      clone.style.minWidth = '800px';
      clone.style.margin = '0';
      clone.style.boxSizing = 'border-box';
      clone.style.boxShadow = 'none';
      clone.style.backgroundColor = '#ffffff';

      cloneContainer.appendChild(clone);
      document.body.appendChild(cloneContainer);

      // Wait for any images inside the clone to be fully loaded
      const images = Array.from(clone.querySelectorAll('img'));
      await Promise.all(
        images.map((img) => {
          if (img.complete) return Promise.resolve();
          return new Promise((res) => {
            img.onload = () => res(null);
            img.onerror = () => res(null);
          });
        })
      );

      const opt = {
        margin: [6, 6, 6, 6],
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0,
          logging: false
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      await (window as any).html2pdf().set(opt).from(clone).save();
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback to print dialog if html2pdf fails
      window.print();
    } finally {
      if (cloneContainer && cloneContainer.parentNode) {
        cloneContainer.parentNode.removeChild(cloneContainer);
      }
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
        cursor: downloading ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.3)',
        opacity: downloading ? 0.7 : 1
      }}
      className="no-print hover:bg-green-700 transition-colors"
    >
      <Download size={16} /> {downloading ? "Generating PDF..." : "Download PDF"}
    </button>
  );
}
