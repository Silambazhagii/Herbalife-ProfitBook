import React, { useState, useRef } from 'react';
import { useProductsStore } from '../store/productsStore';
import { useTransactionStore } from '../store/transactionStore';
import { useInventoryStore } from '../store/inventoryStore';
import { Card, Button, Input, Label, Select, cn } from '../components/ui';
import { CheckCircle2, Trash2, FileUp, AlertTriangle, AlertCircle, XCircle, ShieldCheck, ShieldAlert } from 'lucide-react';
import { format } from 'date-fns';
import {
  extractAndParseInvoice,
  extractTextFromPDF,
  parseInvoiceText,
  detectDocumentType,
  findBestProductMatch
} from '../utils/invoiceParser';
import { CONFIDENCE_THRESHOLD } from '../utils/extraction/index.js';

export default function BillEntry() {
  const { products, discountTiers, vendors, customers } = useProductsStore();
  const { addTransaction, detectDuplicateInvoice } = useTransactionStore();
  const { getStock } = useInventoryStore();

  const [type, setType] = useState('purchase');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [commonData, setCommonData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    entity: '',
    invoiceNumber: ''
  });

  const [formData, setFormData] = useState({
    product: '',
    qty: '',
    discountPercent: '',
  });

  const [draftItems, setDraftItems] = useState([]);
  
  // OCR & Parsing states
  const [isParsing, setIsParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(null);
  const cancelRef = useRef({ cancelled: false });
  const fileInputRef = useRef(null);

  // Review states (For low confidence matches & duplicates)
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  // Parser logs and diagnostics states
  const [parserLogs, setParserLogs] = useState(null);
  const [showParserLogs, setShowParserLogs] = useState(false);

  const stockData = getStock();

  const handleCommonChange = (e) => {
    setCommonData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
  };

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setErrorMsg('');
  };

  const handleToggle = (newType) => {
    setType(newType);
    setCommonData(prev => ({ ...prev, entity: '', invoiceNumber: '' }));
    setDraftItems([]);
    setErrorMsg('');
    setSuccessMsg('');
    setShowReviewScreen(false);
    setDuplicateWarning(null);
  };

  const selectedProduct = products.find(p => p.name === formData.product);

  const getAvailableStock = (productName) => {
    const stockInfo = stockData.find(s => s.product.toLowerCase() === productName.toLowerCase());
    const baseStock = stockInfo ? stockInfo.stock : 0;
    const draftStock = draftItems.filter(item => item.product === productName).reduce((sum, item) => sum + item.qty, 0);
    const reviewStock = reviewItems.filter(item => item.matchedProduct?.name === productName).reduce((sum, item) => sum + item.qty, 0);
    return baseStock - draftStock - reviewStock;
  };

  const handleAddToList = (e) => {
    e.preventDefault();
    if (!commonData.date || !commonData.entity) {
      setErrorMsg('Please select Date and Entity (Vendor/Customer) before adding items.');
      return;
    }
    if (!formData.product || !formData.qty || !formData.discountPercent) {
      setErrorMsg('Product, Quantity, and Discount are required.');
      return;
    }

    const qty = Number(formData.qty);
    const pct = Number(formData.discountPercent);

    if (qty <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    if (type === 'sale') {
      const available = getAvailableStock(formData.product);
      if (qty > available) {
        setErrorMsg(`Cannot sell more than available stock. Available for ${formData.product} is ${available}.`);
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
    setErrorMsg('');
  };

  const handleRemoveItem = (id) => {
    setDraftItems(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveAll = async () => {
    if (draftItems.length === 0) {
      setErrorMsg('No items in the draft list to save.');
      return;
    }
    if (!commonData.date || !commonData.entity) {
      setErrorMsg('Date and Entity are required to save.');
      return;
    }

    try {
      for (const item of draftItems) {
        await addTransaction({
          ...item,
          type,
          date: new Date(commonData.date).toISOString(),
          product: item.product,
          qty: item.qty,
          discountPercent: item.discountPercent,
          rate: item.rate,
          volume: item.volume,
          entity: commonData.entity.trim(),
          invoiceNumber: commonData.invoiceNumber ? commonData.invoiceNumber.trim() : null
        });
      }

      setSuccessMsg(`Successfully saved ${draftItems.length} ${type} item(s)!`);
      setDraftItems([]);
      setCommonData(prev => ({ ...prev, entity: '', invoiceNumber: '' }));
      
      setTimeout(() => {
        setSuccessMsg('');
      }, 4000);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  const cancelParsing = () => {
    cancelRef.current.cancelled = true;
    setIsParsing(false);
    setParseProgress(null);
    setErrorMsg('Parsing cancelled.');
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    setParseProgress({ stage: 'Reading file...', percent: 5 });
    setErrorMsg('');
    cancelRef.current.cancelled = false;

    try {
      const arrayBuffer = await file.arrayBuffer();

      // Use the new enterprise-grade modular extraction pipeline
      const parsedInvoice = await extractAndParseInvoice(
        arrayBuffer,
        products,
        (p) => setParseProgress(p),
        cancelRef.current
      );

      // Save diagnostic logs
      setParserLogs(parsedInvoice.logs);

      if (!parsedInvoice.success) {
        setErrorMsg(`Invoice parsing failed validation: ${parsedInvoice.validation.errors.join(' | ')}`);
        setIsParsing(false);
        setParseProgress(null);
        return;
      }

      if (parsedInvoice.validation.warnings.length > 0) {
        setErrorMsg(`Parse warning: ${parsedInvoice.validation.warnings.join(' ')}`);
      }

      // Verify fingerprint duplicate check
      const isDuplicate = detectDuplicateInvoice({
        invoiceNumber: parsedInvoice.invoiceNumber,
        date: parsedInvoice.invoiceDate || commonData.date,
        totalAmount: parsedInvoice.totalAmount || parsedInvoice.items.reduce((sum, item) => sum + (item.qty * item.rate), 0),
        productCount: parsedInvoice.items.length
      });

      if (parsedInvoice.invoiceNumber) {
        setCommonData(prev => ({
          ...prev,
          invoiceNumber: parsedInvoice.invoiceNumber,
          date: parsedInvoice.invoiceDate ? format(new Date(parsedInvoice.invoiceDate), 'yyyy-MM-dd') : prev.date,
          entity: type === 'purchase' ? 'HERBALIFE' : (parsedInvoice.customer?.name || prev.entity)
        }));
      }

      const reviewList = parsedInvoice.items.map((item, idx) => ({
        id: crypto.randomUUID(),
        rawName: item.rawName,
        matchedProduct: item.matchedProduct,
        confidence: item.confidence,
        qty: item.qty,
        mrp: item.mrp,
        discountPercent: item.discountPercent,
        rate: item.rate,
        volume: item.volume,
        // Extra rich fields
        sku: item.sku,
        hsn: item.hsn,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxableValue: item.taxableValue,
        sgstRate: item.sgstRate,
        sgstAmount: item.sgstAmount,
        cgstRate: item.cgstRate,
        cgstAmount: item.cgstAmount,
        finalAmount: item.finalAmount,
        orderNumber: parsedInvoice.orderNumber,
        customerAddress: parsedInvoice.customer?.address,
        gstin: parsedInvoice.gstin,
        totalAmount: parsedInvoice.totalAmount,
        // New: per-item confidence from confidence engine
        itemConfidence: item.itemConfidence || 0,
        fieldConfidences: item.fieldConfidences || {},
      }));

      // Handle delivery charges separately
      if (parsedInvoice.delivery && parsedInvoice.delivery.total > 0) {
        reviewList.push({
          id: crypto.randomUUID(),
          rawName: 'Delivery Charge',
          matchedProduct: { name: 'Delivery Charge', mrp: parsedInvoice.delivery.total, volume: 0 },
          confidence: 1.0,
          qty: 1,
          mrp: parsedInvoice.delivery.total,
          discountPercent: 0,
          rate: parsedInvoice.delivery.total,
          volume: 0,
          sku: 'DELIVERY',
          hsn: '996813', // Standard SAC for courier/delivery
          unitPrice: parsedInvoice.delivery.taxable,
          discount: 0,
          taxableValue: parsedInvoice.delivery.taxable,
          sgstRate: 9,
          sgstAmount: parsedInvoice.delivery.tax / 2,
          cgstRate: 9,
          cgstAmount: parsedInvoice.delivery.tax / 2,
          finalAmount: parsedInvoice.delivery.total,
          orderNumber: parsedInvoice.orderNumber,
          customerAddress: parsedInvoice.customer?.address,
          gstin: parsedInvoice.gstin,
          totalAmount: parsedInvoice.totalAmount,
          itemConfidence: 1.0,
          fieldConfidences: {}
        });
      }

      if (isDuplicate) {
        setDuplicateWarning({
          message: `This invoice (${parsedInvoice.invoiceNumber || 'No invoice number'}) appears to have already been imported.`,
          reviewList,
          confidence: parsedInvoice.confidence,
        });
      } else {
        processReviewItems(reviewList, parsedInvoice.confidence);
      }

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error processing document.');
    } finally {
      setIsParsing(false);
      setParseProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processReviewItems = (items, confidence) => {
    // Confidence threshold gate: if ANY item confidence < 92% or product match < 90%,
    // OR overall invoice confidence requires review → force review screen
    const needsReview = items.some(item => 
      item.confidence < 90 || 
      !item.matchedProduct ||
      (item.itemConfidence > 0 && item.itemConfidence < CONFIDENCE_THRESHOLD)
    ) || (confidence?.requiresReview);

    if (needsReview) {
      setReviewItems(items);
      setShowReviewScreen(true);
    } else {
      // Direct import to draft
      const mapped = items.map(item => ({
        ...item,
        id: item.id,
        product: item.matchedProduct.name,
        qty: item.qty,
        discountPercent: item.discountPercent,
        rate: item.rate,
        volume: item.volume
      }));
      setDraftItems(prev => [...prev, ...mapped]);
      setSuccessMsg(`Imported ${mapped.length} item(s) from invoice automatically.`);
    }
  };

  const handleReviewMappingChange = (itemId, masterProdId) => {
    const targetProd = products.find(p => p.id === masterProdId);
    setReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const rate = targetProd ? targetProd.mrp - (targetProd.mrp * (item.discountPercent / 100)) : item.rate;
        return {
          ...item,
          matchedProduct: targetProd,
          confidence: 100, // manual override
          volume: targetProd?.volume || 0,
          rate
        };
      }
      return item;
    }));
  };

  const handleReviewQtyChange = (itemId, newQty) => {
    setReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return { ...item, qty: Number(newQty) };
      }
      return item;
    }));
  };

  const handleReviewDiscountChange = (itemId, newDiscount) => {
    const pct = Number(newDiscount);
    setReviewItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const mrp = item.matchedProduct ? item.matchedProduct.mrp : item.mrp;
        const rate = mrp - (mrp * (pct / 100));
        return { ...item, discountPercent: pct, rate };
      }
      return item;
    }));
  };

  const handleApplyReview = () => {
    const invalidItem = reviewItems.find(item => !item.matchedProduct);
    if (invalidItem) {
      setErrorMsg(`Please select a valid master product match for: "${invalidItem.rawName}"`);
      return;
    }

    const mapped = reviewItems.map(item => ({
      ...item,
      id: item.id,
      product: item.matchedProduct.name,
      qty: item.qty,
      discountPercent: item.discountPercent,
      rate: item.rate,
      volume: item.volume
    }));

    setDraftItems(prev => [...prev, ...mapped]);
    setShowReviewScreen(false);
    setReviewItems([]);
    setSuccessMsg(`Fuzzy mapped and added ${mapped.length} items to draft.`);
  };

  const handleConfirmReimport = () => {
    const list = duplicateWarning.reviewList;
    setDuplicateWarning(null);
    processReviewItems(list);
  };

  const handleSkipReimport = () => {
    setDuplicateWarning(null);
    setSuccessMsg('Import skipped.');
  };

  const currentAvailableStock = formData.product ? getAvailableStock(formData.product) : null;
  const draftTotalVolume = draftItems.reduce((sum, item) => sum + (item.volume * item.qty), 0);
  const draftTotalValue = draftItems.reduce((sum, item) => sum + (item.rate * item.qty), 0);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-900 font-sans">Bill Entry</h1>
        
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
               Upload PDF Invoice
            </Button>
          </div>
        )}
      </div>

      {isParsing && (
        <Card className="p-6 bg-blue-50/50 border border-blue-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
            <div className="text-center">
              <p className="font-semibold text-slate-800">{parseProgress?.stage || 'Parsing PDF...'}</p>
              {parseProgress?.page && (
                <p className="text-xs text-slate-500">Page {parseProgress.page} of {parseProgress.totalPages}</p>
              )}
            </div>
            <div className="w-64 bg-slate-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{ width: `${parseProgress?.percent || 0}%` }}></div>
            </div>
            <Button variant="danger" size="sm" onClick={cancelParsing}>
              Cancel Import
            </Button>
          </div>
        </Card>
      )}

      {duplicateWarning && (
        <Card className="p-6 border border-amber-300 bg-amber-50">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-amber-900">Duplicate Invoice Warning</h3>
                <p className="text-sm text-amber-700 mt-1">{duplicateWarning.message}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={handleSkipReimport}>Skip Import</Button>
                <Button className="bg-amber-600 hover:bg-amber-700 text-white" onClick={handleConfirmReimport}>Reimport Invoice</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {showReviewScreen && (
        <Card className="p-6 border border-blue-200">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100">
            <AlertCircle className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-bold text-slate-900">Review Product Mapping</h3>
              <p className="text-xs text-slate-500">Some items had fuzzy matching confidence &lt; 90%. Please confirm matching products.</p>
            </div>
          </div>

          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Extracted Raw Product Name</th>
                  <th className="px-4 py-3">Master Product Match</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reviewItems.map((item) => (
                  <tr key={item.id} className="bg-white">
                    <td className="px-4 py-3 font-medium text-slate-700 max-w-xs" title={item.rawName}>
                      <div className="truncate">{item.rawName}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={cn(
                          "text-[10px] font-bold px-1.5 py-0.5 rounded",
                          item.confidence >= 90 ? "bg-emerald-100 text-emerald-700" :
                          item.confidence >= 50 ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                        )}>
                          {item.confidence.toFixed(0)}% Match
                        </span>
                        {item.itemConfidence > 0 && (
                          <span className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5",
                            item.itemConfidence >= CONFIDENCE_THRESHOLD ? "bg-blue-100 text-blue-700" : "bg-amber-100 text-amber-700"
                          )}>
                            {item.itemConfidence >= CONFIDENCE_THRESHOLD
                              ? <ShieldCheck className="w-3 h-3" />
                              : <ShieldAlert className="w-3 h-3" />}
                            {(item.itemConfidence * 100).toFixed(0)}%
                          </span>
                        )}
                        {item.sku && (
                          <span className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Select
                        value={item.matchedProduct?.id || ''}
                        onChange={(e) => handleReviewMappingChange(item.id, e.target.value)}
                      >
                        <option value="">-- Select Master Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right w-24">
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleReviewQtyChange(item.id, e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-3 text-right w-28">
                      <Select
                        value={item.discountPercent}
                        onChange={(e) => handleReviewDiscountChange(item.id, e.target.value)}
                      >
                        {discountTiers.map(tier => (
                          <option key={tier} value={tier}>{tier}%</option>
                        ))}
                      </Select>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ₹{((item.rate || 0) * (item.qty || 1)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setShowReviewScreen(false)}>Cancel Map</Button>
            <Button onClick={handleApplyReview}>Confirm and Add to Drafts</Button>
          </div>
        </Card>
      )}

      {parserLogs && (
        <Card className="p-5 border border-slate-200 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <FileUp className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-slate-800">Enterprise Extraction Pipeline Diagnostics</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Modular pipeline: pdfExtractor → ocrProcessor → layoutAnalyzer → tableExtractor → fieldMapper → validator → confidenceEngine
                </p>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowParserLogs(!showParserLogs)}>
              {showParserLogs ? 'Hide Diagnostics' : 'Show Diagnostics'}
            </Button>
          </div>

          {showParserLogs && (
            <div className="mt-4 p-4 bg-slate-900 rounded-lg text-slate-200 text-xs font-mono whitespace-pre-wrap max-h-[32rem] overflow-y-auto">
              {parserLogs}
            </div>
          )}
        </Card>
      )}

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

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-xl text-sm border border-rose-100 font-medium flex items-center gap-2">
            <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
            {errorMsg}
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            {successMsg}
          </div>
        )}

        {/* Common Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
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

          <div className="space-y-2">
            <Label htmlFor="invoiceNumber">Invoice Number</Label>
            <Input
              id="invoiceNumber"
              name="invoiceNumber"
              type="text"
              placeholder="e.g. INV-10294"
              value={commonData.invoiceNumber}
              onChange={handleCommonChange}
            />
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
