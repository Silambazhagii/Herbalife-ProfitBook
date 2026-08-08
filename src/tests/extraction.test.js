/**
 * Comprehensive tests for the modular extraction pipeline.
 * Tests each module independently and the full pipeline integration.
 */

import { reconstructLines, analyzeLayout } from '../utils/extraction/layoutAnalyzer.js';
import { extractTableRows } from '../utils/extraction/tableExtractor.js';
import { extractFields, extractDeliveryCharges, detectDocumentTypeFromProfile, flattenFieldResults } from '../utils/extraction/fieldMapper.js';
import { validateInvoice, isValidGSTIN, isValidInvoiceNumber, parseDate, validateRow } from '../utils/extraction/validator.js';
import { computeConfidenceScores, CONFIDENCE_THRESHOLD } from '../utils/extraction/confidenceEngine.js';
import { getDefaultProfile } from '../utils/extraction/extractionProfile.js';
import { runTextExtractionPipeline } from '../utils/extraction/index.js';
import { findBestProductMatch } from '../utils/invoiceParser.js';

// ==========================================
// Layout Analyzer Tests
// ==========================================

export function testLineReconstruction(assert) {
  const items = [
    { str: 'Invoice', x: 50, y: 700, width: 50, height: 12, fontName: 'test' },
    { str: 'No:', x: 110, y: 700, width: 20, height: 12, fontName: 'test' },
    { str: 'TNI0002769065', x: 140, y: 700, width: 100, height: 12, fontName: 'test' },
    { str: 'Date:', x: 50, y: 680, width: 30, height: 12, fontName: 'test' },
    { str: '06 JUN 2025', x: 90, y: 680, width: 80, height: 12, fontName: 'test' },
  ];

  const lines = reconstructLines(items);

  assert(lines.length === 2, `Should reconstruct 2 lines, got ${lines.length}`);
  assert(lines[0].text.includes('Invoice'), `First line should contain 'Invoice', got "${lines[0].text}"`);
  assert(lines[0].text.includes('TNI0002769065'), `First line should contain invoice number`);
  assert(lines[1].text.includes('Date'), `Second line should contain 'Date'`);
}

export function testEmptyLineReconstruction(assert) {
  const lines = reconstructLines([]);
  assert(lines.length === 0, `Empty items should produce 0 lines, got ${lines.length}`);
}

export function testLayoutZoneDetection(assert) {
  // Simulate a simple Herbalife invoice structure
  const mockText = `
    HERBALIFE INTERNATIONAL INDIA, PVT. LTD.
    Invoice No: TNI0002769065
    Invoice Date: 06 JUN 2025
    SL. SKU Description Qty Retail Price Total Discount Taxable SGST CGST
    1 1233 PERSONALIZED PROTEIN POWDER-200G
    HSN/SAC 21061000
    1 2 1233.00 2466.00 1079.00 1387.00 9 124.83 9 124.83
    Invoice Total: 1636.66
  `;

  const profile = getDefaultProfile();
  const lines = mockText.split('\n').filter(l => l.trim());
  const items = [];
  lines.forEach((line, lineIdx) => {
    const words = line.trim().split(/\s+/);
    let xPos = 50;
    const yPos = 800 - (lineIdx * 14);
    for (const word of words) {
      items.push({ str: word, x: xPos, y: yPos, width: word.length * 7, height: 12, fontName: 'test' });
      xPos += word.length * 7 + 4;
    }
  });

  const pages = [{ pageNumber: 1, items, isScanned: false, width: 612, height: 792, _pageRef: null }];
  const layout = analyzeLayout(pages, profile);

  assert(layout.allLines.length > 0, `Should have reconstructed lines, got ${layout.allLines.length}`);
  assert(layout.zones.tableHeaderIndex >= 0, `Should detect table header, got index ${layout.zones.tableHeaderIndex}`);
  assert(layout.zones.valueLineIndices.length === 1, `Should find 1 value row, got ${layout.zones.valueLineIndices.length}`);
}

// ==========================================
// Field Mapper Tests
// ==========================================

export function testFieldExtraction(assert) {
  const text = `
    HERBALIFE INTERNATIONAL INDIA, PVT. LTD.
    GSTIN: 33AAACH8025R1ZA
    Order No: 3I76490777
    Invoice No: TNI0002769065
    Invoice Date: 06 JUN 2025
    Invoice Total: 5833.92
    State: TAMIL NADU
    Place of Supply: TAMIL NADU
    Name : Hanna Jassmitha A
    Address : 4/253H, Kadharkhan Nagar, Rayakottai Road State Code: 33
  `;

  const profile = getDefaultProfile();
  const results = extractFields(text, profile);

  assert(results.invoiceNumber.found === true, 'Should find invoice number');
  assert(results.invoiceNumber.value === 'TNI0002769065', `Invoice number should be TNI0002769065, got ${results.invoiceNumber.value}`);
  assert(results.invoiceNumber.confidence >= 0.9, `Invoice number confidence should be >= 0.9, got ${results.invoiceNumber.confidence}`);

  assert(results.orderNumber.found === true, 'Should find order number');
  assert(results.orderNumber.value === '3I76490777', `Order number should be 3I76490777, got ${results.orderNumber.value}`);

  assert(results.invoiceDate.found === true, 'Should find invoice date');
  assert(results.invoiceDate.value === '06 JUN 2025', `Date should be 06 JUN 2025, got ${results.invoiceDate.value}`);

  assert(results.gstin.found === true, 'Should find GSTIN');
  assert(results.gstin.value === '33AAACH8025R1ZA', `GSTIN should be 33AAACH8025R1ZA, got ${results.gstin.value}`);

  assert(results.totalAmount.found === true, 'Should find total amount');
  assert(results.totalAmount.value === 5833.92, `Total should be 5833.92, got ${results.totalAmount.value}`);

  assert(results.customerName.found === true, 'Should find customer name');
  assert(results.customerName.value === 'Hanna Jassmitha A', `Name should be Hanna Jassmitha A, got ${results.customerName.value}`);
}

export function testDocumentTypeDetection(assert) {
  const profile = getDefaultProfile();

  const purchaseResult = detectDocumentTypeFromProfile(
    'TAX INVOICE HERBALIFE INTERNATIONAL INDIA HSN/SAC',
    profile
  );
  assert(purchaseResult.type === 'purchase_invoice', `Should detect purchase invoice, got ${purchaseResult.type}`);
  assert(purchaseResult.confidence >= 0.95, `Purchase confidence should be >= 0.95, got ${purchaseResult.confidence}`);

  const salesResult = detectDocumentTypeFromProfile(
    'TAX INVOICE SOLD TO CUSTOMER HSN/SAC',
    profile
  );
  assert(salesResult.type === 'sales_invoice', `Should detect sales invoice, got ${salesResult.type}`);

  const priceResult = detectDocumentTypeFromProfile(
    'RETAIL PRICE LIST VOLUME POINT EARNING OPPORTUNITY',
    profile
  );
  assert(priceResult.type === 'price_update_sheet', `Should detect price sheet, got ${priceResult.type}`);
}

export function testDeliveryChargeExtraction(assert) {
  const profile = getDefaultProfile();
  const text = 'Delivery Charges 100.00 some more text';
  const delivery = extractDeliveryCharges(text, profile);

  assert(delivery.taxable === 100.00, `Delivery taxable should be 100.00, got ${delivery.taxable}`);
  assert(delivery.tax === 18.00, `Delivery tax should be 18.00, got ${delivery.tax}`);
  assert(delivery.total === 118.00, `Delivery total should be 118.00, got ${delivery.total}`);
}

// ==========================================
// Validator Tests
// ==========================================

export function testGSTINValidation(assert) {
  assert(isValidGSTIN('33AAACH8025R1ZA') === true, 'Valid GSTIN should pass');
  assert(isValidGSTIN('33AAACH8025R1Z') === false, 'Short GSTIN should fail');
  assert(isValidGSTIN('') === false, 'Empty GSTIN should fail');
  assert(isValidGSTIN('INVALID') === false, 'Invalid GSTIN should fail');
  assert(isValidGSTIN('29AABCU9603R1ZM') === true, 'Another valid GSTIN should pass');
}

export function testInvoiceNumberValidation(assert) {
  assert(isValidInvoiceNumber('TNI0002769065') === true, 'Valid invoice number should pass');
  assert(isValidInvoiceNumber('INV-100293') === true, 'Hyphenated invoice should pass');
  assert(isValidInvoiceNumber('AB') === false, 'Too short should fail');
  assert(isValidInvoiceNumber('') === false, 'Empty should fail');
}

export function testDateParsing(assert) {
  const d1 = parseDate('06 JUN 2025');
  assert(d1 !== null, 'Should parse DD MMM YYYY format');
  assert(d1.getFullYear() === 2025, `Year should be 2025, got ${d1.getFullYear()}`);

  const d2 = parseDate('12-03-2026');
  assert(d2 !== null, 'Should parse DD-MM-YYYY format');

  const d3 = parseDate('2025-06-06');
  assert(d3 !== null, 'Should parse YYYY-MM-DD format');

  const d4 = parseDate('');
  assert(d4 === null, 'Empty date should return null');

  const d5 = parseDate('invalid');
  assert(d5 === null, 'Invalid date should return null');
}

export function testRowValidation(assert) {
  const validRow = {
    slNo: 1,
    unitPrice: 1233.00,
    qty: 2,
    discount: 1079.00,
    taxableValue: 1387.00,
    sgstAmount: 124.83,
    cgstAmount: 124.83,
    finalAmount: 1636.66,
  };

  const result = validateRow(validRow);
  assert(result.valid === true, `Valid row should pass, issues: ${result.issues.join(', ')}`);

  const badRow = {
    slNo: 1,
    unitPrice: 1000.00,
    qty: 2,
    discount: 0,
    taxableValue: 1500.00, // Should be 2000
    sgstAmount: 100,
    cgstAmount: 100,
    finalAmount: 1700.00,
  };

  const badResult = validateRow(badRow);
  assert(badResult.valid === false, 'Invalid row should fail');
  assert(badResult.issues.length > 0, 'Should have issues');
}

// ==========================================
// Confidence Engine Tests
// ==========================================

export function testConfidenceThreshold(assert) {
  assert(CONFIDENCE_THRESHOLD === 0.95, `Threshold should be 0.95, got ${CONFIDENCE_THRESHOLD}`);
}

export function testConfidenceScoring(assert) {
  const fieldResults = {
    invoiceNumber: { value: 'TNI0002769065', confidence: 1.0, source: 'pattern_0', found: true },
    totalAmount: { value: 5833.92, confidence: 0.95, source: 'pattern_0', found: true },
  };

  const rows = [{
    slNo: 1, sku: '1233', description: 'PPP 200g', hsn: '21061000',
    qty: 2, unitPrice: 1233.00, totalRetail: 2466.00, discount: 1079.00,
    taxableValue: 1387.00, sgstRate: 9, sgstAmount: 124.83,
    cgstRate: 9, cgstAmount: 124.83, finalAmount: 1636.66, rawLines: [],
  }];

  const productMatches = [{ product: { name: 'PPP 200g' }, confidence: 95 }];

  const validationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    sumFinalAmounts: 1636.66,
    difference: 0,
  };

  const result = computeConfidenceScores({ fieldResults, rows, productMatches, validationResult });

  assert(result.overallConfidence > 0, `Overall confidence should be > 0, got ${result.overallConfidence}`);
  assert(result.scoredFields.invoiceNumber.confidence >= 0.9, `Invoice number confidence should be high`);
  assert(result.scoredItems.length === 1, `Should have 1 scored item`);
  assert(result.scoredItems[0].overallConfidence > 0, `Item confidence should be > 0`);
}

// ==========================================
// Full Pipeline Integration Tests
// ==========================================

export function testMultiItemInvoicePipeline(assert) {
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
    2 0141 FORMULA 1 NUTRITIONAL SHAKE MIX
    ROSE KHEER FLAVOUR
    HSN/SAC 21069099
    2 2 2076.00 4152.00 1817.00 2335.00 9 210.15 9 210.15
  `;

  const masterProducts = [
    { name: 'Personalized Protein Powder 200 g', mrp: 1455, volume: 11.5, aliases: [] },
    { name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', mrp: 2449, volume: 21.75, aliases: [] },
  ];

  const parsed = runTextExtractionPipeline(mockText, masterProducts, { findBestProductMatch });

  // Header fields
  assert(parsed.invoiceNumber === 'TNI0002769065', `Invoice number should be TNI0002769065, got ${parsed.invoiceNumber}`);
  assert(parsed.orderNumber === '3I76490777', `Order number should be 3I76490777, got ${parsed.orderNumber}`);
  assert(parsed.invoiceDate === '06 JUN 2025', `Date should be 06 JUN 2025, got ${parsed.invoiceDate}`);
  assert(parsed.gstin === '33AAACH8025R1ZA', `GSTIN should be 33AAACH8025R1ZA, got ${parsed.gstin}`);
  assert(parsed.totalAmount === 5833.92, `Total should be 5833.92, got ${parsed.totalAmount}`);

  // Items
  assert(parsed.items.length === 2, `Should extract 2 items, got ${parsed.items.length}`);

  if (parsed.items.length >= 2) {
    // Item 1: Personalized Protein Powder
    const item1 = parsed.items[0];
    assert(item1.sku === '1233', `Item 1 SKU should be 1233, got ${item1.sku}`);
    assert(item1.hsn === '21061000', `Item 1 HSN should be 21061000, got ${item1.hsn}`);
    assert(item1.qty === 2, `Item 1 qty should be 2, got ${item1.qty}`);
    assert(item1.unitPrice === 1233.00, `Item 1 unit price should be 1233.00, got ${item1.unitPrice}`);
    assert(item1.discount === 1079.00, `Item 1 discount should be 1079.00, got ${item1.discount}`);
    assert(item1.taxableValue === 1387.00, `Item 1 taxable should be 1387.00, got ${item1.taxableValue}`);
    assert(item1.sgstRate === 9, `Item 1 SGST rate should be 9, got ${item1.sgstRate}`);
    assert(item1.sgstAmount === 124.83, `Item 1 SGST amount should be 124.83, got ${item1.sgstAmount}`);
    assert(item1.finalAmount === 1636.66, `Item 1 final should be 1636.66, got ${item1.finalAmount}`);

    // Item 2: Formula 1 Rose Kheer (multi-line description)
    const item2 = parsed.items[1];
    assert(item2.sku === '0141', `Item 2 SKU should be 0141, got ${item2.sku}`);
    assert(item2.hsn === '21069099', `Item 2 HSN should be 21069099, got ${item2.hsn}`);
    assert(item2.qty === 2, `Item 2 qty should be 2, got ${item2.qty}`);
    assert(item2.unitPrice === 2076.00, `Item 2 unit price should be 2076.00, got ${item2.unitPrice}`);
    assert(item2.discount === 1817.00, `Item 2 discount should be 1817.00, got ${item2.discount}`);
    assert(item2.taxableValue === 2335.00, `Item 2 taxable should be 2335.00, got ${item2.taxableValue}`);
    assert(item2.sgstAmount === 210.15, `Item 2 SGST amount should be 210.15, got ${item2.sgstAmount}`);
    assert(item2.finalAmount === 2755.30, `Item 2 final should be 2755.30, got ${item2.finalAmount}`);

    // Multi-line description should contain Rose Kheer
    assert(
      item2.rawName.toUpperCase().includes('ROSE KHEER') || item2.rawName.toUpperCase().includes('FORMULA'),
      `Item 2 description should include FORMULA or ROSE KHEER, got "${item2.rawName}"`
    );
  }

  // Confidence
  assert(parsed.confidence !== undefined, 'Should include confidence scores');
  assert(parsed.confidence.overall > 0, `Overall confidence should be > 0, got ${parsed.confidence.overall}`);

  // Validation
  assert(parsed.validation !== undefined, 'Should include validation');

  // Extraction metadata
  assert(parsed.extractionMetadata !== undefined, 'Should include extraction metadata');
  assert(parsed.extractionMetadata.profile === 'herbalife_india', `Profile should be herbalife_india, got ${parsed.extractionMetadata.profile}`);
}

export function testPipelineWithNoItems(assert) {
  const mockText = `
    Random text without any invoice structure
    Just some words here and there
  `;

  const parsed = runTextExtractionPipeline(mockText, [], { findBestProductMatch });

  assert(parsed.items.length === 0, `Should extract 0 items from random text, got ${parsed.items.length}`);
  assert(parsed.success === false, 'Should report failure when no items found');
  assert(parsed.validation.errors.length > 0, 'Should have validation errors');
}
