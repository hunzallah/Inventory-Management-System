# Inventory Management System

A lightweight desktop inventory management system built with Electron, React, Tailwind CSS, Express, and SQLite.

---
<img width="1918" height="1015" alt="image" src="https://github.com/user-attachments/assets/f26d69c6-78a4-4c4e-ba7a-30774406171b" />

## Features

- **Dashboard** — Sales summary, charts, low stock alerts, recent transactions
- **Inventory** — Products with color/size variants (garments) or simple stock; category management; image support
- **Customers** — Customer profiles with full purchase history
- **Billing (POS)** — Fast point-of-sale with product search, variant picker, customer lookup, and printable invoices
- **Reports** — Daily, monthly, best-selling, low stock, inventory value, and customer reports
- **Settings** — Store name, logo, receipt text, dark/light mode, database backup

---

## Tech Stack

| Layer     | Technology                        |
|-----------|-----------------------------------|
| Desktop   | Electron 29                       |
| Frontend  | React 18 + Tailwind CSS           |
| Backend   | Node.js + Express                 |
| Database  | SQLite (via better-sqlite3)       |

---

## Prerequisites

- **Node.js** v18 or higher — https://nodejs.org
- **Windows** 10 or 11 (for `.exe` build)

---

## Quick Start (Development)

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the app (React + Express + Electron together)
npm run dev
```

This starts:
- React on `http://localhost:3000`
- Express API on `http://localhost:3001`
- Electron window loading React

---

## Build Windows Installer (.exe)

```bash
npm run build
```

Output: `dist/Inventory Management System Setup.exe`

---

## Project Structure

```
inventory-app/
├── electron/
│   ├── main.js          # Electron main process
│   └── preload.js       # Secure IPC bridge
│
├── server/
│   ├── index.js         # Express server entry
│   └── routes/
│       ├── settings.js
│       ├── categories.js
│       ├── products.js
│       ├── customers.js
│       ├── invoices.js
│       ├── reports.js
│       └── dashboard.js
│
├── database/
│   └── db.js            # SQLite schema + initialization
│
├── src/
│   ├── App.jsx           # Router, theme context, sidebar
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Inventory.jsx
│   │   ├── Customers.jsx
│   │   ├── Billing.jsx
│   │   ├── Reports.jsx
│   │   └── Settings.jsx
│   ├── components/
│   │   ├── common/
│   │   │   ├── Modal.jsx
│   │   │   ├── Confirm.jsx
│   │   │   └── PageHeader.jsx
│   │   ├── inventory/
│   │   │   └── ProductForm.jsx
│   │   └── billing/
│   │       └── InvoicePrint.jsx
│   └── utils/
│       ├── api.js        # Axios instance
│       └── format.js     # Currency, date, status helpers
│
└── public/
    └── index.html
```

---

## Database Schema

| Table              | Purpose                                     |
|--------------------|---------------------------------------------|
| `settings`         | Key-value store config                      |
| `categories`       | Product categories (variant or simple)      |
| `products`         | All products with pricing and base stock    |
| `product_colors`   | Color options for garment products          |
| `product_variants` | Color + size + quantity for each garment    |
| `customers`        | Customer profiles and aggregate stats       |
| `invoices`         | Sales transactions with customer snapshot   |
| `invoice_items`    | Line items for each invoice                 |

---

## Key Design Decisions

1. **Garments use color → size → quantity** tree. Other products use a flat `quantity` field.
2. **Stock is deducted transactionally** when an invoice is saved. Voiding an invoice restores stock.
3. **Customer stats** (total purchases, total spent) are updated atomically with each invoice.
4. **SQLite WAL mode** is enabled for better read/write performance.
5. **Invoice counter** is stored in settings and increments atomically, producing `INV-1001`, `INV-1002`, etc.

---

## Default Categories

| Category       | Type        |
|----------------|-------------|
| Garments       | Variants    |
| Military Items | Simple      |
| Souvenirs      | Simple      |
| Gift Items     | Simple      |

You can add or delete categories from the Inventory page → Categories button.

---

## Currency

Default currency is **PKR**. Change in `src/utils/format.js` → `formatCurrency()`.
