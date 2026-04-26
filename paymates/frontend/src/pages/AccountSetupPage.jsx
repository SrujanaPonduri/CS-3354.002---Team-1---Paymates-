// src/pages/AccountSetupPage.jsx

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import PhoneInput from 'react-phone-number-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const PENDING_INVITE_KEY = 'paymates_pending_home_invite';

function readPendingInvite() {
  try {
    const raw = localStorage.getItem(PENDING_INVITE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.homeId || !parsed?.inviteToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

function validatePhone(val) {
  if (!val) return '';
  if (/[a-zA-Z]/.test(val)) return 'Phone number cannot contain letters.';
  try {
    if (!isValidPhoneNumber(val)) return 'Please enter a valid phone number.';
  } catch {
    return 'Please enter a valid phone number.';
  }
  return '';
}

export default function AccountSetupPage() {
  const { state }          = useLocation();
  const token              = state?.token || '';
  const email              = state?.email || '';
  const { setCurrentUser } = useHome();
  const navigate           = useNavigate();

  const [name, setName]             = useState('');
  const [phone, setPhone]           = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [address, setAddress]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }

    const phoneMsg = validatePhone(phone);
    if (phoneMsg) { setPhoneError(phoneMsg); return; }

    setError('');
    setPhoneError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/setup', {
        token,
        name:    name.trim(),
        phone:   phone || '',
        address: address.trim(),
      });

      const { user, token: sessionToken } = res.data;
      if (sessionToken) localStorage.setItem('paymates_token', sessionToken);
      setCurrentUser(user);

      const pendingInvite = readPendingInvite();
      if (pendingInvite) {
        navigate(
          `/accept-home-invite?home_id=${encodeURIComponent(pendingInvite.homeId)}&invite_token=${encodeURIComponent(pendingInvite.inviteToken)}`
        );
        return;
      }
      navigate('/homes');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Your link expired. Please start over.');
      } else {
        setError(err.response?.data?.error || 'Setup failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">👤</div>
        <h1 className="auth-title">Set up your profile</h1>
        <p className="auth-subtitle">
          Finishing up for <strong style={{ color: '#a78bfa' }}>{email}</strong>
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label className="form-label">Phone number (optional)</label>
            <PhoneInput
              international
              defaultCountry="US"
              value={phone}
              onChange={(val) => { setPhone(val || ''); if (phoneError) setPhoneError(''); }}
              style={{
                '--PhoneInputCountryFlag-height': '1em',
                '--PhoneInput-color--focus': '#7C5FFF',
              }}
            />
            {phoneError && (
              <p style={{ fontSize: '11px', color: 'var(--danger, #e53e3e)', marginTop: '0.35rem' }}>
                ⚠ {phoneError}
              </p>
            )}
          </div>

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