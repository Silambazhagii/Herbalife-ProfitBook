import React, { useMemo } from 'react';
import { useStore } from '../store/useStore';
import { Card, Select, cn } from '../components/ui';
import { DollarSign, TrendingUp, Package, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const { transactions, getMetrics } = useStore();
  const { totalRevenue, totalCost, totalProfit } = getMetrics();

  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const chartData = useMemo(() => {
    // Group transactions by date for simple chart
    const dataMap = transactions.reduce((acc, tx) => {
      const d = format(new Date(tx.date), 'MMM dd');
      if (!acc[d]) acc[d] = { name: d, sales: 0, purchases: 0 };
      const val = Number(tx.qty) * Number(tx.rate);
      if (tx.type === 'sale') acc[d].sales += val;
      if (tx.type === 'purchase') acc[d].purchases += val;
      return acc;
    }, {});
    return Object.values(dataMap);
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Revenue</p>
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">
            ₹{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Cost (COGS + Current Stock)</p>
            <div className="p-2 bg-red-50 rounded-lg">
              <Package className="w-5 h-5 text-red-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">
             ₹{totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Est. Profit</p>
            <div className="p-2 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="mt-4 text-3xl font-bold text-gray-900">
             ₹{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Revenue & Cost Timeline</h2>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#6B7280'}} dx={-10} />
                <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Line type="monotone" dataKey="sales" name="Sales" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="purchases" name="Purchases" stroke="#EF4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 flex flex-col">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Transactions</h2>
          {recentTransactions.length > 0 ? (
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-full", tx.type === 'sale' ? "bg-green-100 text-green-600" : "bg-blue-100 text-blue-600")}>
                      {tx.type === 'sale' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tx.product}</p>
                      <p className="text-xs text-gray-500">{format(new Date(tx.date), 'MMM dd, yyyy')} - {tx.entity}</p>
                    </div>
                  </div>
                  <div className="text-right">
             <p className="text-sm font-bold text-gray-900">
               ₹{(tx.qty * tx.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}
             </p>
             <p className="text-xs text-gray-500">{tx.qty} x ₹{tx.rate}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              No recent transactions
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
