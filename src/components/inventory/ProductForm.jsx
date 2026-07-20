import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import api, { API_ORIGIN } from '../../utils/api';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'Free Size'];

const emptyColor = () => ({ name: '', sizes: [{ size: '', quantity: 0 }] });

export default function ProductForm({ product, categories, onSave, onCancel }) {
  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', purchase_price: '', selling_price: '',
    description: '', quantity: 0, low_stock_threshold: 5,
  });
  const [colors, setColors] = useState([emptyColor()]);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const selectedCategory = categories.find(c => String(c.id) === String(form.category_id));
  const isVariant = selectedCategory?.has_variants;

  // Load existing product data
  useEffect(() => {
    if (!product) return;
    setLoadingDetail(true);
    api.get(`/products/${product.id}`).then(p => {
      setForm({
        name: p.name, sku: p.sku || '', category_id: String(p.category_id),
        purchase_price: p.purchase_price, selling_price: p.selling_price,
        description: p.description || '', quantity: p.quantity,
        low_stock_threshold: p.low_stock_threshold,
      });
      if (p.image_path) setImagePreview(`${API_ORIGIN}${p.image_path}`);
      if (p.colors?.length) {
        setColors(p.colors.map(c => ({
          name: c.color_name,
          sizes: c.sizes.map(s => ({ size: s.size, quantity: s.quantity })),
        })));
      }
    }).finally(() => setLoadingDetail(false));
  }, [product]);

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }));

  // Color/size helpers
  const addColor = () => setColors(c => [...c, emptyColor()]);
  const removeColor = (i) => setColors(c => c.filter((_, idx) => idx !== i));
  const setColorName = (i, name) => setColors(c => c.map((col, idx) => idx === i ? { ...col, name } : col));
  const addSize = (ci) => setColors(c => c.map((col, idx) => idx === ci ? { ...col, sizes: [...col.sizes, { size: '', quantity: 0 }] } : col));
  const removeSize = (ci, si) => setColors(c => c.map((col, idx) => idx === ci ? { ...col, sizes: col.sizes.filter((_, sidx) => sidx !== si) } : col));
  const setSize = (ci, si, field, val) => setColors(c => c.map((col, idx) => idx === ci ? {
    ...col, sizes: col.sizes.map((sz, sidx) => sidx === si ? { ...sz, [field]: val } : sz)
  } : col));

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.category_id) {
      toast.error('Product name and category are required');
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (isVariant) fd.append('colors', JSON.stringify(colors));
      if (imageFile) fd.append('image', imageFile);
      if (removeImage) fd.append('remove_image', 'true');

      if (product) {
        await api.put(`/products/${product.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product updated');
      } else {
        await api.post('/products', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        toast.success('Product added');
      }
      onSave();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingDetail) return (
    <div className="flex items-center justify-center py-10">
      <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Basic Info */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Product Name *</label>
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Track Suit" />
        </div>
        <div>
          <label className="label">Category *</label>
          <select className="input" value={form.category_id} onChange={e => set('category_id', e.target.value)}>
            <option value="">Select category</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">SKU</label>
          <input className="input" value={form.sku} onChange={e => set('sku', e.target.value)} placeholder="Auto or enter SKU" />
        </div>
        <div>
          <label className="label">Purchase Price</label>
          <input type="number" className="input" value={form.purchase_price} onChange={e => set('purchase_price', e.target.value)} min="0" />
        </div>
        <div>
          <label className="label">Selling Price</label>
          <input type="number" className="input" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} min="0" />
        </div>
        <div>
          <label className="label">Low Stock Alert (qty)</label>
          <input type="number" className="input" value={form.low_stock_threshold} onChange={e => set('low_stock_threshold', e.target.value)} min="0" />
        </div>
        {!isVariant && (
          <div>
            <label className="label">Quantity</label>
            <input type="number" className="input" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0" />
          </div>
        )}
        <div className="col-span-2">
          <label className="label">Description</label>
          <textarea className="input resize-none" rows={2} value={form.description} onChange={e => set('description', e.target.value)} />
        </div>
      </div>

      {/* Image Upload */}
      <div>
        <label className="label">Product Image</label>
        <div className="flex items-center gap-4">
          {imagePreview && !removeImage ? (
            <div className="relative">
              <img src={imagePreview} alt="preview" className="w-20 h-20 rounded-lg object-cover border border-gray-200" />
              <button
                onClick={() => { setImagePreview(null); setImageFile(null); setRemoveImage(true); }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
              >✕</button>
            </div>
          ) : (
            <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary-400 transition-colors">
              <span className="text-xs text-gray-400">Upload</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </label>
          )}
          <p className="text-xs text-gray-400">PNG, JPG up to 5MB</p>
        </div>
      </div>

      {/* Variant Section (Garments) */}
      {isVariant && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Colors & Sizes</h3>
            <button onClick={addColor} className="btn-secondary text-xs py-1">
              <PlusIcon className="w-3.5 h-3.5" /> Add Color
            </button>
          </div>

          <div className="space-y-4">
            {colors.map((color, ci) => (
              <div key={ci} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    className="input flex-1"
                    placeholder="Color name (e.g. Black, Navy Blue)"
                    value={color.name}
                    onChange={e => setColorName(ci, e.target.value)}
                  />
                  <button onClick={() => removeColor(ci)} className="text-red-400 hover:text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  {color.sizes.map((sz, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <select
                        className="input w-32"
                        value={sz.size}
                        onChange={e => setSize(ci, si, 'size', e.target.value)}
                      >
                        <option value="">Size</option>
                        {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
                        <option value="custom">Custom...</option>
                      </select>
                      {sz.size === 'custom' && (
                        <input className="input w-24" placeholder="Enter size"
                          onChange={e => setSize(ci, si, 'size', e.target.value)} />
                      )}
                      <input
                        type="number" min="0"
                        className="input w-24"
                        placeholder="Qty"
                        value={sz.quantity}
                        onChange={e => setSize(ci, si, 'quantity', parseInt(e.target.value) || 0)}
                      />
                      <button onClick={() => removeSize(ci, si)} className="text-gray-400 hover:text-red-500">
                        <TrashIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <button onClick={() => addSize(ci)} className="text-xs text-primary-600 hover:text-primary-800 flex items-center gap-1 mt-1">
                    <PlusIcon className="w-3.5 h-3.5" /> Add Size
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button onClick={onCancel} className="btn-secondary">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : product ? 'Save Changes' : 'Add Product'}
        </button>
      </div>
    </div>
  );
}
