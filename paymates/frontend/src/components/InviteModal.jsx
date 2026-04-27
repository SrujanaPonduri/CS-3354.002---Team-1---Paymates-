// src/components/InviteModal.jsx

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
      <rect x="1.5" y="3" width="13" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1.5 5L8 10.5L14.5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <circle cx="7" cy="7" r="6" stroke="var(--success)" strokeWidth="1.5"/>
      <polyline points="4,7 6.5,9.5 10,5" stroke="var(--success)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

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
        <h2 className="modal-title"><MailIcon /> Invite a Roommate</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {token ? (
          <div>
            <p style={{ color: 'var(--success)', marginBottom: '1.25rem', fontSize: 14, fontWeight: 600 }}>
              <CheckIcon /> Invite created! Share this token with your roommate:
            </p>
            <code style={{
              display: 'block', padding: '1rem', background: 'var(--surface-2)',
              borderRadius: 'var(--r)', wordBreak: 'break-all', fontSize: 13,
              border: '2px solid var(--border)', color: 'var(--accent)', fontWeight: 600,
            }}>
              {token}
            </code>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '.75rem' }}>
              They can use this token at <strong>POST /homes/{homeId}/accept_invite</strong>.
            </p>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>DONE</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">ROOMMATE'S EMAIL ADDRESS</label>
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
              <button type="button" className="btn btn-secondary" onClick={onClose}>CANCEL</button>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'SENDING…' : 'SEND INVITE'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}