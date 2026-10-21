import React from 'react';
import { useAuth } from '../context/AuthContext';
import Button from './Button';

const Navbar = ({ pageTitle = 'Dashboard', onToggleSidebar }) => {
  const { user, logout } = useAuth();

  return (
    <header className="top-navbar">
      <div className="navbar-left">
        <button
          className="sidebar-toggle-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Sidebar"
        >
          ☰
        </button>
        <h1 className="navbar-page-title">{pageTitle}</h1>
      </div>

      <div className="navbar-right">
        <div className="navbar-user-info">
          <div className="user-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="user-details">
            <span className="user-name">{user?.name || 'User'}</span>
            <span className={`user-role-pill role-${user?.role || 'staff'}`}>
              {user?.role || 'staff'}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="navbar-logout-btn"
        >
          Logout
        </Button>
      </div>
    </header>
  );
};

export default Navbar;
