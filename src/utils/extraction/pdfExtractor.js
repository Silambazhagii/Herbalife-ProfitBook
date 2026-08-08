/**
 * PDF Extractor — Extracts structured text items with geometry from PDF pages.
 * 
 * Wraps pdfjs-dist to extract text items with positional data (x, y, width, height).
 * Detects whether each page is digital (has selectable text) or scanned (image-only).
 * 
 * @module pdfExtractor
 */

import * as pdfjsLib from 'pdfjs-dist';

// Setup pdf worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/**
 * @typedef {Object} TextItem
 * @property {string} str - The text content
 * @property {number} x - X position (left edge)
 * @property {number} y - Y position (baseline)
 * @property {number} width - Width of the text item
 * @property {number} height - Height of the text item (derived from font size)
 * @property {string} fontName - Font name
 */

/**
 * @typedef {Object} PageData
 * @property {number} pageNumber - 1-indexed page number
 * @property {TextItem[]} items - Array of text items with geometry
 * @property {boolean} isScanned - True if the page has no selectable text
 * @property {number} width - Page width in PDF units
 * @property {number} height - Page height in PDF units
 */

/**
 * @typedef {Object} ExtractionResult
 * @property {PageData[]} pages - Array of page data
 * @property {number} totalPages - Total number of pages
 * @property {boolean} hasScannedPages - Whether any page was detected as scanned
 */

/**
 * Minimum number of text items to consider a page as having selectable text.
 * Pages with fewer items are treated as scanned.
 */
const MIN_TEXT_ITEMS_THRESHOLD = 3;

function splitTextItem(item) {
  const parts = item.str.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return [item];

  const totalChars = parts.reduce((sum, part) => sum + part.length, 0);
  const averageSpaceWidth = item.width > 0 ? item.width * 0.18 / Math.max(parts.length - 1, 1) : 4;
  let cursorX = item.x;

  return parts.map(part => {
    const width = item.width > 0
      ? (item.width * 0.82 * part.length) / totalChars
      : part.length * 7;
    const token = {
      ...item,
      str: part,
      x: cursorX,
      width,
    };
    cursorX += width + averageSpaceWidth;
    return token;
  });
}

/**
 * Extract structured text items from a PDF ArrayBuffer.
 * 
 * @param {ArrayBuffer} arrayBuffer - The PDF file as an ArrayBuffer
 * @param {Function} [onProgress] - Progress callback: ({ stage, page, totalPages, percent })
 * @param {{ cancelled: boolean }} [cancelRef] - Cancellation reference
 * @returns {Promise<ExtractionResult>} Structured page data with geometry
 */
export async function extractPdfPages(arrayBuffer, onProgress = () => {}, cancelRef = { cancelled: false }) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages = [];
  let hasScannedPages = false;

  for (let i = 1; i <= pdf.numPages; i++) {
    if (cancelRef.cancelled) {
      throw new Error('Extraction cancelled by user');
    }

    onProgress({
      stage: 'Extracting text from PDF',
      page: i,
      totalPages: pdf.numPages,
      percent: Math.round((i / pdf.numPages) * 40),
    });

    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 1.0 });
    const textContent = await page.getTextContent();

    const items = textContent.items
      .filter(item => item.str && item.str.trim().length > 0)
      .map(item => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5],
        width: item.width || 0,
        height: item.height || Math.abs(item.transform[3]) || 12,
        fontName: item.fontName || '',
      }))
      .flatMap(splitTextItem);

    const isScanned = items.length < MIN_TEXT_ITEMS_THRESHOLD;
    if (isScanned) hasScannedPages = true;

    pages.push({
      pageNumber: i,
      items,
      isScanned,
      width: viewport.width,
      height: viewport.height,
      // Keep page reference for OCR rendering if needed
      _pageRef: isScanned ? page : null,
    });
  }

  return {
    pages,
    totalPages: pdf.numPages,
    hasScannedPages,
  };
}

/**
 * Render a PDF page to a canvas (for OCR processing).
 * 
 * @param {Object} page - pdfjs page object
 * @param {number} [scale=2.0] - Rendering scale (higher = better OCR but slower)
 * @returns {Promise<HTMLCanvasElement>} The rendered canvas
 */
export async function renderPageToCanvas(page, scale = 2.0) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;
  return canvas;
}
