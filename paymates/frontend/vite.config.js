// vite.config.js
// Responsible for: configuring Vite, enabling the React plugin, and proxying
// all /api/* requests to the Flask backend at localhost:5000 so the browser
// never makes cross-origin requests during development.

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // Forward every /api/* request to Flask — avoids CORS issues in dev
      '/api': 'http://localhost:5001',
    },
  },
});
