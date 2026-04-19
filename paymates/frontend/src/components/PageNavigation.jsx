// src/components/PageNavigation.jsx
// Navigation pills for app pages (Roommates, Bills, Expenses, Inventory, Dues)

import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function PageNav() {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!homeId) return null; // Don't show nav if no home selected

  const navItems = [
    { label: 'Roommates', path: `/homes/${homeId}/roommates` },
    { label: 'Bills', path: `/homes/${homeId}/bills` },
    { label: 'Expenses', path: `/homes/${homeId}/expenses` },
    { label: 'Inventory', path: `/homes/${homeId}/inventory` },
    { label: 'Dues', path: `/homes/${homeId}/dues` },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="page-nav">
      {navItems.map((item) => (
        <button
          key={item.path}
          className={`page-nav-pill ${isActive(item.path) ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}