// src/components/DeleteHomeModal.jsx
// Use Case: UC02 — TC4 (delete blocked, unanimous consent notice) and
// TC5 (all members voted, home deleted and removed from dashboard).

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

export default function DeleteHomeModal({ home, currentUserId, onClose, onDeleted, onVoteCast }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [voteResult, setVoteResult] = useState(null); // TC4 response

  const alreadyVoted = home.deletion_votes?.includes(currentUserId);
  const isSoleMember = home.member_count === 1;

  const handleVoteOrDelete = async () => {
    setError('');
    setLoading(true);
    try {
      if (isSoleMember) {
        // Sole member — immediate delete (no vote needed)
        await client.delete(`/homes/${home.id}`, { data: { user_id: currentUserId } });
        onDeleted();
        return;
      }
      // Cast a delete vote — backend handles TC4 vs TC5
      const res = await client.post(`/homes/${home.id}/delete_vote`, { user_id: currentUserId });
      if (res.data.deleted) {
        // TC5 — unanimous consent reached, home deleted
        onDeleted();
      } else {
        // TC4 — vote recorded, still waiting for others
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
        <h2 className="modal-title">🗑 Delete Home</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* TC4 — post-vote waiting screen */}
        {voteResult && !voteResult.deleted ? (
          <div>
            <div style={{
              padding: '1rem', borderRadius: 10,
              background: '#1c1c3a', border: '1px solid #2d2d4a',
              marginBottom: '1.25rem',
            }}>
              <p style={{ color: '#fcd34d', fontWeight: 600, marginBottom: '.5rem' }}>
                ⚠ Unanimous consent required
              </p>
              <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: '1rem' }}>
                {voteResult.message}
              </p>
              {/* Vote progress bar */}
              <div style={{ background: '#252540', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.round((voteResult.votes_cast / voteResult.total) * 100)}%`,
                  background: '#f59e0b', height: '100%', transition: 'width .4s',
                }} />
              </div>
              <p style={{ fontSize: 12, color: '#64748b', marginTop: .4 + 'rem', textAlign: 'right' }}>
                {voteResult.votes_cast} / {voteResult.total} votes
              </p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-primary" onClick={onClose}>Got it</button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: '1.25rem' }}>
              You are requesting to delete{' '}
              <strong style={{ color: '#e2e8f0' }}>{home.name}</strong>.
            </p>

            {/* Current vote status */}
            {home.member_count > 1 && (
              <div style={{
                padding: '.875rem 1rem', borderRadius: 10,
                background: '#1c1c3a', border: '1px solid #2d2d4a',
                marginBottom: '1.25rem',
              }}>
                {/* TC4 notice */}
                <p style={{ fontSize: 13, color: '#fcd34d', fontWeight: 600, marginBottom: '.5rem' }}>
                  ⚠ Unanimous consent required
                </p>
                <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: '.75rem' }}>
                  All {home.member_count} members must vote to delete this home.
                  Once everyone votes, it will be permanently removed.
                </p>
                <div style={{ background: '#252540', borderRadius: 999, height: 8, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, background: '#f59e0b', height: '100%', transition: 'width .4s' }} />
                </div>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: '.4rem', textAlign: 'right' }}>
                  {home.votes_cast || 0} / {home.member_count} votes cast
                </p>
              </div>
            )}

            {isSoleMember && (
              <div style={{ padding: '.75rem 1rem', borderRadius: 8, background: '#450a0a', border: '1px solid #b91c1c', marginBottom: '1.25rem', fontSize: 13, color: '#fca5a5' }}>
                You are the only member. This home will be permanently deleted immediately.
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={handleVoteOrDelete}
                disabled={loading || alreadyVoted}
                title={alreadyVoted ? 'You already voted to delete this home' : ''}
              >
                {loading ? 'Submitting…'
                  : alreadyVoted ? '✓ Already voted'
                  : isSoleMember ? 'Delete home'
                  : 'Vote to delete'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
