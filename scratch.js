import './polyfill.js';
import fs from 'fs';
import { extractPdfPages } from './src/utils/extraction/pdfExtractor.js';
import { analyzeLayout } from './src/utils/extraction/layoutAnalyzer.js';

async function run() {
  const data = fs.readFileSync('/Users/silambazhagii/.gemini/antigravity-ide/brain/6c2fa90e-899a-4299-924e-68e2ad5156dc/media__1782379960421.pdf');
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  
  const result = await extractPdfPages(arrayBuffer);
  const layout = analyzeLayout(result.pages, { tableColumns: { headerKeywords: ['sku', 'qty', 'description', 'discount', 'cgst'] } });
  
  const hIdx = layout.zones.tableHeaderIndex;
  console.log("HEADER:", layout.allLines[hIdx]?.text);
  console.log(layout.allLines[hIdx]?.items.map(i => `${i.str} (${i.x.toFixed(1)})`));
  
  for(let i=hIdx+1; i<hIdx+10; i++) {
    if(!layout.allLines[i]) break;
    console.log(`LINE ${i}:`, layout.allLines[i].items.map(i => `${i.str} (${i.x.toFixed(1)})`));
  }
}
run();
