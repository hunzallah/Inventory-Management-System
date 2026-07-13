import React, { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import Modal from '../components/common/Modal';
import Confirm from '../components/common/Confirm';
import PageHeader from '../components/common/PageHeader';

const emptyForm = { name: '', phone: '', address: '', notes: '' };

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [viewCustomer, setViewCustomer] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    api.get('/customers', { params: search ? { search } : {} })
      .then(setCustomers).finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (c = null) => {
    setEditCustomer(c);
    setForm(c ? { name: c.name, phone: c.phone || '', address: c.address || '', notes: c.notes || '' } : emptyForm);
    setFormOpen(true);
  };

  const openView = async (c) => {
    const detail = await api.get(`/customers/${c.id}`);
    setViewCustomer(detail);
    setViewOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Customer name is required');
    setSaving(true);
    try {
      if (editCustomer) {
        await api.put(`/customers/${editCustomer.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added');
      }
      setFormOpen(false);
      load();
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/customers/${deleteId}`);
      toast.success('Customer deleted');
      load();
    } catch (err) { toast.error(err.message); }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} registered`}
        actions={
          <button onClick={() => openEdit()} className="btn-primary">
            <PlusIcon className="w-4 h-4" /> Add Customer
          </button>
        }
      />

      <div className="relative mb-5 max-w-sm">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search name or phone..." value={search}
          onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Phone</th>
              <th>Address</th>
              <th>Purchases</th>
              <th>Total Spent</th>
              <th>Last Visit</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>}
            {!loading && customers.length === 0 && <tr><td colSpan={7} className="text-center py-10 text-gray-400">No customers found</td></tr>}
            {customers.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                      {c.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{c.name}</span>
                  </div>
                </td>
                <td className="text-gray-500">{c.phone || '—'}</td>
                <td className="text-gray-500 max-w-xs truncate">{c.address || '—'}</td>
                <td>{c.total_purchases}</td>
                <td className="font-medium">{formatCurrency(c.total_spent)}</td>
                <td className="text-gray-400">{formatDate(c.last_visit)}</td>
                <td>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openView(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <EyeIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => setDeleteId(c.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={editCustomer ? 'Edit Customer' : 'Add Customer'} size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone number" />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Optional" />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setFormOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : editCustomer ? 'Save Changes' : 'Add Customer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* View customer */}
      <Modal open={viewOpen} onClose={() => setViewOpen(false)} title={viewCustomer?.name} size="lg">
        {viewCustomer && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{viewCustomer.total_purchases}</p>
                <p className="text-xs text-gray-500 mt-1">Total Purchases</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(viewCustomer.total_spent)}</p>
                <p className="text-xs text-gray-500 mt-1">Total Spent</p>
              </div>
              <div className="card p-4 text-center">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{formatDate(viewCustomer.last_visit)}</p>
                <p className="text-xs text-gray-500 mt-1">Last Visit</p>
              </div>
            </div>

            <div className="text-sm text-gray-500 space-y-1">
              {viewCustomer.phone && <p>📞 {viewCustomer.phone}</p>}
              {viewCustomer.address && <p>📍 {viewCustomer.address}</p>}
              {viewCustomer.notes && <p>📝 {viewCustomer.notes}</p>}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Purchase History</h3>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Invoice</th><th>Items</th><th>Total</th><th>Date</th></tr></thead>
                  <tbody>
                    {viewCustomer.invoices?.length === 0 && (
                      <tr><td colSpan={4} className="text-center py-4 text-gray-400 text-xs">No purchases yet</td></tr>
                    )}
                    {viewCustomer.invoices?.map(inv => (
                      <tr key={inv.id}>
                        <td className="font-mono text-xs">{inv.invoice_number}</td>
                        <td>{inv.item_count}</td>
                        <td className="font-medium">{formatCurrency(inv.total)}</td>
                        <td className="text-gray-400">{formatDate(inv.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <Confirm open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Customer" message="Are you sure you want to delete this customer? Their purchase history will also be removed." />
    </div>
  );
}
