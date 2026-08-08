import './polyfill.js';
import fs from 'fs';
import { extractInvoiceData } from './src/utils/invoiceParser.js';

async function run() {
  const data = fs.readFileSync('/Users/silambazhagii/.gemini/antigravity-ide/brain/6c2fa90e-899a-4299-924e-68e2ad5156dc/media__1782379960421.pdf');
  const arrayBuffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  
  const file = new File([arrayBuffer], "invoice.pdf", { type: "application/pdf" });
  
  const masterProducts = [
    { name: 'Personalized Protein Powder 200 g', mrp: 1455, volume: 11.5, sku: '1233' },
    { name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', mrp: 2449, volume: 21.75, sku: '0141' },
    { name: 'Formula 1 Nutritional shake mix Kulfi 500 g', mrp: 2449, volume: 21.75, sku: '1285' }
  ];

  try {
    const result = await extractInvoiceData(file, masterProducts);
    console.log("\n=============================");
    console.log("EXTRACTED RESULTS:");
    console.log("Invoice No:", result.invoiceNumber);
    console.log("Total Amount:", result.totalAmount);
    console.log("Validation Valid?", result.validation?.isValid);
    console.log("Validation Errors:", result.validation?.errors);
    console.log("Extracted Items:", result.items.length);
    for(const item of result.items) {
       console.log(` - SKU: ${item.sku}, Qty: ${item.qty}, Rate: ${item.unitPrice}, Total: ${item.finalAmount}`);
    }
    console.log("=============================\n");
  } catch (e) {
    console.error("FAILED:", e);
  }
}
run();
