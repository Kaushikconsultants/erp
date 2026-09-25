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

      // Load html2canvas & jsPDF dynamically if not present
      const loadScript = (src: string): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = src;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error(`Failed to load ${src}`));
          document.body.appendChild(script);
        });
      };

      if (!(window as any).html2canvas) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
      }

      if (!(window as any).jspdf) {
        await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      }

      // Ensure all custom web fonts are fully loaded
      if (document.fonts) {
        await document.fonts.ready;
      }

      const exportWidth = 800; // Standard document width for crisp A4 proportional scaling

      // Create an isolated container for clean rendering
      cloneContainer = document.createElement('div');
      cloneContainer.style.position = 'fixed';
      cloneContainer.style.top = '0';
      cloneContainer.style.left = '0';
      cloneContainer.style.width = `${exportWidth}px`;
      cloneContainer.style.zIndex = '-9999';
      cloneContainer.style.backgroundColor = '#ffffff';
      cloneContainer.style.pointerEvents = 'none';
      cloneContainer.style.overflow = 'visible';
      cloneContainer.style.margin = '0';
      cloneContainer.style.padding = '0';

      const clone = sourceElement.cloneNode(true) as HTMLElement;
      clone.id = `${elementId}-pdf-export`;
      clone.style.width = `${exportWidth}px`;
      clone.style.maxWidth = `${exportWidth}px`;
      clone.style.minWidth = `${exportWidth}px`;
      clone.style.margin = '0';
      clone.style.padding = '24px 28px';
      clone.style.border = '1px solid #cbd5e1';
      clone.style.boxSizing = 'border-box';
      clone.style.backgroundColor = '#ffffff';

      // Ensure no print-hidden or widget elements remain in the PDF export clone
      clone.querySelectorAll('.no-print, .mobile-scroll-hint, .floating-voice-button-container, .floating-voice-capsule, .floating-voice-tooltip, .stylish-heart-container, [data-voice-widget], .voice-widget-root').forEach(el => el.remove());

      // Ensure table scroll containers do not clip horizontally or vertically in PDF export
      clone.querySelectorAll('.quote-table-scroll-container, .quote-doc-scroll-wrap, .invoice-doc-scroll-wrap').forEach(el => {
        const c = el as HTMLElement;
        c.style.overflow = 'visible';
        c.style.overflowX = 'visible';
        c.style.border = 'none';
        c.style.boxShadow = 'none';
        c.style.padding = '0';
        c.style.margin = '0';
        c.style.width = '100%';
        c.style.maxWidth = '100%';
      });

      // Align all document section cards to exact 100% width
      clone.querySelectorAll('.meta-box, .address-box, .items-table, .lower-box, .header-row, .zoho-footer').forEach(el => {
        const box = el as HTMLElement;
        box.style.width = '100%';
        box.style.maxWidth = '100%';
        box.style.boxSizing = 'border-box';
      });

      // Table layout and header styling: bold, prominent top border line & adequate vertical breathing room
      clone.querySelectorAll('.items-table').forEach(tbl => {
        const table = tbl as HTMLElement;
        table.style.borderTop = '2.5px solid #334155';
        table.style.borderCollapse = 'collapse';
      });
      clone.querySelectorAll('.items-table thead th').forEach(th => {
        const cell = th as HTMLElement;
        cell.style.borderTop = '2.5px solid #334155';
        cell.style.paddingTop = '10px';
        cell.style.paddingBottom = '9px';
        cell.style.verticalAlign = 'middle';
        cell.style.lineHeight = '1.35';
        cell.style.boxSizing = 'border-box';
      });

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
        throw new Error("PDF generation libraries could not be loaded.");
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

      const jsPDF = jsPDFClass;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210; // A4 width mm
      const pageHeight = 297; // A4 height mm
      const margin = 8; // 8mm margin
      const printableWidth = pageWidth - (margin * 2); // 194mm
      const printableHeight = pageHeight - (margin * 2); // 281mm

      const maxCanvasPageHeight = (printableHeight * canvas.width) / printableWidth;

      if (canvas.height <= maxCanvasPageHeight) {
        // Fits entirely on a single page
        const imgData = canvas.toDataURL('image/png');
        const imgHeight = (canvas.height * printableWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', margin, margin, printableWidth, imgHeight);
      } else {
        // Multi-page document with clean canvas chunk slicing
        let renderedHeight = 0;
        let pageIndex = 0;
        while (renderedHeight < canvas.height) {
          if (pageIndex > 0) pdf.addPage();
          const chunkHeight = Math.min(maxCanvasPageHeight, canvas.height - renderedHeight);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = chunkHeight;
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(canvas, 0, renderedHeight, canvas.width, chunkHeight, 0, 0, canvas.width, chunkHeight);
            const chunkImgData = pageCanvas.toDataURL('image/png');
            const chunkHeightMm = (chunkHeight * printableWidth) / canvas.width;
            pdf.addImage(chunkImgData, 'PNG', margin, margin, printableWidth, chunkHeightMm);
          }
          renderedHeight += chunkHeight;
          pageIndex++;
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
