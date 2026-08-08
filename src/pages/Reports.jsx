import React, { useState, useMemo } from 'react';
import { useTransactionStore } from '../store/transactionStore';
import { useProductsStore } from '../store/productsStore';
import { runFIFOEngine } from '../utils/calculationEngine';
import { Card, Button, Select } from '../components/ui';
import { FileText, Download, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import Papa from 'papaparse';

export default function Reports() {
  const transactions = useTransactionStore(s => s.transactions);
  const products = useProductsStore(s => s.products);
  const [selectedReport, setSelectedReport] = useState('product-pl');

  // Compute FIFO details
  const reportData = useMemo(() => {
    return runFIFOEngine(transactions, products);
  }, [transactions, products]);

  const productWisePL = useMemo(() => {
    const { salesDetails } = reportData;
    const map = {};
    salesDetails.forEach(s => {
      if (!map[s.product]) {
        map[s.product] = { product: s.product, qtySold: 0, revenue: 0, cost: 0, profit: 0 };
      }
      map[s.product].qtySold += s.qty;
      map[s.product].revenue += s.salesValue;
      map[s.product].cost += s.costOfGoodsSold;
      map[s.product].profit += s.grossProfit;
    });
    return Object.values(map);
  }, [reportData]);

  const vendorWiseProfit = useMemo(() => {
    const purchases = transactions.filter(t => t.type === 'purchase');
    const map = {};
    purchases.forEach(p => {
      if (!map[p.entity]) {
        map[p.entity] = { vendor: p.entity, purchaseQty: 0, expenditure: 0 };
      }
      map[p.entity].purchaseQty += p.qty;
      map[p.entity].expenditure += p.qty * p.rate;
    });
    return Object.values(map);
  }, [transactions]);

  const customerWiseProfit = useMemo(() => {
    const { salesDetails } = reportData;
    const map = {};
    salesDetails.forEach(s => {
      const name = s.entity || 'WALK-IN';
      if (!map[name]) {
        map[name] = { customer: name, qtySold: 0, revenue: 0, cost: 0, profit: 0 };
      }
      map[name].qtySold += s.qty;
      map[name].revenue += s.salesValue;
      map[name].cost += s.costOfGoodsSold;
      map[name].profit += s.grossProfit;
    });
    return Object.values(map);
  }, [reportData]);

  const monthlyProfitReport = useMemo(() => {
    const { salesDetails } = reportData;
    const map = {};
    salesDetails.forEach(s => {
      const date = new Date(s.date);
      const monthStr = date.toLocaleString('default', { month: 'short', year: 'numeric' });
      if (!map[monthStr]) {
        map[monthStr] = { month: monthStr, sales: 0, cogs: 0, profit: 0, sortKey: date.getTime() };
      }
      map[monthStr].sales += s.salesValue;
      map[monthStr].cogs += s.costOfGoodsSold;
      map[monthStr].profit += s.grossProfit;
    });
    return Object.values(map).sort((a, b) => a.sortKey - b.sortKey);
  }, [reportData]);

  const inventoryValuationReport = useMemo(() => {
    const { productStats } = reportData;
    return productStats.map(p => {
      const avgRate = p.totalPurchased > 0 ? (p.valuation / p.stock) || 0 : 0;
      return {
        product: p.product,
        stock: p.stock,
        avgRate,
        valuation: p.valuation
      };
    }).filter(p => p.stock > 0);
  }, [reportData]);

  const downloadCSV = () => {
    let data = [];
    let filename = '';

    if (selectedReport === 'product-pl') {
      filename = 'Product_Wise_PL.csv';
      data = productWisePL.map(p => ({
        'Product': p.product,
        'Qty Sold': p.qtySold,
        'Revenue': p.revenue.toFixed(2),
        'Cost (FIFO)': p.cost.toFixed(2),
        'Profit': p.profit.toFixed(2),
        'Profit %': p.cost > 0 ? ((p.profit / p.cost) * 100).toFixed(2) + '%' : '0%'
      }));
    } else if (selectedReport === 'vendor-profit') {
      filename = 'Vendor_Wise_Purchases.csv';
      data = vendorWiseProfit.map(v => ({
        'Vendor': v.vendor,
        'Total Purchase Qty': v.purchaseQty,
        'Expenditure': v.expenditure.toFixed(2)
      }));
    } else if (selectedReport === 'customer-profit') {
      filename = 'Customer_Wise_Profit.csv';
      data = customerWiseProfit.map(c => ({
        'Customer': c.customer,
        'Qty Sold': c.qtySold,
        'Revenue': c.revenue.toFixed(2),
        'Cost (FIFO)': c.cost.toFixed(2),
        'Profit': c.profit.toFixed(2),
        'Profit %': c.cost > 0 ? ((c.profit / c.cost) * 100).toFixed(2) + '%' : '0%'
      }));
    } else if (selectedReport === 'monthly-profit') {
      filename = 'Monthly_Profit_Report.csv';
      data = monthlyProfitReport.map(m => ({
        'Month': m.month,
        'Revenue': m.sales.toFixed(2),
        'Cost of Goods Sold': m.cogs.toFixed(2),
        'Profit': m.profit.toFixed(2),
        'Profit %': m.cogs > 0 ? ((m.profit / m.cogs) * 100).toFixed(2) + '%' : '0%'
      }));
    } else if (selectedReport === 'inventory-valuation') {
      filename = 'Inventory_Valuation_Report.csv';
      data = inventoryValuationReport.map(i => ({
        'Product': i.product,
        'Stock': i.stock,
        'Average Rate': i.avgRate.toFixed(2),
        'Valuation': i.valuation.toFixed(2)
      }));
    }

    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            Reporting Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">Generate and export PMR, SMR, and profit analysis reports.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} className="flex items-center gap-2">
            Print / Save PDF
          </Button>
          <Button onClick={downloadCSV} className="flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export CSV / Excel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1 space-y-2">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Select Report Category</label>
          {[
            { id: 'product-pl', label: 'Product Wise P&L' },
            { id: 'vendor-profit', label: 'Vendor Purchases' },
            { id: 'customer-profit', label: 'Customer Wise Profit' },
            { id: 'monthly-profit', label: 'Monthly Profit Trend' },
            { id: 'inventory-valuation', label: 'Inventory Valuation' }
          ].map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all ${
                selectedReport === r.id
                  ? 'bg-blue-50 text-blue-600 shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="md:col-span-3">
          <Card className="p-6 overflow-x-auto print:border-none print:shadow-none">
            {selectedReport === 'product-pl' && (
              <div>
                <h3 className="text-lg font-bold text-slate-950 mb-4 print:hidden">Product Wise P&L</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Qty Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Cost (FIFO)</th>
                      <th className="px-4 py-3 text-right">Gross Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productWisePL.map((p, idx) => {
                      const pct = p.cost > 0 ? (p.profit / p.cost) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-950">{p.product}</td>
                          <td className="px-4 py-3 text-right">{p.qtySold}</td>
                          <td className="px-4 py-3 text-right">₹{p.revenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{p.cost.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold ${p.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{p.profit.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'vendor-profit' && (
              <div>
                <h3 className="text-lg font-bold text-slate-950 mb-4 print:hidden">Vendor Wise Expenditure</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Vendor</th>
                      <th className="px-4 py-3 text-right">Total Purchase Qty</th>
                      <th className="px-4 py-3 text-right">Expenditure</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendorWiseProfit.map((v, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-950">{v.vendor}</td>
                        <td className="px-4 py-3 text-right">{v.purchaseQty}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900">₹{v.expenditure.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'customer-profit' && (
              <div>
                <h3 className="text-lg font-bold text-slate-950 mb-4 print:hidden">Customer Wise Profit</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 text-right">Qty Sold</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">Cost (FIFO)</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customerWiseProfit.map((c, idx) => {
                      const pct = c.cost > 0 ? (c.profit / c.cost) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-950">{c.customer}</td>
                          <td className="px-4 py-3 text-right">{c.qtySold}</td>
                          <td className="px-4 py-3 text-right">₹{c.revenue.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{c.cost.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold ${c.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{c.profit.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'monthly-profit' && (
              <div>
                <h3 className="text-lg font-bold text-slate-950 mb-4 print:hidden">Monthly Profit Report</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Month</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-right">COGS (FIFO)</th>
                      <th className="px-4 py-3 text-right">Profit</th>
                      <th className="px-4 py-3 text-right">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyProfitReport.map((m, idx) => {
                      const pct = m.cogs > 0 ? (m.profit / m.cogs) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-semibold text-slate-950">{m.month}</td>
                          <td className="px-4 py-3 text-right">₹{m.sales.toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">₹{m.cogs.toLocaleString()}</td>
                          <td className={`px-4 py-3 text-right font-bold ${m.profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            ₹{m.profit.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-blue-600">{pct.toFixed(2)}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {selectedReport === 'inventory-valuation' && (
              <div>
                <h3 className="text-lg font-bold text-slate-950 mb-4 print:hidden">Inventory Valuation Report</h3>
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                    <tr className="border-b border-slate-200">
                      <th className="px-4 py-3">Product Name</th>
                      <th className="px-4 py-3 text-right">Current Stock</th>
                      <th className="px-4 py-3 text-right">Avg Purchase Rate</th>
                      <th className="px-4 py-3 text-right">Valuation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {inventoryValuationReport.map((i, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-semibold text-slate-950">{i.product}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-800">{i.stock}</td>
                        <td className="px-4 py-3 text-right">₹{i.avgRate.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 text-right font-black text-blue-600">₹{i.valuation.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
