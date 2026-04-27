// src/pages/RoommatesPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import InviteModal from '../components/InviteModal.jsx';

function EmptyRoommatesIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="16" cy="15" r="8" stroke="var(--text-muted)" strokeWidth="2.5"/>
      <path d="M2 39C2 30.1634 9.16344 23 18 23C26.8366 23 34 30.1634 34 39" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="34" cy="15" r="6" stroke="var(--text-muted)" strokeWidth="2"/>
      <path d="M30 30H40L42 36H28L30 30Z" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="18" y1="11" x2="18" y2="19" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="14" y1="15" x2="22" y2="15" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

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
      window.location.href = '/homes';
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
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Roommates</h1>
          <p className="page-subtitle">Everyone living in this home</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button className="btn btn-success" onClick={() => setShowInvite(true)}>
            + INVITE
          </button>
          <button
            className="btn btn-danger"
            onClick={handleLeave}
            disabled={leaving}
          >
            LEAVE HOME
          </button>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading roommates…</p>
      ) : roommates.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><EmptyRoommatesIcon /></div>
          <p className="empty-title">No roommates yet</p>
          <p className="text-muted">Invite someone to join your home!</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
              </tr>
            </thead>
            <tbody>
              {roommates.map((rm) => (
                <tr key={rm.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="avatar">
                        {(rm.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600 }}>{rm.name}</div>
                        {rm.id === currentUser?.id && (
                          <span
                            className="badge"
                            style={{
                              background: 'var(--success)',
                              color: 'white',
                              marginTop: '0.25rem',
                            }}
                          >
                            YOU
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>{rm.email}</td>
                  <td>{rm.phone || '—'}</td>
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