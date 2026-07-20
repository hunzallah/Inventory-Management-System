import React, { createContext, useContext, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import {
  HomeIcon, CubeIcon, UsersIcon, ShoppingCartIcon,
  ChartBarIcon, Cog6ToothIcon
} from '@heroicons/react/24/outline';

import Dashboard  from './pages/Dashboard';
import Inventory  from './pages/Inventory';
import Customers  from './pages/Customers';
import Billing    from './pages/Billing';
import Reports    from './pages/Reports';
import Settings   from './pages/Settings';
import api, { API_ORIGIN } from './utils/api';

// ─── Theme Context ────────────────────────────────────────────────────────────
const ThemeCtx = createContext({ theme: 'light', setTheme: () => {} });
export const useTheme = () => useContext(ThemeCtx);

// ─── Settings Context ─────────────────────────────────────────────────────────
const SettingsCtx = createContext({});
export const useSettings = () => useContext(SettingsCtx);

const NAV = [
  { to: '/',          icon: HomeIcon,         label: 'Dashboard' },
  { to: '/inventory', icon: CubeIcon,         label: 'Inventory' },
  { to: '/customers', icon: UsersIcon,        label: 'Customers' },
  { to: '/billing',   icon: ShoppingCartIcon, label: 'Billing' },
  { to: '/reports',   icon: ChartBarIcon,     label: 'Reports' },
  { to: '/settings',  icon: Cog6ToothIcon,    label: 'Settings' },
];

export default function App() {
  const [theme, setTheme] = useState('light');
  const [settings, setSettings] = useState({});

  // Load settings on mount
  useEffect(() => {
    api.get('/settings').then((data) => {
      setSettings(data);
      if (data.theme === 'dark') setTheme('dark');
    }).catch(() => {});
  }, []);

  // Apply dark mode to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const handleSetTheme = (t) => {
    setTheme(t);
    api.put('/settings', { theme: t }).catch(() => {});
  };

  return (
    <ThemeCtx.Provider value={{ theme, setTheme: handleSetTheme }}>
      <SettingsCtx.Provider value={{ settings, setSettings }}>
        <HashRouter>
          <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
            {/* Sidebar */}
            <aside className="w-56 flex-shrink-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
              {/* Brand */}
              <div className="px-4 py-5 border-b border-gray-100 dark:border-gray-700">
                {settings.store_logo ? (
                  <img src={`${API_ORIGIN}${settings.store_logo}`} alt="logo" className="h-8 object-contain" />
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                      <CubeIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">
                      {settings.store_name || 'IMS'}
                    </span>
                  </div>
                )}
              </div>

              {/* Nav */}
              <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
                {NAV.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>

              {/* Footer */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400">v1.0.0</p>
              </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto">
              <Routes>
                <Route path="/"          element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/billing"   element={<Billing />} />
                <Route path="/reports"   element={<Reports />} />
                <Route path="/settings"  element={<Settings />} />
                <Route path="*"          element={<Navigate to="/" />} />
              </Routes>
            </main>
          </div>
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </HashRouter>
      </SettingsCtx.Provider>
    </ThemeCtx.Provider>
  );
}
