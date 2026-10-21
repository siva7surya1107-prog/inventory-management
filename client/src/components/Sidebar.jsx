import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/products', label: 'Products', icon: '📦' },
  { path: '/categories', label: 'Categories', icon: '🏷️' },
  { path: '/suppliers', label: 'Suppliers', icon: '🏭' },
  { path: '/locations', label: 'Locations', icon: '📍' },
  { path: '/batches', label: 'Batches', icon: '🔢' },
  { path: '/inventory', label: 'Inventory', icon: '📋' },
  { path: '/stock-in', label: 'Stock In', icon: '📥' },
  { path: '/stock-out', label: 'Stock Out', icon: '📤' },
  { path: '/stock-transfer', label: 'Stock Transfer', icon: '🔄' },
  { path: '/stock-movements', label: 'Stock Movements', icon: '📜' },
  { path: '/reports', label: 'Reports', icon: '📑' },
];

const Sidebar = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}

      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-icon">📦</span>
          <div className="brand-text">
            <h2>Inventory System</h2>
            <span className="brand-badge">PRO v1.0</span>
          </div>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close sidebar">
            &times;
          </button>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-title">Navigation</span>
          <ul>
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'nav-link-active' : ''}`
                  }
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar-sm">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="sidebar-user-details">
              <span className="sidebar-user-name">{user?.name || 'User'}</span>
              <span className={`user-role-badge role-${user?.role || 'staff'}`}>
                {user?.role?.toUpperCase() || 'STAFF'}
              </span>
            </div>
          </div>
          <button className="sidebar-logout-btn" onClick={logout} title="Logout">
            ⎋ Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
