/**
 * Validator — Validates the complete extracted invoice with field-level
 * and cross-field validation rules.
 * 
 * Ensures data integrity before it reaches the database.
 * 
 * @module validator
 */

/**
 * @typedef {Object} ValidationResult
 * @property {boolean} isValid - True if no errors (warnings are OK)
 * @property {string[]} errors - Critical errors that prevent saving
 * @property {string[]} warnings - Non-critical issues (data may be imprecise)
 * @property {number} sumFinalAmounts - Calculated sum of all item final amounts + delivery
 * @property {number} difference - Absolute difference between calculated and stated total
 */

/**
 * Validate GSTIN format.
 * Indian GSTIN: 2 digits + 5 uppercase + 4 digits + 1 uppercase + 1 alphanumeric + 1 Z + 1 alphanumeric
 * 
 * @param {string} gstin - GSTIN string
 * @returns {boolean} True if valid format
 */
export function isValidGSTIN(gstin) {
  if (!gstin) return false;
  return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Zz]{1}[A-Z\d]{1}$/.test(gstin);
}

/**
 * Validate an extracted invoice number.
 * Must be alphanumeric with optional hyphens/slashes, length 5+.
 * 
 * @param {string} invoiceNumber - Invoice number
 * @returns {boolean} True if valid format
 */
export function isValidInvoiceNumber(invoiceNumber) {
  if (!invoiceNumber) return false;
  return /^[A-Z0-9/-]{5,}$/i.test(invoiceNumber.trim());
}

/**
 * Try to parse a date string into a valid Date.
 * Supports formats: DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, DD MMM YYYY.
 * 
 * @param {string} dateStr - Date string
 * @returns {Date|null} Parsed date or null
 */
export function parseDate(dateStr) {
  if (!dateStr) return null;

  const str = dateStr.trim();

  // Try DD MMM YYYY (e.g., "06 JUN 2025")
  const dmy = str.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[2]} ${dmy[1]}, ${dmy[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // Try DD-MM-YYYY or DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (ddmmyyyy) {
    const d = new Date(parseInt(ddmmyyyy[3]), parseInt(ddmmyyyy[2]) - 1, parseInt(ddmmyyyy[1]));
    if (!isNaN(d.getTime())) return d;
  }

  // Try YYYY-MM-DD
  const ymd = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (ymd) {
    const d = new Date(parseInt(ymd[1]), parseInt(ymd[2]) - 1, parseInt(ymd[3]));
    if (!isNaN(d.getTime())) return d;
  }

  // Native fallback
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Validate an individual table row's internal consistency.
 * 
 * @param {Object} row - Extracted table row
 * @returns {{ valid: boolean, issues: string[] }}
 */
export function validateRow(row) {
  const issues = [];

  // Check: unitPrice * qty - discount ≈ taxableValue (tolerance ₹1.00)
  const expectedTaxable = (row.unitPrice * row.qty) - row.discount;
  if (Math.abs(expectedTaxable - row.taxableValue) > 1.0) {
    issues.push(
      `Row ${row.slNo}: Expected taxable ₹${expectedTaxable.toFixed(2)} but got ₹${row.taxableValue.toFixed(2)}`
    );
  }

  // Check: taxableValue + sgstAmount + cgstAmount ≈ finalAmount (tolerance ₹0.50)
  const expectedFinal = row.taxableValue + row.sgstAmount + row.cgstAmount;
  if (Math.abs(expectedFinal - row.finalAmount) > 0.50) {
    issues.push(
      `Row ${row.slNo}: Expected final ₹${expectedFinal.toFixed(2)} but got ₹${row.finalAmount.toFixed(2)}`
    );
  }

  // Check: qty > 0
  if (row.qty <= 0) {
    issues.push(`Row ${row.slNo}: Quantity must be positive, got ${row.qty}`);
  }

  // Check: unitPrice > 0
  if (row.unitPrice <= 0) {
    issues.push(`Row ${row.slNo}: Unit price must be positive, got ${row.unitPrice}`);
  }

  return { valid: issues.length === 0, issues };
}

/**
 * Validate a complete extracted invoice.
 * 
 * @param {Object} params
 * @param {Object} params.fields - Extracted field results from fieldMapper
 * @param {Object[]} params.rows - Extracted table rows from tableExtractor
 * @param {Object} params.delivery - Delivery charges from fieldMapper
 * @param {Object} params.profile - Extraction profile
 * @returns {ValidationResult}
 */
export function validateInvoice({ fields, rows, delivery, profile }) {
  const errors = [];
  const warnings = [];

  // --- Field-level validation ---

  // Required fields check
  for (const fieldDef of profile.fields) {
    const result = fields[fieldDef.name];
    if (fieldDef.required && (!result || !result.found)) {
      errors.push(`${fieldDef.label} could not be detected.`);
    }
  }

  // GSTIN format validation (if found)
  const gstinResult = fields.gstin;
  if (gstinResult && gstinResult.found && !isValidGSTIN(gstinResult.value)) {
    warnings.push(`GSTIN "${gstinResult.value}" does not match expected format.`);
  }

  // Invoice number format validation (if found)
  const invResult = fields.invoiceNumber;
  if (invResult && invResult.found && !isValidInvoiceNumber(invResult.value)) {
    warnings.push(`Invoice number "${invResult.value}" has unusual format.`);
  }

  // Date validation (if found)
  const dateResult = fields.invoiceDate;
  if (dateResult && dateResult.found) {
    const parsed = parseDate(dateResult.value);
    if (!parsed) {
      warnings.push(`Invoice date "${dateResult.value}" could not be parsed.`);
    }
  }

  // --- Row-level validation ---
  if (rows.length === 0) {
    errors.push('No product line items could be extracted.');
  }

  for (const row of rows) {
    const rowValidation = validateRow(row);
    if (!rowValidation.valid) {
      errors.push(...rowValidation.issues);
    }
  }

  // --- Cross-field validation ---

  const subtotal = Math.round(rows.reduce((sum, row) => sum + row.taxableValue, 0) * 100) / 100;
  const tax = Math.round(
    rows.reduce((sum, row) => sum + row.sgstAmount + row.cgstAmount + (row.igstAmount || 0), 0) * 100
  ) / 100;
  const charges = delivery?.total || 0;

  // subtotal + product tax + delivery charges total ≈ invoice total (tolerance ₹2.00)
  const sumFinalAmounts = Math.round((subtotal + tax + charges) * 100) / 100;

  const totalAmount = fields.totalAmount?.found ? fields.totalAmount.value : 0;
  const difference = Math.round(Math.abs(sumFinalAmounts - totalAmount) * 100) / 100;

  if (totalAmount > 0 && difference > 2.0) {
    const rowDiagnostics = rows.map(row => {
      const rowTotal = Math.round((row.taxableValue + row.sgstAmount + row.cgstAmount + (row.igstAmount || 0)) * 100) / 100;
      const expectedTaxable = Math.round(((row.unitPrice * row.qty) - row.discount) * 100) / 100;
      const rowDiff = Math.round(Math.abs(expectedTaxable - row.taxableValue) * 100) / 100;
      return `Row ${row.slNo || '?'} ${row.sku || ''}: taxable ₹${row.taxableValue.toFixed(2)}, tax ₹${(row.sgstAmount + row.cgstAmount + (row.igstAmount || 0)).toFixed(2)}, row total ₹${rowTotal.toFixed(2)}, taxable check diff ₹${rowDiff.toFixed(2)}`;
    });

    errors.push(
      `Calculated total (₹${sumFinalAmounts.toFixed(2)}) differs from Invoice Total (₹${totalAmount.toFixed(2)}) by ₹${difference.toFixed(2)}. ` +
      `Breakdown: subtotal ₹${subtotal.toFixed(2)} + tax ₹${tax.toFixed(2)} + delivery charges ₹${charges.toFixed(2)}. ` +
      `Rows checked: ${rowDiagnostics.join(' | ')}`
    );
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    sumFinalAmounts,
    subtotal,
    tax,
    charges,
    difference,
  };
}
