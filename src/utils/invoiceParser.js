/**
 * Invoice Parser — Backward-compatible wrapper over the modular extraction pipeline.
 * 
 * This file delegates to src/utils/extraction/ for the enterprise-grade pipeline
 * while maintaining the same exports and API surface used by BillEntry.jsx and tests.
 * 
 * Exports:
 * - extractTextFromPDF(arrayBuffer, onProgress, cancelRef) → string
 * - parseInvoiceText(text, masterProducts) → result
 * - computeMatchConfidence(extractedName, masterProduct) → number
 * - findBestProductMatch(extractedName, masterProducts) → { product, confidence }
 * - detectDocumentType(text) → string
 */

import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';
import { runExtractionPipeline, runTextExtractionPipeline } from './extraction/index.js';

// Setup pdf worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * Calculates a confidence match score (0-100) between an extracted product string and a master product name.
 * Handles: Exact, Case-Insensitive, Fuzzy, and Alias matches.
 */
export function computeMatchConfidence(extractedName, masterProduct) {
  const name = masterProduct.name.trim();
  const ext = extractedName.trim();

  // 1. Exact Match
  if (name === ext) return 100;

  // 2. Case-Insensitive Match
  if (name.toLowerCase() === ext.toLowerCase()) return 98;

  // 3. Alias Match
  if (masterProduct.aliases && masterProduct.aliases.some(alias => alias.toLowerCase() === ext.toLowerCase())) {
    return 100;
  }

  // 4. Token Overlap Fuzzy Match
  const normalize = (str) => {
    return str
      .toLowerCase()
      .replace(/(\d+)([a-zA-Z]+)/g, '$1 $2')
      .replace(/([a-zA-Z]+)(\d+)/g, '$1 $2')
      .replace(/[^a-z0-9]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
  };

  const extTokens = normalize(ext);
  const masterTokens = normalize(name);
  
  if (extTokens.length === 0 || masterTokens.length === 0) return 0;

  let matches = 0;
  extTokens.forEach(et => {
    if (masterTokens.some(mt => mt === et || (et.length > 3 && mt.includes(et)) || (mt.length > 3 && et.includes(mt)))) {
      matches++;
    }
  });

  const precision = matches / extTokens.length;
  const recall = matches / masterTokens.length;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  
  return f1 * 100;
}

/**
 * Find the best matching master product for an extracted name and SKU.
 */
export function findBestProductMatch(extractedName, extractedSKU, masterProducts) {
  let bestMatch = null;
  let bestConfidence = 0;

  // 1. Exact SKU Match
  if (extractedSKU) {
    const skuMatch = masterProducts.find(p => p.sku && p.sku === extractedSKU);
    if (skuMatch) {
      return { product: skuMatch, confidence: 100 };
    }
  }

  // 2. Fallback to Fuzzy Name Match
  for (const product of masterProducts) {
    const confidence = computeMatchConfidence(extractedName, product);
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = product;
    }
  }

  return { product: bestMatch, confidence: bestConfidence };
}

/**
 * Automatically detects document type based on extracted text contents.
 */
export function detectDocumentType(text) {
  const content = text.toUpperCase();

  if (content.includes('INVOICE NO') || content.includes('TAX INVOICE') || content.includes('HSN/SAC')) {
    if (content.includes('HERBALIFE INTERNATIONAL INDIA') || content.includes('SOLD TO: HERBALIFE')) {
      return 'purchase_invoice';
    }
    return 'sales_invoice';
  }

  if (content.includes('RETAIL PRICE LIST') || content.includes('VOLUME POINT') || content.includes('SKU') || content.includes('EARNING OPPORTUNITY')) {
    return 'price_update_sheet';
  }

  return 'herbalife_product_list';
}

/**
 * Fast Text Extraction with OCR Fallback and cancellation support.
 * Now delegates to the modular pdfExtractor + ocrProcessor pipeline.
 */
export async function extractTextFromPDF(arrayBuffer, onProgress = () => {}, cancelRef = { cancelled: false }) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  for (let i = 1; i <= pdf.numPages; i++) {
    if (cancelRef.cancelled) {
      throw new Error('Parsing cancelled by user');
    }
    onProgress({ stage: 'Extracting text from PDF', page: i, totalPages: pdf.numPages, percent: Math.round((i / pdf.numPages) * 50) });

    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Reconstruct lines based on geometry
    const items = textContent.items.map(item => ({
      str: item.str,
      x: item.transform[4],
      y: item.transform[5]
    }));

    let pageText = '';

    if (items.length > 0) {
      const linesMap = {};
      items.forEach(item => {
        // Group items with y-coordinates within 5px tolerance
        let foundY = Object.keys(linesMap).find(y => Math.abs(parseFloat(y) - item.y) < 5);
        if (foundY === undefined) {
          foundY = item.y.toString();
          linesMap[foundY] = [];
        }
        linesMap[foundY].push(item);
      });

      // Sort lines top-to-bottom
      const sortedY = Object.keys(linesMap).sort((a, b) => parseFloat(b) - parseFloat(a));

      const pageLines = sortedY.map(y => {
        // Sort items left-to-right within each line
        const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
        return lineItems.map(item => item.str).join(' ');
      });

      pageText = pageLines.join('\n');
    }

    // If PDF page is scanned (no text content)
    if (pageText.trim().length === 0) {
      onProgress({ stage: 'Running OCR Fallback for scanned page', page: i, totalPages: pdf.numPages, percent: Math.round(50 + ((i / pdf.numPages) * 50)) });
      
      // Render page to canvas to perform OCR
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;

      // Extract text with Tesseract
      const ocrResult = await Tesseract.recognize(canvas, 'eng');
      pageText = ocrResult.data.text;
    }

    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Parses extracted text using the NEW modular extraction pipeline.
 * Returns the same result shape as before for backward compatibility.
 */
export function parseInvoiceText(text, masterProducts) {
  // Delegate to the new modular pipeline (text-based entry point)
  return runTextExtractionPipeline(text, masterProducts, {
    findBestProductMatch,
  });
}

/**
 * Full PDF pipeline — extracts text AND parses in one call.
 * Uses the new modular extraction pipeline end-to-end.
 * 
 * @param {ArrayBuffer} arrayBuffer - PDF file data
 * @param {Object[]} masterProducts - Master products for matching
 * @param {Function} [onProgress] - Progress callback
 * @param {{ cancelled: boolean }} [cancelRef] - Cancellation reference
 * @returns {Promise<Object>} Full extraction result
 */
export async function extractAndParseInvoice(arrayBuffer, masterProducts, onProgress = () => {}, cancelRef = { cancelled: false }) {
  return runExtractionPipeline(arrayBuffer, masterProducts, {
    onProgress,
    cancelRef,
    findBestProductMatch,
  });
}
