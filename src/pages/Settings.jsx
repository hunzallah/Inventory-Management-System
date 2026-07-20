import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { SunIcon, MoonIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import api, { API_ORIGIN } from '../utils/api';
import { useTheme } from '../App';
import PageHeader from '../components/common/PageHeader';

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const [form, setForm] = useState({
    store_name: '', receipt_header: '', receipt_footer: '', low_stock_threshold: 5,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then(s => {
      setForm({
        store_name: s.store_name || '',
        receipt_header: s.receipt_header || '',
        receipt_footer: s.receipt_footer || '',
        low_stock_threshold: s.low_stock_threshold || 5,
      });
      if (s.store_logo) setLogoPreview(`${API_ORIGIN}${s.store_logo}`);
    });
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      if (logoFile) {
        const fd = new FormData();
        fd.append('logo', logoFile);
        await api.post('/settings/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      }
      toast.success('Settings saved');
    } catch (err) { toast.error(err.message); } finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleBackup = () => {
    const a = document.createElement('a');
    a.href = `${API_ORIGIN}/api/settings/backup`;
    a.download = `ims-backup-${Date.now()}.db`;
    a.click();
    toast.success('Backup downloading...');
  };

  return (
    <div className="p-6 max-w-2xl">
      <PageHeader title="Settings" subtitle="Configure your store" />

      <div className="space-y-6">
        {/* Store Info */}
        <div className="card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Store Information</h2>

          <div>
            <label className="label">Store Name</label>
            <input className="input" value={form.store_name} onChange={e => set('store_name', e.target.value)} />
          </div>

          <div>
            <label className="label">Store Logo</label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img src={logoPreview} alt="logo" className="h-16 w-auto rounded-lg border border-gray-200 object-contain" />
              ) : (
                <div className="h-16 w-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
                  No logo
                </div>
              )}
              <label className="btn-secondary cursor-pointer">
                Upload Logo
                <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
              </label>
            </div>
          </div>

          <div>
            <label className="label">Receipt Header</label>
            <textarea className="input resize-none" rows={2} value={form.receipt_header}
              onChange={e => set('receipt_header', e.target.value)}
              placeholder="Text shown at top of receipt" />
          </div>

          <div>
            <label className="label">Receipt Footer</label>
            <textarea className="input resize-none" rows={2} value={form.receipt_footer}
              onChange={e => set('receipt_footer', e.target.value)}
              placeholder="Text shown at bottom of receipt" />
          </div>

          <div>
            <label className="label">Default Low Stock Threshold</label>
            <input type="number" className="input w-32" min="1" value={form.low_stock_threshold}
              onChange={e => set('low_stock_threshold', e.target.value)} />
            <p className="text-xs text-gray-400 mt-1">Products below this quantity will show a low-stock alert</p>
          </div>
        </div>

        {/* Appearance */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Appearance</h2>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                theme === 'light'
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <SunIcon className="w-4 h-4" /> Light Mode
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                theme === 'dark'
                  ? 'border-primary-500 bg-primary-900/20 text-primary-400'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <MoonIcon className="w-4 h-4" /> Dark Mode
            </button>
          </div>
        </div>

        {/* Database */}
        <div className="card p-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Database</h2>
          <p className="text-xs text-gray-400 mb-4">Backup your data regularly to prevent loss</p>
          <div className="flex gap-3">
            <button onClick={handleBackup} className="btn-secondary">
              <ArrowDownTrayIcon className="w-4 h-4" /> Backup Database
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <button onClick={handleSave} disabled={saving} className="btn-primary px-8">
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
