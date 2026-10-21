import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';

const pageTitles = {
  '/dashboard': 'Dashboard Overview',
  '/products': 'Products Catalog',
  '/categories': 'Product Categories',
  '/suppliers': 'Suppliers Directory',
  '/locations': 'Warehouse Locations',
  '/batches': 'Batch Tracking',
  '/inventory': 'Stock Inventory',
  '/stock-in': 'Stock Inflow (Receipt)',
  '/stock-out': 'Stock Outflow (Issue)',
  '/stock-transfer': 'Inter-Warehouse Transfer',
  '/stock-movements': 'Stock Movement Audit History',
  '/reports': 'Inventory & Operational Reports',
};

const MainLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const currentTitle = pageTitles[location.pathname] || 'Inventory Management';

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="app-main-wrapper">
        <Navbar
          pageTitle={currentTitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
