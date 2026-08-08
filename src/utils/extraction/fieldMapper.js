/**
 * Field Mapper — Extracts header-level fields using configurable extraction profiles.
 * 
 * Each field extraction returns both the value and a confidence score,
 * enabling the confidence engine to flag uncertain values.
 * 
 * @module fieldMapper
 */

/**
 * @typedef {Object} FieldResult
 * @property {*} value - Extracted value (string, number, etc.)
 * @property {number} confidence - Confidence score (0.0 to 1.0)
 * @property {string} source - Which pattern matched ('pattern_0', 'pattern_1', etc.)
 * @property {boolean} found - Whether the field was found at all
 */

/**
 * Extract a single field from text using a field definition.
 * Tries patterns in priority order; higher-priority patterns get higher confidence.
 * 
 * @param {string} text - Full document text to search
 * @param {Object} fieldDef - Field definition from extraction profile
 * @returns {FieldResult} Extraction result with confidence
 */
function extractField(text, fieldDef) {
  const { patterns, normalize } = fieldDef;

  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match && match[1]) {
      let value = match[1].trim();

      // Apply normalizer if defined
      if (normalize) {
        try {
          value = normalize(value);
        } catch {
          // If normalization fails, use raw value
        }
      }

      // Confidence is highest for the first (most specific) pattern
      // and decreases for fallback patterns
      const baseConfidence = 1.0 - (i * 0.08);
      const confidence = Math.max(0.5, Math.min(1.0, baseConfidence));

      return {
        value,
        confidence,
        source: `pattern_${i}`,
        found: true,
      };
    }
  }

  return {
    value: null,
    confidence: 0,
    source: 'not_found',
    found: false,
  };
}

/**
 * Extract all header-level fields from document text using the extraction profile.
 * 
 * @param {string} fullText - Full reconstructed document text
 * @param {Object} profile - Extraction profile with field definitions
 * @returns {Object} Map of field names to FieldResult objects
 */
export function extractFields(fullText, profile) {
  const results = {};

  for (const fieldDef of profile.fields) {
    results[fieldDef.name] = extractField(fullText, fieldDef);
  }

  return results;
}

/**
 * Extract delivery charges from document text.
 * 
 * @param {string} fullText - Full document text
 * @param {Object} profile - Extraction profile
 * @returns {{ taxable: number, tax: number, total: number, confidence: number }}
 */
export function extractDeliveryCharges(fullText, profile) {
  const deliveryConfig = profile.deliveryCharges;
  if (!deliveryConfig) {
    return { taxable: 0, tax: 0, total: 0, confidence: 1.0 };
  }

  const lines = fullText.split('\n');
  let deliveryLineIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    for (const pattern of deliveryConfig.patterns) {
      if (pattern.test(lines[i])) {
        deliveryLineIdx = i;
        break;
      }
    }
    if (deliveryLineIdx !== -1) break;
  }

  if (deliveryLineIdx === -1) {
    return { taxable: 0, tax: 0, total: 0, confidence: 1.0 };
  }

  // First try to extract from the same line using the patterns
  const deliveryLine = lines[deliveryLineIdx];
  for (const pattern of deliveryConfig.patterns) {
    const match = deliveryLine.match(pattern);
    if (match && match[1]) {
      const taxable = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(taxable) && taxable > 0 && taxable < 10000) {
        const tax = Math.round((taxable * deliveryConfig.taxRate) * 100) / 100;
        const total = Math.round((taxable + tax) * 100) / 100;
        return { taxable, tax, total, confidence: 0.95 };
      }
    }
  }

  // If not found on the same line, scan the next 15 lines for 'Taxable Value'
  const maxScanLines = Math.min(lines.length, deliveryLineIdx + 15);
  for (let i = deliveryLineIdx; i < maxScanLines; i++) {
    const fallbackMatch = lines[i].match(/\bTaxable\s+Value\s+([0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?)/i);
    if (fallbackMatch && fallbackMatch[1]) {
      const taxable = parseFloat(fallbackMatch[1].replace(/,/g, ''));
      if (!isNaN(taxable) && taxable > 0 && taxable < 10000) {
        const tax = Math.round((taxable * deliveryConfig.taxRate) * 100) / 100;
        const total = Math.round((taxable + tax) * 100) / 100;
        return { taxable, tax, total, confidence: 0.90 };
      }
    }
  }

  return { taxable: 0, tax: 0, total: 0, confidence: 1.0 };
}

/**
 * Detect document type from text content.
 * 
 * @param {string} text - Full document text
 * @param {Object} profile - Extraction profile
 * @returns {{ type: string, confidence: number }}
 */
export function detectDocumentTypeFromProfile(text, profile) {
  const content = text.toUpperCase();
  const dtConfig = profile.documentType;

  // Check for invoice keywords first
  const hasInvoiceKeyword = dtConfig.invoiceKeywords.some(kw => content.includes(kw));

  if (hasInvoiceKeyword) {
    // Check if it's a purchase invoice (from Herbalife to the user)
    const isPurchase = dtConfig.purchaseKeywords.some(kw => content.includes(kw));
    if (isPurchase) {
      return { type: 'purchase_invoice', confidence: 0.98 };
    }
    return { type: 'sales_invoice', confidence: 0.90 };
  }

  // Check for price list
  const isPriceList = dtConfig.priceListKeywords.some(kw => content.includes(kw));
  if (isPriceList) {
    return { type: 'price_update_sheet', confidence: 0.95 };
  }

  return { type: 'herbalife_product_list', confidence: 0.5 };
}

/**
 * Build a flat extracted fields object from FieldResult map (for backward compatibility).
 * 
 * @param {Object} fieldResults - Map of field names to FieldResult objects
 * @returns {Object} Flat object with field values
 */
export function flattenFieldResults(fieldResults) {
  const flat = {};
  for (const [name, result] of Object.entries(fieldResults)) {
    flat[name] = result.found ? result.value : (name === 'totalAmount' ? 0 : '');
  }
  return flat;
}
