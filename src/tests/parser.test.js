import {
  computeMatchConfidence,
  detectDocumentType,
  parseInvoiceText
} from '../utils/invoiceParser.js';

export function testFuzzyProductMatching(assert) {
  const masterProduct = {
    name: 'Formula 1 Nutritional Shake Mix Chocolate',
    aliases: ['F1 Chocolate', 'Formula 1 Chocolate']
  };

  // 1. Exact match
  assert(computeMatchConfidence('Formula 1 Nutritional Shake Mix Chocolate', masterProduct) === 100, "Exact match should be 100% confidence");

  // 2. Case-insensitive match
  assert(computeMatchConfidence('formula 1 nutritional shake mix chocolate', masterProduct) === 98, "Case-insensitive match should be 98% confidence");

  // 3. Alias match
  assert(computeMatchConfidence('Formula 1 Chocolate', masterProduct) === 100, "Alias match should be 100% confidence");

  // 4. Fuzzy match
  const confidence = computeMatchConfidence('Formula 1 Chocolate Mix', masterProduct);
  assert(confidence >= 80, `Fuzzy match should be high confidence, got ${confidence}%`);
}

export function testDocumentClassification(assert) {
  const purchaseText = "INVOICE SUMMARY TAX INVOICE HERBALIFE INTERNATIONAL INDIA PVT LTD";
  const salesText = "TAX INVOICE SOLD TO: CUSTOMER PATTU SALES INVOICE";
  const priceListText = "RETAIL PRICE LIST VOLUME POINT SKU TABLE";

  assert(detectDocumentType(purchaseText) === 'purchase_invoice', "Should classify as purchase invoice");
  assert(detectDocumentType(salesText) === 'sales_invoice', "Should classify as sales invoice");
  assert(detectDocumentType(priceListText) === 'price_update_sheet', "Should classify as price update sheet");
}

export function testInvoiceParsing(assert) {
  const mockText = `
    TAX INVOICE
    Invoice No: INV-100293
    Invoice Date: 12-Mar-2026
    HERBALIFE INTERNATIONAL INDIA
    Formula 1 Chocolate HSN/SAC 21069099 2 2449.00
  `;

  const masterProducts = [
    { name: 'Formula 1 Nutritional Shake Mix Chocolate', mrp: 2449, volume: 21.75 }
  ];

  const parsed = parseInvoiceText(mockText, masterProducts);

  assert(parsed.invoiceNumber === 'INV-100293', `Should extract invoice number, got ${parsed.invoiceNumber}`);
  assert(parsed.type === 'purchase_invoice', `Should detect type as purchase_invoice, got ${parsed.type}`);
  assert(parsed.items.length > 0, "Should extract at least one line item");
}

export function testMultiLineHerbalifeInvoiceParsing(assert) {
  const mockText = `
    HERBALIFE INTERNATIONAL INDIA, PVT. LTD.
    GSTIN: 33AAACH8025R1ZA
    Order No: 3I76490777
    Invoice No: TNI0002769065
    Invoice Date: 06 JUN 2025
    Invoice Total: 5833.92
    State: TAMIL NADU
    Place of Supply: TAMIL NADU
    
    Purchased By : 
    Name : Hanna Jassmitha A
    Address : 4/253H, Kadharkhan Nagar, Rayakottai Road, Gangaleri KRISHNAGIRI,TAMIL NADU 635122
    
    SL. SKU Description Qty Retail Price Total Discount Taxable SGST CGST
    1 1233 PERSONALIZED PROTEIN POWDER-200G
    HSN/SAC 21061000
    1 2 1233.00 2466.00 1079.00 1387.00 9 124.83 9 124.83
  `;

  const masterProducts = [
    { name: 'Personalized Protein Powder 200 g', mrp: 1455, volume: 11.5 }
  ];

  const parsed = parseInvoiceText(mockText, masterProducts);

  assert(parsed.invoiceNumber === 'TNI0002769065', `Should extract invoice number TNI0002769065, got ${parsed.invoiceNumber}`);
  assert(parsed.orderNumber === '3I76490777', `Should extract order number 3I76490777, got ${parsed.orderNumber}`);
  assert(parsed.invoiceDate === '06 JUN 2025', `Should extract invoice date 06 JUN 2025, got ${parsed.invoiceDate}`);
  assert(parsed.gstin === '33AAACH8025R1ZA', `Should extract GSTIN 33AAACH8025R1ZA, got ${parsed.gstin}`);
  assert(parsed.customer.name === 'Hanna Jassmitha A', `Should extract customer name, got ${parsed.customer.name}`);
  assert(parsed.customer.address.includes('Kadharkhan Nagar'), `Should extract customer address, got ${parsed.customer.address}`);
  assert(parsed.totalAmount === 5833.92, `Should extract total amount 5833.92, got ${parsed.totalAmount}`);
  assert(parsed.state === 'TAMIL NADU', `Should extract state TAMIL NADU, got ${parsed.state}`);
  assert(parsed.placeOfSupply === 'TAMIL NADU', `Should extract place of supply TAMIL NADU, got ${parsed.placeOfSupply}`);
  assert(parsed.items.length === 1, `Should extract 1 item, got ${parsed.items.length}`);
  
  if (parsed.items.length === 1) {
    const item = parsed.items[0];
    assert(item.sku === '1233', `Item SKU should be 1233, got ${item.sku}`);
    assert(item.hsn === '21061000', `Item HSN should be 21061000, got ${item.hsn}`);
    assert(item.qty === 2, `Item quantity should be 2, got ${item.qty}`);
    assert(item.unitPrice === 1233.00, `Item unit price should be 1233.00, got ${item.unitPrice}`);
    assert(item.discount === 1079.00, `Item discount should be 1079.00, got ${item.discount}`);
    assert(item.taxableValue === 1387.00, `Item taxable value should be 1387.00, got ${item.taxableValue}`);
    assert(item.sgstRate === 9, `Item SGST % should be 9, got ${item.sgstRate}`);
    assert(item.sgstAmount === 124.83, `Item SGST Amount should be 124.83, got ${item.sgstAmount}`);
    assert(item.cgstRate === 9, `Item CGST % should be 9, got ${item.cgstRate}`);
    assert(item.cgstAmount === 124.83, `Item CGST Amount should be 124.83, got ${item.cgstAmount}`);
    assert(item.finalAmount === 1636.66, `Item final amount should be 1636.66, got ${item.finalAmount}`);
    assert(item.matchedProduct.name === 'Personalized Protein Powder 200 g', `Should map to master product, got ${item.matchedProduct.name}`);
  }
}

