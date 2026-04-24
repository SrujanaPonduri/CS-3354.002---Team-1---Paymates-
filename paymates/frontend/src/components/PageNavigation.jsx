// src/components/PageNavigation.jsx
// Navigation pills for all home-scoped pages.
// Updated: added Budgets (UC-12) and Audit (UC-13) tabs;
//          renamed "Dues" → "Payments" to match terminology update.

import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

export default function PageNav() {
  const { homeId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  if (!homeId) return null;

  const navItems = [
    { label: 'Roommates', path: `/homes/${homeId}/roommates` },
    { label: 'Bills',     path: `/homes/${homeId}/bills` },
    { label: 'Expenses',  path: `/homes/${homeId}/expenses` },
    { label: 'Inventory', path: `/homes/${homeId}/inventory` },
    { label: 'Payments',  path: `/homes/${homeId}/dues` },      // renamed from "Dues"
    { label: 'Budgets',   path: `/homes/${homeId}/budgets` },   // UC-12 (new)
    { label: 'Audit',     path: `/homes/${homeId}/audit` },     // UC-13 (new)
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
