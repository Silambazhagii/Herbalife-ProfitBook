import '../../polyfill.js';
import fs from 'fs';
import path from 'path';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const projectInvoicesDir = path.resolve(process.cwd(), 'public/invoices');
const downloadsDir = fs.existsSync(projectInvoicesDir) ? projectInvoicesDir : path.resolve(process.cwd(), 'public/invoices');

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

  const totalMatch = fullText.match(/Invoice Total:\s*([\d,]+\.\d{2})/i);
  const printedTotal = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

  // Delivery Charges
  let deliveryTaxable = 0, deliveryCgst = 0, deliverySgst = 0;
  const delLine = allLines.find(l => l.text.includes('Delivery Charges'));
  if (delLine) {
    const delMatch = delLine.text.match(/Delivery Charges\s+SAC\s*-\s*999799\s+([\d.]+)\s+(?:9\s+)?([\d.]+)\s+(?:9\s+)?([\d.]+)/);
    if (delMatch) {
      deliveryTaxable = parseFloat(delMatch[1]);
      deliverySgst = parseFloat(delMatch[2]);
      deliveryCgst = parseFloat(delMatch[3]);
    }
  }

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

          if (!lineItemMap.has(sl)) {
            lineItemMap.set(sl, {
              sl,
              sku,
              qty,
              unitPrice,
              totalRetail,
              discount,
              taxableValue,
              sgstRate,
              sgstAmount,
              cgstRate,
              cgstAmount
            });
          }
        }
      }
    }
  }

  return {
    fileNum,
    invoiceNumber,
    orderNumber,
    invoiceDateStr,
    printedTotal,
    deliveryTaxable,
    deliveryCgst,
    deliverySgst,
    items: Array.from(lineItemMap.values())
  };
}

export async function testAll10InvoicesReconciliation(assert) {
  let totalCalculated = 0;
  let totalPrinted = 0;

  for (let i = 1; i <= 10; i++) {
    const inv = await parsePdf(i);
    assert(inv.invoiceNumber.startsWith('TNI'), `Invoice ${i} should have valid TNI number, got ${inv.invoiceNumber}`);
    assert(inv.items.length > 0, `Invoice ${i} should have product lines, got ${inv.items.length}`);

    const itemsTaxable = inv.items.reduce((s, it) => s + it.taxableValue, 0);
    const itemsCgst = inv.items.reduce((s, it) => s + it.cgstAmount, 0);
    const itemsSgst = inv.items.reduce((s, it) => s + it.sgstAmount, 0);

    const taxable = Math.round((itemsTaxable + inv.deliveryTaxable) * 100) / 100;
    const cgst = Math.round((itemsCgst + inv.deliveryCgst) * 100) / 100;
    const sgst = Math.round((itemsSgst + inv.deliverySgst) * 100) / 100;

    const calcTotal = Math.round((taxable + cgst + sgst) * 100) / 100;
    const diff = Math.round((calcTotal - inv.printedTotal) * 100) / 100;

    totalCalculated += calcTotal;
    totalPrinted += inv.printedTotal;

    assert(diff === 0, `Invoice ${i} (${inv.invoiceNumber}) reconciliation difference should be ₹0.00, got ₹${diff}`);
  }

  const grandDiff = Math.round((totalCalculated - totalPrinted) * 100) / 100;
  assert(grandDiff === 0, `Grand total reconciliation difference across all 10 invoices should be ₹0.00, got ₹${grandDiff}`);
}
