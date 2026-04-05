// src/pages/RoommatesPage.jsx
// Use Case: UC03 — FR-02: view roommate list, invite new member, leave home.

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import InviteModal from '../components/InviteModal.jsx';

export default function RoommatesPage() {
  const { homeId }                    = useParams();
  const { currentUser }               = useHome();
  const [roommates, setRoommates]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [showInvite, setShowInvite]   = useState(false);
  const [leaving, setLeaving]         = useState(false);

  const fetchRoommates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/homes/${homeId}/roommates`);
      setRoommates(res.data.roommates);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load roommates.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { fetchRoommates(); }, [fetchRoommates]);

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this home?')) return;
    setLeaving(true);
    setError('');
    try {
      await client.delete(`/homes/${homeId}/leave`, { data: { user_id: currentUser.id } });
      window.location.href = '/login';
    } catch (err) {
      if (err.response?.status === 400) {
        setError('You are the last member and cannot leave.');
      } else {
        setError(err.response?.data?.error || 'Could not leave home.');
      }
      setLeaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">👥 Roommates</h1>
          <p className="page-subtitle">Everyone living in this home</p>
        </div>
        <div style={{ display: 'flex', gap: '.75rem' }}>
          <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
            + Invite roommate
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLeave} disabled={leaving}>
            Leave home
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading roommates…</p>
      ) : roommates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏠</div>
          <p className="empty-title">No roommates yet</p>
          <p className="empty-text">Invite someone to join your home!</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>You?</th>
              </tr>
            </thead>
            <tbody>
              {roommates.map(r => (
                <tr key={r.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div className="avatar">{(r.name || '?').charAt(0).toUpperCase()}</div>
                      <span className="fw-600">{r.name}</span>
                    </div>
                  </td>
                  <td className="text-muted">{r.email}</td>
                  <td className="text-muted">{r.phone || '—'}</td>
                  <td>
                    {r.id === currentUser?.id && (
                      <span className="badge badge-purple">You</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showInvite && (
        <InviteModal
          homeId={homeId}
          inviterId={currentUser?.id}
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            fetchRoommates();
          }}
        />
      )}
    </div>
  );
}
