// src/components/InviteModal.jsx
// Use Case: UC03 — FR-02: invite a new roommate by email.

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

export default function InviteModal({ homeId, inviterId, onClose, onSuccess }) {
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [token, setToken]     = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.post(`/homes/${homeId}/invite`, {
        inviter_id:    inviterId,
        invitee_email: email.trim(),
      });
      setToken(res.data.invite_token);
      // Signal parent to refresh; keep modal open to show the token
      onSuccess?.();
    } catch (err) {
      if (err.response?.status === 409) {
        setError('This person is already a member of this home.');
      } else if (err.response?.status === 403) {
        setError('You must be a member to send invites.');
      } else {
        setError(err.response?.data?.error || 'Failed to send invite.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title">📨 Invite a Roommate</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {token ? (
          <div>
            <p style={{ color: '#86efac', marginBottom: '1rem', fontSize: 14 }}>
              ✅ Invite created! Share this token with your roommate:
            </p>
            <code style={{
              display: 'block', padding: '.75rem', background: '#252540',
              borderRadius: 8, wordBreak: 'break-all', fontSize: 12,
              border: '1px solid #2d2d4a', color: '#a78bfa',
            }}>
              {token}
            </code>
            <p style={{ fontSize: 12, color: '#64748b', marginTop: '.5rem' }}>
              They can use this token at <strong>POST /homes/{homeId}/accept_invite</strong>.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Roommate's email address</label>
              <input
                className="form-input"
                type="email"
                placeholder="roommate@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending…' : 'Send invite'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
