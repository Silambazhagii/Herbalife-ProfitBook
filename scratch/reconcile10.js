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
  return { fileNum, pages };
}

function processInvoiceData(pdfDoc) {
  const allLines = pdfDoc.pages.flatMap(p => p.lines);
  const fullText = allLines.map(l => l.text).join('\n');

  const invNoMatch = fullText.match(/Invoice No:\s*([A-Z0-9]+)/i) || fullText.match(/\b(TNI\d{7,})\b/i);
  const invoiceNumber = invNoMatch ? invNoMatch[1] : '';

  const orderNoMatch = fullText.match(/Order No:\s*([A-Z0-9]+)/i) || fullText.match(/\b(3I\d{7,})\b/i);
  const orderNumber = orderNoMatch ? orderNoMatch[1] : '';

  const dateMatch = fullText.match(/Invoice Date:\s*([0-9]{1,2}\s+[A-Z]{3}\s+[0-9]{4})/i);
  const invoiceDate = dateMatch ? dateMatch[1] : '';

  const totalMatch = fullText.match(/Invoice Total:\s*([\d,]+\.\d{2})/i);
  const printedTotal = totalMatch ? parseFloat(totalMatch[1].replace(/,/g, '')) : 0;

  // Delivery Charges
  let deliveryTaxable = 0, deliveryCgst = 0, deliverySgst = 0;
  const delLine = allLines.find(l => l.text.includes('Delivery Charges'));
  if (delLine) {
    const posNums = delLine.text.match(/[\d.]+/g)?.map(Number) || [];
    // e.g. "Delivery Charges SAC - 999799 100.00 9 8.98 9 9.02"
    const delMatch = delLine.text.match(/Delivery Charges\s+SAC\s*-\s*999799\s+([\d.]+)\s+(?:9\s+)?([\d.]+)\s+(?:9\s+)?([\d.]+)/);
    if (delMatch) {
      deliveryTaxable = parseFloat(delMatch[1]);
      deliverySgst = parseFloat(delMatch[2]);
      deliveryCgst = parseFloat(delMatch[3]);
    }
  }

  const lineItemMap = new Map();

  for (const page of pdfDoc.pages) {
    const isAnnexure = page.lines.some(l => l.text.includes('Annexure'));
    if (isAnnexure) continue;

    for (let i = 0; i < page.lines.length; i++) {
      const line = page.lines[i];
      const trimmed = line.text.trim();

      // Look for line starting with SL number and SKU
      const slMatch = trimmed.match(/^(\d+)\s+([A-Z0-9]{3,8})\s+(.+)/);
      if (slMatch && !trimmed.includes('Delivery Charges') && !trimmed.includes('Total') && !trimmed.includes('SL.')) {
        const sl = parseInt(slMatch[1]);
        const sku = slMatch[2];
        const rest = slMatch[3];

        // The last 9 numbers are: Qty, UnitPrice, TotalRetail, Discount, Taxable, SGST_Rate, SGST_Amt, CGST_Rate, CGST_Amt
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
          if (idxFirstNum !== -1) {
            descPart = descPart.substring(0, idxFirstNum);
          }

          let hsn = '';
          if (i + 1 < page.lines.length) {
            const nextLine = page.lines[i + 1].text.trim();
            const hsnM = nextLine.match(/HSN\/SAC\s+(\d+)/i) || nextLine.match(/^(\d{6,8})$/);
            if (hsnM) {
              hsn = hsnM[1];
            }
          }
          const hsnInDesc = descPart.match(/HSN\/SAC\s+(\d+)/i);
          if (hsnInDesc) hsn = hsnInDesc[1];

          let cleanDesc = descPart.replace(/HSN\/?SAC/gi, '').replace(/\b\d{6,8}\b/g, '').trim();

          const lineItem = {
            sl,
            sku,
            description: cleanDesc,
            hsn,
            qty,
            unitPrice,
            totalRetail,
            discount,
            taxableValue,
            sgstRate,
            sgstAmount,
            cgstRate,
            cgstAmount,
            finalAmount: Math.round((taxableValue + sgstAmount + cgstAmount) * 100) / 100
          };

          if (!lineItemMap.has(sl)) {
            lineItemMap.set(sl, lineItem);
          }
        }
      }
    }
  }

  const items = Array.from(lineItemMap.values());
  return {
    fileNum: pdfDoc.fileNum,
    invoiceNumber,
    orderNumber,
    invoiceDate,
    printedTotal,
    deliveryTaxable,
    deliveryCgst,
    deliverySgst,
    deliveryTotal: Math.round((deliveryTaxable + deliveryCgst + deliverySgst) * 100) / 100,
    items
  };
}

async function run() {
  console.log('Final Reconciliation Table (All 10 PDFs):');
  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');
  console.log('File  | Inv No        | Inv Date    | Order No   | Lines | Units | Gross Value | Discount  | Taxable   | CGST    | SGST    | Delivery | Printed Total | Calc Total | Difference');
  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');

  let pdfCount = 0;
  let totalLinesAll = 0;
  let totalUnitsAll = 0;
  let totalGrossAll = 0;
  let totalDiscountAll = 0;
  let totalTaxableAll = 0;
  let totalCgstAll = 0;
  let totalSgstAll = 0;
  let totalDeliveryAll = 0;
  let totalPrintedAll = 0;
  let totalCalcAll = 0;

  for (let i = 1; i <= 10; i++) {
    const doc = await parsePdf(i);
    const inv = processInvoiceData(doc);

    pdfCount++;
    const totalUnits = inv.items.reduce((s, it) => s + it.qty, 0);
    const grossValue = inv.items.reduce((s, it) => s + it.totalRetail, 0);
    const discount = inv.items.reduce((s, it) => s + it.discount, 0);

    const itemsTaxable = inv.items.reduce((s, it) => s + it.taxableValue, 0);
    const itemsCgst = inv.items.reduce((s, it) => s + it.cgstAmount, 0);
    const itemsSgst = inv.items.reduce((s, it) => s + it.sgstAmount, 0);

    const taxable = Math.round((itemsTaxable + inv.deliveryTaxable) * 100) / 100;
    const cgst = Math.round((itemsCgst + inv.deliveryCgst) * 100) / 100;
    const sgst = Math.round((itemsSgst + inv.deliverySgst) * 100) / 100;
    
    const calcTotal = Math.round((taxable + cgst + sgst) * 100) / 100;
    const diff = Math.round((calcTotal - inv.printedTotal) * 100) / 100;

    totalLinesAll += inv.items.length;
    totalUnitsAll += totalUnits;
    totalGrossAll += grossValue;
    totalDiscountAll += discount;
    totalTaxableAll += taxable;
    totalCgstAll += cgst;
    totalSgstAll += sgst;
    totalDeliveryAll += inv.deliveryTotal;
    totalPrintedAll += inv.printedTotal;
    totalCalcAll += calcTotal;

    console.log(
      `her${i}  | ${inv.invoiceNumber.padEnd(13)} | ${inv.invoiceDate.padEnd(11)} | ${inv.orderNumber.padEnd(10)} | ${String(inv.items.length).padStart(5)} | ${String(totalUnits).padStart(5)} | ${grossValue.toFixed(2).padStart(11)} | ${discount.toFixed(2).padStart(9)} | ${taxable.toFixed(2).padStart(9)} | ${cgst.toFixed(2).padStart(7)} | ${sgst.toFixed(2).padStart(7)} | ${inv.deliveryTotal.toFixed(2).padStart(8)} | ${inv.printedTotal.toFixed(2).padStart(13)} | ${calcTotal.toFixed(2).padStart(10)} | ₹${diff.toFixed(2)}`
    );
  }

  console.log('---------------------------------------------------------------------------------------------------------------------------------------------');
  console.log(
    `TOTAL | 10 Invoices   |             |            | ${String(totalLinesAll).padStart(5)} | ${String(totalUnitsAll).padStart(5)} | ${totalGrossAll.toFixed(2).padStart(11)} | ${totalDiscountAll.toFixed(2).padStart(9)} | ${totalTaxableAll.toFixed(2).padStart(9)} | ${totalCgstAll.toFixed(2).padStart(7)} | ${totalSgstAll.toFixed(2).padStart(7)} | ${totalDeliveryAll.toFixed(2).padStart(8)} | ${totalPrintedAll.toFixed(2).padStart(13)} | ${totalCalcAll.toFixed(2).padStart(10)} | ₹${Math.round((totalCalcAll - totalPrintedAll) * 100) / 100}`
  );
}

run().catch(console.error);
