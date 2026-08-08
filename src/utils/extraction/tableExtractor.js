/**
 * Table Extractor — Extracts structured product rows from the table zone using PDF geometry.
 *
 * The important rule here is that numeric cells must come from separate PDF x/y
 * positions. Plain text is useful for diagnostics only; it is not used to split
 * adjacent numeric values into columns.
 *
 * @module tableExtractor
 */

const EXPECTED_COLUMNS = [
  'sl',
  'sku',
  'description',
  'qty',
  'retailPrice',
  'total',
  'discount',
  'taxableValue',
  'sgstRate',
  'sgstAmount',
  'cgstRate',
  'cgstAmount',
];

function roundMoney(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatItem(item) {
  return `${item.str}@(${item.x.toFixed(2)},${item.y.toFixed(2)})`;
}

function cleanDescription(str) {
  return str
    .replace(/\b(?:HSN\/SAC|HSN|SAC)\b/gi, '')
    .replace(/\b\d{6,8}\b/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[-\s]+$/, '')
    .replace(/^[-\s]+/, '')
    .trim();
}

function extractSKU(text) {
  const match = text.match(/^\s*([A-Z0-9]{3,8})\b/i);
  if (match) {
    return {
      sku: match[1],
      remaining: text.replace(/^\s*[A-Z0-9]{3,8}\b/i, '').trim(),
    };
  }
  return { sku: '', remaining: text };
}

function extractHSN(text) {
  const match = text.match(/\b(\d{6,8})\b/);
  return match ? match[1] : '';
}

export function parseSafeNumber(value) {
  if (value === null || value === undefined) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned) return null;
  if (!/^-?(?:\d+|\d+\.\d{1,2})$/.test(cleaned)) {
    return null;
  }
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRequiredNumber(value, column, rowLabel, debugRows) {
  const parsed = parseSafeNumber(value);
  if (parsed === null) {
    debugRows.push(`[TableExtractor] Rejected malformed number in ${rowLabel}.${column}: "${value}"`);
    return null;
  }
  return parsed;
}

function textOf(items) {
  return items.map(item => item.str).join(' ').trim();
}

function detectColumnAnchors(headerLine, valueLines) {
  const headerText = headerLine?.text?.toLowerCase() || '';
  const headerLooksUseful = headerText.includes('sku') && headerText.includes('qty');
  const anchors = {};

  if (headerLooksUseful) {
    const headerItems = [...headerLine.items].sort((a, b) => a.x - b.x);
    for (let i = 0; i < headerItems.length; i++) {
      const token = headerItems[i].str.toLowerCase();
      const next = headerItems[i + 1]?.str?.toLowerCase() || '';
      if (/^sl/.test(token)) anchors.sl = headerItems[i].x;
      if (token.includes('sku')) anchors.sku = headerItems[i].x;
      if (token.includes('desc') || token.includes('particular')) anchors.description = headerItems[i].x;
      if (token === 'qty' || token.includes('quantity')) anchors.qty = headerItems[i].x;
      if (token.includes('retail') || (token.includes('price') && anchors.retailPrice === undefined)) anchors.retailPrice = headerItems[i].x;
      if (token.includes('total') && anchors.total === undefined) anchors.total = headerItems[i].x;
      if (token.includes('discount')) anchors.discount = headerItems[i].x;
      if (token.includes('taxable')) anchors.taxableValue = headerItems[i].x;
      if (token.includes('sgst')) {
        anchors.sgstRate = headerItems[i].x;
        anchors.sgstAmount = headerItems[i + 1] ? headerItems[i + 1].x : headerItems[i].x + 32;
      }
      if (token.includes('cgst')) {
        anchors.cgstRate = headerItems[i].x;
        anchors.cgstAmount = headerItems[i + 1] ? headerItems[i + 1].x : headerItems[i].x + 32;
      }
      if (token.includes('rate') && next.includes('amount') && anchors.sgstRate !== undefined && anchors.sgstAmount === undefined) {
        anchors.sgstAmount = headerItems[i + 1].x;
      }
    }
  }

  const bestValueLine = [...valueLines]
    .sort((a, b) => b.items.length - a.items.length)
    .find(line => line.items.filter(item => parseSafeNumber(item.str) !== null).length >= 9);

  if (bestValueLine) {
    const numericItems = bestValueLine.items
      .filter(item => parseSafeNumber(item.str) !== null)
      .sort((a, b) => a.x - b.x);
    const numericColumns = ['sl', 'qty', 'retailPrice', 'total', 'discount', 'taxableValue', 'sgstRate', 'sgstAmount', 'cgstRate', 'cgstAmount'];
    numericColumns.forEach((column, idx) => {
      if (numericItems[idx]) anchors[column] = numericItems[idx].x;
    });
  }

  const skuDescriptionLine = valueLines.find(line => /[A-Z]/i.test(line.text) && /\b[A-Z0-9]{3,8}\b/.test(line.text));
  if (skuDescriptionLine) {
    const sorted = [...skuDescriptionLine.items].sort((a, b) => a.x - b.x);
    anchors.sl ??= sorted[0]?.x ?? 0;
    anchors.sku ??= sorted[1]?.x ?? sorted[0]?.x ?? 0;
    anchors.description ??= sorted[2]?.x ?? anchors.sku + 35;
  }

  return EXPECTED_COLUMNS
    .filter(column => anchors[column] !== undefined)
    .map(column => ({ column, x: anchors[column] }))
    .sort((a, b) => a.x - b.x);
}

function inferTableBounds(allLines, zones) {
  if (zones.tableHeaderIndex >= 0) {
    return {
      headerIndex: zones.tableHeaderIndex,
      startIndex: zones.tableHeaderIndex + 1,
      endIndex: zones.tableEndIndex > 0 ? zones.tableEndIndex : allLines.length - 1,
    };
  }

  if (zones.valueLineIndices?.length > 0) {
    const firstValue = zones.valueLineIndices[0];
    const lastValue = zones.valueLineIndices[zones.valueLineIndices.length - 1];
    return {
      headerIndex: -1,
      startIndex: Math.max(0, firstValue - 4),
      endIndex: Math.min(allLines.length - 1, lastValue + 2),
    };
  }

  return {
    headerIndex: -1,
    startIndex: 0,
    endIndex: allLines.length - 1,
  };
}

function buildColumnBounds(anchors) {
  return anchors.map((anchor, index) => {
    const prev = anchors[index - 1];
    const next = anchors[index + 1];
    return {
      column: anchor.column,
      x: anchor.x,
      min: prev ? (prev.x + anchor.x) / 2 : Number.NEGATIVE_INFINITY,
      max: next ? (anchor.x + next.x) / 2 : Number.POSITIVE_INFINITY,
    };
  });
}

function getColumnForX(x, bounds) {
  const match = bounds.find(bound => x >= bound.min && x < bound.max);
  return match?.column || null;
}

function isFooterLine(line) {
  return /delivery charges|invoice total|invoice value|grand total|authorised/i.test(line.text);
}

function isValueColumns(columns) {
  return (
    parseSafeNumber(columns.qty) !== null &&
    parseSafeNumber(columns.retailPrice) !== null &&
    parseSafeNumber(columns.total) !== null &&
    parseSafeNumber(columns.discount) !== null &&
    parseSafeNumber(columns.taxableValue) !== null &&
    parseSafeNumber(columns.sgstRate) !== null &&
    parseSafeNumber(columns.sgstAmount) !== null &&
    parseSafeNumber(columns.cgstRate) !== null &&
    parseSafeNumber(columns.cgstAmount) !== null
  );
}

function getNumericTokens(line) {
  return [...line.items]
    .sort((a, b) => a.x - b.x)
    .map(item => ({ item, value: parseSafeNumber(item.str) }))
    .filter(entry => entry.value !== null);
}

function isNumericValueLine(line) {
  return getNumericTokens(line).length >= 10;
}

function extractDescriptionLine(line) {
  const sorted = [...line.items].sort((a, b) => a.x - b.x);
  const tokens = sorted.map(item => item.str).filter(Boolean);
  if (tokens.length === 0) {
    return { slNo: null, sku: '', text: '' };
  }

  if (/^HSN\/?SAC$/i.test(tokens[0]) || /^HSN\/?SAC/i.test(line.text)) {
    return { slNo: null, sku: '', text: line.text };
  }

  const slNo = parseSafeNumber(tokens[0]);
  if (slNo !== null && tokens[1] && /[A-Z0-9]{3,8}/i.test(tokens[1])) {
    return {
      slNo,
      sku: tokens[1],
      text: tokens.slice(1).join(' '),
    };
  }

  return { slNo: null, sku: '', text: line.text };
}

function createProductRowFromNumericLine(descriptionLines, valueLine, debugRows) {
  const numericTokens = getNumericTokens(valueLine);
  if (numericTokens.length < 10) return null;

  // Herbalife value cells are the right-most numeric run:
  // [SL, Qty, Retail, Total, Discount, Taxable, SGST%, SGST Amt, CGST%, CGST Amt].
  // Product descriptions can contain SKU, pack size, and HSN numbers before this run.
  const valueTokens = numericTokens.slice(-10);
  const values = valueTokens.map(entry => entry.value);
  const expectedTotal = roundMoney(values[1] * values[2]);
  const expectedTaxable = roundMoney(values[3] - values[4]);
  const hasPlausibleValueShape =
    values[0] > 0 &&
    values[1] > 0 &&
    values[1] < 1000 &&
    values[2] > 0 &&
    Math.abs(expectedTotal - values[3]) <= 2 &&
    Math.abs(expectedTaxable - values[5]) <= 2 &&
    values[6] <= 50 &&
    values[8] <= 50;

  if (!hasPlausibleValueShape) {
    debugRows.push(`[TableExtractor] Skipped numeric row with implausible value shape: ${JSON.stringify(values)} from "${valueLine.text}"`);
    return null;
  }

  const firstValueItem = valueTokens[0].item;
  const valueLinePrefix = valueLine.items
    .filter(item => item.x < firstValueItem.x)
    .map(item => item.str)
    .join(' ')
    .trim();
  const descriptionText = [...descriptionLines.map(line => line.text), valueLinePrefix]
    .filter(Boolean)
    .join(' ')
    .trim();
  const { sku, remaining } = extractSKU(descriptionText);
  const hsn = extractHSN(remaining);
  const description = cleanDescription(remaining);
  const finalAmount = roundMoney(values[5] + values[7] + values[9]);
  const rawLines = [...descriptionLines.map(line => line.text), valueLine.text];

  const product = {
    slNo: values[0],
    sku,
    description,
    hsn,
    qty: values[1],
    unitPrice: values[2],
    totalRetail: values[3],
    discount: values[4],
    taxableValue: values[5],
    sgstRate: values[6],
    sgstAmount: values[7],
    cgstRate: values[8],
    cgstAmount: values[9],
    finalAmount,
    rawLines,
    debug: {
      rawPdfText: rawLines.join('\n'),
      textItems: valueLine.items.map(item => ({ str: item.str, x: item.x, y: item.y, width: item.width, height: item.height })),
      detectedRow: valueLine.text,
      detectedColumns: {
        sl: String(values[0]),
        qty: String(values[1]),
        retailPrice: String(values[2]),
        total: String(values[3]),
        discount: String(values[4]),
        taxableValue: String(values[5]),
        sgstRate: String(values[6]),
        sgstAmount: String(values[7]),
        cgstRate: String(values[8]),
        cgstAmount: String(values[9]),
      },
      parsedNumericValues: {
        qty: values[1],
        unitPrice: values[2],
        totalRetail: values[3],
        discount: values[4],
        taxableValue: values[5],
        sgstRate: values[6],
        sgstAmount: values[7],
        cgstRate: values[8],
        cgstAmount: values[9],
      },
      calculatedSubtotal: finalAmount,
    },
  };

  debugRows.push(`[TableExtractor] Parsed fallback product object: ${JSON.stringify(product, null, 2)}`);
  return product;
}

function fallbackExtractFromNumericRows(candidateLines, debugRows) {
  const rows = [];

  for (let i = 0; i < candidateLines.length; i++) {
    const line = candidateLines[i];
    if (!isNumericValueLine(line)) continue;

    const descriptionLines = [];
    for (let j = i - 1; j >= 0 && descriptionLines.length < 4; j--) {
      const previous = candidateLines[j];
      if (isNumericValueLine(previous) || isFooterLine(previous)) break;
      if (previous.text.trim()) descriptionLines.unshift(previous);
      if (/\b[A-Z0-9]{3,8}\b/.test(previous.text) && /[A-Z]/i.test(previous.text)) break;
    }

    const row = createProductRowFromNumericLine(descriptionLines, line, debugRows);
    if (row) rows.push(row);
  }

  return rows;
}

function buildColumns(line, bounds) {
  const binned = Object.fromEntries(EXPECTED_COLUMNS.map(column => [column, []]));
  for (const item of [...line.items].sort((a, b) => a.x - b.x)) {
    const column = getColumnForX(item.x, bounds);
    if (column) binned[column].push(item);
  }

  return Object.fromEntries(
    EXPECTED_COLUMNS.map(column => [column, textOf(binned[column])])
  );
}

function createProductRow(state, columns, line, debugRows) {
  const rowLabel = columns.sl || `line ${line.index}`;
  const numeric = {
    qty: parseRequiredNumber(columns.qty, 'qty', rowLabel, debugRows),
    unitPrice: parseRequiredNumber(columns.retailPrice, 'retailPrice', rowLabel, debugRows),
    totalRetail: parseRequiredNumber(columns.total, 'total', rowLabel, debugRows),
    discount: parseRequiredNumber(columns.discount, 'discount', rowLabel, debugRows),
    taxableValue: parseRequiredNumber(columns.taxableValue, 'taxableValue', rowLabel, debugRows),
    sgstRate: parseRequiredNumber(columns.sgstRate, 'sgstRate', rowLabel, debugRows),
    sgstAmount: parseRequiredNumber(columns.sgstAmount, 'sgstAmount', rowLabel, debugRows),
    cgstRate: parseRequiredNumber(columns.cgstRate, 'cgstRate', rowLabel, debugRows),
    cgstAmount: parseRequiredNumber(columns.cgstAmount, 'cgstAmount', rowLabel, debugRows),
  };

  if (Object.values(numeric).some(value => value === null)) {
    return null;
  }

  const fullDesc = state.descriptionParts.join(' ').trim();
  const { sku, remaining } = extractSKU(fullDesc);
  const hsn = extractHSN(remaining);
  const description = cleanDescription(remaining);
  const finalAmount = roundMoney(numeric.taxableValue + numeric.sgstAmount + numeric.cgstAmount);

  const product = {
    slNo: parseSafeNumber(columns.sl) || state.slNo || 0,
    sku: sku || state.sku || '',
    description,
    hsn,
    qty: numeric.qty,
    unitPrice: numeric.unitPrice,
    totalRetail: numeric.totalRetail,
    discount: numeric.discount,
    taxableValue: numeric.taxableValue,
    sgstRate: numeric.sgstRate,
    sgstAmount: numeric.sgstAmount,
    cgstRate: numeric.cgstRate,
    cgstAmount: numeric.cgstAmount,
    finalAmount,
    rawLines: [...state.rawLines, line.text],
    debug: {
      rawPdfText: [...state.rawLines, line.text].join('\n'),
      textItems: line.items.map(item => ({ str: item.str, x: item.x, y: item.y, width: item.width, height: item.height })),
      detectedRow: line.text,
      detectedColumns: columns,
      parsedNumericValues: numeric,
      calculatedSubtotal: finalAmount,
    },
  };

  debugRows.push(`[TableExtractor] Parsed product object: ${JSON.stringify(product, null, 2)}`);
  return product;
}

export function extractTableRows(layout) {
  const { allLines, zones } = layout;
  const tableBounds = inferTableBounds(allLines, zones);
  const debugRows = [];

  debugRows.push(`[TableExtractor] Header Index: ${tableBounds.headerIndex}, Start Index: ${tableBounds.startIndex}, End Index: ${tableBounds.endIndex}`);

  if (tableBounds.headerIndex < 0 && (!zones.valueLineIndices || zones.valueLineIndices.length === 0)) {
    debugRows.push('[TableExtractor] No table header or numeric value rows found. Coordinate extraction cannot continue.');
    extractTableRows.lastDebugLog = debugRows.join('\n');
    console.log(extractTableRows.lastDebugLog);
    return [];
  }
  if (tableBounds.headerIndex < 0) {
    debugRows.push('[TableExtractor] No table header found. Falling back to numeric value row coordinates.');
  }

  const candidateLines = allLines
    .slice(tableBounds.startIndex, tableBounds.endIndex + 1)
    .filter(line => line.items.length > 0 && !isFooterLine(line));

  const anchors = detectColumnAnchors(
    tableBounds.headerIndex >= 0 ? allLines[tableBounds.headerIndex] : null,
    candidateLines
  );
  const bounds = buildColumnBounds(anchors);
  debugRows.push(`[TableExtractor] Detected column anchors: ${JSON.stringify(anchors, null, 2)}`);
  debugRows.push(`[TableExtractor] Detected column bounds: ${JSON.stringify(bounds, null, 2)}`);

  const rows = [];
  let current = { descriptionParts: [], rawLines: [], sku: '', slNo: 0 };

  for (const line of candidateLines) {
    const columns = buildColumns(line, bounds);
    debugRows.push(`[TableExtractor] Raw PDF text: ${line.text}`);
    debugRows.push(`[TableExtractor] Text items with coordinates: ${line.items.map(formatItem).join(' | ')}`);
    debugRows.push(`[TableExtractor] Detected row: ${line.text}`);
    debugRows.push(`[TableExtractor] Detected columns: ${JSON.stringify(columns)}`);

    if (isValueColumns(columns)) {
      const row = createProductRow(current, columns, line, debugRows);
      if (row) rows.push(row);
      current = { descriptionParts: [], rawLines: [], sku: '', slNo: 0 };
      continue;
    }

    const descriptionText = [columns.sku, columns.description]
      .filter(Boolean)
      .join(' ')
      .trim();
    const leftSide = extractDescriptionLine(line);
    const maybeSlNo = leftSide.slNo ?? parseSafeNumber(columns.sl);
    if (maybeSlNo !== null && (leftSide.sku || columns.sku)) current.slNo = maybeSlNo;
    if ((leftSide.sku || columns.sku) && !current.sku) current.sku = leftSide.sku || columns.sku;
    if (leftSide.text) {
      current.descriptionParts.push(leftSide.text);
    } else if (descriptionText) {
      current.descriptionParts.push(descriptionText);
    }
    current.rawLines.push(line.text);
  }

  debugRows.push(`[TableExtractor] Extracted ${rows.length} product row(s) using coordinate reconstruction.`);
  if (rows.length === 0) {
    const fallbackRows = fallbackExtractFromNumericRows(candidateLines, debugRows);
    debugRows.push(`[TableExtractor] Fallback numeric-row extraction produced ${fallbackRows.length} product row(s).`);
    rows.push(...fallbackRows);
  }
  extractTableRows.lastDebugLog = debugRows.join('\n');
  console.log(extractTableRows.lastDebugLog);
  return rows;
}
