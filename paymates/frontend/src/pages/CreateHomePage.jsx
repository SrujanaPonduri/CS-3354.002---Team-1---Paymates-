// src/pages/CreateHomePage.jsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function CreateHomePage() {
  const { currentUser } = useHome();
  const navigate        = useNavigate();

  const [name, setName]       = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [fieldError, setFieldError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setFieldError('name');
      setError('Home name is required. Please fill in this field.');
      return;
    }

    setError('');
    setFieldError('');
    setLoading(true);

    try {
      const res = await client.post('/homes', {
        creator_id: currentUser?.id,
        name:       name.trim(),
        address:    address.trim(),
      });
      const newHome = res.data.home;
      navigate(`/homes/${newHome.id}/inventory`);
    } catch (err) {
      if (err.response?.status === 400) {
        setFieldError(err.response.data?.field || '');
        setError(err.response.data?.error || 'Please fill in all required fields.');
      } else if (err.response?.status === 409) {
        setFieldError('name');
        setError(err.response.data?.error || 'You already have a home with that name. Please choose a different name.');
      } else {
        setError(err.response?.data?.error || 'Failed to create home. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 Create a Home</h1>
          <p className="page-subtitle">Set up a new shared home for you and your roommates</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/homes')}>
          CANCEL
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => { setError(''); setFieldError(''); }} />

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              HOME NAME <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g. Maple Street House"
              value={name}
              onChange={e => { setName(e.target.value); setFieldError(''); }}
              style={fieldError === 'name' ? { borderColor: 'var(--error)' } : {}}
              autoFocus
            />
            {fieldError === 'name' && (
              <p style={{ fontSize: 12, color: 'var(--error)', marginTop: 6 }}>
                {name.trim() === ''
                  ? 'Please enter a home name.'
                  : 'This name is already used by one of your homes. Choose a different name.'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">ADDRESS</label>
            <input
              className="form-input"
              placeholder="123 Main St, City, TX 75000"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Optional — helps roommates identify the correct home</p>
          </div>

          <div style={{ marginTop: '2rem', padding: '1.25rem', background: 'var(--surface-2)', borderRadius: 'var(--rl)', border: '2px solid var(--border-light)', fontSize: 14, color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text)', display: 'block', marginBottom: '.75rem' }}>What happens next?</strong>
            <ul style={{ marginTop: '.5rem', paddingLeft: '1.5rem', lineHeight: 1.8 }}>
              <li>You become the creator and first member of the home.</li>
              <li>Invite roommates from the <strong>Roommates</strong> page.</li>
              <li>Deleting the home requires <strong>unanimous consent</strong> from all members.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2rem' }}>
            <button className="btn btn-success" type="submit" disabled={loading} style={{ padding: '1rem 2.5rem' }}>
              {loading ? 'CREATING…' : '✓ CREATE HOME'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}