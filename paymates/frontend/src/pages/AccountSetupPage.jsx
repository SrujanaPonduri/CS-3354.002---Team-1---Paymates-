// src/pages/AccountSetupPage.jsx

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const COUNTRIES = [
  { code: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { code: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { code: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { code: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { code: 'PH', name: 'Philippines', dial: '+63', flag: '🇵🇭' },
  { code: 'MX', name: 'Mexico', dial: '+52', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', dial: '+55', flag: '🇧🇷' },
  { code: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { code: 'JP', name: 'Japan', dial: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dial: '+82', flag: '🇰🇷' },
  { code: 'CN', name: 'China', dial: '+86', flag: '🇨🇳' },
  { code: 'SG', name: 'Singapore', dial: '+65', flag: '🇸🇬' },
  { code: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { code: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { code: 'NG', name: 'Nigeria', dial: '+234', flag: '🇳🇬' },
  { code: 'AF', name: 'Afghanistan', dial: '+93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', dial: '+213', flag: '🇩🇿' },
  { code: 'AS', name: 'American Samoa', dial: '+1', flag: '🇦🇸' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'PK', name: 'Pakistan', dial: '+92', flag: '🇵🇰' },
  { code: 'BD', name: 'Bangladesh', dial: '+880', flag: '🇧🇩' },
  { code: 'ID', name: 'Indonesia', dial: '+62', flag: '🇮🇩' },
  { code: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966', flag: '🇸🇦' },
  { code: 'AE', name: 'UAE', dial: '+971', flag: '🇦🇪' },
  { code: 'EG', name: 'Egypt', dial: '+20', flag: '🇪🇬' },
  { code: 'GH', name: 'Ghana', dial: '+233', flag: '🇬🇭' },
  { code: 'VN', name: 'Vietnam', dial: '+84', flag: '🇻🇳' },
  { code: 'TH', name: 'Thailand', dial: '+66', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', dial: '+60', flag: '🇲🇾' },
  { code: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { code: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { code: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { code: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { code: 'RU', name: 'Russia', dial: '+7', flag: '🇷🇺' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'NP', name: 'Nepal', dial: '+977', flag: '🇳🇵' },
  { code: 'LK', name: 'Sri Lanka', dial: '+94', flag: '🇱🇰' },
  { code: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { code: 'HK', name: 'Hong Kong', dial: '+852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', dial: '+886', flag: '🇹🇼' },
  { code: 'KE', name: 'Kenya', dial: '+254', flag: '🇰🇪' },
];

function validatePhone(phone) {
  if (!phone) return ''; // optional field
  if (/[a-zA-Z]/.test(phone)) return 'Phone number cannot contain letters.';
  if (/[^0-9]/.test(phone)) return 'Phone number can only contain digits.';
  if (phone.length !== 10) return 'Phone number must be exactly 10 digits.';
  return '';
}

export default function AccountSetupPage() {
  const { state }           = useLocation();
  const token               = state?.token || '';
  const email               = state?.email || '';
  const { setCurrentUser }  = useHome();
  const navigate            = useNavigate();

  const [name, setName]             = useState('');
  const [countryCode, setCountryCode] = useState('US');
  const [phone, setPhone]           = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [address, setAddress]       = useState('');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  const selectedCountry = COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0];

  // Validate on space key press
  const handlePhoneKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault(); // don't insert a space
      const msg = validatePhone(phone.trim());
      setPhoneError(msg);
    }
  };

  const handlePhoneChange = (e) => {
    setPhone(e.target.value);
    // Clear error as user types after a space-triggered error
    if (phoneError) setPhoneError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }

    const phoneMsg = validatePhone(phone.trim());
    if (phoneMsg) { setPhoneError(phoneMsg); return; }

    setError('');
    setPhoneError('');
    setLoading(true);
    try {
      const fullPhone = phone.trim() ? `${selectedCountry.dial}${phone.trim()}` : '';
      const res = await client.post('/auth/setup', {
        token,
        name:    name.trim(),
        phone:   fullPhone,
        address: address.trim(),
      });

      const { user, token: sessionToken } = res.data;
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
            <label className="form-label">PHONE (optional)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <select
                className="form-input"
                style={{ width: '200px', flexShrink: 0, cursor: 'pointer' }}
                value={countryCode}
                onChange={e => setCountryCode(e.target.value)}
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.name} ({c.dial})
                  </option>
                ))}
              </select>

              <input
                className="form-input"
                style={{
                  flex: 1,
                  borderColor: phoneError ? 'var(--danger, #e53e3e)' : undefined,
                }}
                type="text"
                placeholder="10-digit number"
                value={phone}
                onChange={handlePhoneChange}
                onKeyDown={handlePhoneKeyDown}
              />
            </div>
            {phoneError ? (
              <p style={{ fontSize: '11px', color: 'var(--danger, #e53e3e)', marginTop: '0.35rem' }}>
                ⚠ {phoneError}
              </p>
            ) : (
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                {selectedCountry.flag} {selectedCountry.dial} · digits only, 10 required · press Space to check
              </p>
            )}
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
