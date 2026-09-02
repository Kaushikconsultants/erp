const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('C:\\Users\\HP\\Downloads\\API Setup Guide (2).pdf');

pdf.PDFParse(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_text.txt', data.text);
    console.log('PDF parsed.');
}).catch(console.error);
