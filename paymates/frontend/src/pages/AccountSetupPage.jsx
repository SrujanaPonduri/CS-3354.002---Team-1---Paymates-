// src/pages/AccountSetupPage.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Use Case: UC01 — FR-01, FR-03: Complete profile (name, phone, address)
//           after email verification for a BRAND-NEW user.
//
// This page is only reached by new users who have verified their magic-link
// token but have not yet created a profile.  Returning users whose profile is
// already complete are redirected straight to /homes by MagicLinkSentPage,
// so they never land here.
//
// Flow:
//   MagicLinkSentPage (verify token) ──► AccountSetupPage (if user == null)
//   AccountSetupPage  ──POST /auth/setup──► saves user → navigate('/homes')
//
// The token and email are passed in via React Router location.state (set by
// MagicLinkSentPage).  If location.state is missing the token field, the
// setup API call will return 401 and the user will be shown an error.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function AccountSetupPage() {
  // Read the token and email forwarded from MagicLinkSentPage via location.state.
  // Fallback to empty string so controlled inputs never receive undefined.
  const { state }           = useLocation();
  const token               = state?.token || '';
  const email               = state?.email || '';

  // setCurrentUser saves the new user to context AND to localStorage.
  const { setCurrentUser }  = useHome();
  const navigate            = useNavigate();

  // Controlled form fields
  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // ── Submit handler ─────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation — name is the only required profile field.
    if (!name.trim()) { setError('Name is required.'); return; }

    setError('');
    setLoading(true);
    try {
      // POST /api/auth/setup
      // Backend validates the token (still valid, not expired), creates the
      // user record in DB["users"], and deletes the token (one-time use).
      const res = await client.post('/auth/setup', {
        token,
        name:    name.trim(),
        phone:   phone.trim(),
        address: address.trim(),
      });

      const user = res.data.user;

      // Persist the user object to context + localStorage so the app
      // considers the user "logged in" across the entire session.
      setCurrentUser(user);

      // New users land on /homes where they can create or enter a home.
      navigate('/homes');
    } catch (err) {
      if (err.response?.status === 401) {
        // Token expired or was already used
        setError('Your link expired. Please start over.');
      } else {
        setError(err.response?.data?.error || 'Setup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">👤</div>
        <h1 className="auth-title">Set up your profile</h1>

        {/* Show the email the token was issued for so the user can confirm */}
        <p className="auth-subtitle">
          Finishing up for <strong style={{ color: '#a78bfa' }}>{email}</strong>
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          {/* Required */}
          <div className="form-group">
            <label className="form-label">Full name *</label>
            <input
              className="form-input"
              type="text"
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Optional — stored in user record for roommate display */}
          <div className="form-group">
            <label className="form-label">Phone number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="555-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          {/* Optional — defaults to the home's address if left blank */}
          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              className="form-input"
              type="text"
              placeholder="123 Main St"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? 'Creating account…' : 'Create account →'}
          </button>
        </form>
      </div>
    </div>
  );
}
