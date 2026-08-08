import '../polyfill.js';
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const downloadsDir = '/Users/silambazhagii/Downloads';

async function parsePdf(fileNum) {
  const p = path.join(downloadsDir, `her${fileNum}.pdf`);
  const data = fs.readFileSync(p);
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/' }).promise;

  let pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5],
      w: item.width || 0,
      h: item.height || Math.abs(item.transform[3]) || 12
    }));

    const linesMap = {};
    items.forEach(item => {
      let foundY = Object.keys(linesMap).find(y => Math.abs(parseFloat(y) - item.y) <= 3);
      if (foundY === undefined) {
        foundY = item.y.toString();
        linesMap[foundY] = [];
      }
      linesMap[foundY].push(item);
    });

    const sortedY = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));
    const lines = sortedY.map(y => {
      const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
      return { y: parseFloat(y), text: lineItems.map(it => it.str).join(' ').trim(), items: lineItems };
    }).filter(l => l.text);

    pages.push({ pageNumber: i, lines });
  }

  const lineItemMap = new Map();
  // Also check Annexure pages for full product description if truncated on page 1
  const annexureLines = pages.filter(p => p.lines.some(l => l.text.includes('Annexure'))).flatMap(p => p.lines);

  for (const page of pages) {
    if (page.lines.some(l => l.text.includes('Annexure'))) continue;

    for (let i = 0; i < page.lines.length; i++) {
      const line = page.lines[i];
      const trimmed = line.text.trim();
      const slMatch = trimmed.match(/^(\d+)\s+([A-Z0-9]{3,8})\s+(.+)/);
      if (slMatch && !trimmed.includes('Delivery Charges') && !trimmed.includes('Total') && !trimmed.includes('SL.')) {
        const sl = parseInt(slMatch[1]);
        const sku = slMatch[2];
        const rest = slMatch[3];
        const numMatches = [...rest.matchAll(/([\d]+(?:\.[\d]+)?)/g)].map(m => parseFloat(m[1]));
        if (numMatches.length >= 9) {
          const valueNums = numMatches.slice(-9);
          const qty = valueNums[0];
          const unitPrice = valueNums[1];
          let firstNumStr = valueNums[0].toString();
          let descPart = rest;
          const idxFirstNum = descPart.indexOf(firstNumStr);
          if (idxFirstNum !== -1) descPart = descPart.substring(0, idxFirstNum);

          let hsn = '';
          if (i + 1 < page.lines.length) {
            const nextLine = page.lines[i + 1].text.trim();
            const hsnM = nextLine.match(/HSN\/SAC\s+(\d+)/i) || nextLine.match(/^(\d{6,8})$/);
            if (hsnM) hsn = hsnM[1];
          }
          let cleanDesc = descPart.replace(/HSN\/?SAC/gi, '').replace(/\b\d{6,8}\b/g, '').trim();

          // Check annexure for full description
          const annexLine = annexureLines.find(al => al.text.includes(sku));
          let annexDesc = '';
          if (annexLine) {
            const am = annexLine.text.match(new RegExp(`${sku}\\s+(.+?)(?:HSN/SAC|U\\w+|$)`, 'i'));
            if (am) annexDesc = am[1].trim();
          }

          if (!lineItemMap.has(sl)) {
            lineItemMap.set(sl, { sl, sku, description: cleanDesc, annexDesc, hsn, qty, unitPrice });
          }
        }
      }
    }
  }

  return Array.from(lineItemMap.values());
}

async function run() {
  const allExtractedItems = [];
  for (let i = 1; i <= 10; i++) {
    const items = await parsePdf(i);
    allExtractedItems.push(...items.map(it => ({ ...it, pdfFile: `her${i}.pdf` })));
  }

  const skuMap = new Map();
  allExtractedItems.forEach(item => {
    if (!skuMap.has(item.sku)) {
      skuMap.set(item.sku, []);
    }
    skuMap.get(item.sku).push(item);
  });

  console.log('Detailed 34 Unique SKUs from Uploaded Herbalife Invoices:\n');
  let idx = 1;
  skuMap.forEach((items, sku) => {
    const first = items[0];
    const bestDesc = (first.annexDesc && first.annexDesc.length > first.description.length) ? first.annexDesc : first.description;
    console.log(`${String(idx++).padStart(2)}. SKU: ${sku.padEnd(6)} | Retail Price: ₹${first.unitPrice.toFixed(2).padStart(7)} | Desc: "${bestDesc}" (Found in ${items.length} line(s) across ${items.map(it => it.pdfFile).join(', ')})`);
  });
}

run().catch(console.error);
