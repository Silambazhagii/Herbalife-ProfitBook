import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui';
import { format } from 'date-fns';
import { FileDown, Trash2 } from 'lucide-react';

export default function PMR() {
  const { transactions, deleteTransaction } = useStore();
  const purchases = transactions.filter(t => t.type === 'purchase').sort((a,b) => new Date(a.date) - new Date(b.date));

  const totalPurchases = purchases.reduce((sum, tx) => sum + (Number(tx.qty) * Number(tx.rate)), 0);

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this purchase record?")) {
      deleteTransaction(id);
    }
  };

  let cumulativeVolume = 0;
  let cumulativePurchaseValue = 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Purchase Master Record (PMR)</h1>
        <div className="mt-4 sm:mt-0 flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg font-semibold border border-blue-100 shadow-sm">
          Total Expenditure: ₹{totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </div>
      </div>

      <Card className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-700 bg-white min-w-max">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-4 py-4 font-bold border-r border-slate-100 bg-slate-100/30">S.No</th>
              <th className="px-4 py-4 font-semibold">Date</th>
              <th className="px-4 py-4 font-semibold">Vendor</th>
              <th className="px-4 py-4 font-semibold">Product</th>
              <th className="px-4 py-4 font-semibold text-right">Qty</th>
              <th className="px-4 py-4 font-semibold text-right border-r border-slate-100">%</th>
              <th className="px-4 py-4 font-semibold text-right">VOLUME</th>
              <th className="px-4 py-4 font-semibold text-right border-r border-slate-100 bg-emerald-50/30">CUM.VOLUME</th>
              <th className="px-4 py-4 font-semibold text-right">PURCHASE RATE</th>
              <th className="px-4 py-4 font-semibold text-right">CUM PURCHASE</th>
              <th className="px-4 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {purchases.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <FileDown className="w-12 h-12 text-slate-300 mb-3" />
                    <p className="text-base font-medium text-slate-600">No purchase records found.</p>
                  </div>
                </td>
              </tr>
            ) : (
              purchases.map((tx, index) => {
                const sNo = index + 1;
                const volume = tx.volume || 0;
                const qty = tx.qty || 0;
                const rowVolume = volume * qty;
                cumulativeVolume += rowVolume;

                const rate = tx.rate || 0;
                const rowPurchase = rate * qty;
                cumulativePurchaseValue += rowPurchase;

                return (
                  <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-4 font-semibold text-slate-500 border-r border-slate-100 bg-slate-50/30">{sNo}</td>
                    <td className="px-4 py-4 whitespace-nowrap font-medium text-[13px]">{format(new Date(tx.date), 'dd-MMM-yy')}</td>
                    <td className="px-4 py-4 max-w-[120px] truncate font-bold text-slate-900 text-center">{tx.entity}</td>
                    <td className="px-4 py-4 max-w-[200px] truncate text-slate-700 italic">{tx.product}</td>
                    <td className="px-4 py-4 text-right font-medium">{qty}</td>
                    <td className="px-4 py-4 text-right border-r border-slate-100 font-semibold text-blue-600">{tx.discountPercent || 0}</td>
                    <td className="px-4 py-4 text-right">{rowVolume.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-bold text-emerald-700 bg-emerald-50/30 border-r border-slate-100">{cumulativeVolume.toFixed(2)}</td>
                    <td className="px-4 py-4 text-right font-bold text-slate-900">₹{rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-4 py-4 text-right font-black text-slate-900 bg-slate-50/50">
                      ₹{cumulativePurchaseValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
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
