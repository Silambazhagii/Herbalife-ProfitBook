/**
 * Extraction Pipeline Orchestrator — Runs the full enterprise-grade extraction.
 * 
 * This is the main entry point that coordinates all extraction modules:
 * pdfExtractor → ocrProcessor → layoutAnalyzer → tableExtractor →
 * fieldMapper → validator → confidenceEngine
 * 
 * Returns a result backward-compatible with the original parseInvoiceText output.
 * 
 * @module extraction/index
 */

import { extractPdfPages } from './pdfExtractor.js';
import { processScannedPages } from './ocrProcessor.js';
import { analyzeLayout } from './layoutAnalyzer.js';
import { extractTableRows } from './tableExtractor.js';
import { extractFields, extractDeliveryCharges, detectDocumentTypeFromProfile, flattenFieldResults } from './fieldMapper.js';
import { validateInvoice, parseDate } from './validator.js';
import { computeConfidenceScores } from './confidenceEngine.js';
import { getDefaultProfile } from './extractionProfile.js';

// Re-export for external use
export { CONFIDENCE_THRESHOLD } from './confidenceEngine.js';
export { getDefaultProfile, getProfile } from './extractionProfile.js';
export { reconstructLines } from './layoutAnalyzer.js';

function legacyTextOnlyFallbackRows(text) {
  const rows = [];
  const pattern = /(.+?)\s+HSN\/SAC\s+(\d{6,8})\s+(\d+)\s+([\d,]+(?:\.\d{1,2})?)/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const description = match[1].split('\n').pop().trim();
    const qty = Number(match[3]);
    const unitPrice = Number(match[4].replace(/,/g, ''));
    const finalAmount = Math.round(qty * unitPrice * 100) / 100;
    rows.push({
      slNo: rows.length + 1,
      sku: '',
      description,
      hsn: match[2],
      qty,
      unitPrice,
      totalRetail: finalAmount,
      discount: 0,
      taxableValue: finalAmount,
      sgstRate: 0,
      sgstAmount: 0,
      cgstRate: 0,
      cgstAmount: 0,
      finalAmount,
      rawLines: [match[0]],
    });
  }
  return rows;
}

/**
 * Run the full extraction pipeline on a PDF ArrayBuffer.
 * 
 * @param {ArrayBuffer} arrayBuffer - PDF file data
 * @param {Object[]} masterProducts - Array of master products for matching
 * @param {Object} [options] - Pipeline options
 * @param {Function} [options.onProgress] - Progress callback
 * @param {{ cancelled: boolean }} [options.cancelRef] - Cancellation reference
 * @param {Function} [options.findBestProductMatch] - Product matching function
 * @param {Object} [options.profile] - Extraction profile (defaults to Herbalife)
 * @returns {Promise<Object>} Extraction result (backward compatible with parseInvoiceText)
 */
export async function runExtractionPipeline(arrayBuffer, masterProducts, options = {}) {
  const {
    onProgress = () => {},
    cancelRef = { cancelled: false },
    findBestProductMatch,
    profile = getDefaultProfile(),
  } = options;

  const logs = [];
  const startTime = Date.now();

  // ============================================
  // STAGE 1: PDF Text Extraction
  // ============================================
  onProgress({ stage: 'Extracting text from PDF...', percent: 5 });
  const pdfResult = await extractPdfPages(arrayBuffer, onProgress, cancelRef);

  logs.push(`[Pipeline] Extracted ${pdfResult.totalPages} pages (${pdfResult.hasScannedPages ? 'contains scanned pages' : 'all digital'})`);

  // ============================================
  // STAGE 2: OCR for scanned pages
  // ============================================
  let pages = pdfResult.pages;
  if (pdfResult.hasScannedPages) {
    onProgress({ stage: 'Running OCR on scanned pages...', percent: 40 });
    const scannedPages = pages.filter(p => p.isScanned);
    const ocrPages = await processScannedPages(scannedPages, onProgress, cancelRef);

    // Merge OCR results back
    pages = pages.map(p => {
      if (p.isScanned) {
        const ocrPage = ocrPages.find(op => op.pageNumber === p.pageNumber);
        return ocrPage || p;
      }
      return p;
    });

    logs.push(`[Pipeline] OCR processed ${scannedPages.length} scanned page(s)`);
  }

  // ============================================
  // STAGE 3: Layout Analysis
  // ============================================
  onProgress({ stage: 'Analyzing document layout...', percent: 60 });
  const layout = analyzeLayout(pages, profile);

  logs.push(`[Pipeline] Reconstructed ${layout.allLines.length} lines`);
  logs.push(`[Pipeline] Table header at line ${layout.zones.tableHeaderIndex}`);
  logs.push(`[Pipeline] Found ${layout.zones.valueLineIndices.length} value row(s)`);

  // ============================================
  // STAGE 4: Field Extraction
  // ============================================
  onProgress({ stage: 'Extracting invoice fields...', percent: 70 });
  const fieldResults = extractFields(layout.fullText, profile);
  const delivery = extractDeliveryCharges(layout.fullText, profile);
  const docTypeResult = detectDocumentTypeFromProfile(layout.fullText, profile);

  const flatFields = flattenFieldResults(fieldResults);

  logs.push(`[Pipeline] Document type: ${docTypeResult.type} (${(docTypeResult.confidence * 100).toFixed(0)}%)`);
  logs.push(`[Pipeline] Fields extracted: ${Object.keys(fieldResults).filter(k => fieldResults[k].found).join(', ')}`);
  logs.push(`[Pipeline] Fields missing: ${Object.keys(fieldResults).filter(k => !fieldResults[k].found).join(', ') || 'None'}`);

  // ============================================
  // STAGE 5: Table Extraction
  // ============================================
  onProgress({ stage: 'Extracting product line items...', percent: 80 });
  const rows = extractTableRows(layout);

  logs.push(`[Pipeline] Extracted ${rows.length} product row(s)`);
  if (extractTableRows.lastDebugLog) {
    logs.push(extractTableRows.lastDebugLog);
  }

  // ============================================
  // STAGE 6: Product Matching
  // ============================================
  onProgress({ stage: 'Matching products...', percent: 85 });
  const productMatches = rows.map(row => {
    if (findBestProductMatch) {
      return findBestProductMatch(row.description, row.sku, masterProducts);
    }
    return { product: null, confidence: 0 };
  });

  // ============================================
  // STAGE 7: Validation
  // ============================================
  onProgress({ stage: 'Validating extraction...', percent: 90 });
  const validationResult = validateInvoice({
    fields: fieldResults,
    rows,
    delivery,
    profile,
  });

  logs.push(`[Pipeline] Validation: ${validationResult.isValid ? 'PASSED' : 'FAILED'}`);
  if (validationResult.errors.length > 0) {
    logs.push(`[Pipeline] Errors: ${validationResult.errors.join(' | ')}`);
  }
  if (validationResult.warnings.length > 0) {
    logs.push(`[Pipeline] Warnings: ${validationResult.warnings.join(' | ')}`);
  }

  // ============================================
  // STAGE 8: Confidence Scoring
  // ============================================
  onProgress({ stage: 'Computing confidence scores...', percent: 95 });
  const confidenceResult = computeConfidenceScores({
    fieldResults,
    rows,
    productMatches,
    validationResult,
  });

  logs.push(`[Pipeline] Overall confidence: ${(confidenceResult.overallConfidence * 100).toFixed(1)}%`);
  logs.push(`[Pipeline] Requires review: ${confidenceResult.requiresReview ? 'YES' : 'NO'}`);

  const elapsed = Date.now() - startTime;
  logs.push(`[Pipeline] Total extraction time: ${elapsed}ms`);

  // ============================================
  // BUILD BACKWARD-COMPATIBLE RESULT
  // ============================================
  onProgress({ stage: 'Complete', percent: 100 });

  const type = docTypeResult.type;
  const invoiceNumber = flatFields.invoiceNumber || null;
  const orderNumber = flatFields.orderNumber || '';
  const invoiceDate = flatFields.invoiceDate || null;
  const customerName = flatFields.customerName || '';
  const customerAddress = flatFields.customerAddress || '';
  const gstin = flatFields.gstin || '';
  const totalAmount = flatFields.totalAmount || 0;
  const state = flatFields.state || '';
  const placeOfSupply = flatFields.placeOfSupply || '';

  // Entity selection (same as original)
  const entity = type === 'purchase_invoice' ? 'HERBALIFE' : (customerName || 'GENERIC CUSTOMER');

  // Build items array (backward compatible with original parseInvoiceText)
  const items = rows.map((row, idx) => {
    const match = productMatches[idx];
    const matchedProduct = match?.product || null;
    const matchConfidence = match?.confidence || 0;

    // Calculate rate paid per unit (including tax)
    const ratePaid = row.qty > 0 ? row.finalAmount / row.qty : 0;

    // Calculate discount percent
    const totalRetail = row.unitPrice * row.qty;
    const discountPercent = totalRetail > 0
      ? Math.round((row.discount / totalRetail) * 100)
      : 42; // Herbalife default fallback

    return {
      rawName: row.description,
      productName: matchedProduct ? matchedProduct.name : row.description,
      matchedProduct,
      confidence: matchConfidence,
      sku: row.sku,
      hsn: row.hsn,
      qty: row.qty,
      unitPrice: row.unitPrice,
      discount: row.discount,
      taxableValue: row.taxableValue,
      sgstRate: row.sgstRate,
      sgstAmount: row.sgstAmount,
      cgstRate: row.cgstRate,
      cgstAmount: row.cgstAmount,
      finalAmount: row.finalAmount,
      mrp: matchedProduct ? matchedProduct.mrp : row.unitPrice,
      discountPercent,
      rate: ratePaid,
      volume: matchedProduct ? matchedProduct.volume : 0,
      // New: per-item confidence from confidence engine
      itemConfidence: confidenceResult.scoredItems[idx]?.overallConfidence || 0,
      fieldConfidences: confidenceResult.scoredItems[idx]?.fieldConfidences || {},
      rawLines: row.rawLines,
    };
  });

  // Build database payload
  const dbPayload = items.map(item => ({
    type: type === 'purchase_invoice' ? 'purchase' : 'sale',
    date: invoiceDate ? (parseDate(invoiceDate)?.toISOString() || new Date().toISOString()) : new Date().toISOString(),
    product: item.productName,
    qty: item.qty,
    discountPercent: item.discountPercent,
    rate: item.rate,
    volume: item.volume,
    entity,
    invoiceNumber,
    orderNumber,
    customerAddress,
    gstin,
    sku: item.sku,
    hsn: item.hsn,
    unitPrice: item.unitPrice,
    discount: item.discount,
    taxableValue: item.taxableValue,
    sgstRate: item.sgstRate,
    sgstAmount: item.sgstAmount,
    cgstRate: item.cgstRate,
    cgstAmount: item.cgstAmount,
    finalAmount: item.finalAmount,
  }));

  // Build JSON payload
  const jsonPayload = {
    invoiceNumber: invoiceNumber || '',
    orderNumber: orderNumber || '',
    invoiceDate: invoiceDate || '',
    customer: {
      name: customerName || '',
      address: customerAddress || '',
    },
    gstin: gstin || '',
    totalAmount: totalAmount || 0,
    delivery,
    items: items.map(item => ({
      sku: item.sku || '',
      productName: item.productName || '',
      hsn: item.hsn || '',
      qty: item.qty || 0,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      taxableValue: item.taxableValue || 0,
      sgstRate: item.sgstRate || 0,
      sgstAmount: item.sgstAmount || 0,
      cgstRate: item.cgstRate || 0,
      cgstAmount: item.cgstAmount || 0,
      finalAmount: item.finalAmount || 0,
    })),
  };

  // Build comprehensive logs
  const fullLogs = [];
  fullLogs.push('=================== PIPELINE LOG ===================');
  fullLogs.push(logs.join('\n'));
  fullLogs.push('=================== RAW EXTRACTED TEXT ===================');
  fullLogs.push(layout.fullText);
  fullLogs.push('==========================================================');
  fullLogs.push('==================== DETECTED FIELDS =====================');
  fullLogs.push(JSON.stringify({
    invoiceNumber,
    orderNumber,
    invoiceDate,
    customer: { name: customerName, address: customerAddress },
    gstin,
    totalAmount,
    state,
    placeOfSupply,
    itemCount: items.length,
  }, null, 2));
  fullLogs.push('==========================================================');
  fullLogs.push('==================== CONFIDENCE SCORES ===================');
  fullLogs.push(JSON.stringify({
    overall: confidenceResult.overallConfidence,
    requiresReview: confidenceResult.requiresReview,
    fields: Object.fromEntries(
      Object.entries(confidenceResult.scoredFields).map(([k, v]) => [k, { confidence: v.confidence, requiresReview: v.requiresReview }])
    ),
    items: confidenceResult.scoredItems.map((si, i) => ({
      row: i + 1,
      overallConfidence: si.overallConfidence,
      requiresReview: si.requiresReview,
    })),
  }, null, 2));
  fullLogs.push('==========================================================');
  fullLogs.push('=================== GENERATED PAYLOAD ====================');
  fullLogs.push(JSON.stringify(jsonPayload, null, 2));
  fullLogs.push('==========================================================');
  fullLogs.push('==================== DATABASE PAYLOAD ====================');
  fullLogs.push(JSON.stringify(dbPayload, null, 2));
  fullLogs.push('==========================================================');

  const resultLogs = fullLogs.join('\n');

  return {
    success: validationResult.isValid,
    type,
    invoiceNumber,
    orderNumber,
    invoiceDate,
    customer: {
      name: customerName,
      address: customerAddress,
    },
    gstin,
      totalAmount,
      state,
      placeOfSupply,
      items,
      delivery,
      validation: {
        isValid: validationResult.isValid,
        errors: validationResult.errors,
        warnings: validationResult.warnings,
        sumFinalAmounts: validationResult.sumFinalAmounts,
        subtotal: validationResult.subtotal,
        tax: validationResult.tax,
        charges: validationResult.charges,
        difference: validationResult.difference,
      },
    confidence: {
      overall: confidenceResult.overallConfidence,
      requiresReview: confidenceResult.requiresReview,
      fields: confidenceResult.scoredFields,
      items: confidenceResult.scoredItems,
    },
    logs: resultLogs,
    dbPayload,
    jsonPayload,
    // Metadata for auditing
    extractionMetadata: {
      profile: profile.name,
      extractedAt: new Date().toISOString(),
      elapsedMs: elapsed,
      pagesProcessed: pdfResult.totalPages,
      hasScannedPages: pdfResult.hasScannedPages,
      rawText: layout.fullText,
    },
  };
}

/**
 * Run extraction on pre-extracted text (for backward compatibility and testing).
 * Simulates the pipeline without PDF extraction stages.
 * 
 * @param {string} text - Pre-extracted text
 * @param {Object[]} masterProducts - Master product list
 * @param {Object} [options] - Options
 * @param {Function} [options.findBestProductMatch] - Product matching function
 * @param {Object} [options.profile] - Extraction profile
 * @returns {Object} Extraction result (same shape as runExtractionPipeline)
 */
export function runTextExtractionPipeline(text, masterProducts, options = {}) {
  const {
    findBestProductMatch,
    profile = getDefaultProfile(),
  } = options;

  const logs = [];
  const startTime = Date.now();

  // Convert text into pseudo-page items for layout analysis
  const lines = text.split('\n').filter(l => l.trim());
  const items = [];

  // Create synthetic text items with geometric positions
  lines.forEach((line, lineIdx) => {
    const words = line.split(/(\s+)/);
    let xPos = 50;
    const yPos = 800 - (lineIdx * 14); // Simulate top-to-bottom

    for (const word of words) {
      if (word.trim().length > 0) {
        items.push({
          str: word.trim(),
          x: xPos,
          y: yPos,
          width: word.trim().length * 7,
          height: 12,
          fontName: 'synthetic',
        });
        xPos += word.length * 7;
      }
      xPos += 4; // Space width
    }
  });

  const pages = [{
    pageNumber: 1,
    items,
    isScanned: false,
    width: 612,
    height: 792,
    _pageRef: null,
  }];

  // Run layout analysis
  const layout = analyzeLayout(pages, profile);

  logs.push(`[TextPipeline] Reconstructed ${layout.allLines.length} lines`);
  logs.push(`[TextPipeline] Table header at line ${layout.zones.tableHeaderIndex}`);
  logs.push(`[TextPipeline] Found ${layout.zones.valueLineIndices.length} value row(s)`);

  // Field extraction
  const fieldResults = extractFields(layout.fullText, profile);
  const delivery = extractDeliveryCharges(layout.fullText, profile);
  const docTypeResult = detectDocumentTypeFromProfile(layout.fullText, profile);

  const flatFields = flattenFieldResults(fieldResults);

  // Table extraction
  let rows = extractTableRows(layout);

  logs.push(`[TextPipeline] Extracted ${rows.length} product row(s)`);
  if (extractTableRows.lastDebugLog) {
    logs.push(extractTableRows.lastDebugLog);
  }
  if (rows.length === 0) {
    rows = legacyTextOnlyFallbackRows(text);
    logs.push(`[TextPipeline] Legacy text-only fallback extracted ${rows.length} product row(s)`);
  }

  // Product matching
  const productMatches = rows.map(row => {
    if (findBestProductMatch) {
      return findBestProductMatch(row.description, row.sku, masterProducts);
    }
    return { product: null, confidence: 0 };
  });

  // Validation
  const validationResult = validateInvoice({
    fields: fieldResults,
    rows,
    delivery,
    profile,
  });

  // Confidence scoring
  const confidenceResult = computeConfidenceScores({
    fieldResults,
    rows,
    productMatches,
    validationResult,
  });

  const elapsed = Date.now() - startTime;

  // Build the same result shape
  const type = docTypeResult.type;
  const invoiceNumber = flatFields.invoiceNumber || null;
  const orderNumber = flatFields.orderNumber || '';
  const invoiceDate = flatFields.invoiceDate || null;
  const customerName = flatFields.customerName || '';
  const customerAddress = flatFields.customerAddress || '';
  const gstin = flatFields.gstin || '';
  const totalAmount = flatFields.totalAmount || 0;
  const state = flatFields.state || '';
  const placeOfSupply = flatFields.placeOfSupply || '';
  const entity = type === 'purchase_invoice' ? 'HERBALIFE' : (customerName || 'GENERIC CUSTOMER');

  const resultItems = rows.map((row, idx) => {
    const match = productMatches[idx];
    const matchedProduct = match?.product || null;
    const matchConfidence = match?.confidence || 0;
    const ratePaid = row.qty > 0 ? row.finalAmount / row.qty : 0;
    const totalRetail = row.unitPrice * row.qty;
    const discountPercent = totalRetail > 0
      ? Math.round((row.discount / totalRetail) * 100)
      : 42;

    return {
      rawName: row.description,
      productName: matchedProduct ? matchedProduct.name : row.description,
      matchedProduct,
      confidence: matchConfidence,
      sku: row.sku,
      hsn: row.hsn,
      qty: row.qty,
      unitPrice: row.unitPrice,
      discount: row.discount,
      taxableValue: row.taxableValue,
      sgstRate: row.sgstRate,
      sgstAmount: row.sgstAmount,
      cgstRate: row.cgstRate,
      cgstAmount: row.cgstAmount,
      finalAmount: row.finalAmount,
      mrp: matchedProduct ? matchedProduct.mrp : row.unitPrice,
      discountPercent,
      rate: ratePaid,
      volume: matchedProduct ? matchedProduct.volume : 0,
      itemConfidence: confidenceResult.scoredItems[idx]?.overallConfidence || 0,
      fieldConfidences: confidenceResult.scoredItems[idx]?.fieldConfidences || {},
      rawLines: row.rawLines,
    };
  });

  const dbPayload = resultItems.map(item => ({
    type: type === 'purchase_invoice' ? 'purchase' : 'sale',
    date: invoiceDate ? (parseDate(invoiceDate)?.toISOString() || new Date().toISOString()) : new Date().toISOString(),
    product: item.productName,
    qty: item.qty,
    discountPercent: item.discountPercent,
    rate: item.rate,
    volume: item.volume,
    entity,
    invoiceNumber,
    orderNumber,
    customerAddress,
    gstin,
    sku: item.sku,
    hsn: item.hsn,
    unitPrice: item.unitPrice,
    discount: item.discount,
    taxableValue: item.taxableValue,
    sgstRate: item.sgstRate,
    sgstAmount: item.sgstAmount,
    cgstRate: item.cgstRate,
    cgstAmount: item.cgstAmount,
    finalAmount: item.finalAmount,
  }));

  const jsonPayload = {
    invoiceNumber: invoiceNumber || '',
    orderNumber: orderNumber || '',
    invoiceDate: invoiceDate || '',
    customer: { name: customerName || '', address: customerAddress || '' },
    gstin: gstin || '',
    totalAmount: totalAmount || 0,
    items: resultItems.map(item => ({
      sku: item.sku || '',
      productName: item.productName || '',
      hsn: item.hsn || '',
      qty: item.qty || 0,
      unitPrice: item.unitPrice || 0,
      discount: item.discount || 0,
      taxableValue: item.taxableValue || 0,
      sgstRate: item.sgstRate || 0,
      sgstAmount: item.sgstAmount || 0,
      cgstRate: item.cgstRate || 0,
      cgstAmount: item.cgstAmount || 0,
      finalAmount: item.finalAmount || 0,
    })),
    delivery: delivery,
  };

  const fullLogs = [];
  fullLogs.push('=================== PIPELINE LOG ===================');
  fullLogs.push(logs.join('\n'));
  fullLogs.push('=================== RAW TEXT ===================');
  fullLogs.push(layout.fullText);
  fullLogs.push('==========================================================');
  fullLogs.push('==================== GENERATED PAYLOAD ====================');
  fullLogs.push(JSON.stringify(jsonPayload, null, 2));
  fullLogs.push('==========================================================');

  return {
    success: validationResult.isValid,
    type,
    invoiceNumber,
    orderNumber,
    invoiceDate,
    customer: { name: customerName, address: customerAddress },
    gstin,
    totalAmount,
    state,
    placeOfSupply,
    items: resultItems,
    delivery,
    validation: {
      isValid: validationResult.isValid,
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      sumFinalAmounts: validationResult.sumFinalAmounts,
      subtotal: validationResult.subtotal,
      tax: validationResult.tax,
      charges: validationResult.charges,
      difference: validationResult.difference,
    },
    confidence: {
      overall: confidenceResult.overallConfidence,
      requiresReview: confidenceResult.requiresReview,
      fields: confidenceResult.scoredFields,
      items: confidenceResult.scoredItems,
    },
    logs: fullLogs.join('\n'),
    dbPayload,
    jsonPayload,
    extractionMetadata: {
      profile: profile.name,
      extractedAt: new Date().toISOString(),
      elapsedMs: elapsed,
      pagesProcessed: 1,
      hasScannedPages: false,
      rawText: layout.fullText,
    },
  };
}
