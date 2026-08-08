globalThis.DOMMatrix = class DOMMatrix {
  constructor() {
    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
  }
};
globalThis.URL = class URL {
  constructor(url) {
    this.href = url;
  }
  toString() {
    return this.href;
  }
};

async function main() {
  const { testBasicCalculations, testFIFOEngine, testNegativeStockCheck } = await import('./calculations.test.js');
  const { testFuzzyProductMatching, testDocumentClassification, testInvoiceParsing, testMultiLineHerbalifeInvoiceParsing } = await import('./parser.test.js');
  const {
    testLineReconstruction,
    testEmptyLineReconstruction,
    testLayoutZoneDetection,
    testFieldExtraction,
    testDocumentTypeDetection,
    testDeliveryChargeExtraction,
    testGSTINValidation,
    testInvoiceNumberValidation,
    testDateParsing,
    testRowValidation,
    testConfidenceThreshold,
    testConfidenceScoring,
    testMultiItemInvoicePipeline,
    testPipelineWithNoItems,
  } = await import('./extraction.test.js');

  let passCount = 0;
  let failCount = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failCount++;
    }
  }

  function runSuite(name, suiteFn) {
    console.log(`\n🏃 Running Suite: ${name}`);
    try {
      suiteFn(assert);
    } catch (err) {
      console.error(`  💥 CRASH: Suite crashed with error:`, err);
      failCount++;
    }
  }

  console.log("============= ProfitBook Test Runner =============");

  // --- Original Test Suites ---
  runSuite("Basic Accounting Formulas", testBasicCalculations);
  runSuite("FIFO Stock Engine", testFIFOEngine);
  runSuite("Negative Stock Validations", testNegativeStockCheck);
  runSuite("Fuzzy Product Match Engine", testFuzzyProductMatching);
  runSuite("Document Classifier", testDocumentClassification);
  runSuite("Invoice Text Extraction", testInvoiceParsing);
  runSuite("Multi-line Herbalife Invoice Parsing", testMultiLineHerbalifeInvoiceParsing);

  const { testAll10InvoicesReconciliation } = await import('./invoices10.test.js');

  // --- New Extraction Pipeline Test Suites ---
  console.log("\n============= Extraction Pipeline Tests =============");
  runSuite("Line Reconstruction", testLineReconstruction);
  runSuite("Empty Line Reconstruction", testEmptyLineReconstruction);
  runSuite("Layout Zone Detection", testLayoutZoneDetection);
  runSuite("Field Extraction (Profile-Based)", testFieldExtraction);
  runSuite("Document Type Detection (Profile-Based)", testDocumentTypeDetection);
  runSuite("Delivery Charge Extraction", testDeliveryChargeExtraction);
  runSuite("GSTIN Validation", testGSTINValidation);
  runSuite("Invoice Number Validation", testInvoiceNumberValidation);
  runSuite("Date Parsing", testDateParsing);
  runSuite("Row Validation", testRowValidation);
  runSuite("Confidence Threshold", testConfidenceThreshold);
  runSuite("Confidence Scoring", testConfidenceScoring);
  runSuite("Multi-Item Invoice Pipeline (Integration)", testMultiItemInvoicePipeline);
  runSuite("Pipeline With No Items (Edge Case)", testPipelineWithNoItems);

  console.log("\n============= 10-Invoice Audit & Reconciliation Suite =============");
  await testAll10InvoicesReconciliation(assert);

  console.log("\n=================== Summary ===================");
  console.log(`📊 Passed: ${passCount}`);
  console.log(`📊 Failed: ${failCount}`);

  if (failCount > 0) {
    console.error("❌ Tests failed!");
    process.exit(1);
  } else {
    console.log("🏆 All tests passed successfully!");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Failed to run tests:", err);
  process.exit(1);
});
