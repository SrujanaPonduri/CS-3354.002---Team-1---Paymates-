// src/components/RequireAuth.jsx

import React from 'react';
import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';
import PageNav from './PageNavigation.jsx';

export default function RequireAuth() {
  const { currentUser, setCurrentUser } = useHome();
  const navigate = useNavigate();

  // Auth guard
  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* SINGLE Top Navigation Bar */}
      <div className="top-nav">
        <div className="top-nav-brand">Paymates</div>
        <div className="top-nav-user">
          <div className="avatar">
            {(currentUser.name || '?').charAt(0).toUpperCase()}
          </div>
          <span className="user-name">{currentUser.name}</span>
          <button className="logout-btn" onClick={handleLogout}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* Page Navigation Pills (only shows on home pages) */}
      <PageNav />

      {/* Main content area */}
      <Outlet />
    </div>
  );
}