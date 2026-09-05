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

      // Load html2pdf bundle (which bundles html2canvas & jsPDF) if not present
      if (!(window as any).html2canvas || !(window as any).html2pdf) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load PDF library"));
          document.body.appendChild(script);
        });
      }

      // Ensure all custom web fonts are fully loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      // Create an isolated container for clean rendering
      cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'fixed';
      cloneContainer.style.top = '0';
      cloneContainer.style.left = '0';
      cloneContainer.style.width = '760px';
      cloneContainer.style.zIndex = '-9999';
      cloneContainer.style.backgroundColor = '#ffffff';
      cloneContainer.style.pointerEvents = 'none';

      const clone = sourceElement.cloneNode(true) as HTMLElement;
      clone.id = `${elementId}-pdf-export`;
      clone.style.width = '760px';
      clone.style.maxWidth = '760px';
      clone.style.minWidth = '760px';
      clone.style.margin = '0';
      clone.style.padding = '24px 28px';
      clone.style.border = '1px solid #9ca3af';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';

      cloneContainer.appendChild(clone);
      document.body.appendChild(cloneContainer);

      // Ensure all images (logo, signature, QR) inside the clone are loaded
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

      // Brief tick for font & layout settlement
      await new Promise((r) => setTimeout(r, 120));

      const html2canvas = (window as any).html2canvas;
      const jsPDFClass = (window as any).jspdf?.jsPDF || (window as any).jsPDF;

      if (!html2canvas || !jsPDFClass) {
        // Fallback to standard html2pdf invocation
        const opt = {
          margin: [8, 8, 8, 8],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await (window as any).html2pdf().set(opt).from(clone).save();
        return;
      }

      // Render high-res crisp canvas
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);

      const pdf = new jsPDFClass({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const margin = 8; // 8mm margin
      const printableWidth = pageWidth - (margin * 2); // 194mm
      const printableHeight = pageHeight - (margin * 2); // 281mm

      // Scale proportionally so the full document width fits exactly within printable area
      const imgWidth = printableWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (imgHeight <= printableHeight) {
        // Fits entirely on a single page
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      } else {
        // Multi-page document support
        let heightLeft = imgHeight;
        let position = margin;

        pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
        heightLeft -= printableHeight;

        while (heightLeft > 0) {
          position -= printableHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'JPEG', margin, position, imgWidth, imgHeight);
          heightLeft -= printableHeight;
        }
      }

      pdf.save(filename);
    } catch (err) {
      console.error("PDF generation error:", err);
      // Fallback to print dialog if canvas generation fails
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
