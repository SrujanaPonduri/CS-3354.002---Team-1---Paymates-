// src/pages/HomesPage.jsx

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import DeleteHomeModal from '../components/DeleteHomeModal.jsx';

function EmptyHomeIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M6 20L24 6L42 20V38C42 40.2091 40.2091 42 38 42H10C7.79086 42 6 40.2091 6 38V20Z" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinejoin="round"/>
      <path d="M18 42V26H30V42" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinejoin="round"/>
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
      <circle cx="5" cy="4" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 12C1 9.79086 2.79086 8 5 8C7.20914 8 9 9.79086 9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="10.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M9 10H12.5L13.5 12.5H8L9 10Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
      <line x1="4.5" y1="7" x2="9.5" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

export default function HomesPage() {
  const { currentUser, homes, setHomes, homesLoading, homesError, refreshHomes } = useHome();
  const navigate = useNavigate();

  const [error, setError]               = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [leaveLoading, setLeaveLoading] = useState('');

  const displayError = error || homesError || '';

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

      <ErrorBanner message={displayError} onDismiss={() => setError('')} />

      {homesLoading ? (
        <p className="text-muted">Loading homes…</p>
      ) : homes.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><EmptyHomeIcon /></div>
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
                <div>
                  <h3 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '0.5rem' }}>{home.name}</h3>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{home.address || 'No address set'}</p>
                  {home.is_creator && (
                    <span className="badge" style={{ background: 'var(--accent)', color: 'white', marginTop: '0.5rem' }}>
                      CREATOR
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '14px', color: 'var(--text-muted)' }}>
                  <span><UsersIcon /> {home.member_count} member{home.member_count !== 1 ? 's' : ''}</span>
                  {home.votes_cast > 0 && (
                    <span style={{ color: 'var(--error)' }}>
                      <DeleteIcon /> {home.votes_cast}/{home.member_count} deletion votes
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: 'auto', paddingTop: '1rem', borderTop: '2px solid var(--border-light)' }}>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                  </div>
                  <button
                    className="btn btn-danger btn-full"
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
          onVoteCast={() => refreshHomes()}
        />
      )}
    </div>
  );
}