import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, Input, Select } from '../components/ui';
import { Search, History, Calendar, Calculator, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export default function PriceHistory() {
  const { priceHistory, discountTiers } = useStore();
  // Sort history chronologically (newest first)
  const sortedHistory = useMemo(() => {
    return [...priceHistory].sort((a,b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  }, [priceHistory]);

  const [selectedDate, setSelectedDate] = useState(sortedHistory.length > 0 ? sortedHistory[0].id : '');
  const [searchQuery, setSearchQuery] = useState('');

  // Find the currently selected snapshot and the immediate previous one for diffing
  const { currentSnapshot, previousSnapshot } = useMemo(() => {
    if (sortedHistory.length === 0) return { currentSnapshot: null, previousSnapshot: null };
    
    const index = sortedHistory.findIndex((s) => s.id === selectedDate);
    if (index === -1) return { currentSnapshot: null, previousSnapshot: null };

    return {
      currentSnapshot: sortedHistory[index],
      previousSnapshot: sortedHistory[index + 1] || null
    };
  }, [sortedHistory, selectedDate]);

  // Filter snapshot products by search query
  const filteredProducts = useMemo(() => {
    if (!currentSnapshot) return [];
    if (!searchQuery) return currentSnapshot.products;
    return currentSnapshot.products.filter(p => 
      p.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [currentSnapshot, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <History className="w-6 h-6 text-blue-600" />
            Price History
          </h1>
          <p className="text-sm text-gray-500 mt-1">View past snapshots of your product price lists.</p>
        </div>
      </div>

      <Card className="p-4 sm:p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              Select Date Snapshot
            </label>
            <Select 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              disabled={priceHistory.length === 0}
            >
              {sortedHistory.length === 0 ? (
                <option value="">No history available</option>
              ) : (
                sortedHistory.map((snapshot) => (
                  <option key={snapshot.id} value={snapshot.id}>
                    {new Date(snapshot.uploadDate).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short'
                    })}
                  </option>
                ))
              )}
            </Select>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
              <Search className="w-4 h-4 text-slate-400" />
              Search Product
            </label>
            <Input 
              type="text" 
              placeholder="Type product name to search..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={!currentSnapshot}
            />
          </div>
        </div>
      </Card>

      {!currentSnapshot ? (
        <Card className="p-12 text-center flex flex-col items-center justify-center">
          <Calculator className="w-16 h-16 text-slate-200 mb-4" />
          <h3 className="text-lg font-semibold text-slate-800 mb-1">No Snapshot Selected</h3>
          <p className="text-sm text-slate-500">
            Upload a Master Product Price List CSV in the Product PL page to generate a new price snapshot.
          </p>
        </Card>
      ) : (
        <div className="animate-in fade-in duration-300">
          <h2 className="text-sm font-semibold text-blue-600 mb-3 ml-1">
            Viewing prices from: {new Date(currentSnapshot.uploadDate).toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'short'})}
          </h2>

          <div className="md:hidden flex items-center justify-end mb-2 text-xs text-slate-500 font-medium">
            <span className="animate-pulse opacity-75">↔ Swipe to view columns</span>
          </div>
          <Card className="overflow-x-auto scroll-smooth webkit-overflow-scrolling-touch">
            <table className="w-full text-sm text-left text-slate-700 bg-white min-w-max">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-4 font-semibold bg-gray-50 md:sticky md:left-0 md:z-10 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">Products</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right">Vol.</th>
                  <th scope="col" className="px-6 py-4 font-semibold text-right border-r border-gray-200">MRP (₹)</th>
                  {discountTiers.map(tier => (
                    <th key={tier} scope="col" className="px-6 py-4 font-semibold text-right">
                      <span className="text-blue-600">{tier}%</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={3 + discountTiers.length} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center">
                        <Search className="w-12 h-12 text-gray-300 mb-2" />
                        <p>No products match your search for this date.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item, idx) => {
                    const prevItem = previousSnapshot?.products.find(p => p.productName === item.productName);
                    const mrpDiff = prevItem && prevItem.mrp !== item.mrp;
                    const volDiff = prevItem && prevItem.volume !== item.volume;
                    const isNew = previousSnapshot && !prevItem;

                    return (
                      <tr key={`${item.productName}-${idx}`} className={`border-b border-gray-50 transition-colors ${mrpDiff || volDiff || isNew ? 'bg-indigo-50/20 hover:bg-indigo-50/40' : 'hover:bg-gray-50/50'}`}>
                        <td className={`px-6 py-4 font-medium bg-white md:sticky md:left-0 md:z-10 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] max-w-xs truncate ${isNew ? 'text-indigo-600' : 'text-gray-900'}`} title={item.productName}>
                          {item.productName}
                          {isNew && <span className="ml-2 text-[10px] uppercase font-bold text-indigo-500 bg-indigo-100 px-1.5 py-0.5 rounded">New</span>}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-600">
                           {volDiff ? (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-xs text-rose-400 line-through">{prevItem.volume}</span>
                                <span className="text-emerald-600 font-bold">{item.volume}</span>
                              </div>
                           ) : (
                             item.volume
                           )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium border-r border-gray-100 bg-gray-50/30">
                          {mrpDiff ? (
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-xs text-rose-400 line-through">
                                ₹{prevItem.mrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span className={`flex items-center gap-1 font-bold ${item.mrp > prevItem.mrp ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {item.mrp > prevItem.mrp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                ₹{item.mrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-900">
                              {item.mrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </td>
                        {discountTiers.map(tier => (
                          <td key={tier} className="px-6 py-4 text-right text-green-700 font-medium bg-green-50/10">
                            {item.discounts[tier] ? item.discounts[tier].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                          </td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
