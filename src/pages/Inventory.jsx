import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon,
  FunnelIcon, PhotoIcon
} from '@heroicons/react/24/outline';
import api from '../utils/api';
import { formatCurrency, stockStatus } from '../utils/format';
import Modal from '../components/common/Modal';
import Confirm from '../components/common/Confirm';
import PageHeader from '../components/common/PageHeader';
import ProductForm from '../components/inventory/ProductForm';

export default function Inventory() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');
  const [filterStock, setFilterStock] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatVariant, setNewCatVariant] = useState(false);

  const load = useCallback(() => {
    const params = {};
    if (search)       params.search = search;
    if (filterCat)    params.category = filterCat;
    if (filterStock === 'low')  params.low_stock = true;
    if (filterStock === 'out')  params.out_of_stock = true;

    Promise.all([
      api.get('/products', { params }),
      api.get('/categories'),
    ]).then(([prods, cats]) => {
      setProducts(prods);
      setCategories(cats);
    }).finally(() => setLoading(false));
  }, [search, filterCat, filterStock]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async () => {
    try {
      await api.delete(`/products/${deleteId}`);
      toast.success('Product deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await api.post('/categories', { name: newCatName.trim(), has_variants: newCatVariant });
      toast.success('Category added');
      setNewCatName(''); setNewCatVariant(false);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleDeleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Inventory"
        subtitle={`${products.length} products`}
        actions={
          <>
            <button onClick={() => setCatOpen(true)} className="btn-secondary">
              <FunnelIcon className="w-4 h-4" /> Categories
            </button>
            <button onClick={() => { setEditProduct(null); setFormOpen(true); }} className="btn-primary">
              <PlusIcon className="w-4 h-4" /> Add Product
            </button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className="input w-40" value={filterStock} onChange={e => setFilterStock(e.target.value)}>
          <option value="">All Stock</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>SKU</th>
              <th>Purchase</th>
              <th>Selling</th>
              <th>Stock</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
            )}
            {!loading && products.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No products found</td></tr>
            )}
            {products.map(p => {
              const status = stockStatus(p.total_quantity, p.low_stock_threshold);
              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {p.image_path ? (
                        <img src={`http://localhost:3001${p.image_path}`} alt={p.name}
                          className="w-9 h-9 rounded-lg object-cover border border-gray-200" />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                          <PhotoIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{p.name}</span>
                    </div>
                  </td>
                  <td>{p.category_name}</td>
                  <td className="text-gray-400 font-mono text-xs">{p.sku || '—'}</td>
                  <td>{formatCurrency(p.purchase_price)}</td>
                  <td className="font-medium">{formatCurrency(p.selling_price)}</td>
                  <td className="font-medium">{p.total_quantity}</td>
                  <td><span className={`badge ${status.color}`}>{status.label}</span></td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditProduct(p); setFormOpen(true); }}
                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(p.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Product Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editProduct ? 'Edit Product' : 'Add Product'}
        size="xl"
      >
        <ProductForm
          product={editProduct}
          categories={categories}
          onSave={() => { setFormOpen(false); load(); }}
          onCancel={() => setFormOpen(false)}
        />
      </Modal>

      {/* Delete confirm */}
      <Confirm
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Delete Product"
        message="This will permanently delete the product and all its variants. This action cannot be undone."
      />

      {/* Category Manager */}
      <Modal open={catOpen} onClose={() => setCatOpen(false)} title="Manage Categories" size="sm">
        <div className="space-y-4">
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                  {c.has_variants ? (
                    <span className="ml-2 badge badge-blue text-xs">Variants</span>
                  ) : (
                    <span className="ml-2 badge badge-gray text-xs">Simple</span>
                  )}
                </div>
                {c.product_count === 0 && (
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-red-400 hover:text-red-600">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add New Category</p>
            <input
              className="input mb-2"
              placeholder="Category name"
              value={newCatName}
              onChange={e => setNewCatName(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3 cursor-pointer">
              <input type="checkbox" checked={newCatVariant} onChange={e => setNewCatVariant(e.target.checked)}
                className="rounded border-gray-300" />
              Has color/size variants (e.g. Garments)
            </label>
            <button onClick={handleAddCategory} className="btn-primary w-full justify-center">
              <PlusIcon className="w-4 h-4" /> Add Category
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
