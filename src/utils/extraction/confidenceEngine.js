/**
 * Confidence Engine — Assigns confidence scores to every extracted field and row.
 * 
 * Combines:
 * - Pattern match strength (which regex pattern matched)
 * - Cross-validation results (do totals reconcile?)
 * - Product matching confidence from fuzzy matcher
 * 
 * Any field with confidence < 0.92 is flagged for user review.
 * Never silently save uncertain values.
 * 
 * @module confidenceEngine
 */

/**
 * Confidence threshold below which user confirmation is required.
 */
export const CONFIDENCE_THRESHOLD = 0.95;

/**
 * @typedef {Object} ScoredField
 * @property {*} value - The extracted value
 * @property {number} confidence - Confidence score (0.0 to 1.0)
 * @property {string} source - How the value was obtained
 * @property {boolean} requiresReview - Whether this field needs user confirmation
 */

/**
 * @typedef {Object} ScoredItem
 * @property {Object} data - All item fields
 * @property {number} overallConfidence - Overall confidence for this line item
 * @property {boolean} requiresReview - Whether any field needs user review
 * @property {Object} fieldConfidences - Per-field confidence breakdown
 */

/**
 * Score a header-level field based on extraction quality.
 * 
 * @param {Object} fieldResult - FieldResult from fieldMapper
 * @param {Object} validationResult - ValidationResult from validator
 * @param {string} fieldName - Name of the field
 * @returns {ScoredField}
 */
function scoreField(fieldResult, validationResult, fieldName) {
  if (!fieldResult.found) {
    return {
      value: null,
      confidence: 0,
      source: 'not_found',
      requiresReview: true,
    };
  }

  let confidence = fieldResult.confidence;

  // Boost confidence if cross-validation passed for totalAmount
  if (fieldName === 'totalAmount' && validationResult.difference <= 2.0) {
    confidence = Math.min(1.0, confidence + 0.05);
  }

  // Reduce confidence if there are validation warnings related to this field
  const hasRelatedWarning = validationResult.warnings.some(
    w => w.toLowerCase().includes(fieldName.toLowerCase())
  );
  if (hasRelatedWarning) {
    confidence = Math.max(0.3, confidence - 0.15);
  }

  return {
    value: fieldResult.value,
    confidence: Math.round(confidence * 100) / 100,
    source: fieldResult.source,
    requiresReview: confidence < CONFIDENCE_THRESHOLD,
  };
}

/**
 * Score a product line item based on extraction quality and product matching.
 * 
 * @param {Object} row - ExtractedRow from tableExtractor
 * @param {Object} productMatch - { product, confidence } from fuzzy matcher
 * @param {Object} validationResult - ValidationResult from validator
 * @returns {ScoredItem}
 */
function scoreItem(row, productMatch, validationResult) {
  const fieldConfidences = {};

  // SKU confidence: high if non-empty and alphanumeric
  fieldConfidences.sku = row.sku
    ? { confidence: 0.95, requiresReview: false }
    : { confidence: 0.5, requiresReview: true };

  // HSN confidence: high if 6-8 digit code
  fieldConfidences.hsn = /^\d{6,8}$/.test(row.hsn)
    ? { confidence: 0.98, requiresReview: false }
    : { confidence: 0.4, requiresReview: true };

  // Description/Product match confidence
  const matchConfidence = productMatch.confidence / 100; // Convert from 0-100 to 0-1
  fieldConfidences.productName = {
    confidence: matchConfidence,
    requiresReview: matchConfidence < CONFIDENCE_THRESHOLD,
  };

  // Numeric field confidence: high if row validation passed
  const rowHasIssues = validationResult.warnings.some(
    w => w.includes(`Row ${row.slNo}`)
  );
  const numericConfidence = rowHasIssues ? 0.75 : 0.98;

  fieldConfidences.qty = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };
  fieldConfidences.unitPrice = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };
  fieldConfidences.taxableValue = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };
  fieldConfidences.sgstAmount = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };
  fieldConfidences.cgstAmount = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };
  fieldConfidences.finalAmount = { confidence: numericConfidence, requiresReview: numericConfidence < CONFIDENCE_THRESHOLD };

  // Overall item confidence = minimum of all field confidences
  const allConfidences = Object.values(fieldConfidences).map(fc => fc.confidence);
  const overallConfidence = Math.min(...allConfidences);
  const requiresReview = overallConfidence < CONFIDENCE_THRESHOLD;

  return {
    data: row,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    requiresReview,
    fieldConfidences,
  };
}

/**
 * Run the confidence engine on a complete extraction result.
 * 
 * @param {Object} params
 * @param {Object} params.fieldResults - Field extraction results from fieldMapper
 * @param {Object[]} params.rows - Table rows from tableExtractor
 * @param {Object[]} params.productMatches - Product matches for each row
 * @param {Object} params.validationResult - Validation result
 * @returns {Object} Scored extraction with confidence on every field and item
 */
export function computeConfidenceScores({ fieldResults, rows, productMatches, validationResult }) {
  // Score header fields
  const scoredFields = {};
  for (const [name, result] of Object.entries(fieldResults)) {
    scoredFields[name] = scoreField(result, validationResult, name);
  }

  // Score line items
  const scoredItems = rows.map((row, index) => {
    const productMatch = productMatches[index] || { product: null, confidence: 0 };
    return scoreItem(row, productMatch, validationResult);
  });

  // Overall invoice confidence = minimum of all field and item confidences
  const allFieldConfidences = Object.values(scoredFields).filter(sf => sf.confidence > 0).map(sf => sf.confidence);
  const allItemConfidences = scoredItems.map(si => si.overallConfidence);
  const allConfidences = [...allFieldConfidences, ...allItemConfidences];

  const overallConfidence = allConfidences.length > 0
    ? Math.round(Math.min(...allConfidences) * 100) / 100
    : 0;

  const requiresReview = overallConfidence < CONFIDENCE_THRESHOLD;

  return {
    scoredFields,
    scoredItems,
    overallConfidence,
    requiresReview,
  };
}
