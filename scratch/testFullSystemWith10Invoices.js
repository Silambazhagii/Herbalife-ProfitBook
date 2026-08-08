import '../polyfill.js';
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { runFIFOEngine } from '../src/utils/calculationEngine.js';

const downloadsDir = '/Users/silambazhagii/Downloads';

// Master products list
const masterProducts = [
  { id: '1', sku: '1278', name: 'Activated Fibre 90 Tablets', volume: 15.75, mrp: 1839 },
  { id: '2', sku: '0028', name: 'Active fiber complex - Unflavored', volume: 22.95, mrp: 2876 },
  { id: '3', sku: '1295', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 913 },
  { id: '4', sku: '1292', name: 'Afresh Energy Drink Mix Elaichi 50 g', volume: 7.8, mrp: 913 },
  { id: '5', sku: '1293', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 913 },
  { id: '6', sku: '2280', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 913 },
  { id: '7', sku: '1294', name: 'Afresh Energy Drink Mix Lemon 50 g', volume: 7.8, mrp: 913 },
  { id: '8', sku: '1296', name: 'Afresh Energy Drink Mix Peach 50 g', volume: 7.8, mrp: 913 },
  { id: '9', sku: '146K', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 913 },
  { id: '10', sku: '0015', name: 'Aloe Plus', volume: 9.4, mrp: 1190 },
  { id: '11', sku: '0544', name: 'Beta Heart Vanilla', volume: 19.55, mrp: 2520 },
  { id: '12', sku: '310K', name: 'Brain Health', volume: 15.1, mrp: 1645 },
  { id: '13', sku: '0123', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2489 },
  { id: '14', sku: '0111', name: 'Cell-U-Loss 90 Tablets', volume: 15.75, mrp: 1916 },
  { id: '15', sku: '1264', name: 'Dinoshake Chocolate 200 g', volume: 9.6, mrp: 1252 },
  { id: '16', sku: '1265', name: 'Dinoshake nutritional children\'s drink mix - Strawberry flavour', volume: 9.6, mrp: 1252 },
  { id: '17', sku: '1269', name: 'Formula 1 Nutritional shake mix Banana Caramel 500 g', volume: 21.75, mrp: 2449 },
  { id: '18', sku: '1263', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2449 },
  { id: '19', sku: '0141', name: 'Formula 1 Nutritional shake mix kulfi 500 g', volume: 21.75, mrp: 2449 },
  { id: '20', sku: '1266', name: 'Formula 1 Nutritional shake mix Mango 500 g', volume: 21.75, mrp: 2449 },
  { id: '21', sku: '1267', name: 'Formula 1 Nutritional shake mix Orange Cream 500 g', volume: 21.75, mrp: 2449 },
  { id: '22', sku: '148K', name: 'Formula 1 Nutritional shake mix PAAN 500 g', volume: 21.75, mrp: 2449 },
  { id: '23', sku: '315K', name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', volume: 21.75, mrp: 2449 },
  { id: '24', sku: '1265', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2449 },
  { id: '25', sku: '1262', name: 'Formula 1 Nutritional shake mix Vanilla 500 g', volume: 21.75, mrp: 2449 },
  { id: '26', sku: '1459', name: 'H24 Rebuild Strength', volume: 24.7, mrp: 2940 },
  { id: '27', sku: '0006', name: 'Herbal Aloe concentrate (original)', volume: 24.95, mrp: 3030 },
  { id: '28', sku: '0102', name: 'Herbal Control', volume: 32.95, mrp: 3858 },
  { id: '29', sku: '0020', name: 'Herbalife Calcium Tablets', volume: 10.25, mrp: 1352 },
  { id: '30', sku: '1458', name: 'Herbalife H24 Hydrate', volume: 14.05, mrp: 1839 },
  { id: '31', sku: '0065', name: 'Herbalifeline® 60 Softgels', volume: 25.75, mrp: 2998 },
  { id: '32', sku: '0085', name: 'HN - Skin Booster - 30 Servings', volume: 38.65, mrp: 4394 },
  { id: '33', sku: '316K', name: 'HN - Skin Booster Canister Orange 300 g', volume: 38.65, mrp: 4394 },
  { id: '34', sku: '309K', name: 'Immune Health', volume: 15.8, mrp: 1717 },
  { id: '35', sku: '0555', name: 'Joint Support', volume: 20.9, mrp: 2759 },
  { id: '36', sku: '175K', name: 'Male Factor +', volume: 34.75, mrp: 3832 },
  { id: '37', sku: '1232', name: 'Multivitamin Mineral and Herbal Tablets Plus 90 Tablets', volume: 19.95, mrp: 2252 },
  { id: '38', sku: '0139', name: 'Niteworks.', volume: 75, mrp: 8010 },
  { id: '39', sku: '311K', name: 'Ocular Defense', volume: 19.25, mrp: 2166 },
  { id: '40', sku: '1233', name: 'Personalized Protein Powder 200 g', volume: 11.5, mrp: 1455 },
  { id: '41', sku: '1234', name: 'Personalized Protein Powder 400 g', volume: 22.5, mrp: 2792 },
  { id: '42', sku: '147K', name: 'ShakeMate', volume: 6.45, mrp: 733 },
  { id: '43', sku: '025K', name: 'Simply Probiotic', volume: 21.95, mrp: 2482 },
  { id: '44', sku: '174K', name: 'Triphala 60 Tablets', volume: 11.25, mrp: 1224 },
  { id: '45', sku: '012K', name: 'vritilife Facial cleanser', volume: 10.4, mrp: 1165 },
  { id: '46', sku: '015K', name: 'VRITILIFE FACIAL COMBO PACK (CLEANSER AND MOISTURIZER)', volume: 23.55, mrp: 2638 },
  { id: '47', sku: '014K', name: 'vritilife Facial Serum', volume: 27.05, mrp: 3022 },
  { id: '48', sku: '013K', name: 'vritilife Facial Toner', volume: 11.8, mrp: 1322 },
  { id: '49', sku: '011K', name: 'vritilife Moisturizer', volume: 13.15, mrp: 1473 },
  { id: '50', sku: '106K', name: 'Woman\'s Choice', volume: 12.45, mrp: 1399 },
];

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

  const allLines = pages.flatMap(p => p.lines);
  const fullText = allLines.map(l => l.text).join('\n');

  const invNoMatch = fullText.match(/Invoice No:\s*([A-Z0-9]+)/i) || fullText.match(/\b(TNI\d{7,})\b/i);
  const invoiceNumber = invNoMatch ? invNoMatch[1] : '';

  const orderNoMatch = fullText.match(/Order No:\s*([A-Z0-9]+)/i) || fullText.match(/\b(3I\d{7,})\b/i);
  const orderNumber = orderNoMatch ? orderNoMatch[1] : '';

  const dateMatch = fullText.match(/Invoice Date:\s*([0-9]{1,2}\s+[A-Z]{3}\s+[0-9]{4})/i);
  const invoiceDateStr = dateMatch ? dateMatch[1] : '';
  const dateObj = new Date(invoiceDateStr);

  const lineItemMap = new Map();
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
          const totalRetail = valueNums[2];
          const discount = valueNums[3];
          const taxableValue = valueNums[4];
          const sgstRate = valueNums[5];
          const sgstAmount = valueNums[6];
          const cgstRate = valueNums[7];
          const cgstAmount = valueNums[8];

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
          const cleanDesc = descPart.replace(/HSN\/?SAC/gi, '').replace(/\b\d{6,8}\b/g, '').trim();
          const finalAmount = Math.round((taxableValue + sgstAmount + cgstAmount) * 100) / 100;
          const ratePaidPerUnit = qty > 0 ? (finalAmount / qty) : 0;
          const discountPercent = totalRetail > 0 ? Math.round((discount / totalRetail) * 100) : 42;

          if (!lineItemMap.has(sl)) {
            lineItemMap.set(sl, {
              id: `inv-${invoiceNumber}-${sl}`,
              type: 'purchase',
              date: dateObj.toISOString(),
              entity: 'HERBALIFE',
              invoiceNumber,
              orderNumber,
              sku,
              hsn,
              product: cleanDesc, // Will be mapped to product master name
              qty,
              unitPrice,
              totalRetail,
              discount,
              taxableValue,
              sgstRate,
              sgstAmount,
              cgstRate,
              cgstAmount,
              rate: ratePaidPerUnit,
              discountPercent,
              finalAmount
            });
          }
        }
      }
    }
  }

  return Array.from(lineItemMap.values());
}

async function run() {
  const allPurchases = [];
  for (let i = 1; i <= 10; i++) {
    const items = await parsePdf(i);
    allPurchases.push(...items);
  }

  console.log(`Generated ${allPurchases.length} purchase transaction objects from 10 PDFs.`);

  // Test FIFO engine with all purchases
  const fifoResult = runFIFOEngine(allPurchases, masterProducts);
  console.log('\n--- FIFO Engine Output ---');
  console.log('Total Inventory Valuation: ₹' + fifoResult.overallMetrics.totalInventoryValuation.toFixed(2));
  console.log('Product Stats Count:', fifoResult.productStats.length);
}

run().catch(console.error);
