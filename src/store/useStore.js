import { create } from 'zustand';
import { useProductsStore } from './productsStore';
import { useTransactionStore } from './transactionStore';
import { usePriceStore } from './priceStore';
import { useInventoryStore } from './inventoryStore';

// Expose a unified hook for components that still use legacy useStore
export const useStore = create((set, get) => ({
  // Selectors directly referencing sub-stores (we will keep these updated dynamically)
  get transactions() { return useTransactionStore.getState().transactions; },
  get products() { return useProductsStore.getState().products; },
  get vendors() { return useProductsStore.getState().vendors; },
  get customers() { return useProductsStore.getState().customers; },
  get discountTiers() { return useProductsStore.getState().discountTiers; },
  get priceHistory() { return usePriceStore.getState().priceHistory; },

  addTransaction: (tx) => useTransactionStore.getState().addTransaction(tx),
  deleteTransaction: (id) => useTransactionStore.getState().deleteTransaction(id),
  updateProduct: (id, fields) => useProductsStore.getState().updateProduct(id, fields),
  addProduct: (prod) => useProductsStore.getState().addProduct(prod),
  deleteProduct: (id) => useProductsStore.getState().deleteProduct(id),
  addVendor: (name) => useProductsStore.getState().addVendor(name),
  deleteVendor: (name) => useProductsStore.getState().deleteVendor(name),
  addCustomer: (name) => useProductsStore.getState().addCustomer(name),
  deleteCustomer: (name) => useProductsStore.getState().deleteCustomer(name),
  addPriceHistorySnapshot: (snapshot) => usePriceStore.getState().addPriceHistorySnapshot(snapshot),

  getStock: () => useInventoryStore.getState().getStock(),
  getMetrics: () => useInventoryStore.getState().getMetrics(),
  getProductPL: () => useInventoryStore.getState().getProductPL(),
}));

// Sync changes across stores when states change
useTransactionStore.subscribe((state) => {
  useStore.setState({ transactions: state.transactions });
});
useProductsStore.subscribe((state) => {
  useStore.setState({
    products: state.products,
    vendors: state.vendors,
    customers: state.customers,
    discountTiers: state.discountTiers
  });
});
usePriceStore.subscribe((state) => {
  useStore.setState({ priceHistory: state.priceHistory });
});
