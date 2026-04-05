// src/main.jsx
// ─────────────────────────────────────────────────────────────────────────────
// React application entry point — mounts the React tree into #root.
//
// Provider hierarchy (outermost → innermost):
//   <BrowserRouter>    — gives all descendants access to React Router hooks
//     <HomeProvider>   — exposes currentUser + currentHomeId via useHome()
//       <App />        — defines all routes; protected routes use RequireAuth
//
// Why BrowserRouter wraps HomeProvider:
//   HomeProvider itself does not use routing, but some of its consumers
//   (e.g., RequireAuth) call useNavigate(), which requires a Router ancestor.
//   Placing BrowserRouter at the very top ensures this is always satisfied.
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { HomeProvider } from './context/HomeContext.jsx';
import App from './App.jsx';
import './index.css';   // global dark-theme design system (CSS variables, utility classes)

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    {/* HomeProvider persists currentUser to localStorage and provides
        setCurrentUser() to pages that need to log in/out.               */}
    <HomeProvider>
      <App />
    </HomeProvider>
  </BrowserRouter>
);
