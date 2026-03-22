import React from 'react';
import { useStore } from '../store/useStore';
import { Card } from '../components/ui';
import { PackageX } from 'lucide-react';

export default function Inventory() {
  const { getStock } = useStore();
  const stockData = getStock().filter(item => item.totalPurchased > 0 || item.totalSold > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Inventory Management (Stock)</h1>
      </div>

      <Card className="overflow-x-auto border-none shadow-premium">
        <table className="w-full text-sm text-left text-slate-700 bg-white min-w-max">
          <thead className="bg-slate-50 text-[11px] uppercase text-slate-500 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 font-bold border-r border-slate-100 bg-slate-100/30 w-16 text-center">No</th>
              <th className="px-6 py-4 font-semibold text-slate-900">Product Name</th>
              <th className="px-6 py-4 font-semibold text-right text-slate-900">Purchase Qty</th>
              <th className="px-6 py-4 font-semibold text-right text-slate-900">Sales Qty</th>
              <th className="px-6 py-4 font-semibold text-right text-slate-900 border-l border-slate-100 bg-blue-50/30">Remaining Stocks</th>
            </tr>
          </thead>
          <tbody>
            {stockData.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-24 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <PackageX className="w-12 h-12 text-slate-200 mb-4" />
                    <p className="text-lg font-semibold text-slate-400">Inventory is empty</p>
                    <p className="text-sm mt-1 text-slate-400">New arrivals will appear here once purchased.</p>
                  </div>
                </td>
              </tr>
            ) : (
              stockData.map((item, idx) => (
                <tr key={item.product} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-center text-slate-400 border-r border-slate-100 bg-slate-50/30 font-bold">{idx + 1}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{item.product}</td>
                  <td className="px-6 py-4 text-right text-slate-600 font-medium">{item.totalPurchased}</td>
                  <td className="px-6 py-4 text-right text-slate-600 font-medium">{item.totalSold}</td>
                  <td className="px-6 py-4 text-right font-black bg-blue-50/30 text-blue-700 border-l border-slate-100">
                    {item.stock}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
