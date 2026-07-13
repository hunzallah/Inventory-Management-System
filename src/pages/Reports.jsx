import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { formatCurrency, formatDate } from '../utils/format';
import PageHeader from '../components/common/PageHeader';
import { stockStatus } from '../utils/format';

const tabs = ['Daily', 'Monthly', 'Best Selling', 'Low Stock', 'Inventory Value', 'Customers'];

export default function Reports() {
  const [tab, setTab] = useState('Daily');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
  setData(null);
  setLoading(true);

  const endpoints = {
    'Daily': `/reports/daily?date=${date}`,
    'Monthly': `/reports/monthly?year=${year}&month=${month}`,
    'Best Selling': '/reports/best-selling?days=30',
    'Low Stock': '/reports/low-stock',
    'Inventory Value': '/reports/inventory-value',
    'Customers': '/reports/customers',
  };

  api.get(endpoints[tab])
    .then((result) => {
      console.log("=================================");
      console.log("Current Tab:", tab);
      console.log("Endpoint:", endpoints[tab]);
      console.log("Result:", result);
      console.log("Type:", typeof result);
      console.log("Is Array:", Array.isArray(result));

      setData(result);
    })
    .catch((err) => {
      console.error("API Error:", err);
    })
    .finally(() => {
      setLoading(false);
    });

}, [tab, date, month, year]);

  return (
    <div className="p-6">
      <PageHeader title="Reports" subtitle="Business insights and analytics" />

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>{t}</button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        {tab === 'Daily' && (
          <input type="date" className="input w-48" value={date} onChange={e => setDate(e.target.value)} />
        )}
        {tab === 'Monthly' && (
          <>
            <select className="input w-32" value={month} onChange={e => setMonth(e.target.value)}>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i+1} value={i+1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
            <input type="number" className="input w-24" value={year} min="2020" max="2099"
              onChange={e => setYear(e.target.value)} />
          </>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full" />
        </div>
      )}

      {!loading && data && (
        <div>
          {/* Daily */}
          {tab === 'Daily' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.summary?.invoice_count}</p>
                  <p className="text-xs text-gray-500 mt-1">Invoices</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-xl font-bold text-primary-600">{formatCurrency(data.summary?.total_revenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">Revenue</p>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Invoice</th><th>Customer</th><th>Product</th><th>Color/Size</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
                  <tbody>
                    {data.items?.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-gray-400">No sales on this date</td></tr>}
                    {data.items?.map((r, i) => (
                      <tr key={i}>
                        <td className="font-mono text-xs">{r.invoice_number}</td>
                        <td>{r.customer_name}</td>
                        <td>{r.product_name}</td>
                        <td className="text-gray-400">{r.color_name ? `${r.color_name} / ${r.size}` : '—'}</td>
                        <td>{r.quantity}</td>
                        <td>{formatCurrency(r.unit_price)}</td>
                        <td className="font-medium">{formatCurrency(r.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Monthly */}
          {tab === 'Monthly' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 max-w-lg">
                <div className="card p-4 text-center">
                  <p className="text-2xl font-bold">{data.summary?.invoice_count}</p>
                  <p className="text-xs text-gray-500 mt-1">Invoices</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-lg font-bold text-primary-600">{formatCurrency(data.summary?.total_revenue)}</p>
                  <p className="text-xs text-gray-500 mt-1">Revenue</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-lg font-bold">{formatCurrency(data.summary?.avg_sale)}</p>
                  <p className="text-xs text-gray-500 mt-1">Avg Sale</p>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Invoices</th><th>Revenue</th></tr></thead>
                  <tbody>
                    {data.daily?.map((d, i) => (
                      <tr key={i}>
                        <td>{formatDate(d.date)}</td>
                        <td>{d.invoices}</td>
                        <td className="font-medium">{formatCurrency(d.revenue)}</td>
                      </tr>
                    ))}
                    {data.daily?.length === 0 && <tr><td colSpan={3} className="text-center py-8 text-gray-400">No data for this month</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Best Selling */}
          {tab === 'Best Selling' && (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>#</th><th>Product</th><th>Units Sold</th><th>Revenue</th><th>Orders</th></tr></thead>
                <tbody>
                  {Array.isArray(data) && data.map((p, i) => (
                    <tr key={i}>
                      <td className="text-gray-400 font-bold">{i+1}</td>
                      <td className="font-medium">{p.product_name}</td>
                      <td>{p.sold_qty}</td>
                      <td className="font-medium text-primary-600">{formatCurrency(p.revenue)}</td>
                      <td>{p.orders}</td>
                    </tr>
                  ))}
                  {data?.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No data available</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Low Stock */}
          {tab === 'Low Stock' && (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Product</th><th>Category</th><th>SKU</th><th>Stock</th><th>Threshold</th><th>Status</th></tr></thead>
                <tbody>
                  {Array.isArray(data) && data.map((p, i) => {
                    const st = stockStatus(p.total_quantity, p.low_stock_threshold);
                    return (
                      <tr key={i}>
                        <td className="font-medium">{p.name}</td>
                        <td>{p.category_name}</td>
                        <td className="font-mono text-xs text-gray-400">{p.sku || '—'}</td>
                        <td className="font-bold">{p.total_quantity}</td>
                        <td>{p.low_stock_threshold}</td>
                        <td><span className={`badge ${st.color}`}>{st.label}</span></td>
                      </tr>
                    );
                  })}
                  {data?.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-green-500">All items are well stocked!</td></tr>}
                </tbody>
              </table>
            </div>
          )}

          {/* Inventory Value */}
          {tab === 'Inventory Value' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div className="card p-4 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(data.totals?.purchase_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">Cost Value</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-lg font-bold text-primary-600">{formatCurrency(data.totals?.retail_value)}</p>
                  <p className="text-xs text-gray-500 mt-1">Retail Value</p>
                </div>
              </div>
              <div className="table-container">
                <table className="data-table">
                  <thead><tr><th>Product</th><th>Category</th><th>Qty</th><th>Cost Price</th><th>Sell Price</th><th>Cost Value</th><th>Retail Value</th></tr></thead>
                  <tbody>
                    {data.products?.map((p, i) => (
                      <tr key={i}>
                        <td className="font-medium">{p.name}</td>
                        <td>{p.category_name}</td>
                        <td>{p.total_quantity}</td>
                        <td>{formatCurrency(p.purchase_price)}</td>
                        <td>{formatCurrency(p.selling_price)}</td>
                        <td>{formatCurrency(p.purchase_value)}</td>
                        <td className="font-medium text-primary-600">{formatCurrency(p.retail_value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Customer Report */}
          {tab === 'Customers' && (
            <div className="table-container">
              <table className="data-table">
                <thead><tr><th>Customer</th><th>Phone</th><th>Invoices</th><th>Total Spent</th><th>Last Visit</th></tr></thead>
                <tbody>
                  {Array.isArray(data) && data.map((c, i) => (
                    <tr key={i}>
                      <td className="font-medium">{c.name}</td>
                      <td>{c.phone || '—'}</td>
                      <td>{c.invoice_count}</td>
                      <td className="font-medium text-primary-600">{formatCurrency(c.actual_spent)}</td>
                      <td className="text-gray-400">{formatDate(c.last_visit)}</td>
                    </tr>
                  ))}
                  {data?.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-gray-400">No customers yet</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
