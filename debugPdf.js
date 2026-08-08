globalThis.DOMMatrix = class DOMMatrix { constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; } };
globalThis.URL = class URL { constructor(url) { this.href = url; } toString() { return this.href; } };

import fs from 'fs';
import { extractPdfPages } from './src/utils/extraction/pdfExtractor.js';
import { analyzeLayout } from './src/utils/extraction/layoutAnalyzer.js';

async function run() {
  const data = fs.readFileSync('/Users/silambazhagii/.gemini/antigravity-ide/brain/6c2fa90e-899a-4299-924e-68e2ad5156dc/media__1782379960421.pdf');
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  
  console.log('Extracting PDF pages...');
  const result = await extractPdfPages(arrayBuffer);
  
  console.log('Analyzing layout...');
  const layout = analyzeLayout(result.pages, { tableColumns: { headerKeywords: ['sku', 'qty', 'description', 'discount', 'cgst'] } });
  
  console.log('Header line:', layout.allLines[layout.zones.tableHeaderIndex]?.text);
  if (layout.zones.tableHeaderIndex >= 0) {
    console.log('Header items:', layout.allLines[layout.zones.tableHeaderIndex].items.map(i => ({ str: i.str, x: i.x, width: i.width })));
  }

  for (const idx of layout.zones.valueLineIndices) {
    console.log(`Value Line ${idx}:`, layout.allLines[idx].text);
    console.log(`Value Line ${idx} items:`, layout.allLines[idx].items.map(i => ({ str: i.str, x: i.x })));
  }
}

run().catch(console.error);
