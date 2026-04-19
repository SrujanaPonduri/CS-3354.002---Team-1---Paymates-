// Public route opened from emailed magic link: /magic-link?token=...
// Verifies the token via GET /api/auth/verify/<token> and routes like MagicLinkSentPage.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import { verifyMagicLinkAndRoute } from '../auth/magicLinkVerify.js';

export default function MagicLinkPage() {
  const [searchParams] = useSearchParams();
  const token = (searchParams.get('token') || '').trim();
  const navigate = useNavigate();
  const { setCurrentUser } = useHome();
  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('This link is missing a token. Request a new magic link from the sign-in page.');
      return;
    }

    let cancelled = false;
    (async () => {
      setError('');
      setLoading(true);
      try {
        await verifyMagicLinkAndRoute({ token, navigate, setCurrentUser });
      } catch (err) {
        if (cancelled) return;
        if (err.response?.status === 401) {
          setError('This link has expired. Please start over.');
        } else {
          setError(err.response?.data?.error || 'Verification failed. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, navigate, setCurrentUser]);

  if (loading) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">✉️</div>
          <h1 className="auth-title">Signing you in…</h1>
          <p className="auth-subtitle">Please wait while we verify your link.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✉️</div>
        <h1 className="auth-title">Magic link</h1>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <p className="auth-footer">
          <Link to="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
