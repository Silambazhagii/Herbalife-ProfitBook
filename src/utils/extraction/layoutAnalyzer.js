/**
 * Layout Analyzer — Reconstructs lines from geometric text items
 * and identifies document zones (header, address, table, footer).
 * 
 * This is the critical bridge between raw positioned text items
 * and structured document understanding.
 * 
 * @module layoutAnalyzer
 */

/**
 * @typedef {Object} ReconstructedLine
 * @property {number} y - Y position of the line (average of items)
 * @property {string} text - Full line text (items joined left-to-right)
 * @property {Object[]} items - Original text items in this line
 * @property {number} index - Line index (0-based, top-to-bottom)
 */

/**
 * @typedef {Object} DocumentLayout
 * @property {ReconstructedLine[]} allLines - All reconstructed lines top-to-bottom
 * @property {string} fullText - Full reconstructed text (lines joined with \n)
 * @property {Object} zones - Identified document zones
 * @property {number} zones.tableHeaderIndex - Line index of table header (-1 if not found)
 * @property {number} zones.tableStartIndex - Line index where table data begins
 * @property {number} zones.tableEndIndex - Line index where table data ends
 * @property {number[]} zones.valueLineIndices - Indices of lines that are numeric value rows
 */

/**
 * Adaptive y-tolerance for line grouping.
 * Uses median font height to determine when items are on the same line.
 * 
 * @param {Object[]} items - Text items with height property
 * @returns {number} Y-tolerance in PDF units
 */
function computeAdaptiveTolerance(items) {
  if (items.length === 0) return 5;

  const heights = items
    .map(item => item.height)
    .filter(h => h > 0)
    .sort((a, b) => a - b);

  if (heights.length === 0) return 5;

  // Use median height * 0.6 as tolerance
  const medianHeight = heights[Math.floor(heights.length / 2)];
  return Math.max(3, Math.min(medianHeight * 0.6, 10));
}

/**
 * Group text items into lines based on y-coordinate proximity.
 * Items within the adaptive tolerance are considered on the same line.
 * 
 * @param {Object[]} items - Text items with x, y, str properties
 * @returns {ReconstructedLine[]} Lines sorted top-to-bottom
 */
export function reconstructLines(items) {
  if (!items || items.length === 0) return [];

  const tolerance = computeAdaptiveTolerance(items);
  const linesMap = {};

  // Group items by y-coordinate (within tolerance)
  for (const item of items) {
    let foundY = Object.keys(linesMap).find(
      y => Math.abs(parseFloat(y) - item.y) < tolerance
    );

    if (foundY === undefined) {
      foundY = item.y.toString();
      linesMap[foundY] = [];
    }

    linesMap[foundY].push(item);
  }

  // Sort lines top-to-bottom (higher y = higher on page in PDF coords)
  const sortedY = Object.keys(linesMap).sort(
    (a, b) => parseFloat(b) - parseFloat(a)
  );

  return sortedY.map((y, index) => {
    // Sort items left-to-right within each line
    const lineItems = linesMap[y].sort((a, b) => a.x - b.x);
    const text = lineItems.map(item => item.str).join(' ');

    return {
      y: parseFloat(y),
      text: text.trim(),
      items: lineItems,
      index,
    };
  });
}

/**
 * Detect the table header line in the document.
 * Looks for a line containing key column header keywords.
 * 
 * @param {ReconstructedLine[]} lines - Reconstructed lines
 * @param {string[]} headerKeywords - Keywords to search for (e.g., ['description', 'sku', 'qty'])
 * @returns {number} Index of the header line, or -1 if not found
 */
function findTableHeaderIndex(lines, headerKeywords) {
  const normalizedKeywords = headerKeywords.map(k => k.toLowerCase());

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].text.toLowerCase();
    // A header line should contain at least 3 of the expected keywords
    const matchCount = normalizedKeywords.filter(kw => lower.includes(kw)).length;
    if (matchCount >= 3) {
      return i;
    }
  }

  // Fallback: look for 'description' + at least one of 'qty'/'sku'/'discount'
  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].text.toLowerCase();
    if (
      (lower.includes('description') || lower.includes('particulars')) &&
      (lower.includes('qty') || lower.includes('sku') || lower.includes('discount') || lower.includes('amount'))
    ) {
      return i;
    }
  }

  return -1;
}

/**
 * Identify numeric value rows in the document.
 * A value row is a line where ≥10 of the first tokens are numbers,
 * matching the Herbalife column layout:
 * [SL, Qty, RetailPrice, TotalRetail, Discount, TaxableValue, SGSTRate, SGSTAmt, CGSTRate, CGSTAmt]
 * 
 * @param {ReconstructedLine[]} lines - Reconstructed lines
 * @param {number} minNumericTokens - Minimum number of numeric tokens to qualify
 * @returns {number[]} Indices of value rows
 */
function findValueLineIndices(lines, minNumericTokens = 10) {
  const indices = [];

  for (let i = 0; i < lines.length; i++) {
    const tokens = lines[i].text.split(/\s+/);
    if (tokens.length >= minNumericTokens) {
      const numericCount = tokens.slice(0, minNumericTokens).filter(t => {
        const num = parseFloat(t.replace(/,/g, ''));
        return !isNaN(num);
      }).length;

      if (numericCount >= minNumericTokens) {
        indices.push(i);
      }
    }
  }

  return indices;
}

/**
 * Find the end of the table zone.
 * The table ends when we encounter footer keywords or the last value line.
 * 
 * @param {ReconstructedLine[]} lines - Reconstructed lines
 * @param {number[]} valueLineIndices - Indices of value rows
 * @returns {number} Index of the last table line
 */
function findTableEndIndex(lines, valueLineIndices) {
  if (valueLineIndices.length === 0) return -1;

  const lastValueLine = valueLineIndices[valueLineIndices.length - 1];

  // Look for footer markers after the last value line
  const footerKeywords = ['delivery charges', 'invoice total', 'invoice value', 'grand total', 'authorised'];
  for (let i = lastValueLine + 1; i < lines.length; i++) {
    const lower = lines[i].text.toLowerCase();
    if (footerKeywords.some(kw => lower.includes(kw))) {
      return i - 1;
    }
  }

  // Default: 2 lines after last value line (for multi-line descriptions)
  return Math.min(lastValueLine + 2, lines.length - 1);
}

/**
 * Analyze document layout from text items across all pages.
 * 
 * @param {Object[]} pages - Array of page data from pdfExtractor
 * @param {Object} profile - Extraction profile with tableColumns config
 * @returns {DocumentLayout} Layout analysis result
 */
export function analyzeLayout(pages, profile) {
  // Merge all items from all pages into a single list
  // Offset y-coordinates to ensure proper ordering across pages
  const allItems = [];
  let yOffset = 0;

  for (const page of pages) {
    for (const item of page.items) {
      allItems.push({
        ...item,
        y: item.y + yOffset,
        originalPageNumber: page.pageNumber,
      });
    }
    // Each page shifts y down by page height
    yOffset -= page.height;
  }

  // Reconstruct lines
  const allLines = reconstructLines(allItems);

  // Build full text
  const fullText = allLines.map(l => l.text).join('\n');

  // Identify table structure
  const headerKeywords = profile.tableColumns?.headerKeywords || [
    'description', 'sku', 'qty', 'discount', 'taxable', 'sgst', 'cgst',
  ];

  const tableHeaderIndex = findTableHeaderIndex(allLines, headerKeywords);
  const valueLineIndices = findValueLineIndices(allLines);
  const tableEndIndex = findTableEndIndex(allLines, valueLineIndices);

  // Determine table start (line after header)
  const tableStartIndex = tableHeaderIndex >= 0 ? tableHeaderIndex + 1 : 0;

  return {
    allLines,
    fullText,
    zones: {
      tableHeaderIndex,
      tableStartIndex,
      tableEndIndex,
      valueLineIndices,
    },
  };
}
