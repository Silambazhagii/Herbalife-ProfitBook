import '../polyfill.js';
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const downloadsDir = '/Users/silambazhagii/Downloads';

// Master products list with full SKU mapping
const masterProducts = [
  { id: '1', sku: '1278', name: 'Activated Fibre 90 Tablets', volume: 15.75, mrp: 1839, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '2', sku: '0028', name: 'Active fiber complex - Unflavored', volume: 22.95, mrp: 2876, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '3', sku: '1295', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '4', sku: '1292', name: 'Afresh Energy Drink Mix Elaichi 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '5', sku: '1293', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '6', sku: '2280', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '7', sku: '1294', name: 'Afresh Energy Drink Mix Lemon 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '8', sku: '1296', name: 'Afresh Energy Drink Mix Peach 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '9', sku: '146K', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '10', sku: '0015', name: 'Aloe Plus', volume: 9.4, mrp: 1190, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '11', sku: '0544', name: 'Beta Heart Vanilla', volume: 19.55, mrp: 2520, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '12', sku: '310K', name: 'Brain Health', volume: 15.1, mrp: 1645, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '13', sku: '0123', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2489, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '14', sku: '0111', name: 'Cell-U-Loss 90 Tablets', volume: 15.75, mrp: 1916, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '15', sku: '1264', name: 'Dinoshake Chocolate 200 g', volume: 9.6, mrp: 1252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '16', sku: '1265', name: 'Dinoshake nutritional children\'s drink mix - Strawberry flavour', volume: 9.6, mrp: 1252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '17', sku: '1269', name: 'Formula 1 Nutritional shake mix Banana Caramel 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '18', sku: '1263', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '19', sku: '0141', name: 'Formula 1 Nutritional shake mix kulfi 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '20', sku: '1266', name: 'Formula 1 Nutritional shake mix Mango 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '21', sku: '1267', name: 'Formula 1 Nutritional shake mix Orange Cream 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '22', sku: '148K', name: 'Formula 1 Nutritional shake mix PAAN 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '23', sku: '315K', name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '24', sku: '1268', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '25', sku: '1262', name: 'Formula 1 Nutritional shake mix Vanilla 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '26', sku: '1459', name: 'H24 Rebuild Strength', volume: 24.7, mrp: 2940, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '27', sku: '0006', name: 'Herbal Aloe concentrate (original)', volume: 24.95, mrp: 3030, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '28', sku: '0102', name: 'Herbal Control', volume: 32.95, mrp: 3858, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '29', sku: '0020', name: 'Herbalife Calcium Tablets', volume: 10.25, mrp: 1352, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '30', sku: '1458', name: 'Herbalife H24 Hydrate', volume: 14.05, mrp: 1839, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '31', sku: '0065', name: 'Herbalifeline® 60 Softgels', volume: 25.75, mrp: 2998, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '32', sku: '0085', name: 'HN - Skin Booster - 30 Servings', volume: 38.65, mrp: 4394, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '33', sku: '316K', name: 'HN - Skin Booster Canister Orange 300 g', volume: 38.65, mrp: 4394, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '34', sku: '309K', name: 'Immune Health', volume: 15.8, mrp: 1717, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '35', sku: '0555', name: 'Joint Support', volume: 20.9, mrp: 2759, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '36', sku: '175K', name: 'Male Factor +', volume: 34.75, mrp: 3832, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '37', sku: '1232', name: 'Multivitamin Mineral and Herbal Tablets Plus 90 Tablets', volume: 19.95, mrp: 2252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '38', sku: '0139', name: 'Niteworks.', volume: 75, mrp: 8010, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '39', sku: '311K', name: 'Ocular Defense', volume: 19.25, mrp: 2166, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '40', sku: '1233', name: 'Personalized Protein Powder 200 g', volume: 11.5, mrp: 1455, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '41', sku: '1569', name: 'Personalized Protein Powder 400 g', volume: 22.5, mrp: 2792, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '42', sku: '183K', name: 'ShakeMate', volume: 6.45, mrp: 733, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '43', sku: '025K', name: 'Simply Probiotic', volume: 21.95, mrp: 2482, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '44', sku: '174K', name: 'Triphala 60 Tablets', volume: 11.25, mrp: 1224, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '45', sku: '012K', name: 'vritilife Facial cleanser', volume: 10.4, mrp: 1165, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '46', sku: '015K', name: 'VRITILIFE FACIAL COMBO PACK (CLEANSER AND MOISTURIZER)', volume: 23.55, mrp: 2638, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '47', sku: '014K', name: 'vritilife Facial Serum', volume: 27.05, mrp: 3022, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '48', sku: '013K', name: 'vritilife Facial Toner', volume: 11.8, mrp: 1322, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '49', sku: '011K', name: 'vritilife Moisturizer', volume: 13.15, mrp: 1473, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '50', sku: '106K', name: 'Woman\'s Choice', volume: 12.45, mrp: 1399, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  // Newly added SKUs from invoices
  { id: '51', sku: '031K', name: 'Herbalife 24 Rebuild Strength', volume: 24.7, mrp: 2491, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '52', sku: '080K', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '53', sku: '1238', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '54', sku: '1291', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '55', sku: '230K', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '56', sku: '406K', name: 'Formula 1 Nutritional shake mix Mango 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '57', sku: '407K', name: 'Formula 1 Nutritional shake mix Vanilla 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '58', sku: '408K', name: 'Formula 1 Nutritional shake mix Rose Kheer 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '59', sku: '409K', name: 'Formula 1 Nutritional shake mix Kulfi 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '60', sku: '082K', name: 'Formula 1 Nutritional shake mix Kulfi 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '61', sku: '1239', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '62', sku: '1248', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '63', sku: '127K', name: 'Woman\'s Choice', volume: 12.45, mrp: 1185, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '64', sku: '3123', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2109, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '65', sku: '426K', name: 'Sleep Enhance (30g)', volume: 15.1, mrp: 1616, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '66', sku: '505K', name: 'Lift Off - 10 Sachets', volume: 14.05, mrp: 1334, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
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

          // Match product from masterProducts by SKU
          const matchedProd = masterProducts.find(p => p.sku === sku);
          const productName = matchedProd ? matchedProd.name : descPart.replace(/HSN\/?SAC/gi, '').replace(/\b\d{6,8}\b/g, '').trim();
          const volume = matchedProd ? matchedProd.volume : 0;

          const finalAmount = Math.round((taxableValue + sgstAmount + cgstAmount) * 100) / 100;
          const ratePaidPerUnit = qty > 0 ? (finalAmount / qty) : 0;
          const discountPercent = totalRetail > 0 ? Math.round((discount / totalRetail) * 100) : 42;

          if (!lineItemMap.has(sl)) {
            lineItemMap.set(sl, {
              id: `inv-${invoiceNumber}-${sl}`,
              type: 'purchase',
              date: dateObj.toISOString(),
              entity: 'Herbalife',
              product: productName,
              qty,
              discountPercent,
              volume,
              rate: ratePaidPerUnit,
              invoiceNumber,
              orderNumber,
              sku,
              hsn,
              unitPrice,
              discount,
              taxableValue,
              sgstRate,
              sgstAmount,
              cgstRate,
              cgstAmount,
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

  console.log(`Generated ${allPurchases.length} purchase transaction objects.`);

  // Write master products to JSON / JS snippet
  fs.writeFileSync('./scratch/generatedMasterProducts.json', JSON.stringify(masterProducts, null, 2));
  fs.writeFileSync('./scratch/generatedPurchases.json', JSON.stringify(allPurchases, null, 2));
  console.log('Saved generated products and purchases JSON files.');
}

run().catch(console.error);
