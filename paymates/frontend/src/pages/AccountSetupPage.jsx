// src/pages/AccountSetupPage.jsx

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function AccountSetupPage() {
  const { state }           = useLocation();
  const token               = state?.token || '';
  const email               = state?.email || '';
  const { setCurrentUser }  = useHome();
  const navigate            = useNavigate();

  const [name, setName]       = useState('');
  const [phone, setPhone]     = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }

    setError('');
    setLoading(true);
    try {
      const res = await client.post('/auth/setup', {
        token,
        name:    name.trim(),
        phone:   phone.trim(),
        address: address.trim(),
      });

      const { user, token: sessionToken } = res.data;
      // Save the session token so client.js attaches it to every API request.
      if (sessionToken) localStorage.setItem('paymates_token', sessionToken);
      setCurrentUser(user);
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>Profile</div>
        </div>

        <h1 className="auth-title" style={{ textAlign: 'center' }}>Set up your profile</h1>
        <p className="auth-subtitle" style={{ textAlign: 'center' }}>
          Complete your account for <strong style={{ color: '#7C5FFF' }}>{email}</strong>
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">FULL NAME</label>
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
            <label className="form-label">PHONE</label>
            <input
              className="form-input"
              type="tel"
              placeholder="555-1234"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">ADDRESS</label>
            <input
              className="form-input"
              type="text"
              placeholder="123 Main St"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
          </div>

          <button className="btn btn-primary btn-full" type="submit" disabled={loading}>
            {loading ? 'SETTING UP...' : 'COMPLETE SETUP →'}
          </button>
        </form>
      </div>
    </div>
  );
}
