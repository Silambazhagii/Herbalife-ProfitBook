import React, { useState, useRef } from 'react';
import { useProductsStore } from '../store/productsStore';
import { usePriceStore } from '../store/priceStore';
import { useInventoryStore } from '../store/inventoryStore';
import { Card, Button, Input, Modal } from '../components/ui';
import { Edit2, Calculator, Plus, Trash2, FileUp } from 'lucide-react';
import Papa from 'papaparse';

export default function ProductPL() {
  const { products, discountTiers, updateProduct, addProduct, deleteProduct } = useProductsStore();
  const addPriceHistorySnapshot = usePriceStore(s => s.addPriceHistorySnapshot);
  const getProductPL = useInventoryStore(s => s.getProductPL);

  const plData = getProductPL();

  const [productModal, setProductModal] = useState({ isOpen: false, mode: 'add', product: null });
  const [editName, setEditName] = useState('');
  const [editVolume, setEditVolume] = useState('');
  const [editMrp, setEditMrp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isParsing, setIsParsing] = useState(false);

  const fileInputRef = useRef(null);

  const openAdd = () => {
    setProductModal({ isOpen: true, mode: 'add', product: null });
    setEditName('');
    setEditVolume('');
    setEditMrp('');
  };

  const openEdit = (product) => {
    setProductModal({ isOpen: true, mode: 'edit', product });
    setEditName(product.product);
    setEditVolume(product.volume.toString());
    setEditMrp(product.mrp.toString());
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    const vol = Number(editVolume);
    const mrp = Number(editMrp);
    
    if (editName.trim() === '') {
      alert("Product Name cannot be empty.");
      return;
    }
    if (isNaN(vol) || vol < 0) {
      alert("Volume must be a valid positive number.");
      return;
    }
    if (isNaN(mrp) || mrp < 0) {
      alert("MRP must be a valid positive number.");
      return;
    }

    if (productModal.mode === 'edit') {
      await updateProduct(productModal.product.id, { name: editName.trim(), volume: vol, mrp });
    } else {
      await addProduct({ name: editName.trim(), volume: vol, mrp });
    }
    setProductModal({ isOpen: false, mode: 'add', product: null });
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProduct(id);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    clearMessages();
    setIsParsing(true);

    const fileType = file.name.split('.').pop().toLowerCase();

    if (fileType === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          processExtractedDataArray(results.data.map(row => ({
            name: row['Product Name'] || row['Product'] || row['name'] || row['product'],
            volume: parseFloat(row['Volume'] || row['volume']),
            mrp: parseFloat(row['MRP'] || row['mrp'] || row['MRP (₹)'])
          })));
        },
        error: (err) => {
          console.error(err);
          setError('Error parsing CSV file.');
          setIsParsing(false);
          resetFileInput();
        }
      });
      return;
    }

    setError('Unsupported file type. Please upload a CSV file.');
    setIsParsing(false);
    resetFileInput();
  };

  const processExtractedDataArray = async (items) => {
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let updatedProductsList = [...products];

    for (const data of items) {
      const { name, volume, mrp } = data;

      if (!name || isNaN(volume) || isNaN(mrp)) {
        skippedCount++;
        continue;
      }

      const existingIndex = updatedProductsList.findIndex(p => p.name.toLowerCase() === name.trim().toLowerCase());
      
      if (existingIndex >= 0) {
        updatedProductsList[existingIndex] = { ...updatedProductsList[existingIndex], volume, mrp };
        await updateProduct(updatedProductsList[existingIndex].id, { name: updatedProductsList[existingIndex].name, volume, mrp });
        updatedCount++;
      } else {
        const newProd = { id: crypto.randomUUID(), name: name.trim(), volume, mrp };
        updatedProductsList.push(newProd);
        await addProduct(newProd);
        addedCount++;
      }
    }

    if (addedCount > 0 || updatedCount > 0) {
      const snapshotProducts = updatedProductsList.map(p => {
        const margins = {};
        discountTiers.forEach(tier => {
          margins[tier] = p.mrp - (p.mrp * (tier / 100));
        });
        return {
          productName: p.name,
          volume: p.volume,
          mrp: p.mrp,
          discounts: margins
        };
      });

      await addPriceHistorySnapshot(snapshotProducts);
    }

    if (addedCount === 0 && updatedCount === 0) {
      setError(`No valid products found. Skipped ${skippedCount} invalid rows.`);
    } else {
      setSuccess(`Extracted and processed ${addedCount + updatedCount} products, and saved a Price History snapshot. Skipped ${skippedCount} invalid items.`);
      setTimeout(() => setSuccess(''), 5000);
    }
    
    setIsParsing(false);
    resetFileInput();
  };

  const resetFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900 font-sans">Master Product Price List</h1>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="shrink-0" disabled={isParsing}>
            <FileUp className="w-4 h-4 mr-2" />
            {isParsing ? 'Importing CSV...' : 'Import CSV'}
          </Button>
          <Button onClick={openAdd} className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-100 font-medium">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 font-medium">
          {success}
        </div>
      )}

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
              <th scope="col" className="px-6 py-4 font-semibold text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plData.length === 0 ? (
               <tr>
               <td colSpan={4 + discountTiers.length} className="px-6 py-12 text-center text-gray-500">
                 <div className="flex flex-col items-center justify-center">
                   <Calculator className="w-12 h-12 text-gray-300 mb-2" />
                   <p>No product data available.</p>
                 </div>
               </td>
             </tr>
            ) : (
               plData.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900 bg-white md:sticky md:left-0 md:z-10 md:shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] max-w-xs truncate" title={item.product}>
                    {item.product}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-600">{item.volume}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900 border-r border-gray-100 bg-gray-50/30">
                    {item.mrp.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  {discountTiers.map(tier => (
                    <td key={tier} className="px-6 py-4 text-right text-green-700 font-medium bg-green-50/10">
                      {item.margins[tier].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEdit(item)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Edit Product">
                        <Edit2 className="w-4 h-4 inline" />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.product)} className="text-rose-400 hover:text-rose-600 transition-colors p-1" title="Delete Product">
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {/* Add / Edit Product Modal */}
      <Modal 
        isOpen={productModal.isOpen} 
        onClose={() => setProductModal({ isOpen: false, mode: 'add', product: null })}
        title={productModal.mode === 'add' ? 'Add New Product' : 'Edit Product'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
            <Input 
              type="text" 
              value={editName} 
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Activated Fibre 90 Tablets"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Volume</label>
            <Input 
              type="number" 
              value={editVolume} 
              onChange={(e) => setEditVolume(e.target.value)}
              placeholder="e.g. 15.75"
              step="0.01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">MRP (₹)</label>
            <Input 
              type="number" 
              value={editMrp} 
              onChange={(e) => setEditMrp(e.target.value)}
              placeholder="e.g. 1839"
              step="0.01"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setProductModal({ isOpen: false, mode: 'add', product: null })}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {productModal.mode === 'add' ? 'Add Product' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
