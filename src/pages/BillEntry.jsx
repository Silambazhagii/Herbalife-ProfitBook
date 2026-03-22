import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { Card, Button, Input, Label, Select, cn } from '../components/ui';
import { CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

export default function BillEntry() {
  const { addTransaction, getStock, products, discountTiers, vendors, customers } = useStore();
  const [type, setType] = useState('purchase');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    product: '',
    qty: '',
    discountPercent: '',
    entity: '',
  });

  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
    setSuccessMsg('');
  };

  const handleToggle = (newType) => {
    setType(newType);
    setFormData(prev => ({ ...prev, entity: '' })); // Reset entity when switching type
    setError('');
    setSuccessMsg('');
  };

  const selectedProduct = products.find(p => p.name === formData.product);

  const calculateTotal = () => {
    const q = Number(formData.qty);
    const pct = Number(formData.discountPercent);
    if (!selectedProduct || isNaN(q) || isNaN(pct)) return 0;
    
    const rate = selectedProduct.mrp - (selectedProduct.mrp * (pct / 100));
    return q * rate;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.date || !formData.product || !formData.qty || !formData.discountPercent || !formData.entity) {
      setError('All fields are required.');
      return;
    }

    const qty = Number(formData.qty);
    const pct = Number(formData.discountPercent);

    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    if (type === 'sale') {
      const stockData = getStock();
      const productStock = stockData.find(s => s.product.toLowerCase() === formData.product.toLowerCase());
      const currentStock = productStock ? productStock.stock : 0;
      
      if (qty > currentStock) {
        setError(`Cannot sell more than stock. Current stock for ${formData.product} is ${currentStock}.`);
        return;
      }
    }

    const rate = selectedProduct.mrp - (selectedProduct.mrp * (pct / 100));

    addTransaction({
      type,
      date: new Date(formData.date).toISOString(),
      product: formData.product,
      qty,
      discountPercent: pct,
      rate,
      volume: selectedProduct.volume,
      entity: formData.entity.trim(),
    });

    setSuccessMsg(`Successfully saved ${type}!`);
    setFormData(prev => ({ ...prev, product: '', qty: '', discountPercent: '', entity: '' }));
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bill Entry</h1>
      </div>

      <Card className="p-5 md:p-8">
        <div className="flex p-1 bg-slate-100/80 rounded-xl w-full max-w-sm mb-8 relative z-10">
          <button
            onClick={() => handleToggle('purchase')}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
              type === 'purchase' ? "bg-white text-blue-600 shadow-[0_2px_10px_rgb(0,0,0,0.06)]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            Purchase Entry
          </button>
          <button
            onClick={() => handleToggle('sale')}
            className={cn(
              "flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all",
              type === 'sale' ? "bg-white text-blue-600 shadow-[0_2px_10px_rgb(0,0,0,0.06)]" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
            )}
          >
            Sales Entry
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-100 font-medium">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="entity">{type === 'purchase' ? 'Vendor Name' : 'Customer Name'}</Label>
              <Select
                id="entity"
                name="entity"
                value={formData.entity}
                onChange={handleChange}
                required
              >
                <option value="" disabled>Select {type === 'purchase' ? 'Vendor' : 'Customer'}</option>
                {(type === 'purchase' ? vendors : customers).map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </Select>
            </div>

            <div className="space-y-2 lg:col-span-1">
              <Label htmlFor="product">Product Name</Label>
              <Select
                id="product"
                name="product"
                value={formData.product}
                onChange={handleChange}
              >
                <option value="" disabled>Select a product</option>
                {products.map(p => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                name="qty"
                type="number"
                min="1"
                step="0.01"
                placeholder="0"
                value={formData.qty}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="discountPercent">Discount %</Label>
              <Select
                id="discountPercent"
                name="discountPercent"
                value={formData.discountPercent}
                onChange={handleChange}
              >
                <option value="" disabled>Select %</option>
                {discountTiers.map(t => (
                  <option key={t} value={t}>{t}%</option>
                ))}
              </Select>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-12">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Volume Built</p>
                <p className="text-2xl font-bold text-slate-800">
                  {selectedProduct && formData.qty ? (selectedProduct.volume * Number(formData.qty)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total {type === 'purchase' ? 'Purchase' : 'Sale'} Value</p>
                <p className="text-3xl font-bold text-blue-600">
                  ₹{calculateTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <Button type="submit" size="lg" className="w-full sm:w-auto px-10 shadow-blue-500/20">
               Save {type === 'purchase' ? 'Purchase' : 'Sale'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
