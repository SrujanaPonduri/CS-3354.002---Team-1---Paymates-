// src/context/HomeContext.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Global state context used by every authenticated page.
//
// State provided:
//   currentUser      — the logged-in user object (id, name, email, …)
//   setCurrentUser   — updates currentUser AND syncs localStorage. null = sign-out.
//   currentHomeId    — the active home ID (synced from URL by RequireAuth)
//   setCurrentHomeId — called by RequireAuth on each route change
//   homes            — all homes the current user belongs to
//   homesLoading     — true while the homes fetch is in-flight
//   homesError       — error string if the fetch failed, otherwise null
//   refreshHomes     — callable by any page to re-fetch after a mutation
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

const HomeContext = createContext(null);

export function HomeProvider({ children }) {
  // ── Auth state ─────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUserRaw] = useState(() => {
    try {
      const stored = localStorage.getItem('paymates_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [currentHomeId, setCurrentHomeId] = useState(null);

  const setCurrentUser = (user) => {
    setCurrentUserRaw(user);
    if (user) {
      localStorage.setItem('paymates_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('paymates_user');
      localStorage.removeItem('paymates_token');
      setHomes([]);
      setCurrentHomeId(null);
    }
  };

  // ── Homes state ────────────────────────────────────────────────────────────
  const [homes, setHomes]               = useState([]);
  const [homesLoading, setHomesLoading] = useState(false);
  const [homesError, setHomesError]     = useState(null);

  const refreshHomes = useCallback(async () => {
    if (!currentUser) return;
    setHomesLoading(true);
    setHomesError(null);
    try {
      const res = await client.get(`/homes?user_id=${currentUser.id}`);
      setHomes(res.data.homes ?? res.data);
    } catch (err) {
      setHomesError(err.response?.data?.error || 'Failed to load homes.');
    } finally {
      setHomesLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    refreshHomes();
  }, [refreshHomes]);

  return (
    <HomeContext.Provider value={{
      currentUser, setCurrentUser,
      currentHomeId, setCurrentHomeId,
      homes, setHomes,
      homesLoading, homesError,
      refreshHomes,
    }}>
      {children}
    </HomeContext.Provider>
  );
}

export function useHome() {
  const ctx = useContext(HomeContext);
  if (!ctx) throw new Error('useHome must be used inside HomeProvider');
  return ctx;
}
