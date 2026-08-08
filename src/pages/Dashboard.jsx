import React, { useMemo } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { useProductsStore } from '../store/productsStore';
import { useInventoryStore } from '../store/inventoryStore';
import { Card, cn } from '../components/ui';
import { DollarSign, TrendingUp, Package, ArrowUpRight, ArrowDownRight, Award, AlertOctagon } from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { format } from 'date-fns';
import { runFIFOEngine } from '../utils/calculationEngine';

export default function Dashboard() {
  const transactions = useTransactionStore(s => s.transactions);
  const products = useProductsStore(s => s.products);
  const { getMetrics } = useInventoryStore();

  const metrics = getMetrics();

  const recentTransactions = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);
  }, [transactions]);

  // Compute advanced statistics from FIFO engine
  const stats = useMemo(() => {
    const { productStats, salesDetails } = runFIFOEngine(transactions, products);
    
    // Sort products by quantity sold to find fast/slow moving products
    const sortedBySales = [...productStats].sort((a, b) => b.totalSold - a.totalSold);
    const fastMoving = sortedBySales.filter(p => p.totalSold > 0).slice(0, 3);
    const slowMoving = [...productStats].filter(p => p.stock > 0).sort((a, b) => a.totalSold - b.totalSold).slice(0, 3);

    // Group sales and purchases by month for timeline
    const monthlyMap = {};
    
    salesDetails.forEach(s => {
      const d = format(new Date(s.date), 'MMM yyyy');
      if (!monthlyMap[d]) monthlyMap[d] = { name: d, sales: 0, purchases: 0, profit: 0 };
      monthlyMap[d].sales += s.salesValue;
      monthlyMap[d].profit += s.grossProfit;
    });

    transactions.forEach(tx => {
      if (tx.type === 'purchase') {
        const d = format(new Date(tx.date), 'MMM yyyy');
        if (!monthlyMap[d]) monthlyMap[d] = { name: d, sales: 0, purchases: 0, profit: 0 };
        monthlyMap[d].purchases += tx.qty * tx.rate;
      }
    });

    const monthlyTimeline = Object.values(monthlyMap);

    return {
      fastMoving,
      slowMoving,
      monthlyTimeline
    };
  }, [transactions, products]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-sans">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Revenue</p>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
            ₹{metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Total Cost (COGS)</p>
            <div className="p-2 bg-rose-50 rounded-lg">
              <Package className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
             ₹{metrics.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Net Profit</p>
            <div className="p-2 bg-emerald-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
             ₹{metrics.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">Inventory Value (FIFO)</p>
            <div className="p-2 bg-amber-50 rounded-lg">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="mt-4 text-2xl font-bold text-slate-900">
             ₹{metrics.inventoryValuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fast Moving Products */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-emerald-600" />
            <h3 className="text-md font-bold text-slate-900">Fast Moving Products</h3>
          </div>
          <div className="space-y-3 flex-1">
            {stats.fastMoving.length > 0 ? (
              stats.fastMoving.map((p, idx) => (
                <div key={p.product} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{p.product}</span>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                    {p.totalSold} Sold
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">No sales recorded.</div>
            )}
          </div>
        </Card>

        {/* Slow Moving Products */}
        <Card className="p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <AlertOctagon className="w-5 h-5 text-rose-600" />
            <h3 className="text-md font-bold text-slate-900">Slow Moving Products</h3>
          </div>
          <div className="space-y-3 flex-1">
            {stats.slowMoving.length > 0 ? (
              stats.slowMoving.map((p, idx) => (
                <div key={p.product} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <span className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{p.product}</span>
                  <span className="text-xs font-bold bg-slate-200 text-slate-800 px-2.5 py-1 rounded-full">
                    {p.totalSold} Sold / {p.stock} Stock
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-500 py-4 text-center">No inventory found.</div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-6 flex flex-col">
          <h2 className="text-md font-bold text-slate-900 mb-4">Recent Activity Log</h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-3 flex-1">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={cn("p-1.5 rounded-full", tx.type === 'sale' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600")}>
                      {tx.type === 'sale' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900 truncate max-w-[150px]">{tx.product}</p>
                      <p className="text-[10px] text-slate-500">{format(new Date(tx.date), 'MMM dd')} - {tx.entity}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">₹{(tx.qty * tx.rate).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-500">{tx.qty} x ₹{tx.rate}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              No activity logs.
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-slate-900 mb-4 font-sans">Monthly Revenue & Net Profit Timeline</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyTimeline}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="sales" name="Sales Revenue" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="purchases" name="Purchases Value" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
