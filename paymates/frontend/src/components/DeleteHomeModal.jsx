// src/components/DeleteHomeModal.jsx

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

function DeleteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
      <path d="M3 5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M7 2H11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M6 5V14C6 15.1046 6.89543 16 8 16H10C11.1046 16 12 15.1046 12 14V5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="M7.5 1L14 13H1L7.5 1Z" stroke="var(--warning)" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="7.5" y1="5.5" x2="7.5" y2="8.5" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="7.5" cy="10.5" r="0.7" fill="var(--warning)"/>
    </svg>
  );
}

export default function DeleteHomeModal({ home, currentUserId, onClose, onDeleted, onVoteCast }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [voteResult, setVoteResult] = useState(null);

  const alreadyVoted = home.deletion_votes?.includes(currentUserId);
  const isSoleMember = home.member_count === 1;

  const handleVoteOrDelete = async () => {
    setError('');
    setLoading(true);
    try {
      if (isSoleMember) {
        await client.delete(`/homes/${home.id}`, { data: { user_id: currentUserId } });
        onDeleted();
        return;
      }
      const res = await client.post(`/homes/${home.id}/delete_vote`, { user_id: currentUserId });
      if (res.data.deleted) {
        onDeleted();
      } else {
        setVoteResult(res.data);
        onVoteCast?.();
      }
    } catch (err) {
      if (err.response?.status === 400) {
        setError(err.response.data?.error || 'Vote already cast.');
      } else if (err.response?.status === 403) {
        setError('You are not a member of this home.');
      } else {
        setError(err.response?.data?.error || 'Failed to submit vote.');
      }
    } finally {
      setLoading(false);
    }
  };

  const pct = home.member_count > 0
    ? Math.round(((home.votes_cast || 0) / home.member_count) * 100)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title"><DeleteIcon /> Delete Home</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {voteResult && !voteResult.deleted ? (
          <div>
            <div style={{
              padding: '1.25rem', borderRadius: 'var(--rl)',
              background: 'var(--accent-light)', border: '2px solid var(--accent)',
              marginBottom: '1.5rem',
            }}>
              <p style={{ color: 'var(--warning)', fontWeight: 700, marginBottom: '.75rem', fontSize: 15 }}>
                <WarningIcon /> Unanimous consent required
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                {voteResult.message}
              </p>
              <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 10, overflow: 'hidden', border: '2px solid var(--border-light)' }}>
                <div style={{
                  width: `${Math.round((voteResult.votes_cast / voteResult.total) * 100)}%`,
                  background: 'var(--warning)', height: '100%', transition: 'width .4s',
                }} />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '.6rem', textAlign: 'right', fontWeight: 600 }}>
                {voteResult.votes_cast} / {voteResult.total} votes
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>GOT IT</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              You are requesting to delete{' '}
              <strong style={{ color: 'var(--text)' }}>{home.name}</strong>.
            </p>

            {home.member_count > 1 && (
              <div style={{
                padding: '1.25rem', borderRadius: 'var(--rl)',
                background: 'var(--accent-light)', border: '2px solid var(--accent)',
                marginBottom: '1.5rem',
              }}>
                <p style={{ fontSize: 13, color: 'var(--warning)', fontWeight: 700, marginBottom: '.75rem' }}>
                  <WarningIcon /> Unanimous consent required
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  All {home.member_count} members must vote to delete this home.
                  Once everyone votes, it will be permanently removed.
                </p>
                <div style={{ background: 'var(--surface-2)', borderRadius: 999, height: 10, overflow: 'hidden', border: '2px solid var(--border-light)' }}>
                  <div style={{ width: `${pct}%`, background: 'var(--warning)', height: '100%', transition: 'width .4s' }} />
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: '.6rem', textAlign: 'right', fontWeight: 600 }}>
                  {home.votes_cast || 0} / {home.member_count} votes cast
                </p>
              </div>
            )}

            {isSoleMember && (
              <div style={{ padding: '1rem 1.25rem', borderRadius: 'var(--r)', background: 'var(--error-bg)', border: '2px solid var(--error-border)', marginBottom: '1.5rem', fontSize: 13, color: 'var(--error)', fontWeight: 600 }}>
                You are the only member. This home will be permanently deleted immediately.
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>CANCEL</button>
              <button
                className="btn btn-danger"
                onClick={handleVoteOrDelete}
                disabled={loading || alreadyVoted}
                title={alreadyVoted ? 'You already voted to delete this home' : ''}
              >
                {loading ? 'SUBMITTING…'
                  : alreadyVoted ? '✓ ALREADY VOTED'
                  : isSoleMember ? 'DELETE HOME'
                  : 'VOTE TO DELETE'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}