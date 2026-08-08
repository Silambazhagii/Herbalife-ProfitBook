import { create } from 'zustand';
import { getAllFromStore, putToStore, deleteFromStore } from '../utils/db';
import { logAudit } from './auditStore';

const initialProducts = [
  { id: '1', sku: '1278', name: 'Activated Fibre 90 Tablets', volume: 15.75, mrp: 1839, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '2', sku: '0028', name: 'Active fiber complex - Unflavored', volume: 22.95, mrp: 2876, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '3', sku: '1295', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '4', sku: '1292', name: 'Afresh Energy Drink Mix Elaichi 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '5', sku: '1293', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '6', sku: '2280', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '7', sku: '1294', name: 'Afresh Energy Drink Mix Lemon 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '8', sku: '1296', name: 'Afresh Energy Drink Mix Peach 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '9', sku: '146K', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 913, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '10', sku: '0015', name: 'Aloe Plus', volume: 9.4, mrp: 1190, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '11', sku: '0544', name: 'Beta Heart Vanilla', volume: 19.55, mrp: 2520, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '12', sku: '310K', name: 'Brain Health', volume: 15.1, mrp: 1645, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '13', sku: '0123', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2489, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '14', sku: '0111', name: 'Cell-U-Loss 90 Tablets', volume: 15.75, mrp: 1916, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '15', sku: '1264', name: 'Dinoshake Chocolate 200 g', volume: 9.6, mrp: 1252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '16', sku: '1265', name: 'Dinoshake nutritional children\'s drink mix - Strawberry flavour', volume: 9.6, mrp: 1252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '17', sku: '1269', name: 'Formula 1 Nutritional shake mix Banana Caramel 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '18', sku: '1263', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '19', sku: '0141', name: 'Formula 1 Nutritional shake mix kulfi 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '20', sku: '1266', name: 'Formula 1 Nutritional shake mix Mango 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '21', sku: '1267', name: 'Formula 1 Nutritional shake mix Orange Cream 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '22', sku: '148K', name: 'Formula 1 Nutritional shake mix PAAN 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '23', sku: '315K', name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '24', sku: '1268', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '25', sku: '1262', name: 'Formula 1 Nutritional shake mix Vanilla 500 g', volume: 21.75, mrp: 2449, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '26', sku: '1459', name: 'H24 Rebuild Strength', volume: 24.7, mrp: 2940, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '27', sku: '0006', name: 'Herbal Aloe concentrate (original)', volume: 24.95, mrp: 3030, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '28', sku: '0102', name: 'Herbal Control', volume: 32.95, mrp: 3858, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '29', sku: '0020', name: 'Herbalife Calcium Tablets', volume: 10.25, mrp: 1352, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '30', sku: '1458', name: 'Herbalife H24 Hydrate', volume: 14.05, mrp: 1839, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '31', sku: '0065', name: 'Herbalifeline® 60 Softgels', volume: 25.75, mrp: 2998, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '32', sku: '0085', name: 'HN - Skin Booster - 30 Servings', volume: 38.65, mrp: 4394, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '33', sku: '316K', name: 'HN - Skin Booster Canister Orange 300 g', volume: 38.65, mrp: 4394, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '34', sku: '309K', name: 'Immune Health', volume: 15.8, mrp: 1717, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '35', sku: '0555', name: 'Joint Support', volume: 20.9, mrp: 2759, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '36', sku: '175K', name: 'Male Factor +', volume: 34.75, mrp: 3832, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '37', sku: '1232', name: 'Multivitamin Mineral and Herbal Tablets Plus 90 Tablets', volume: 19.95, mrp: 2252, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '38', sku: '0139', name: 'Niteworks.', volume: 75, mrp: 8010, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '39', sku: '311K', name: 'Ocular Defense', volume: 19.25, mrp: 2166, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '40', sku: '1233', name: 'Personalized Protein Powder 200 g', volume: 11.5, mrp: 1455, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '41', sku: '1569', name: 'Personalized Protein Powder 400 g', volume: 22.5, mrp: 2792, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '42', sku: '183K', name: 'ShakeMate', volume: 6.45, mrp: 733, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '43', sku: '025K', name: 'Simply Probiotic', volume: 21.95, mrp: 2482, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '44', sku: '174K', name: 'Triphala 60 Tablets', volume: 11.25, mrp: 1224, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '45', sku: '012K', name: 'vritilife Facial cleanser', volume: 10.4, mrp: 1165, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '46', sku: '015K', name: 'VRITILIFE FACIAL COMBO PACK (CLEANSER AND MOISTURIZER)', volume: 23.55, mrp: 2638, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '47', sku: '014K', name: 'vritilife Facial Serum', volume: 27.05, mrp: 3022, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '48', sku: '013K', name: 'vritilife Facial Toner', volume: 11.8, mrp: 1322, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '49', sku: '011K', name: 'vritilife Moisturizer', volume: 13.15, mrp: 1473, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '50', sku: '106K', name: 'Woman\'s Choice', volume: 12.45, mrp: 1399, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '51', sku: '031K', name: 'Herbalife 24 Rebuild Strength', volume: 24.7, mrp: 2491, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '52', sku: '080K', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '53', sku: '1238', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '54', sku: '1291', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '55', sku: '230K', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 773, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '56', sku: '406K', name: 'Formula 1 Nutritional shake mix Mango 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '57', sku: '407K', name: 'Formula 1 Nutritional shake mix Vanilla 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '58', sku: '408K', name: 'Formula 1 Nutritional shake mix Rose Kheer 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '59', sku: '409K', name: 'Formula 1 Nutritional shake mix Kulfi 750 g', volume: 32.6, mrp: 3073, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '60', sku: '082K', name: 'Formula 1 Nutritional shake mix Kulfi 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '61', sku: '1239', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '62', sku: '1248', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2075, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '63', sku: '127K', name: 'Woman\'s Choice', volume: 12.45, mrp: 1185, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '64', sku: '3123', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2109, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '65', sku: '426K', name: 'Sleep Enhance (30g)', volume: 15.1, mrp: 1616, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '66', sku: '505K', name: 'Lift Off - 10 Sachets', volume: 14.05, mrp: 1334, aliases: [], active: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
];

const loadInitialFromLocalStorage = (key, fallback) => {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
};

const saveToLocalStorage = (key, val) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(err);
  }
};

export const useProductsStore = create((set, get) => ({
  products: [],
  vendors: loadInitialFromLocalStorage('profitbook-vendors', ['HERBALIFE']),
  customers: loadInitialFromLocalStorage('profitbook-customers', ['PATTU', 'JASSMITHA', 'AATHIRAI', 'SARA', 'SILAMBAZHAGII']),
  discountTiers: [5, 10, 15, 20, 25, 35, 42, 50],
  isLoaded: false,

  loadProducts: async () => {
    try {
      let dbProducts = await getAllFromStore('products');
      // Hydrate or merge missing products into IndexedDB
      if (dbProducts.length < initialProducts.length) {
        for (const prod of initialProducts) {
          const exists = dbProducts.find(p => p.sku && prod.sku && p.sku === prod.sku);
          if (!exists) {
            await putToStore('products', prod);
          }
        }
        dbProducts = await getAllFromStore('products');
      }
      set({ products: dbProducts, isLoaded: true });
    } catch (err) {
      console.error('Failed to load products from IndexedDB:', err);
      set({ products: initialProducts, isLoaded: true });
    }
  },

  addProduct: async (prod) => {
    const newProduct = {
      id: prod.id || crypto.randomUUID(),
      sku: prod.sku || '',
      name: prod.name,
      aliases: prod.aliases || [],
      volume: Number(prod.volume) || 0,
      mrp: Number(prod.mrp) || 0,
      costPrice: Number(prod.costPrice) || 0,
      active: prod.active !== undefined ? prod.active : true,
      createdAt: prod.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    await putToStore('products', newProduct);
    
    set((state) => ({
      products: [...state.products, newProduct]
    }));

    await logAudit('Product Added', newProduct);
  },

  updateProduct: async (id, updatedFields) => {
    const { products } = get();
    const existing = products.find(p => p.id === id);
    if (!existing) return;

    const updatedProduct = {
      ...existing,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    await putToStore('products', updatedProduct);

    set((state) => ({
      products: state.products.map(p => p.id === id ? updatedProduct : p)
    }));

    await logAudit('Product Updated', updatedProduct);
  },

  deleteProduct: async (id) => {
    const { products } = get();
    const existing = products.find(p => p.id === id);
    
    await deleteFromStore('products', id);

    set((state) => ({
      products: state.products.filter(p => p.id !== id)
    }));

    if (existing) {
      await logAudit('Product Deleted', existing);
    }
  },

  addVendor: (vendor) => {
    const name = vendor.trim().toUpperCase();
    if (!name) return;
    set((state) => {
      if (!state.vendors.includes(name)) {
        const next = [...state.vendors, name];
        saveToLocalStorage('profitbook-vendors', next);
        return { vendors: next };
      }
      return {};
    });
  },

  deleteVendor: (vendorName) => {
    set((state) => {
      const next = state.vendors.filter(v => v !== vendorName);
      saveToLocalStorage('profitbook-vendors', next);
      return { vendors: next };
    });
  },

  addCustomer: (customer) => {
    const name = customer.trim().toUpperCase();
    if (!name) return;
    set((state) => {
      if (!state.customers.includes(name)) {
        const next = [...state.customers, name];
        saveToLocalStorage('profitbook-customers', next);
        return { customers: next };
      }
      return {};
    });
  },

  deleteCustomer: (customerName) => {
    set((state) => {
      const next = state.customers.filter(c => c !== customerName);
      saveToLocalStorage('profitbook-customers', next);
      return { customers: next };
    });
  }
}));
