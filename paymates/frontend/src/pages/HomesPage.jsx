// src/pages/HomesPage.jsx
// Use Case: UC02 — TC1–TC6 dashboard: lists all homes the user belongs to,
// provides create and delete-vote actions, and shows leave-home per TC6.

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import DeleteHomeModal from '../components/DeleteHomeModal.jsx';

export default function HomesPage() {
  const { currentUser }       = useHome();
  const navigate              = useNavigate();
  const [homes, setHomes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null); // home to vote-delete
  const [leaveLoading, setLeaveLoading] = useState('');   // home_id being left

  const fetchHomes = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await client.get(`/homes?user_id=${currentUser.id}`);
      setHomes(res.data.homes);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load homes.');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { fetchHomes(); }, [fetchHomes]);

  // TC6 — leave a home
  const handleLeave = async (homeId, homeName) => {
    if (!window.confirm(`Leave "${homeName}"? You will need a new invite to rejoin.`)) return;
    setLeaveLoading(homeId);
    setError('');
    try {
      await client.delete(`/homes/${homeId}/leave`, { data: { user_id: currentUser.id } });
      setHomes(prev => prev.filter(h => h.id !== homeId));
    } catch (err) {
      if (err.response?.status === 400) {
        setError('You are the last member — use "Delete home" instead of leaving.');
      } else {
        setError(err.response?.data?.error || 'Could not leave home.');
      }
    } finally {
      setLeaveLoading('');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🏠 My Homes</h1>
          <p className="page-subtitle">All shared homes you belong to</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/homes/new')}>
          + Create home
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading homes…</p>
      ) : homes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <p className="empty-title">No homes yet</p>
          <p className="empty-text">Create a home to get started, or ask a roommate to send you an invite.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => navigate('/homes/new')}>
            Create your first home
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {homes.map(home => {
            const alreadyVoted = home.deletion_votes?.includes(currentUser?.id);
            return (
              <div key={home.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{home.name}</h2>
                    <p style={{ fontSize: 13, color: '#64748b' }}>{home.address || 'No address set'}</p>
                  </div>
                  {home.is_creator && (
                    <span className="badge badge-purple">Creator</span>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: 13, color: '#94a3b8' }}>
                  <span>👥 {home.member_count} member{home.member_count !== 1 ? 's' : ''}</span>
                  {home.votes_cast > 0 && (
                    <span style={{ color: '#fca5a5' }}>
                      🗳 {home.votes_cast}/{home.member_count} deletion votes
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap', marginTop: 'auto', paddingTop: '.75rem', borderTop: '1px solid #2d2d4a' }}>
                  <Link to={`/homes/${home.id}/inventory`} className="btn btn-primary btn-sm">
                    Enter →
                  </Link>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleLeave(home.id, home.name)}
                    disabled={leaveLoading === home.id}
                  >
                    Leave
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => setDeleteTarget(home)}
                    style={{ marginLeft: 'auto' }}
                    title={alreadyVoted ? 'You already voted to delete' : 'Vote to delete home'}
                  >
                    {alreadyVoted ? '🗳 Voted' : 'Delete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <DeleteHomeModal
          home={deleteTarget}
          currentUserId={currentUser?.id}
          onClose={() => setDeleteTarget(null)}
          onDeleted={() => {
            setHomes(prev => prev.filter(h => h.id !== deleteTarget.id));
            setDeleteTarget(null);
          }}
          onVoteCast={() => fetchHomes()}
        />
      )}
    </div>
  );
}
