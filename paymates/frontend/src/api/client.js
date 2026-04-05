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

export default client;
