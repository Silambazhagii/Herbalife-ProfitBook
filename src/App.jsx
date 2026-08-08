import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const BillEntry = lazy(() => import('./pages/BillEntry'));
const Inventory = lazy(() => import('./pages/Inventory'));
const PMR = lazy(() => import('./pages/PMR'));
const SMR = lazy(() => import('./pages/SMR'));
const ProductPL = lazy(() => import('./pages/ProductPL'));
const PriceHistory = lazy(() => import('./pages/PriceHistory'));
const VendorCustomer = lazy(() => import('./pages/VendorCustomer'));
const Reports = lazy(() => import('./pages/Reports'));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <span className="text-sm font-semibold text-slate-500">Loading ProfitBook...</span>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="bill-entry" element={<BillEntry />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="pmr" element={<PMR />} />
            <Route path="smr" element={<SMR />} />
            <Route path="product-pl" element={<ProductPL />} />
            <Route path="price-history" element={<PriceHistory />} />
            <Route path="vendor-customer" element={<VendorCustomer />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;

