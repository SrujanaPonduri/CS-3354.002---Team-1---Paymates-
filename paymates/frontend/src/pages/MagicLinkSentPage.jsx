// src/pages/MagicLinkSentPage.jsx
// Use Case: UC01 — FR-04: simulates clicking the magic-link email.
// Reads the token from location.state and verifies it via GET /auth/verify/<token>.

import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function MagicLinkSentPage() {
  const { state }          = useLocation();
  const token              = state?.token;
  const navigate           = useNavigate();
  const { setCurrentUser } = useHome();
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleVerify = async () => {
    if (!token) { setError('No token found. Please start over.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await client.get(`/auth/verify/${token}`);
      const { email, user } = res.data;

      if (user) {
        // Returning user — account already fully set up (e.g. seeded demo users).
        // Save them to context + localStorage and go straight to the app.
        setCurrentUser(user);
        navigate('/homes/home-demo/inventory');
      } else {
        // New user — still needs to complete profile setup.
        navigate('/account-setup', { state: { token, email } });
      }
    } catch (err) {
      if (err.response?.status === 401) {
        setError('This link has expired. Please start over.');
      } else {
        setError(err.response?.data?.error || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✉️</div>
        <h1 className="auth-title">Your magic link is ready</h1>
        <p className="auth-subtitle">
          Click the button below to continue — this simulates clicking the link
          from the email sent to <strong style={{ color: '#a78bfa' }}>{state?.email}</strong>.
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <button
          className="btn btn-primary btn-full"
          onClick={handleVerify}
          disabled={loading || !token}
        >
          {loading ? 'Verifying…' : 'Verify and continue →'}
        </button>

        {!token && (
          <p className="auth-footer">
            Token missing.{' '}
            <Link to="/login" className="auth-link">Start over</Link>
          </p>
        )}
      </div>
    </div>
  );
}
