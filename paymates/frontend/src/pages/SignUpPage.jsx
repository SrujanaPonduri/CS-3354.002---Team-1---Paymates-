// src/pages/SignUpPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Use Case: UC01 — FR-01: Register a new user via email → magic-link flow.
//
// Flow:
//   1. User enters email → POST /api/auth/signup
//   2. Backend sends a magic-link email (and may return token in dev if configured).
//   3. Frontend navigates to MagicLinkSentPage with { email } and optional { token }.
//
// Error handling:
//   409 → email already registered (prompt to log in instead)
//   any → generic error shown in ErrorBanner
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function SignUpPage() {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/signup', { email: email.trim() });
      navigate('/magic-link-sent', { state: { token: res.data.token, email } });

      const nextState = { email: email.trim() };
      if (res.data.token) nextState.token = res.data.token;
      navigate('/magic-link-sent', { state: nextState });
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This email is already registered. Try logging in.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">P</div>
        <h1 className="auth-title">Sign up</h1>
        
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">EMAIL</label>
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
          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'SENDING...' : 'SIGN UP →'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </p>
      </div>
    </div>
  );
}