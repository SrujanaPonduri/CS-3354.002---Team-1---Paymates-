// src/pages/HomesPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import DeleteHomeModal from '../components/DeleteHomeModal.jsx';

export default function HomesPage() {
  const { currentUser } = useHome();
  const navigate              = useNavigate();
  const [homes, setHomes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState('');

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
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Your Homes</h1>
          <p className="page-subtitle">Manage your shared living spaces</p>
        </div>
        <button className="btn btn-success" onClick={() => navigate('/homes/new')}>
          + CREATE HOME
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading homes…</p>
      ) : homes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <p className="empty-title">No homes yet</p>
          <p className="text-muted">Create a home to get started with your roommates.</p>
          <button className="btn btn-success" style={{ marginTop: '1.5rem' }} onClick={() => navigate('/homes/new')}>
            Create your first home
          </button>
        </div>
      ) : (
        <div className="card-grid">
          {homes.map((home) => {
            const alreadyVoted = home.deletion_votes?.includes(currentUser?.id);
            return (
              <div key={home.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
                {/* Header */}
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '0.5rem' }}>{home.name}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{home.address || 'No address set'}</p>
                  {home.is_creator && (
                    <span className="badge" style={{ background: 'var(--accent)', color: 'white', marginTop: '0.5rem' }}>
                      CREATOR
                    </span>
                  )}
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span>👥 {home.member_count} member{home.member_count !== 1 ? 's' : ''}</span>
                  {home.votes_cast > 0 && (
                    <span style={{ color: 'var(--error)' }}>
                      🗳 {home.votes_cast}/{home.member_count} deletion votes
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '2px solid var(--border-light)' }}>
                  <Link to={`/homes/${home.id}/inventory`} className="btn btn-success" style={{ textDecoration: 'none', flex: 1 }}>
                    ENTER →
                  </Link>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleLeave(home.id, home.name)}
                    disabled={leaveLoading === home.id}
                    style={{ flex: 1 }}
                  >
                    {leaveLoading === home.id ? 'LEAVING...' : 'LEAVE'}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => setDeleteTarget(home)}
                    title={alreadyVoted ? 'You already voted to delete' : 'Vote to delete home'}
                  >
                    {alreadyVoted ? '✓ VOTED' : 'DELETE'}
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