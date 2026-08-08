import { create } from 'zustand';
import { useProductsStore } from './productsStore';
import { useTransactionStore } from './transactionStore';
import { runFIFOEngine } from '../utils/calculationEngine';

export const useInventoryStore = create((set, get) => ({
  // The state can be dynamically computed from transactionStore and productsStore
  
  getStock: () => {
    const transactions = useTransactionStore.getState().transactions;
    const products = useProductsStore.getState().products;
    const { productStats } = runFIFOEngine(transactions, products);
    return productStats;
  },

  getMetrics: () => {
    const transactions = useTransactionStore.getState().transactions;
    const products = useProductsStore.getState().products;
    const { overallMetrics } = runFIFOEngine(transactions, products);
    return {
      totalRevenue: overallMetrics.totalRevenue,
      totalCost: overallMetrics.totalCostOfGoodsSold,
      totalProfit: overallMetrics.overallProfit,
      inventoryValuation: overallMetrics.totalInventoryValuation
    };
  },

  getProductPL: () => {
    const products = useProductsStore.getState().products;
    const discountTiers = useProductsStore.getState().discountTiers;
    return products.map((p) => {
      const plData = {
        id: p.id,
        product: p.name,
        volume: p.volume,
        mrp: p.mrp,
        margins: {}
      };
      
      discountTiers.forEach(tier => {
        const discountPrice = p.mrp - (p.mrp * (tier / 100));
        plData.margins[tier] = discountPrice;
      });
      
      return plData;
    });
  }
}));
