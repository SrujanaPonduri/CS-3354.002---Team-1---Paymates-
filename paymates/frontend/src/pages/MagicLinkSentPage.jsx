// src/pages/MagicLinkSentPage.jsx

import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { verifyMagicLinkAndRoute } from '../auth/magicLinkVerify.js';

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
      await verifyMagicLinkAndRoute({ token, navigate, setCurrentUser });
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>Mail</div>
        </div>
        
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Your magic link is ready</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>
          Click below to continue — this simulates clicking the link from the email sent to{' '}
          <strong style={{ color: '#7C5FFF' }}>{state?.email}</strong>.
        <div className="auth-logo">✉️</div>
        <h1 className="auth-title">
          {token ? 'Your magic link is ready' : 'Check your email'}
        </h1>
        <p className="auth-subtitle">
          {token ? (
            <>
              Click the button below to continue — this simulates the emailed link for{' '}
              <strong style={{ color: '#a78bfa' }}>{state?.email}</strong>
              {' '}(dev mode when the API returns a token).
            </>
          ) : (
            <>
              We sent a sign-in link to{' '}
              <strong style={{ color: '#a78bfa' }}>{state?.email}</strong>.
              {' '}Open the link in that inbox to continue. You can close this tab.
            </>
          )}
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <button
          className="btn btn-primary btn-full"
          onClick={handleVerify}
          disabled={loading || !token}
        >
          {loading ? 'VERIFYING...' : 'VERIFY AND CONTINUE →'}
        </button>

        {token && (
          <button
            className="btn btn-primary btn-full"
            onClick={handleVerify}
            disabled={loading}
          >
            {loading ? 'Verifying…' : 'Verify and continue →'}
          </button>
        )}

        {!token && (
          <p className="auth-footer">
            Wrong address?{' '}
            <Link to="/login" className="auth-link">Sign in</Link>
            {' · '}
            <Link to="/signup" className="auth-link">Sign up</Link>
          </p>
        )}
      </div>
    </div>
  );
}