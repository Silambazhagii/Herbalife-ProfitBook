import fs from 'fs';

// polyfill
globalThis.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } };
Promise.try = Promise.try || function(fn, ...args) {
  return new Promise((resolve) => resolve(fn(...args)));
};
Promise.withResolvers = Promise.withResolvers || function() {
  let resolve, reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
};

import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

async function run() {
  const data = fs.readFileSync('/Users/silambazhagii/.gemini/antigravity-ide/brain/6c2fa90e-899a-4299-924e-68e2ad5156dc/media__1782379960421.pdf');
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/' }).promise;
  
  let allItems = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    allItems.push(...content.items);
  }
  
  // Sort and group by Y to simulate layoutAnalyzer
  allItems.sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5];
    if (Math.abs(yDiff) > 5) return yDiff;
    return a.transform[4] - b.transform[4];
  });
  
  let currentY = null;
  let lines = [];
  let currentLine = [];
  
  for (const item of allItems) {
    if (currentY === null || Math.abs(item.transform[5] - currentY) > 5) {
      if (currentLine.length > 0) {
        lines.push(currentLine.map(i => i.str).join(' '));
      }
      currentLine = [item];
      currentY = item.transform[5];
    } else {
      currentLine.push(item);
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine.map(i => i.str).join(' '));
  }
  
  const dLines = lines.filter(l => /delivery|taxable/i.test(l));
  console.log("Lines of interest:", dLines);
}
run();
