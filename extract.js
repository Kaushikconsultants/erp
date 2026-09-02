const fs = require('fs');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

const pdfPath = 'C:\\Users\\HP\\Downloads\\API Setup Guide (2).pdf';
const data = new Uint8Array(fs.readFileSync(pdfPath));

pdfjsLib.getDocument({ data: data }).promise.then(async function(pdf) {
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
    }
    fs.writeFileSync('pdf_extracted.txt', fullText);
    console.log('PDF Extracted successfully.');
}).catch(console.error);
