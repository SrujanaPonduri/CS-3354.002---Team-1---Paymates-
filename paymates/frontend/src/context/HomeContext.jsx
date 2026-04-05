// src/context/HomeContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global state context used by every authenticated page.
//
// Use Case: All UCs — any component that needs to know who is logged in or
//           which home is active imports the `useHome()` hook from here.
//
// State provided:
//   currentUser     — the logged-in user object (id, name, email, …)
//                     persisted to localStorage so a page refresh doesn't log
//                     the user out.
//   setCurrentUser  — updates currentUser AND syncs localStorage.
//                     Passing null clears the stored value (sign-out).
//   currentHomeId   — the active home ID (currently driven by the URL, not
//                     stored persistently — the URL is the source of truth).
//   setCurrentHomeId — can be called to programmatically switch homes.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState } from 'react';

// Create the context with a null default so useHome() can detect misuse.
const HomeContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// HomeProvider — wraps the entire app (mounted in main.jsx)
// ─────────────────────────────────────────────────────────────────────────────
export function HomeProvider({ children }) {
  // Lazy-initialise from localStorage so the user stays logged in across
  // page refreshes.  JSON.parse can throw on corrupt data, so we wrap it.
  const [currentUser, setCurrentUserRaw] = useState(() => {
    try {
      const stored = localStorage.getItem('paymates_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      // Corrupt storage — treat as logged-out
      return null;
    }
  });

  // currentHomeId is lighter-weight: it is derived from the URL in
  // RequireAuth.jsx via useMatch(), so we don't persist it.
  const [currentHomeId, setCurrentHomeId] = useState(null);

  // Wrapped setter so every caller automatically syncs localStorage.
  const setCurrentUser = (user) => {
    setCurrentUserRaw(user);
    if (user) {
      // Persist the user object so the session survives a hard refresh.
      localStorage.setItem('paymates_user', JSON.stringify(user));
    } else {
      // null means "sign out" — remove the stored value.
      localStorage.removeItem('paymates_user');
    }
  };

  return (
    // Expose all four values to every child component.
    <HomeContext.Provider value={{ currentUser, setCurrentUser, currentHomeId, setCurrentHomeId }}>
      {children}
    </HomeContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// useHome — convenience hook used throughout the app
// Throws a clear error if called outside <HomeProvider> (helps catch bugs
// during development).
// ─────────────────────────────────────────────────────────────────────────────
export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error('useHome must be used inside HomeProvider');
  return ctx;
}
