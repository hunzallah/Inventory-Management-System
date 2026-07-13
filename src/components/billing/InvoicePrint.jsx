import React from 'react';
import { formatCurrency, formatDateTime } from '../../utils/format';

export default function InvoicePrint({ invoice, settings }) {
  if (!invoice) return null;

  return (
    <div className="print-invoice bg-white text-gray-900 p-6 font-sans text-sm">
      {/* Header */}
      <div className="text-center mb-6 border-b border-gray-200 pb-4">
        {settings?.store_logo && (
          <img src={`http://localhost:3001${settings.store_logo}`} alt="logo"
            className="h-16 object-contain mx-auto mb-2" />
        )}
        <h1 className="text-xl font-bold">{settings?.store_name || 'My Store'}</h1>
        {settings?.receipt_header && (
          <p className="text-xs text-gray-500 mt-1">{settings.receipt_header}</p>
        )}
      </div>

      {/* Invoice meta */}
      <div className="flex justify-between text-xs mb-4 text-gray-600">
        <div>
          <p><span className="font-semibold">Invoice:</span> {invoice.invoice_number}</p>
          <p><span className="font-semibold">Date:</span> {formatDateTime(invoice.created_at)}</p>
        </div>
        <div className="text-right">
          <p><span className="font-semibold">Customer:</span> {invoice.customer_name}</p>
          {invoice.customer_phone && <p><span className="font-semibold">Phone:</span> {invoice.customer_phone}</p>}
        </div>
      </div>

      {/* Items */}
      <table className="w-full text-xs mb-4">
        <thead>
          <tr className="border-b border-gray-300">
            <th className="text-left py-2 font-semibold">Product</th>
            <th className="text-center py-2 font-semibold">Qty</th>
            <th className="text-right py-2 font-semibold">Price</th>
            <th className="text-right py-2 font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items?.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5">
                <div>{item.product_name}</div>
                {item.color_name && <div className="text-gray-400">{item.color_name} / {item.size}</div>}
              </td>
              <td className="text-center py-1.5">{item.quantity}</td>
              <td className="text-right py-1.5">{formatCurrency(item.unit_price)}</td>
              <td className="text-right py-1.5 font-medium">{formatCurrency(item.total_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="border-t border-gray-300 pt-2 text-xs space-y-1">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>{formatCurrency(invoice.subtotal)}</span>
        </div>
        {invoice.discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Discount</span>
            <span>- {formatCurrency(invoice.discount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1">
          <span>Total</span>
          <span>{formatCurrency(invoice.total)}</span>
        </div>
      </div>

      {/* Footer */}
      {settings?.receipt_footer && (
        <p className="text-center text-xs text-gray-400 mt-6 pt-4 border-t border-gray-200">
          {settings.receipt_footer}
        </p>
      )}
    </div>
  );
}
