import React, { useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import { useReactToPrint } from 'react-to-print';
import {
  MagnifyingGlassIcon, PlusIcon, TrashIcon, PrinterIcon,
  CheckCircleIcon, UserPlusIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';
import Modal from '../components/common/Modal';
import InvoicePrint from '../components/billing/InvoicePrint';

export default function Billing() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '' });
  const [addingCustomer, setAddingCustomer] = useState(false);
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [successOpen, setSuccessOpen] = useState(false);
  const [variantModal, setVariantModal] = useState(null); // { product, colors }
  const printRef = useRef();

  useEffect(() => {
    api.get('/settings').then(setSettings);
  }, []);

  // Product search
  useEffect(() => {
    if (!search.trim()) { setProducts([]); return; }
    const t = setTimeout(() => {
      api.get('/products', { params: { search } }).then(setProducts);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Customer search
  useEffect(() => {
    if (!customerSearch.trim()) { setCustomerResults([]); return; }
    const t = setTimeout(() => {
      api.get('/customers', { params: { search: customerSearch } }).then(setCustomerResults);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch]);

  const addToCart = async (product) => {
    if (product.has_variants) {
      // Load full product with colors
      const detail = await api.get(`/products/${product.id}`);
      setVariantModal(detail);
    } else {
      // Simple product
      const existing = cart.find(i => i.product_id === product.id && !i.variant_id);
      if (existing) {
        setCart(c => c.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        setCart(c => [...c, {
          product_id: product.id,
          product_name: product.name,
          variant_id: null, color_name: null, size: null,
          quantity: 1,
          unit_price: product.selling_price,
          available: product.total_quantity,
        }]);
      }
    }
    setSearch('');
    setProducts([]);
  };

  const addVariantToCart = (product, colorId, colorName, size, qty, variantId) => {
    const existing = cart.find(i => i.variant_id === variantId);
    if (existing) {
      setCart(c => c.map(i => i === existing ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setCart(c => [...c, {
        product_id: product.id,
        product_name: product.name,
        variant_id: variantId, color_name: colorName, size,
        quantity: 1,
        unit_price: product.selling_price,
        available: qty,
      }]);
    }
    setVariantModal(null);
  };

  const updateQty = (idx, qty) => {
    const item = cart[idx];
    const q = Math.max(1, Math.min(parseInt(qty) || 1, item.available));
    setCart(c => c.map((it, i) => i === idx ? { ...it, quantity: q } : it));
  };

  const removeItem = (idx) => setCart(c => c.filter((_, i) => i !== idx));

  const subtotal = cart.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const total = Math.max(0, subtotal - parseFloat(discount || 0));

  const handleSave = async () => {
    if (!cart.length) return toast.error('Add items to the cart first');
    setSaving(true);
    try {
      const invoice = await api.post('/invoices', {
        customer_id: selectedCustomer?.id || null,
        customer_name: selectedCustomer?.name || newCustomer.name || 'Walk-in Customer',
        customer_phone: selectedCustomer?.phone || newCustomer.phone || null,
        items: cart.map(i => ({
          product_id: i.product_id,
          product_name: i.product_name,
          variant_id: i.variant_id,
          color_name: i.color_name,
          size: i.size,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        discount: parseFloat(discount) || 0,
      });
      setSavedInvoice(invoice);
      setSuccessOpen(true);
      setCart([]);
      setDiscount(0);
      setSelectedCustomer(null);
      setNewCustomer({ name: '', phone: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = useReactToPrint({ content: () => printRef.current });

  return (
    <div className="flex h-full">
      {/* Left: Product Search + Cart */}
      <div className="flex-1 flex flex-col p-6 overflow-hidden">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Point of Sale</h1>

        {/* Search */}
        <div className="relative mb-3">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search product by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {/* Dropdown results */}
          {products.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-20 max-h-64 overflow-y-auto">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.name}</div>
                    <div className="text-xs text-gray-400">{p.category_name} · Stock: {p.total_quantity}</div>
                  </div>
                  <span className="text-sm font-semibold text-primary-600">{formatCurrency(p.selling_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        <div className="flex-1 overflow-y-auto">
          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center h-48 text-gray-300 dark:text-gray-600 select-none">
              <div className="text-5xl mb-2">🛒</div>
              <p className="text-sm">Search and add products above</p>
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map((item, idx) => (
                <div key={idx} className="card p-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{item.product_name}</p>
                    {item.color_name && (
                      <p className="text-xs text-gray-400">{item.color_name} / {item.size}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5">
                      {formatCurrency(item.unit_price)} each · {item.available} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" max={item.available}
                      value={item.quantity}
                      onChange={e => updateQty(idx, e.target.value)}
                      className="input w-16 text-center py-1"
                    />
                    <span className="text-sm font-semibold text-gray-900 dark:text-white w-24 text-right">
                      {formatCurrency(item.unit_price * item.quantity)}
                    </span>
                    <button onClick={() => removeItem(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: Order summary + Customer */}
      <div className="w-80 flex-shrink-0 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Customer section */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Customer</h3>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-primary-800 dark:text-primary-300">{selectedCustomer.name}</p>
                  <p className="text-xs text-primary-500">{selectedCustomer.phone}</p>
                </div>
                <button onClick={() => setSelectedCustomer(null)} className="text-xs text-red-400 hover:text-red-600">Remove</button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <input className="input text-sm" placeholder="Search customer..."
                    value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} />
                  {customerResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                      {customerResults.map(c => (
                        <button key={c.id} onClick={() => { setSelectedCustomer(c); setCustomerSearch(''); setCustomerResults([]); }}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700">
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-gray-400">{c.phone}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!addingCustomer ? (
                  <button onClick={() => setAddingCustomer(true)} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1">
                    <UserPlusIcon className="w-3.5 h-3.5" /> Add new customer
                  </button>
                ) : (
                  <div className="space-y-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <input className="input text-sm" placeholder="Name" value={newCustomer.name}
                      onChange={e => setNewCustomer(n => ({ ...n, name: e.target.value }))} />
                    <input className="input text-sm" placeholder="Phone" value={newCustomer.phone}
                      onChange={e => setNewCustomer(n => ({ ...n, phone: e.target.value }))} />
                    <div className="flex gap-2">
                      <button onClick={() => setAddingCustomer(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
                    </div>
                  </div>
                )}
                {!addingCustomer && !customerSearch && (
                  <p className="text-xs text-gray-400">Leave empty for walk-in</p>
                )}
              </div>
            )}
          </div>

          {/* Totals */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Discount</span>
                <input
                  type="number" min="0"
                  value={discount}
                  onChange={e => setDiscount(e.target.value)}
                  className="input w-28 text-right text-sm py-1"
                />
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-gray-900 dark:text-white">Total</span>
                <span className="text-primary-600 dark:text-primary-400">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-2">
          <button
            onClick={handleSave}
            disabled={saving || !cart.length}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            <CheckCircleIcon className="w-5 h-5" />
            {saving ? 'Processing...' : 'Save & Complete'}
          </button>
          <button onClick={() => { setCart([]); setDiscount(0); setSelectedCustomer(null); }}
            disabled={!cart.length} className="btn-secondary w-full justify-center">
            Clear Cart
          </button>
        </div>
      </div>

      {/* Variant selection modal */}
      {variantModal && (
        <Modal open={true} onClose={() => setVariantModal(null)} title={`Select Variant — ${variantModal.name}`} size="md">
          <div className="space-y-4">
            {variantModal.colors?.map(color => (
              <div key={color.id}>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{color.color_name}</p>
                <div className="flex flex-wrap gap-2">
                  {color.sizes?.map(sz => (
                    <button
                      key={sz.id}
                      onClick={() => addVariantToCart(variantModal, color.id, color.color_name, sz.size, sz.quantity, sz.id)}
                      disabled={sz.quantity === 0}
                      className={`px-3 py-1.5 text-sm rounded-lg border font-medium transition-colors
                        ${sz.quantity === 0
                          ? 'border-gray-200 text-gray-300 cursor-not-allowed'
                          : 'border-primary-300 text-primary-700 hover:bg-primary-50'
                        }`}
                    >
                      {sz.size}
                      <span className="text-xs ml-1 opacity-60">({sz.quantity})</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Success + Print modal */}
      <Modal open={successOpen} onClose={() => setSuccessOpen(false)} title="Invoice Saved" size="lg">
        {savedInvoice && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{savedInvoice.invoice_number}</p>
                <p className="text-sm text-gray-500">{formatDateTime(savedInvoice.created_at)}</p>
              </div>
              <button onClick={handlePrint} className="btn-primary">
                <PrinterIcon className="w-4 h-4" /> Print Invoice
              </button>
            </div>

            {/* Invoice preview (also used for printing) */}
            <div ref={printRef}>
              <InvoicePrint invoice={savedInvoice} settings={settings} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
