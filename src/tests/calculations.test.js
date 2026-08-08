import {
  calculatePurchaseValue,
  calculateSalesValue,
  calculateGrossProfit,
  calculateProfitPercent,
  runFIFOEngine,
  wouldBeNegativeStock
} from '../utils/calculationEngine.js';

export function testBasicCalculations(assert) {
  // Test basic formulas
  assert(calculatePurchaseValue(5, 1200) === 6000, "Purchase value should be Qty * Rate");
  assert(calculateSalesValue(3, 1500) === 4500, "Sales value should be Qty * Rate");
  assert(calculateGrossProfit(4500, 3600) === 900, "Gross profit should be Sales Value - Cost Value");
  assert(calculateProfitPercent(900, 3600) === 25, "Profit % should be Gross Profit / Cost * 100");
  assert(calculateProfitPercent(100, 0) === 0, "Profit % with zero cost should be 0");
}

export function testFIFOEngine(assert) {
  const masterProducts = [
    { name: 'Formula 1 Vanilla', mrp: 2449, volume: 21.75 }
  ];

  const transactions = [
    // Purchase 5 at ₹1500 on day 1
    { id: '1', type: 'purchase', date: '2026-06-01T00:00:00.000Z', product: 'Formula 1 Vanilla', qty: 5, rate: 1500 },
    // Purchase 5 at ₹1600 on day 2
    { id: '2', type: 'purchase', date: '2026-06-02T00:00:00.000Z', product: 'Formula 1 Vanilla', qty: 5, rate: 1600 },
    // Sale of 7 at ₹2000 on day 3 (should consume 5 at ₹1500 and 2 at ₹1600 = ₹7500 + ₹3200 = ₹10700 cost)
    { id: '3', type: 'sale', date: '2026-06-03T00:00:00.000Z', product: 'Formula 1 Vanilla', qty: 7, rate: 2000 }
  ];

  const result = runFIFOEngine(transactions, masterProducts);
  
  // Verify remaining stock is 3
  const vanillaStock = result.productStats.find(p => p.product === 'Formula 1 Vanilla');
  assert(vanillaStock.stock === 3, `Vanilla stock should be 3, got ${vanillaStock.stock}`);
  
  // Verify valuation: 3 * 1600 = 4800
  assert(vanillaStock.valuation === 4800, `Vanilla stock valuation should be 4800, got ${vanillaStock.valuation}`);

  // Verify cost of goods sold for sale
  const saleTx = result.salesDetails.find(s => s.id === '3');
  assert(saleTx.costOfGoodsSold === 10700, `Cost of goods sold should be 10700, got ${saleTx.costOfGoodsSold}`);
  
  // Sales value: 7 * 2000 = 14000. Profit: 14000 - 10700 = 3300.
  assert(saleTx.grossProfit === 3300, `Gross profit should be 3300, got ${saleTx.grossProfit}`);
}

export function testNegativeStockCheck(assert) {
  const transactions = [
    { type: 'purchase', product: 'Formula 1 Vanilla', qty: 3, rate: 1500, date: '2026-06-01T00:00:00.000Z' },
    { type: 'sale', product: 'Formula 1 Vanilla', qty: 2, rate: 2000, date: '2026-06-02T00:00:00.000Z' }
  ];

  // Try to sell 2 more (Total Stock: 3 - 2 = 1. Selling 2 would result in -1, so negative stock = true)
  const isNegative = wouldBeNegativeStock(transactions, {
    type: 'sale',
    product: 'Formula 1 Vanilla',
    qty: 2
  });

  assert(isNegative === true, "Should flag negative stock when selling more than available");

  // Try to sell 1 (should be fine)
  const isNegativeOk = wouldBeNegativeStock(transactions, {
    type: 'sale',
    product: 'Formula 1 Vanilla',
    qty: 1
  });

  assert(isNegativeOk === false, "Should not flag negative stock when selling available amount");
}
