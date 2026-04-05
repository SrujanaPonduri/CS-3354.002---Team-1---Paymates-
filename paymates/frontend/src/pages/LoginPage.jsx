// src/pages/LoginPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Use Case: UC01 — FR-03: Existing user logs in via email → magic-link flow.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // POST /api/auth/login
      // Backend checks DB["users"] for a matching email.
      // If found → generates a token → returns { token }.
      // If not found → 404.
      const res = await client.post('/auth/login', { email: email.trim() });

      // Pass both token and the typed email to MagicLinkSentPage via
      // location.state (not query params — keeps the URL clean).
      navigate('/magic-link-sent', { state: { token: res.data.token, email } });
    } catch (err) {
      if (err.response?.status === 404) {
        // Email not in DB — guide the user to sign up.
        setError('No account found. Please sign up first.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">We'll send you a magic link to sign in instantly.</p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email address</label>
            <input
              className="form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Sending link…' : 'Send magic link →'}
          </button>
        </form>

        {/* Navigation escape hatch for new users */}
        <p className="auth-footer">
          No account yet?{' '}
          <Link to="/signup" className="auth-link">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
