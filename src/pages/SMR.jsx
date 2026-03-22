import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui';
import { format } from 'date-fns';
import { FileUp, Trash2 } from 'lucide-react';

export default function SMR() {
  const { transactions, deleteTransaction } = useStore();
  
  const purchases = transactions.filter(t => t.type === 'purchase');
  const sales = transactions.filter(t => t.type === 'sale').sort((a,b) => new Date(a.date) - new Date(b.date));

  const totalSalesOverall = sales.reduce((sum, tx) => sum + (Number(tx.qty) * Number(tx.rate)), 0);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this sales record?")) {
      deleteTransaction(id);
    }
  };

  let cumulativeVolume = 0;
  let cumulativeSales = 0;
  let cumulativeProfit = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Sales Master Record (SMR)</h1>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg font-semibold border border-emerald-100 shadow-sm">
          Total Revenue: ₹{totalSalesOverall.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-700 bg-white min-w-max">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-bold border-r border-slate-100 bg-slate-100/30">S.No</th>
              <th className="px-4 py-4 font-semibold">Date</th>
              <th className="px-4 py-4 font-semibold">Customer</th>
              <th className="px-4 py-4 font-semibold">Product</th>
              <th className="px-4 py-4 font-semibold text-right">Qty</th>
              <th className="px-4 py-4 font-semibold text-right border-r border-slate-100">%</th>
              <th className="px-4 py-4 font-semibold text-right">VOLUME</th>
              <th className="px-4 py-4 font-semibold text-right border-r border-slate-100 bg-blue-50/30">CUM.VOLUME</th>
              <th className="px-4 py-4 font-semibold text-right">PURCHASE RATE</th>
              <th className="px-4 py-4 font-semibold text-right">SALES RATE</th>
              <th className="px-4 py-4 font-semibold text-right border-r border-slate-200">CUM SALES</th>
              <th className="px-4 py-4 font-semibold text-right">PROFIT</th>
              <th className="px-4 py-4 font-semibold text-right">CUM PROFIT</th>
              <th className="px-4 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-6 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <FileUp className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">No sales records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              sales.map((tx, index) => {
                const sNo = index + 1;
                const volume = tx.volume || 0;
                const qty = tx.qty || 0;
                const rowVolume = volume * qty;
                cumulativeVolume += rowVolume;

                const salesRate = tx.rate || 0;
                const rowSales = salesRate * qty;
                cumulativeSales += rowSales;

                // For Profit, we need to find the specific purchase rate used for this product & discount
                // However, our data model stores tx.rate as the actual rate the sale happened at.
                // In Excel, Profit = (Sales Rate - Purchase Rate) * Qty.
                // For simplicity and accuracy based on User Excel: 
                // We'll calculate "Purchase Rate" as a 35% discount (default purchase level) or match logic.
                // Standard Profit calculation: Sales Value - Cost of Goods Sold.
                
                // Fetch Average Purchase Rate for this product to match Excel logic
                const productPurchases = purchases.filter(p => p.product === tx.product);
                const purchaseRate = productPurchases.length > 0 
                  ? productPurchases.reduce((sum, p) => sum + p.rate, 0) / productPurchases.length
                  : salesRate * 0.65; // Fallback estimate

                const profit = (salesRate - purchaseRate) * qty;
                cumulativeProfit += profit;

                return (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-500 border-r border-slate-100 bg-slate-50/30">{sNo}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-[13px]">{format(new Date(tx.date), 'dd-MMM-yy')}</td>
                    <td className="px-4 py-4 max-w-[120px] truncate font-bold text-slate-900">{tx.entity}</td>
                    <td className="px-4 py-4 max-w-[180px] truncate text-slate-700 italic">{tx.product}</td>
                    <td className="px-4 py-4 text-right font-medium">{qty}</td>
                    <td className="px-4 py-4 text-right border-r border-slate-100 font-semibold text-emerald-600">{tx.discountPercent || 0}</td>
                    <td className="px-4 py-4 text-right">{volume}</td>
                    <td className="px-4 py-4 text-right font-bold text-blue-700 bg-blue-50/30 border-r border-slate-100">{cumulativeVolume.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right text-slate-400">{purchaseRate.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">{salesRate.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-black text-slate-900 border-r border-slate-200">{cumulativeSales.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    
                    <td className="px-4 py-4 text-right font-bold text-emerald-600">₹{profit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-right font-black bg-emerald-50/30 text-emerald-700">₹{cumulativeProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    
                    <td className="px-4 py-4 text-center">
                      <button onClick={() => handleDelete(tx.id)} className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded-md transition-colors">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
