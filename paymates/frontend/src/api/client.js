// src/api/client.js
// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for HTTP communication with the Flask backend.
//
// Usage in any component:
//   import client from '../api/client.js';
//   const res = await client.get('/homes/home-demo/dues');
// ─────────────────────────────────────────────────────────────────────────────

import axios from 'axios';

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach the session token to every request automatically.
// Saved to localStorage by magicLinkVerify.js and AccountSetupPage.jsx.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('paymates_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default client;
