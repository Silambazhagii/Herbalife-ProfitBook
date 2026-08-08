/**
 * OCR Processor — Handles scanned PDF pages using Tesseract.js.
 * 
 * Renders scanned pages at high resolution, runs OCR, and converts
 * the results into the same TextItem format used by pdfExtractor.
 * 
 * @module ocrProcessor
 */

import Tesseract from 'tesseract.js';
import { renderPageToCanvas } from './pdfExtractor.js';

/**
 * Process scanned pages with OCR and return structured text items.
 * 
 * @param {Object[]} scannedPages - Array of page data objects with _pageRef
 * @param {Function} [onProgress] - Progress callback
 * @param {{ cancelled: boolean }} [cancelRef] - Cancellation reference
 * @returns {Promise<Object[]>} Updated page data with OCR-extracted items
 */
export async function processScannedPages(scannedPages, onProgress = () => {}, cancelRef = { cancelled: false }) {
  const results = [];

  for (let i = 0; i < scannedPages.length; i++) {
    const pageData = scannedPages[i];

    if (cancelRef.cancelled) {
      throw new Error('OCR cancelled by user');
    }

    onProgress({
      stage: `Running OCR on scanned page ${pageData.pageNumber}`,
      page: pageData.pageNumber,
      totalPages: scannedPages.length,
      percent: Math.round(40 + ((i + 1) / scannedPages.length) * 20),
    });

    if (!pageData._pageRef) {
      results.push(pageData);
      continue;
    }

    // Render at 2x for better OCR accuracy
    const canvas = await renderPageToCanvas(pageData._pageRef, 2.0);

    // Run Tesseract OCR
    const ocrResult = await Tesseract.recognize(canvas, 'eng', {
      // PSM 6: Assume a single uniform block of text
      tessedit_pageseg_mode: '6',
    });

    // Convert OCR words to TextItem format
    const items = [];
    if (ocrResult.data && ocrResult.data.words) {
      for (const word of ocrResult.data.words) {
        if (!word.text || word.text.trim().length === 0) continue;

        const bbox = word.bbox;
        items.push({
          str: word.text,
          x: bbox.x0 / 2, // Scale back to 1x coordinates
          y: pageData.height - (bbox.y0 / 2), // Convert to PDF coordinate system (origin bottom-left)
          width: (bbox.x1 - bbox.x0) / 2,
          height: (bbox.y1 - bbox.y0) / 2,
          fontName: 'OCR',
        });
      }
    }

    results.push({
      ...pageData,
      items,
      isScanned: true,
      ocrApplied: true,
      _pageRef: null, // Release page reference
    });
  }

  return results;
}

/**
 * Run OCR on a single canvas and return raw text.
 * Used as a simpler fallback when geometric data isn't needed.
 * 
 * @param {HTMLCanvasElement} canvas - Canvas with rendered page content
 * @returns {Promise<string>} Extracted text
 */
export async function ocrCanvasToText(canvas) {
  const result = await Tesseract.recognize(canvas, 'eng');
  return result.data.text || '';
}
