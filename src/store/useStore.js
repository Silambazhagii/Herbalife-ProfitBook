import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const initialProducts = [
  { id: '1', name: 'Activated Fibre 90 Tablets', volume: 15.75, mrp: 1839 },
  { id: '2', name: 'Active fiber complex - Unflavored', volume: 22.95, mrp: 2876 },
  { id: '3', name: 'Afresh Energy Drink Mix Cinnamon 50 g', volume: 7.8, mrp: 913 },
  { id: '4', name: 'Afresh Energy Drink Mix Elaichi 50 g', volume: 7.8, mrp: 913 },
  { id: '5', name: 'Afresh Energy Drink Mix Ginger 50 g', volume: 7.8, mrp: 913 },
  { id: '6', name: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', volume: 7.8, mrp: 913 },
  { id: '7', name: 'Afresh Energy Drink Mix Lemon 50 g', volume: 7.8, mrp: 913 },
  { id: '8', name: 'Afresh Energy Drink Mix Peach 50 g', volume: 7.8, mrp: 913 },
  { id: '9', name: 'Afresh Energy Drink Mix Tulsi 50 g', volume: 7.8, mrp: 913 },
  { id: '10', name: 'Aloe Plus', volume: 9.4, mrp: 1190 },
  { id: '11', name: 'Beta Heart Vanilla', volume: 19.55, mrp: 2520 },
  { id: '12', name: 'Brain Health', volume: 15.1, mrp: 1645 },
  { id: '13', name: 'Cell Activator New 60 Tablets', volume: 21.95, mrp: 2489 },
  { id: '14', name: 'Cell-U-Loss 90 Tablets', volume: 15.75, mrp: 1916 },
  { id: '15', name: 'Dinoshake Chocolate 200 g', volume: 9.6, mrp: 1252 },
  { id: '16', name: 'Dinoshake nutritional children\'s drink mix - Strawberry flavour', volume: 9.6, mrp: 1252 },
  { id: '17', name: 'Formula 1 Nutritional shake mix Banana Caramel 500 g', volume: 21.75, mrp: 2449 },
  { id: '18', name: 'Formula 1 Nutritional shake mix Chocolate 500 g', volume: 21.75, mrp: 2449 },
  { id: '19', name: 'Formula 1 Nutritional shake mix kulfi 500 g', volume: 21.75, mrp: 2449 },
  { id: '20', name: 'Formula 1 Nutritional shake mix Mango 500 g', volume: 21.75, mrp: 2449 },
  { id: '21', name: 'Formula 1 Nutritional shake mix Orange Cream 500 g', volume: 21.75, mrp: 2449 },
  { id: '22', name: 'Formula 1 Nutritional shake mix PAAN 500 g', volume: 21.75, mrp: 2449 },
  { id: '23', name: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', volume: 21.75, mrp: 2449 },
  { id: '24', name: 'Formula 1 Nutritional shake mix Strawberry 500 g', volume: 21.75, mrp: 2449 },
  { id: '25', name: 'Formula 1 Nutritional shake mix Vanilla 500 g', volume: 21.75, mrp: 2449 },
  { id: '26', name: 'H24 Rebuild Strength', volume: 24.7, mrp: 2940 },
  { id: '27', name: 'Herbal Aloe concentrate (original)', volume: 24.95, mrp: 3030 },
  { id: '28', name: 'Herbal Control', volume: 32.95, mrp: 3858 },
  { id: '29', name: 'Herbalife Calcium Tablets', volume: 10.25, mrp: 1352 },
  { id: '30', name: 'Herbalife H24 Hydrate', volume: 14.05, mrp: 1839 },
  { id: '31', name: 'Herbalifeline\u00ae 60 Softgels', volume: 25.75, mrp: 2998 },
  { id: '32', name: 'HN - Skin Booster - 30 Servings', volume: 38.65, mrp: 4394 },
  { id: '33', name: 'HN - Skin Booster Canister Orange 300 g', volume: 38.65, mrp: 4394 },
  { id: '34', name: 'Immune Health', volume: 15.8, mrp: 1717 },
  { id: '35', name: 'Joint Support', volume: 20.9, mrp: 2759 },
  { id: '36', name: 'Male Factor +', volume: 34.75, mrp: 3832 },
  { id: '37', name: 'Multivitamin Mineral and Herbal Tablets Plus 90 Tablets', volume: 19.95, mrp: 2252 },
  { id: '38', name: 'Niteworks.', volume: 75, mrp: 8010 },
  { id: '39', name: 'Ocular Defense', volume: 19.25, mrp: 2166 },
  { id: '40', name: 'Personalized Protein Powder 200 g', volume: 11.5, mrp: 1455 },
  { id: '41', name: 'Personalized Protein Powder 400 g', volume: 22.5, mrp: 2792 },
  { id: '42', name: 'ShakeMate', volume: 6.45, mrp: 733 },
  { id: '43', name: 'Simply Probiotic', volume: 21.95, mrp: 2482 },
  { id: '44', name: 'Triphala 60 Tablets', volume: 11.25, mrp: 1224 },
  { id: '45', name: 'vritilife Facial cleanser', volume: 10.4, mrp: 1165 },
  { id: '46', name: 'VRITILIFE FACIAL COMBO PACK (CLEANSER AND MOISTURIZER)', volume: 23.55, mrp: 2638 },
  { id: '47', name: 'vritilife Facial Serum', volume: 27.05, mrp: 3022 },
  { id: '48', name: 'vritilife Facial Toner', volume: 11.8, mrp: 1322 },
  { id: '49', name: 'vritilife Moisturizer', volume: 13.15, mrp: 1473 },
  { id: '50', name: 'Woman\'s Choice', volume: 12.45, mrp: 1399 },
];

const initialVendors = ['HERBALIFE'];
const initialCustomers = ['PATTU', 'JASSMITHA', 'AATHIRAI', 'SARA', 'SILAMBAZHAGII'];

const initialTransactions = [
  // PURCHASES (PMR) - Exactly matched with the new "Purchase Data" screenshot
  { id: 'p1', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Personalized Protein Powder 400 g', qty: 1, discountPercent: 42, volume: 22.5, rate: 1765.99 },
  { id: 'p2', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', qty: 12, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p3', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Niteworks.', qty: 5, discountPercent: 42, volume: 75, rate: 5065.98 },
  { id: 'p4', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Active fiber complex - Unflavored', qty: 1, discountPercent: 42, volume: 22.95, rate: 1818.55 },
  { id: 'p5', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Afresh Energy Drink Mix Peach 50 g', qty: 8, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 'p6', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Dinoshake Chocolate 200 g', qty: 3, discountPercent: 42, volume: 9.6, rate: 791.57 },
  { id: 'p7', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'ShakeMate', qty: 8, discountPercent: 42, volume: 6.45, rate: 581.13 },
  { id: 'p8', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'HN - Skin Booster - 30 Servings', qty: 1, discountPercent: 42, volume: 38.65, rate: 3030.74 },
  { id: 'p9', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Beta Heart Vanilla', qty: 1, discountPercent: 42, volume: 19.55, rate: 1738.23 },
  { id: 'p10', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Simply Probiotic', qty: 1, discountPercent: 42, volume: 21.95, rate: 1569.14 },
  { id: 'p11', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Multivitamin Mineral and Herbal Tablets Plus 90 Tablets', qty: 1, discountPercent: 42, volume: 19.95, rate: 1423.79 },
  { id: 'p12', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix PAAN 500 g', qty: 2, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p13', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix kulfi 500 g', qty: 3, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p14', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'vritilife Moisturizer', qty: 1, discountPercent: 42, volume: 13.15, rate: 931.44 },
  { id: 'p15', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'vritilife Facial cleanser', qty: 1, discountPercent: 42, volume: 10.4, rate: 736.46 },
  { id: 'p16', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'vritilife Facial Serum', qty: 1, discountPercent: 42, volume: 27.05, rate: 1911.34 },
  { id: 'p17', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'vritilife Facial Toner', qty: 1, discountPercent: 42, volume: 11.8, rate: 835.91 },
  { id: 'p18', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Herbal Control', qty: 2, discountPercent: 42, volume: 32.95, rate: 2439.51 },
  { id: 'p19', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Personalized Protein Powder 400 g', qty: 2, discountPercent: 42, volume: 22.5, rate: 1765.99 },
  { id: 'p20', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'ShakeMate', qty: 6, discountPercent: 42, volume: 6.45, rate: 581.13 },
  { id: 'p21', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Herbalifeline\u00ae 60 Softgels', qty: 1, discountPercent: 42, volume: 25.75, rate: 1895.48 },
  { id: 'p22', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Aloe Plus', qty: 1, discountPercent: 42, volume: 9.4, rate: 751.83 },
  { id: 'p23', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Simply Probiotic', qty: 1, discountPercent: 42, volume: 21.95, rate: 1569.14 },
  { id: 'p24', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Joint Support', qty: 1, discountPercent: 42, volume: 20.9, rate: 1744.35 },
  { id: 'p25', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Herbalife Calcium Tablets', qty: 1, discountPercent: 42, volume: 10.25, rate: 854.51 },
  { id: 'p26', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: "Woman's Choice", qty: 3, discountPercent: 42, volume: 12.45, rate: 884.36 },
  { id: 'p27', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'H24 Rebuild Strength', qty: 1, discountPercent: 42, volume: 24.7, rate: 1930.83 },
  { id: 'p28', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Afresh Energy Drink Mix Tulsi 50 g', qty: 7, discountPercent: 42, volume: 7.8, rate: 599.91 },
  { id: 'p29', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix Vanilla 500 g', qty: 1, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p30', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix Strawberry 500 g', qty: 1, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p31', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Formula 1 Nutritional shake mix Mango 500 g', qty: 1, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 'p32', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Afresh Energy Drink Mix Elaichi 50 g', qty: 5, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 'p33', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', qty: 4, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 'p34', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Afresh Energy Drink Mix Lemon 50 g', qty: 4, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 'p35', type: 'purchase', date: '2025-03-15T00:00:00.000Z', entity: 'Herbalife', product: 'Brain Health', qty: 1, discountPercent: 42, volume: 15.1, rate: 1040.29 },
  { id: 'p36', type: 'purchase', date: '2025-03-22T00:00:00.000Z', entity: 'Herbalife', product: 'Cell-U-Loss 90 Tablets', qty: 0, discountPercent: 50, volume: 15.75, rate: 1077.34 },
  { id: 'p37', type: 'purchase', date: '2025-04-28T00:00:00.000Z', entity: 'HERBALIFE', product: 'Personalized Protein Powder 200 g', qty: 2, discountPercent: 50, volume: 11.5, rate: 818.33 },
  { id: 'p38', type: 'purchase', date: '2025-04-28T00:00:00.000Z', entity: 'HERBALIFE', product: 'Personalized Protein Powder 400 g', qty: 2, discountPercent: 50, volume: 22.5, rate: 1570.58 },

  // SALES (SMR) - Adjusted to match the specific "Sales Qty" from the Stock screenshot, ensuring accurate remaining stocks
  { id: 't1', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'PATTU', product: 'Formula 1 Nutritional shake mix kulfi 500 g', qty: 1, discountPercent: 35, volume: 21.75, rate: 1698.08 },
  { id: 't2', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'PATTU', product: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', qty: 1, discountPercent: 35, volume: 21.75, rate: 1698.08 },
  { id: 't3', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'PATTU', product: 'ShakeMate', qty: 2, discountPercent: 35, volume: 6.45, rate: 606.4 },
  { id: 't4', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'PATTU', product: 'Personalized Protein Powder 400 g', qty: 1, discountPercent: 35, volume: 22.5, rate: 1936.97 },
  { id: 't5', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'AATHIRAI', product: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', qty: 2, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 't6', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'AATHIRAI', product: 'ShakeMate', qty: 2, discountPercent: 42, volume: 6.45, rate: 581.13 },
  { id: 't7', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'AATHIRAI', product: 'Personalized Protein Powder 400 g', qty: 1, discountPercent: 42, volume: 22.5, rate: 1765.99 },
  { id: 't8', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'AATHIRAI', product: 'Afresh Energy Drink Mix Tulsi 50 g', qty: 1, discountPercent: 42, volume: 7.8, rate: 599.91 },
  { id: 't9', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'JASSMITHA', product: 'Personalized Protein Powder 400 g', qty: 1, discountPercent: 42, volume: 22.5, rate: 1765.99 },
  { id: 't10', type: 'sale', date: '2025-03-15T00:00:00.000Z', entity: 'JASSMITHA', product: 'Simply Probiotic', qty: 1, discountPercent: 42, volume: 21.95, rate: 1569.14 },
  { id: 't11', type: 'sale', date: '2025-04-12T00:00:00.000Z', entity: 'JASSMITHA', product: 'Formula 1 Nutritional shake mix PAAN 500 g', qty: 1, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 't12', type: 'sale', date: '2025-04-12T00:00:00.000Z', entity: 'JASSMITHA', product: 'Formula 1 Nutritional shake mix Vanilla 500 g', qty: 1, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 't13', type: 'sale', date: '2025-04-12T00:00:00.000Z', entity: 'JASSMITHA', product: 'Afresh Energy Drink Mix Elaichi 50 g', qty: 2, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 't14', type: 'sale', date: '2025-04-12T00:00:00.000Z', entity: 'JASSMITHA', product: 'Afresh Energy Drink Mix Tulsi 50 g', qty: 1, discountPercent: 42, volume: 7.8, rate: 599.91 },
  { id: 't15', type: 'sale', date: '2025-04-12T00:00:00.000Z', entity: 'JASSMITHA', product: 'ShakeMate', qty: 1, discountPercent: 42, volume: 6.45, rate: 581.13 },
  { id: 't16', type: 'sale', date: '2025-04-15T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't17', type: 'sale', date: '2025-04-17T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Lemon 50 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't18', type: 'sale', date: '2025-04-28T00:00:00.000Z', entity: 'PATTU', product: 'Formula 1 Nutritional shake mix kulfi 500 g', qty: 1, discountPercent: 35, volume: 21.75, rate: 1698.08 },
  { id: 't19', type: 'sale', date: '2025-04-28T00:00:00.000Z', entity: 'PATTU', product: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', qty: 1, discountPercent: 35, volume: 21.75, rate: 1698.08 },
  { id: 't20', type: 'sale', date: '2025-04-28T00:00:00.000Z', entity: 'PATTU', product: 'ShakeMate', qty: 1, discountPercent: 35, volume: 6.45, rate: 606.4 },
  { id: 't21', type: 'sale', date: '2025-04-13T00:00:00.000Z', entity: 'JASSMITHA', product: 'Formula 1 Nutritional shake mix Rose Kheer 500 g', qty: 2, discountPercent: 42, volume: 21.75, rate: 1547.99 },
  { id: 't22', type: 'sale', date: '2025-04-13T00:00:00.000Z', entity: 'JASSMITHA', product: 'ShakeMate', qty: 1, discountPercent: 42, volume: 6.45, rate: 581.13 },
  { id: 't23', type: 'sale', date: '2025-04-13T00:00:00.000Z', entity: 'JASSMITHA', product: 'Afresh Energy Drink Mix Peach 50 g', qty: 1, discountPercent: 42, volume: 7.8, rate: 576.62 },
  { id: 't24', type: 'sale', date: '2025-05-01T00:00:00.000Z', entity: 'SARA', product: "Woman's Choice", qty: 1, discountPercent: 42, volume: 12.45, rate: 884.36 },
  { id: 't25', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't26', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Lemon 50 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't27', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Personalized Protein Powder 200 g', qty: 1, discountPercent: 35, volume: 11.5, rate: 1009.31 },
  { id: 't28', type: 'sale', date: '2025-08-15T00:00:00.000Z', entity: 'JASSMITHA', product: 'Afresh Energy Drink Mix Peach 50 g', qty: 1, discountPercent: 42, volume: 7.8, rate: 576.62 },
];

export const useStore = create(
  persist(
    (set, get) => ({
      transactions: initialTransactions,
      products: initialProducts,
      vendors: initialVendors,
      customers: initialCustomers,
      discountTiers: [5, 10, 15, 20, 25, 35, 42, 50],
      priceHistory: [],

      // Actions
      addTransaction: (transaction) =>
        set((state) => ({
          transactions: [
            ...state.transactions,
            { ...transaction, id: crypto.randomUUID() },
          ],
        })),

      deleteTransaction: (id) =>
        set((state) => ({
          transactions: state.transactions.filter((t) => t.id !== id),
        })),

      updateProduct: (id, updatedData) =>
        set((state) => ({
          products: state.products.map((p) =>
            p.id === id ? { ...p, ...updatedData } : p
          ),
        })),

      addProduct: (product) =>
        set((state) => ({
          products: [
            ...state.products,
            { ...product, id: crypto.randomUUID() },
          ],
        })),

      deleteProduct: (id) =>
        set((state) => ({
          products: state.products.filter((p) => p.id !== id),
        })),

      addVendor: (vendorName) =>
        set((state) => {
          if (!state.vendors.includes(vendorName)) {
            return { vendors: [...state.vendors, vendorName] };
          }
          return state;
        }),

      deleteVendor: (vendorName) =>
        set((state) => ({
          vendors: state.vendors.filter((v) => v !== vendorName),
        })),

      addCustomer: (customerName) =>
        set((state) => {
          if (!state.customers.includes(customerName)) {
            return { customers: [...state.customers, customerName] };
          }
          return state;
        }),
      
      deleteCustomer: (customerName) =>
        set((state) => ({
          customers: state.customers.filter((c) => c !== customerName),
        })),

      addPriceHistorySnapshot: (snapshot) =>
        set((state) => {
          // Keep only the latest 30 snapshots to avoid LocalStorage limits
          const updatedHistory = [snapshot, ...state.priceHistory].slice(0, 30);
          return { priceHistory: updatedHistory };
        }),

      // Computed Data (Selectors)
      getStock: () => {
        const { transactions, products } = get();
        // Initialize with all products that have ever had activity
        const stockMap = {};

        transactions.forEach((tx) => {
          if (!stockMap[tx.product]) {
            stockMap[tx.product] = {
              product: tx.product,
              totalPurchased: 0,
              totalSold: 0,
              stock: 0,
            };
          }
          if (tx.type === 'purchase') {
            stockMap[tx.product].totalPurchased += Number(tx.qty);
          } else if (tx.type === 'sale') {
            stockMap[tx.product].totalSold += Number(tx.qty);
          }
          stockMap[tx.product].stock = stockMap[tx.product].totalPurchased - stockMap[tx.product].totalSold;
        });

        // Add products from initial list even if no transactions, to match "0" rows in Excel
        // But for clarity, we only show those mentioned in transactions or specific list
        return Object.values(stockMap);
      },

      getMetrics: () => {
        const { transactions } = get();
        let totalRevenue = 0;
        let totalCost = 0;

        transactions.forEach((tx) => {
          const val = Number(tx.qty) * Number(tx.rate);
          if (tx.type === 'sale') {
            totalRevenue += val;
            const purchases = transactions.filter(t => t.product === tx.product && t.type === 'purchase');
            if (purchases.length > 0) {
              const totalPurchasedQty = purchases.reduce((sum, p) => sum + Number(p.qty), 0);
              const totalPurchasedCost = purchases.reduce((sum, p) => sum + (Number(p.qty) * Number(p.rate)), 0);
              const avgCost = totalPurchasedCost / totalPurchasedQty;
              totalCost += Number(tx.qty) * avgCost;
            } else {
              const product = initialProducts.find(p => p.name === tx.product);
              if (product) {
                totalCost += Number(tx.qty) * (product.mrp * 0.65);
              }
            }
          }
        });

        const totalProfit = totalRevenue - totalCost;

        return { totalRevenue, totalCost, totalProfit };
      },

      getProductPL: () => {
        const { products, discountTiers } = get();
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
    }),
    {
      name: 'profitbook-storage',
      version: 8,
      migrate: (persistedState, version) => {
        if (version < 7) {
          persistedState.products = initialProducts;
          persistedState.vendors = initialVendors;
          persistedState.customers = initialCustomers;
          persistedState.transactions = initialTransactions;
          persistedState.discountTiers = [5, 10, 15, 20, 25, 35, 42, 50];
        }
        if (version < 8) {
          persistedState.priceHistory = [];
        }
        return persistedState;
      }
    }
  )
);


