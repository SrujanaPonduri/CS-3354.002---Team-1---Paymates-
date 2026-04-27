// src/components/RequireAuth.jsx

import React, { useEffect } from 'react';
import { Navigate, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';
import PageNav from './PageNavigation.jsx';

function BrandLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 64 64" fill="none" style={{ flexShrink: 0 }}>
      {/* Drop shadow layer */}
      <g transform="translate(3, 3)">
        <text 
          x="32" 
          y="46" 
          textAnchor="middle" 
          fontSize="52" 
          fontWeight="900" 
          fill="#1a1a2e"
          fontFamily="system-ui, -apple-system, sans-serif"
          stroke="#1a1a2e"
          strokeWidth="10"
          strokeLinejoin="round"
        >P</text>
      </g>
      {/* Outline layer */}
      <text 
        x="32" 
        y="46" 
        textAnchor="middle" 
        fontSize="52" 
        fontWeight="900" 
        fill="#1a1a2e"
        stroke="#1a1a2e"
        strokeWidth="10"
        strokeLinejoin="round"
        fontFamily="system-ui, -apple-system, sans-serif"
      >P</text>
      {/* Inner green P */}
      <text 
        x="32" 
        y="46" 
        textAnchor="middle" 
        fontSize="52" 
        fontWeight="900" 
        fill="#00D084"
        fontFamily="system-ui, -apple-system, sans-serif"
      >P</text>
    </svg>
  );
}

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
        <div className="top-nav-brand" style={{ display: 'flex', alignItems: 'center', gap: '0px' }}>
          <BrandLogo />
          <span style={{ 
            fontSize: '25px', 
            fontWeight: 700, 
            letterSpacing: '-0.4px',
            color: 'var(--text)',
            marginLeft: '-4px'
          }}>aymates</span>
        </div>
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