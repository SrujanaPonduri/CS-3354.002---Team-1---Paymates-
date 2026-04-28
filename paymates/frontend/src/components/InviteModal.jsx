// src/components/InviteModal.jsx
// Updated: supports inviting multiple roommates at once

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

function PlusIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
      <line x1="7" y1="2" x2="7" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <line x1="2" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

export default function InviteModal({ homeId, inviterId, onClose, onSuccess }) {
  const [emails, setEmails]     = useState(['']);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [results, setResults]   = useState(null); // null = not submitted yet

  const addEmailField = () => setEmails(prev => [...prev, '']);
  const removeEmailField = (idx) => setEmails(prev => prev.filter((_, i) => i !== idx));
  const updateEmail = (idx, val) => setEmails(prev => prev.map((e, i) => i === idx ? val : e));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = emails.map(e => e.trim()).filter(Boolean);
    if (trimmed.length === 0) { setError('Enter at least one email address.'); return; }

    // Basic email format check
    const invalid = trimmed.filter(em => {
      const at = em.indexOf('@');
      return at < 1 || !em.slice(at).includes('.');
    });
    if (invalid.length > 0) {
      setError(`Invalid email(s): ${invalid.join(', ')}`);
      return;
    }

    setError('');
    setLoading(true);
    // Send one invite per email, collect results
    const settled = await Promise.allSettled(
      trimmed.map(email =>
        client.post(`/homes/${homeId}/invite`, {
          inviter_id:    inviterId,
          invitee_email: email,
        }).then(res => ({ email, token: res.data.invite_token, ok: true }))
          .catch(err => ({ email, error: err.response?.data?.error || 'Failed', ok: false }))
      )
    );
    setLoading(false);
    const res = settled.map(s => s.value);
    setResults(res);
    if (res.every(r => r.ok)) onSuccess?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
        <h2 className="modal-title"><MailIcon /> Invite Roommates</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {results ? (
          <div>
            <p style={{ fontWeight: 600, marginBottom: '1rem', fontSize: 14 }}>
              Invite results ({results.filter(r => r.ok).length}/{results.length} sent):
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {results.map((r, i) => (
                <div key={i} style={{
                  padding: '0.6rem 1rem',
                  borderRadius: 'var(--r)',
                  background: r.ok ? 'var(--success-light, #f0fdf4)' : 'var(--error-light, #fff5f5)',
                  border: `1.5px solid ${r.ok ? 'var(--success)' : 'var(--danger, #e53e3e)'}`,
                  fontSize: 13,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontWeight: 600 }}>{r.email}</span>
                  <span style={{ color: r.ok ? 'var(--success)' : 'var(--danger, #e53e3e)', fontWeight: 600 }}>
                    {r.ok ? <><CheckIcon />Sent</> : `✕ ${r.error}`}
                  </span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>DONE</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">ROOMMATE EMAIL ADDRESSES</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {emails.map((email, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input
                      className="form-input"
                      style={{ flex: 1 }}
                      type="email"
                      placeholder={`roommate${idx + 1}@example.com`}
                      value={email}
                      onChange={e => updateEmail(idx, e.target.value)}
                      autoFocus={idx === 0}
                    />
                    {emails.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '6px 10px', flexShrink: 0 }}
                        onClick={() => removeEmailField(idx)}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.6rem', fontSize: 12 }}
                onClick={addEmailField}
              >
                <PlusIcon /> ADD ANOTHER
              </button>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>CANCEL</button>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'SENDING…' : `SEND ${emails.filter(e => e.trim()).length > 1 ? 'INVITES' : 'INVITE'}`}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
