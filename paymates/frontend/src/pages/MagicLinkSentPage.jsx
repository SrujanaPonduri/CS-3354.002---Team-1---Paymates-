// src/pages/MagicLinkSentPage.jsx

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
        setCurrentUser(user);
        navigate('/homes');
      } else {
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>Mail</div>
        </div>
        
        <h1 className="auth-title" style={{ textAlign: 'center' }}>Your magic link is ready</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>
          Click below to continue — this simulates clicking the link from the email sent to{' '}
          <strong style={{ color: '#7C5FFF' }}>{state?.email}</strong>.
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <button
          className="btn btn-primary btn-full"
          onClick={handleVerify}
          disabled={loading || !token}
        >
          {loading ? 'VERIFYING...' : 'VERIFY AND CONTINUE →'}
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