import fs from 'fs';

const purchases = JSON.parse(fs.readFileSync('./scratch/generatedPurchases.json', 'utf8'));

const sales = [
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
  { id: '24', type: 'sale', date: '2025-05-01T00:00:00.000Z', entity: 'SARA', product: "Woman's Choice", qty: 1, discountPercent: 42, volume: 12.45, rate: 884.36 },
  { id: 't25', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Kashmiri Kahwa 40 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't26', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Afresh Energy Drink Mix Lemon 50 g', qty: 1, discountPercent: 35, volume: 7.8, rate: 632.54 },
  { id: 't27', type: 'sale', date: '2025-05-14T00:00:00.000Z', entity: 'PATTU', product: 'Personalized Protein Powder 200 g', qty: 1, discountPercent: 35, volume: 11.5, rate: 1009.31 },
  { id: 't28', type: 'sale', date: '2025-08-15T00:00:00.000Z', entity: 'JASSMITHA', product: 'Afresh Energy Drink Mix Peach 50 g', qty: 1, discountPercent: 42, volume: 7.8, rate: 576.62 },
];

const allInitialTx = [...purchases, ...sales];

const fileContent = `import { create } from 'zustand';
import { getAllFromStore, putToStore, deleteFromStore, clearStore } from '../utils/db';
import { logAudit } from './auditStore';
import { wouldBeNegativeStock } from '../utils/calculationEngine';

const initialTransactions = ${JSON.stringify(allInitialTx, null, 2)};

export const useTransactionStore = create((set, get) => ({
  transactions: [],
  isLoaded: false,

  loadTransactions: async () => {
    try {
      let dbTx = await getAllFromStore('transactions');
      
      // Duplicate Protection & Seeding check:
      // Ensure real invoice transactions (TNI...) exist in IndexedDB
      const hasRealInvoices = dbTx.some(t => t.invoiceNumber && t.invoiceNumber.startsWith('TNI'));
      
      if (!hasRealInvoices || dbTx.length < initialTransactions.length) {
        // Hydrate missing initial real invoice transactions
        const existingIds = new Set(dbTx.map(t => t.id));
        const existingInvNos = new Set(dbTx.filter(t => t.invoiceNumber).map(t => t.invoiceNumber + '_' + t.sku));
        
        for (const tx of initialTransactions) {
          const key = tx.invoiceNumber ? (tx.invoiceNumber + '_' + tx.sku) : null;
          if (!existingIds.has(tx.id) && (!key || !existingInvNos.has(key))) {
            await putToStore('transactions', tx);
          }
        }
        dbTx = await getAllFromStore('transactions');
      }

      // Filter out old dummy p1-p38 transactions if real invoices are present
      if (dbTx.some(t => t.invoiceNumber && t.invoiceNumber.startsWith('TNI'))) {
        const cleaned = dbTx.filter(t => !/^p\d+$/.test(t.id));
        if (cleaned.length !== dbTx.length) {
          await clearStore('transactions');
          for (const tx of cleaned) {
            await putToStore('transactions', tx);
          }
          dbTx = cleaned;
        }
      }

      set({ transactions: dbTx, isLoaded: true });
    } catch (err) {
      console.error('Failed to load transactions:', err);
      set({ transactions: initialTransactions, isLoaded: true });
    }
  },

  addTransaction: async (tx) => {
    const { transactions } = get();
    
    if (!tx.date || !tx.product || !tx.entity) {
      throw new Error("Date, Product, and Vendor/Customer cannot be blank.");
    }

    const qty = Number(tx.qty);
    const rate = Number(tx.rate);
    const discountPercent = Number(tx.discountPercent);

    if (isNaN(qty) || isNaN(rate) || isNaN(discountPercent)) {
      throw new Error("Quantity, rate, and discount must be valid numbers.");
    }

    if (qty <= 0) {
      throw new Error("Quantity must be a positive number.");
    }

    if (rate < 0) {
      throw new Error("Price cannot be negative.");
    }

    if (tx.type === 'sale' && wouldBeNegativeStock(transactions, tx)) {
      throw new Error(\`Insufficient stock for \${tx.product}. Stock cannot become negative.\`);
    }

    const newTx = {
      ...tx,
      id: tx.id || crypto.randomUUID(),
      type: tx.type,
      date: new Date(tx.date).toISOString(),
      product: tx.product,
      qty,
      discountPercent,
      rate,
      volume: Number(tx.volume) || 0,
      entity: tx.entity,
      invoiceNumber: tx.invoiceNumber || null,
      orderNumber: tx.orderNumber || null,
      customerAddress: tx.customerAddress || null,
      gstin: tx.gstin || null,
      sku: tx.sku || null,
      hsn: tx.hsn || null,
      unitPrice: tx.unitPrice != null ? Number(tx.unitPrice) : null,
      discount: tx.discount != null ? Number(tx.discount) : null,
      taxableValue: tx.taxableValue != null ? Number(tx.taxableValue) : null,
      sgstRate: tx.sgstRate != null ? Number(tx.sgstRate) : null,
      sgstAmount: tx.sgstAmount != null ? Number(tx.sgstAmount) : null,
      cgstRate: tx.cgstRate != null ? Number(tx.cgstRate) : null,
      cgstAmount: tx.cgstAmount != null ? Number(tx.cgstAmount) : null,
      finalAmount: tx.finalAmount != null ? Number(tx.finalAmount) : null,
      extractionMetadata: tx.extractionMetadata || null,
    };

    if (transactions.some(t => t.id === newTx.id)) {
      throw new Error("Duplicate transaction ID detected.");
    }

    await putToStore('transactions', newTx);
    set(state => ({
      transactions: [...state.transactions, newTx]
    }));

    await logAudit(tx.type === 'purchase' ? 'Purchase Imported' : 'Sale Recorded', newTx);
  },

  deleteTransaction: async (id) => {
    const { transactions } = get();
    const existing = transactions.find(t => t.id === id);
    if (!existing) return;

    await deleteFromStore('transactions', id);
    set(state => ({
      transactions: state.transactions.filter(t => t.id !== id)
    }));

    await logAudit('Transaction Deleted', existing);
  },

  detectDuplicateInvoice: (invoiceMeta) => {
    const { invoiceNumber, date, totalAmount, productCount } = invoiceMeta;
    const { transactions } = get();

    const duplicate = transactions.some(tx => {
      if (tx.invoiceNumber && invoiceNumber && tx.invoiceNumber === invoiceNumber) {
        return true;
      }
      return false;
    });

    return duplicate;
  }
}));
`;

fs.writeFileSync('./src/store/transactionStore.js', fileContent);
console.log('Successfully written src/store/transactionStore.js');
