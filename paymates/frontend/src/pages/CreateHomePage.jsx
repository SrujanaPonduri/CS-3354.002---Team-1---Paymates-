// src/pages/CreateHomePage.jsx
// Use Case: UC02 — TC1 (create valid home), TC2 (missing required fields),
// TC3 (duplicate home name under same account).

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
  const [fieldError, setFieldError] = useState(''); // TC2/TC3 field highlight

  const handleSubmit = async (e) => {
    e.preventDefault();

    // TC2 — client-side required field check
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
      // TC1 — success: navigate to the new home's inventory
      navigate(`/homes/${newHome.id}/inventory`);
    } catch (err) {
      if (err.response?.status === 400) {
        // TC2 — server-side validation (e.g. empty name that slipped through)
        setFieldError(err.response.data?.field || '');
        setError(err.response.data?.error || 'Please fill in all required fields.');
      } else if (err.response?.status === 409) {
        // TC3 — duplicate home name
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
    <div style={{ maxWidth: 520 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 Create a Home</h1>
          <p className="page-subtitle">Set up a new shared home for you and your roommates</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/homes')}>
          Cancel
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => { setError(''); setFieldError(''); }} />

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">
              Home name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              className="form-input"
              placeholder="e.g. Maple Street House"
              value={name}
              onChange={e => { setName(e.target.value); setFieldError(''); }}
              style={fieldError === 'name' ? { borderColor: '#ef4444' } : {}}
              autoFocus
            />
            {fieldError === 'name' && (
              <p style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
                {name.trim() === ''
                  ? 'Please enter a home name.'
                  : 'This name is already used by one of your homes. Choose a different name.'}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input
              className="form-input"
              placeholder="123 Main St, City, TX 75000"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Optional — helps roommates identify the correct home</p>
          </div>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#252540', borderRadius: 8, fontSize: 13, color: '#94a3b8' }}>
            <strong style={{ color: '#e2e8f0' }}>What happens next?</strong>
            <ul style={{ marginTop: '.5rem', paddingLeft: '1.25rem', lineHeight: 1.8 }}>
              <li>You become the creator and first member of the home.</li>
              <li>Invite roommates from the <strong>Roommates</strong> page.</li>
              <li>Deleting the home requires <strong>unanimous consent</strong> from all members.</li>
            </ul>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={loading} style={{ padding: '.75rem 2rem' }}>
              {loading ? 'Creating…' : '✓ Create home'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
