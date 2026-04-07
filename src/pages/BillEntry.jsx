import React, { useState, useRef } from 'react';
import { useStore } from '../store/useStore';
import { Card, Button, Input, Label, Select, cn } from '../components/ui';
import { CheckCircle2, Trash2, FileUp } from 'lucide-react';
import { format } from 'date-fns';
import * as pdfjsLib from 'pdfjs-dist';

// Use local worker bundled via Vite to avoid CORS and version mismatch issues
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function BillEntry() {
  const { addTransaction, getStock, products, discountTiers, vendors, customers } = useStore();
  const [type, setType] = useState('purchase');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [commonData, setCommonData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    entity: '',
  });

  const [formData, setFormData] = useState({
    product: '',
    qty: '',
    discountPercent: '',
  });

  const [draftItems, setDraftItems] = useState([]);
  const [error, setError] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const fileInputRef = useRef(null);

  const stockData = getStock();

  const handleCommonChange = (e) => {
    setCommonData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleToggle = (newType) => {
    setType(newType);
    setCommonData(prev => ({ ...prev, entity: '' }));
    setDraftItems([]);
    setError('');
    setSuccessMsg('');
  };

  const selectedProduct = products.find(p => p.name === formData.product);

  const getAvailableStock = (productName) => {
    const stockInfo = stockData.find(s => s.product.toLowerCase() === productName.toLowerCase());
    const baseStock = stockInfo ? stockInfo.stock : 0;
    // Subtract stock already queued in draftItems
    const draftStock = draftItems.filter(item => item.product === productName).reduce((sum, item) => sum + item.qty, 0);
    return baseStock - draftStock;
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    if (!commonData.date || !commonData.entity) {
      setError('Please select Date and Entity (Vendor/Customer) before adding items.');
      return;
    }
    if (!formData.product || !formData.qty || !formData.discountPercent) {
      setError('Product, Quantity, and Discount are required.');
      return;
    }

    const qty = Number(formData.qty);
    const pct = Number(formData.discountPercent);

    if (qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    if (type === 'sale') {
      const available = getAvailableStock(formData.product);
      if (qty > available) {
        setError(`Cannot sell more than available stock. Available for ${formData.product} is ${available} (taking drafts into account).`);
        return;
      }
    }

    const rate = selectedProduct.mrp - (selectedProduct.mrp * (pct / 100));

    const newItem = {
      id: crypto.randomUUID(),
      product: formData.product,
      qty,
      discountPercent: pct,
      rate,
      volume: selectedProduct.volume,
    };

    setDraftItems(prev => [...prev, newItem]);
    setFormData({ product: '', qty: '', discountPercent: '' });
    setError('');
  };

  const handleRemoveItem = (id) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveAll = () => {
    if (draftItems.length === 0) {
      setError('No items in the draft list to save.');
      return;
    }
    if (!commonData.date || !commonData.entity) {
      setError('Date and Entity are required to save.');
      return;
    }

    draftItems.forEach(item => {
      addTransaction({
        type,
        date: new Date(commonData.date).toISOString(),
        product: item.product,
        qty: item.qty,
        discountPercent: item.discountPercent,
        rate: item.rate,
        volume: item.volume,
        entity: commonData.entity.trim(),
      });
    });

    setSuccessMsg(`Successfully saved ${draftItems.length} ${type} item(s)!`);
    setDraftItems([]);
    setCommonData(prev => ({ ...prev, entity: '' }));
    
    setTimeout(() => {
      setSuccessMsg('');
    }, 4000);
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    setError('');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + ' ';
      }

      // Best-effort parsing: search for product names in the text
      const foundProducts = [];
      products.forEach(p => {
        // Simple case-insensitive inclusion check
        if (fullText.toLowerCase().includes(p.name.toLowerCase())) {
          foundProducts.push(p);
        }
      });

      if (foundProducts.length === 0) {
        setError('Could not confidently find any matching products in the PDF. Please add manually.');
      } else {
        const newDrafts = foundProducts.map(fp => {
          // Assume qty 1, tier 42 as default, let user adjust
          const pct = 42; 
          const rate = fp.mrp - (fp.mrp * (pct / 100));
          return {
            id: crypto.randomUUID(),
            product: fp.name,
            qty: 1,
            discountPercent: pct,
            rate: rate,
            volume: fp.volume,
          };
        });
        setDraftItems(prev => [...prev, ...newDrafts]);
        setSuccessMsg(`Extracted ${newDrafts.length} product(s) from PDF. Please review quantities and discounts.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err) {
      console.error(err);
      setError('Error parsing PDF document. Check console for details.');
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const currentAvailableStock = formData.product ? getAvailableStock(formData.product) : null;
  const draftTotalVolume = draftItems.reduce((sum, item) => sum + (item.volume * item.qty), 0);
  const draftTotalValue = draftItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Bill Entry</h1>
        
        {type === 'purchase' && (
          <div className="mt-4 sm:mt-0 flex gap-2 items-center">
            <input 
              type="file" 
              accept=".pdf" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handlePdfUpload}
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isParsing}
            >
               <FileUp className="w-4 h-4 mr-2" />
               {isParsing ? 'Parsing PDF...' : 'Upload PDF Invoice'}
            </Button>
          </div>
        )}
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

        {/* Common Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              name="date"
              type="date"
              value={commonData.date}
              onChange={handleCommonChange}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="entity">{type === 'purchase' ? 'Vendor Name' : 'Customer Name'}</Label>
            <Select
              id="entity"
              name="entity"
              value={commonData.entity}
              onChange={handleCommonChange}
              required
            >
              <option value="" disabled>Select {type === 'purchase' ? 'Vendor' : 'Customer'}</option>
              {(type === 'purchase' ? vendors : customers).map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </Select>
          </div>
        </div>

        <form onSubmit={handleAddToList} className="space-y-6 lg:space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            <div className="space-y-2 md:col-span-5">
              <Label htmlFor="product">
                Product Name {currentAvailableStock !== null && (
                  <span className="ml-2 text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                    Stock: {currentAvailableStock}
                  </span>
                )}
              </Label>
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

            <div className="space-y-2 md:col-span-3">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                name="qty"
                type="number"
                min="1"
                step="1"
                placeholder="1"
                value={formData.qty}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
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

            <div className="md:col-span-2 pb-1">
              <Button type="submit" variant="outline" className="w-full">
                Add Item
              </Button>
            </div>
          </div>
        </form>

        {/* Draft Items List */}
        {draftItems.length > 0 && (
          <div className="mt-8 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">%</th>
                    <th className="px-4 py-3 text-right">Rate</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {draftItems.map(item => (
                    <tr key={item.id} className="bg-white hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-800">{item.product}</td>
                      <td className="px-4 py-3 text-right">{item.qty}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">{item.discountPercent}%</td>
                      <td className="px-4 py-3 text-right text-slate-600">₹{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">₹{(item.rate * item.qty).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveItem(item.id)} className="text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-8">
                <div>
                  <span className="text-sm text-slate-500 font-medium block">Total Volume</span>
                  <span className="text-lg font-bold text-slate-800">{draftTotalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-sm text-slate-500 font-medium block">Total Amount</span>
                  <span className="text-xl font-bold text-blue-600">₹{draftTotalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
              <Button onClick={handleSaveAll} size="lg" className="px-8 shadow-blue-500/20 w-full sm:w-auto">
                Save All Items
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
