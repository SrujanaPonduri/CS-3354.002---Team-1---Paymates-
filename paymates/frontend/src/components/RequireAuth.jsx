// src/components/RequireAuth.jsx

import React, { useEffect } from 'react';
import { Navigate, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';
import PageNav from './PageNavigation.jsx';

export default function RequireAuth() {
  const { currentUser, setCurrentUser, setCurrentHomeId } = useHome();
  const navigate = useNavigate();

  // Sync :homeId from URL into context on every navigation.
  const match  = useMatch('/homes/:homeId/*');
  const homeId = match?.params?.homeId ?? null;

  useEffect(() => {
    setCurrentHomeId(homeId);
  }, [homeId, setCurrentHomeId]);

  // Auth guard
  if (!currentUser) return <Navigate to="/login" replace />;

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Top Navigation Bar */}
      <div className="top-nav">
        <div className="top-nav-brand">Paymates</div>
        <div className="top-nav-user">
          <div
            onClick={() => navigate('/homes')}
            className="top-nav-user-chip"
            title="Back to My Homes"
          >
            <div className="avatar">
              {(currentUser.name || '?').charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{currentUser.name}</span>
          </div>
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
