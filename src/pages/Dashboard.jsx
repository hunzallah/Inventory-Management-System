import React, { useEffect, useState } from 'react';
import {
  CurrencyDollarIcon, UsersIcon, CubeIcon, ExclamationTriangleIcon,
  ShoppingBagIcon, ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, ArcElement
} from 'chart.js';
import api from '../utils/api';
import { formatCurrency, formatDateTime } from '../utils/format';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, ArcElement);

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <div className="card p-5">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(setData).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full" />
    </div>
  );

  if (!data) return <div className="p-6 text-gray-500">Failed to load dashboard</div>;

  const months = data.monthlySales.map(m => {
    const [y, mo] = m.month.split('-');
    return new Date(y, mo - 1).toLocaleDateString('en-PK', { month: 'short', year: '2-digit' });
  });

  const lineData = {
    labels: months,
    datasets: [{
      label: 'Revenue',
      data: data.monthlySales.map(m => m.revenue),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      fill: true,
      tension: 0.4,
      pointRadius: 4,
    }]
  };

  const doughnutData = {
    labels: data.salesByCategory.map(s => s.category || 'Other'),
    datasets: [{
      data: data.salesByCategory.map(s => s.revenue),
      backgroundColor: ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'],
      borderWidth: 0,
    }]
  };

  const chartOpts = { responsive: true, plugins: { legend: { position: 'bottom' } } };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={CurrencyDollarIcon} label="Today's Sales" value={formatCurrency(data.todaySales.amount)}
          sub={`${data.todaySales.count} transactions`} color="bg-primary-500" />
        <StatCard icon={UsersIcon}         label="Customers"     value={data.totalCustomers.toLocaleString()} color="bg-emerald-500" />
        <StatCard icon={CubeIcon}          label="Products"      value={data.totalProducts.toLocaleString()}  color="bg-violet-500" />
        <StatCard icon={ArrowTrendingUpIcon} label="Stock Value" value={formatCurrency(data.inventoryValue)}  color="bg-sky-500" />
        <StatCard icon={ExclamationTriangleIcon} label="Low Stock" value={data.lowStockCount}
          sub="items need restock" color="bg-amber-500" />
        <StatCard icon={ShoppingBagIcon}   label="Out of Stock"  value={data.outOfStockCount}
          sub="items unavailable" color="bg-red-500" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Revenue</h3>
          {data.monthlySales.length ? (
            <Line data={lineData} options={{ ...chartOpts, scales: { y: { beginAtZero: true } } }} />
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Sales by Category</h3>
          {data.salesByCategory.length ? (
            <Doughnut data={doughnutData} options={chartOpts} />
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          )}
        </div>
      </div>

      {/* Bottom tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Top Selling (30 days)</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.topSelling.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No sales yet</div>
            )}
            {data.topSelling.map((p, i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-xs font-bold flex items-center justify-center text-gray-500">{i+1}</span>
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{p.product_name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{p.sold_qty} sold</div>
                  <div className="text-xs text-gray-400">{formatCurrency(p.revenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent sales */}
        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Transactions</h3>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.recentSales.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No transactions yet</div>
            )}
            {data.recentSales.map((inv) => (
              <div key={inv.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{inv.invoice_number}</div>
                  <div className="text-xs text-gray-400">{inv.customer_name} · {formatDateTime(inv.created_at)}</div>
                </div>
                <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
                  {formatCurrency(inv.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low stock warning */}
      {data.lowStock.length > 0 && (
        <div className="card border-amber-200 dark:border-amber-800">
          <div className="px-5 py-4 border-b border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-900/20 rounded-t-xl">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-4 h-4" /> Low Stock Alerts
            </h3>
          </div>
          <div className="divide-y divide-amber-50 dark:divide-gray-700">
            {data.lowStock.map(p => (
              <div key={p.id} className="px-5 py-3 flex justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">{p.name}</span>
                <span className="badge badge-yellow">{p.total_quantity} left</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
