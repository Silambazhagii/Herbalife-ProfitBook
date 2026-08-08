/**
 * Extraction Profile — Configurable field definitions and column layouts.
 * 
 * Each profile defines:
 * - Field extraction patterns (regex, zone hint, priority)
 * - Table column layout expectations
 * - Normalization rules
 * 
 * The default profile is tuned for Herbalife India Tax Invoices.
 */

/**
 * @typedef {Object} FieldDefinition
 * @property {string} name - Field identifier
 * @property {string} label - Human-readable label
 * @property {RegExp[]} patterns - Array of regex patterns to try (in priority order)
 * @property {string} zone - Where to look: 'header', 'address', 'footer', 'any'
 * @property {boolean} required - Whether missing this field is an error vs a warning
 * @property {function} [normalize] - Optional normalizer function
 */

/**
 * Default Herbalife India Tax Invoice extraction profile.
 */
export const HERBALIFE_PROFILE = {
  name: 'herbalife_india',
  label: 'Herbalife International India Tax Invoice',

  /** Field definitions for header-level extraction */
  fields: [
    {
      name: 'invoiceNumber',
      label: 'Invoice Number',
      patterns: [
        /(?:Invoice\s*No|Invoice\s*#|Inv\s*No|Invoice\s*Number|Factura)[:.;\s-]*([A-Z0-9/-]+)/i,
        /\b(TNI\d{7,})\b/i,
        /\b(INV[- ]?\d{4,})\b/i,
      ],
      zone: 'header',
      required: true,
      normalize: (val) => val.trim().toUpperCase(),
    },
    {
      name: 'orderNumber',
      label: 'Order Number',
      patterns: [
        /(?:Order\s*No|Order\s*#|Order\s*Number)[:.;\s-]*([A-Z0-9/-]+)/i,
        /\b(3I\d{7,})\b/i,
      ],
      zone: 'header',
      required: false,
      normalize: (val) => val.trim(),
    },
    {
      name: 'invoiceDate',
      label: 'Invoice Date',
      patterns: [
        /(?:Invoice\s*Date|Inv\.?\s*Date)[:.;\s-]*(\d{1,2}[-/\s]\w{3}[-/\s]\d{2,4})/i,
        /(?:Invoice\s*Date|Inv\.?\s*Date)[:.;\s-]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
        /(?:Date|Billing\s*Date)[:.;\s-]*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i,
        /(?:Date|Billing\s*Date)[:.;\s-]*(\d{1,2}[-/\s]\w{3}[-/\s]\d{2,4})/i,
      ],
      zone: 'header',
      required: true,
      normalize: (val) => val.trim(),
    },
    {
      name: 'gstin',
      label: 'GSTIN',
      patterns: [
        /\b(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Zz]{1}[A-Z\d]{1})\b/,
      ],
      zone: 'any',
      required: false,
      normalize: (val) => val.trim().toUpperCase(),
    },
    {
      name: 'customerName',
      label: 'Customer Name',
      patterns: [
        /(?:Ship\s*To|Shipped\s*To)\s*:\s*\n*\s*Name\s*:\s*([^\n]+)/i,
        /(?:Purchased\s*By|Sold\s*To)\s*:\s*\n*(?:.*\n)*?Name\s*:\s*([^\n]+)/i,
        /(?:Bill\s*To|Billed\s*To)\s*:\s*\n*\s*Name\s*:\s*([^\n]+)/i,
        /Name\s*:\s*([A-Za-z\s.]+?)(?=\s*\n|\s*Address|\s*$)/i,
      ],
      zone: 'address',
      required: false,
      normalize: (val) => val.trim(),
    },
    {
      name: 'customerAddress',
      label: 'Customer Address',
      patterns: [
        /Address\s*:\s*([\s\S]+?)(?=\bState\b|\bPlace\b|\bGSTIN\b|\bOrder\b|\bPurchased\b|\bShip\b|\bSL\b|\bAuthorised\b)/i,
      ],
      zone: 'address',
      required: false,
      normalize: (val) => val.trim().replace(/\s+/g, ' '),
    },
    {
      name: 'totalAmount',
      label: 'Invoice Total',
      patterns: [
        /(?:Invoice\s*Total|Invoice\s*Value)[:.;\s-]*(?:₹|Rs\.?\s*)?([0-9,]+(?:\.[0-9]+)?)/i,
        /(?:Grand\s*Total|Net\s*Total)[:.;\s-]*(?:₹|Rs\.?\s*)?([0-9,]+(?:\.[0-9]+)?)/i,
        /Total[:.;\s-]*(?:₹|Rs\.?\s*)?([0-9,]+(?:\.[0-9]+)?)\s*$/im,
      ],
      zone: 'footer',
      required: true,
      normalize: (val) => parseFloat(val.replace(/,/g, '')),
    },
    {
      name: 'state',
      label: 'State',
      patterns: [
        /State[:.;\s]*([A-Za-z\s]+?)(?=\s*State|\s*Place|\s*GSTIN|\s*Code|\s*Purchased|\s*$)/i,
      ],
      zone: 'any',
      required: false,
      normalize: (val) => val.trim().toUpperCase(),
    },
    {
      name: 'placeOfSupply',
      label: 'Place of Supply',
      patterns: [
        /Place\s*of\s*Supply[:.;\s]*([A-Za-z\s]+?)(?=\s*State|\s*Place|\s*GSTIN|\s*Code|\s*Purchased|\s*$)/i,
      ],
      zone: 'any',
      required: false,
      normalize: (val) => val.trim().toUpperCase(),
    },
  ],

  /**
   * Table column expectations.
   * These keywords help identify the header row and column positions.
   */
  tableColumns: {
    headerKeywords: ['sl', 'sku', 'description', 'qty', 'retail', 'price', 'discount', 'taxable', 'sgst', 'cgst', 'hsn'],
    // Expected column order in Herbalife invoices (for the numeric value row):
    // [SL, Qty, RetailPricePerUnit, TotalRetail, Discount, TaxableValue, SGSTRate, SGSTAmt, CGSTRate, CGSTAmt]
    numericColumnCount: 10,
  },

  /**
   * Delivery charges extraction
   */
  deliveryCharges: {
    patterns: [
      /\b(?:Delivery|Courier|Shipping|Handling)\s*(?:&|and)?\s*(?:Handling)?\s*Charges?\b.*?(?:₹|Rs\.?\s*)?([0-9]{1,4}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]{1,5}\.[0-9]{2})\b/i,
    ],
    taxRate: 0.18, // 18% GST on delivery
  },

  /**
   * Document type detection keywords
   */
  documentType: {
    purchaseKeywords: ['HERBALIFE INTERNATIONAL INDIA', 'SOLD TO: HERBALIFE'],
    salesKeywords: ['TAX INVOICE'],
    priceListKeywords: ['RETAIL PRICE LIST', 'VOLUME POINT', 'EARNING OPPORTUNITY'],
    invoiceKeywords: ['INVOICE NO', 'TAX INVOICE', 'HSN/SAC'],
  },
};

/**
 * Get the default extraction profile.
 * @returns {Object} The default Herbalife profile
 */
export function getDefaultProfile() {
  return HERBALIFE_PROFILE;
}

/**
 * Get a profile by name.
 * @param {string} name - Profile name
 * @returns {Object|null} The profile or null
 */
export function getProfile(name) {
  const profiles = {
    herbalife_india: HERBALIFE_PROFILE,
  };
  return profiles[name] || null;
}
