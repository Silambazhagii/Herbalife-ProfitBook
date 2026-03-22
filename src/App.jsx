import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';

import Dashboard from './pages/Dashboard';
import BillEntry from './pages/BillEntry';
import Inventory from './pages/Inventory';
import PMR from './pages/PMR';
import SMR from './pages/SMR';
import ProductPL from './pages/ProductPL';
import VendorCustomer from './pages/VendorCustomer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="bill-entry" element={<BillEntry />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="pmr" element={<PMR />} />
          <Route path="smr" element={<SMR />} />
          <Route path="product-pl" element={<ProductPL />} />
          <Route path="vendor-customer" element={<VendorCustomer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
