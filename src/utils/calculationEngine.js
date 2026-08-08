/**
 * Centralized Calculation Engine for Herbalife ProfitBook.
 * Contains core formula calculations and FIFO stock lot logic.
 */

/**
 * Calculate purchase value.
 * @param {number} qty 
 * @param {number} rate 
 * @returns {number}
 */
export function calculatePurchaseValue(qty, rate) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  return q * r;
}

/**
 * Calculate sales value.
 * @param {number} qty 
 * @param {number} rate 
 * @returns {number}
 */
export function calculateSalesValue(qty, rate) {
  const q = Number(qty) || 0;
  const r = Number(rate) || 0;
  return q * r;
}

/**
 * Calculate Gross Profit.
 * @param {number} salesValue 
 * @param {number} costValue 
 * @returns {number}
 */
export function calculateGrossProfit(salesValue, costValue) {
  return (Number(salesValue) || 0) - (Number(costValue) || 0);
}

/**
 * Calculate Profit % based on Gross Profit and Cost (Purchase Value).
 * @param {number} grossProfit 
 * @param {number} costValue 
 * @returns {number}
 */
export function calculateProfitPercent(grossProfit, costValue) {
  const cost = Number(costValue) || 0;
  if (cost <= 0) return 0;
  return (grossProfit / cost) * 100;
}

/**
 * Main FIFO Lot engine. Processes all transactions in chronological order.
 * Outputs current stocks, lots, sales with cost analysis, and metrics.
 * @param {Array} transactions 
 * @param {Array} masterProducts 
 */
export function runFIFOEngine(transactions, masterProducts = []) {
  // Sort transactions chronologically
  const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Initialize stock lots per product name
  // Key: product name (case-insensitive) -> Array of lots: { id, date, rate, qty, remainingQty }
  const lotsMap = {};
  
  // Track running stats per product
  const productStats = {};

  // Initialize all master products with 0 stock
  masterProducts.forEach(p => {
    productStats[p.name] = {
      product: p.name,
      totalPurchased: 0,
      totalSold: 0,
      stock: 0,
      valuation: 0
    };
  });

  const salesDetails = [];

  for (const tx of sortedTx) {
    const productName = tx.product;
    const qty = Number(tx.qty) || 0;
    const rate = Number(tx.rate) || 0;

    if (!productStats[productName]) {
      productStats[productName] = {
        product: productName,
        totalPurchased: 0,
        totalSold: 0,
        stock: 0,
        valuation: 0
      };
    }

    if (tx.type === 'purchase') {
      // Create new lot
      if (!lotsMap[productName]) {
        lotsMap[productName] = [];
      }
      lotsMap[productName].push({
        id: tx.id,
        date: tx.date,
        rate: rate,
        qty: qty,
        remainingQty: qty
      });

      productStats[productName].totalPurchased += qty;
      productStats[productName].stock += qty;

    } else if (tx.type === 'sale') {
      let remainingToConsume = qty;
      let totalCostOfSale = 0;
      
      const productLots = lotsMap[productName] || [];

      // Consume from lots using FIFO
      for (const lot of productLots) {
        if (remainingToConsume <= 0) break;
        if (lot.remainingQty > 0) {
          const consumeQty = Math.min(lot.remainingQty, remainingToConsume);
          lot.remainingQty -= consumeQty;
          remainingToConsume -= consumeQty;
          totalCostOfSale += consumeQty * lot.rate;
        }
      }

      // If we sold more than purchased (negative stock fallback, though validated in UI)
      if (remainingToConsume > 0) {
        // Find product mrp from master products if available
        const productDef = masterProducts.find(p => p.name === productName);
        const fallbackRate = productDef ? productDef.mrp * 0.65 : rate * 0.65;
        totalCostOfSale += remainingToConsume * fallbackRate;
      }

      const salesValue = calculateSalesValue(qty, rate);
      const grossProfit = calculateGrossProfit(salesValue, totalCostOfSale);
      const profitPercent = calculateProfitPercent(grossProfit, totalCostOfSale);

      productStats[productName].totalSold += qty;
      productStats[productName].stock -= qty;

      salesDetails.push({
        ...tx,
        salesValue,
        costOfGoodsSold: totalCostOfSale,
        grossProfit,
        profitPercent,
        avgPurchaseRateUsed: qty > 0 ? (totalCostOfSale / qty) : 0
      });
    }
  }

  // Calculate remaining stock valuation
  Object.keys(lotsMap).forEach(productName => {
    const productLots = lotsMap[productName];
    let valuation = 0;
    productLots.forEach(lot => {
      if (lot.remainingQty > 0) {
        valuation += lot.remainingQty * lot.rate;
      }
    });
    if (productStats[productName]) {
      productStats[productName].valuation = valuation;
    }
  });

  // Compile overall metrics
  let totalRevenue = 0;
  let totalCostOfGoodsSold = 0;
  let totalInventoryValuation = 0;

  salesDetails.forEach(s => {
    totalRevenue += s.salesValue;
    totalCostOfGoodsSold += s.costOfGoodsSold;
  });

  Object.values(productStats).forEach(stat => {
    totalInventoryValuation += stat.valuation;
  });

  const overallProfit = totalRevenue - totalCostOfGoodsSold;

  return {
    productStats: Object.values(productStats),
    salesDetails,
    overallMetrics: {
      totalRevenue,
      totalCostOfGoodsSold,
      overallProfit,
      totalInventoryValuation
    }
  };
}

/**
 * Check if adding a transaction will result in negative stock.
 * @param {Array} transactions 
 * @param {Object} newTransaction 
 * @param {string} newTransaction.type - 'purchase' or 'sale'
 * @param {string} newTransaction.product 
 * @param {number} newTransaction.qty 
 * @returns {boolean} - true if stock would become negative
 */
export function wouldBeNegativeStock(transactions, newTransaction) {
  if (newTransaction.type !== 'sale') return false;

  const product = newTransaction.product;
  const qtyToSell = Number(newTransaction.qty) || 0;

  // Sum up existing quantities
  let stock = 0;
  transactions.forEach(tx => {
    if (tx.product === product) {
      if (tx.type === 'purchase') {
        stock += Number(tx.qty) || 0;
      } else if (tx.type === 'sale') {
        stock -= Number(tx.qty) || 0;
      }
    }
  });

  return (stock - qtyToSell) < 0;
}
