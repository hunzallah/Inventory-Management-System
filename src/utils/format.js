export const formatCurrency = (amount, currency = 'PKR') =>
  `${currency} ${Number(amount || 0).toLocaleString('en-PK', { minimumFractionDigits: 0 })}`;

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-PK', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

export const stockStatus = (qty, threshold = 5) => {
  if (qty === 0) return { label: 'Out of Stock', color: 'badge-red' };
  if (qty <= threshold) return { label: 'Low Stock', color: 'badge-yellow' };
  return { label: 'In Stock', color: 'badge-green' };
};
