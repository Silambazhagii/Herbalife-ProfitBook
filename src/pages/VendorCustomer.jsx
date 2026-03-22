import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Card, Input, Button } from '../components/ui';
import { Trash2, UserPlus, Building2 } from 'lucide-react';

export default function VendorCustomer() {
  const { vendors, customers, addVendor, deleteVendor, addCustomer, deleteCustomer } = useStore();
  
  const [newVendor, setNewVendor] = useState('');
  const [newCustomer, setNewCustomer] = useState('');

  const handleAddVendor = (e) => {
    e.preventDefault();
    if (newVendor.trim()) {
      addVendor(newVendor.trim().toUpperCase());
      setNewVendor('');
    }
  };

  const handleAddCustomer = (e) => {
    e.preventDefault();
    if (newCustomer.trim()) {
      addCustomer(newCustomer.trim().toUpperCase());
      setNewCustomer('');
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Vendor & Customer Management</h1>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Vendors Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Vendors</h2>
              <p className="text-sm text-slate-500">Manage your suppliers</p>
            </div>
          </div>

          <form onSubmit={handleAddVendor} className="flex gap-2 mb-6">
            <Input 
              placeholder="Enter vendor name..." 
              value={newVendor}
              onChange={(e) => setNewVendor(e.target.value)}
              className="uppercase"
            />
            <Button type="submit" disabled={!newVendor.trim()}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </form>

          <div className="space-y-2">
            {vendors.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No vendors added yet</div>
            ) : (
              vendors.map((vendor, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700">{vendor}</span>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete vendor "${vendor}"?`)) {
                        deleteVendor(vendor);
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Delete Vendor"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Customers Section */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Customers</h2>
              <p className="text-sm text-slate-500">Manage your buyers</p>
            </div>
          </div>

          <form onSubmit={handleAddCustomer} className="flex gap-2 mb-6">
            <Input 
              placeholder="Enter customer name..." 
              value={newCustomer}
              onChange={(e) => setNewCustomer(e.target.value)}
              className="uppercase"
            />
            <Button type="submit" variant="emerald" disabled={!newCustomer.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <UserPlus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </form>

          <div className="space-y-2">
            {customers.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">No customers added yet</div>
            ) : (
              customers.map((customer, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <span className="font-semibold text-slate-700">{customer}</span>
                  <button 
                    onClick={() => {
                      if (window.confirm(`Delete customer "${customer}"?`)) {
                        deleteCustomer(customer);
                      }
                    }}
                    className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                    title="Delete Customer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </Card>

      </div>
    </div>
  );
}
