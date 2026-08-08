import { create } from 'zustand';
import { getAllFromStore, putToStore } from '../utils/db';
import { logAudit } from './auditStore';

export const usePriceStore = create((set, get) => ({
  priceHistory: [],
  isLoaded: false,

  loadPriceHistory: async () => {
    try {
      const history = await getAllFromStore('priceHistory');
      history.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
      set({ priceHistory: history, isLoaded: true });
    } catch (err) {
      console.error('Failed to load price history:', err);
      set({ priceHistory: [], isLoaded: true });
    }
  },

  addPriceHistorySnapshot: async (snapshotProducts) => {
    const { priceHistory } = get();
    const prevSnapshot = priceHistory[0] || null; // newest is at 0 index

    // Generate variance report against the previous snapshot
    const varianceReport = [];
    const productsMap = {};

    if (prevSnapshot) {
      prevSnapshot.products.forEach(p => {
        productsMap[p.productName] = p;
      });
    }

    snapshotProducts.forEach(newP => {
      const oldP = productsMap[newP.productName];
      const oldMrp = oldP ? oldP.mrp : null;
      const newMrp = newP.mrp;
      
      let diff = 0;
      let diffPercent = 0;

      if (oldMrp !== null) {
        diff = newMrp - oldMrp;
        diffPercent = oldMrp > 0 ? (diff / oldMrp) * 100 : 0;
      }

      varianceReport.push({
        productName: newP.productName,
        oldMrp,
        newMrp,
        diff,
        diffPercent,
        isNew: !oldP,
      });
    });

    const newSnapshot = {
      id: crypto.randomUUID(),
      uploadDate: new Date().toISOString(),
      products: snapshotProducts,
      varianceReport
    };

    try {
      await putToStore('priceHistory', newSnapshot);
      
      set((state) => {
        const updated = [newSnapshot, ...state.priceHistory];
        return { priceHistory: updated };
      });

      await logAudit('Price Updated', {
        snapshotId: newSnapshot.id,
        itemsChanged: varianceReport.filter(v => v.diff !== 0 || v.isNew).length
      });
    } catch (err) {
      console.error('Failed to add price snapshot:', err);
    }
  }
}));
