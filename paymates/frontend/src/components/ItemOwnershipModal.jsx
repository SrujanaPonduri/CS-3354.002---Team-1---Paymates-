// src/components/ItemOwnershipModal.jsx

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

function KeyIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
      <circle cx="5.5" cy="5.5" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 8L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M13 9L15 11L12 14L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function ItemOwnershipModal({ item, currentUserId, allRoommates, onClose, onUpdate }) {
  const [owners, setOwners]           = useState([...(item.owners || [])]);
  const [newOwnerId, setNewOwnerId]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const nonOwners = allRoommates.filter(r => !owners.includes(r.id));
  const ownerObjects = owners.map(uid => allRoommates.find(r => r.id === uid) || { id: uid, name: uid });

  const handleRemove = async (ownerId) => {
    if (owners.length <= 1) {
      setError('An item must have at least one owner.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await client.delete(`/items/${item.id}/owners/${ownerId}`, {
        data: { requester_id: currentUserId },
      });
      const next = owners.filter(id => id !== ownerId);
      setOwners(next);
      onUpdate();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only current owners can manage ownership.');
      } else if (err.response?.status === 400) {
        setError('An item must have at least one owner.');
      } else {
        setError(err.response?.data?.error || 'Failed to remove owner.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newOwnerId) return;
    setError('');
    setLoading(true);
    try {
      await client.post(`/items/${item.id}/owners`, {
        requester_id: currentUserId,
        new_owner_id: newOwnerId,
      });
      setOwners(prev => [...prev, newOwnerId]);
      setNewOwnerId('');
      onUpdate();
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Only current owners can manage ownership.');
      } else if (err.response?.status === 409) {
        setError('That person is already an owner.');
      } else {
        setError(err.response?.data?.error || 'Failed to add owner.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title"><KeyIcon /> Manage Ownership</h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          <strong style={{ color: 'var(--text)' }}>{item.name}</strong> · {item.category}
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Current owners */}
        <div style={{ marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.85rem', fontWeight: 700 }}>
            Current owners
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
            {ownerObjects.map(owner => (
              <div key={owner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.85rem 1rem', background: 'var(--surface-2)', border: '2px solid var(--border-light)', borderRadius: 'var(--r)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="avatar">{(owner.name || '?').charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: 14, fontWeight: 600 }}>{owner.name}</span>
                  {owner.id === currentUserId && (
                    <span className="badge badge-purple" style={{ fontSize: 10 }}>You</span>
                  )}
                </div>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleRemove(owner.id)}
                  disabled={loading || owners.length <= 1}
                  title={owners.length <= 1 ? 'Cannot remove last owner' : 'Remove owner'}
                >
                  REMOVE
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add new owner */}
        {nonOwners.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.85rem', fontWeight: 700 }}>
              Add owner
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select
                className="form-select"
                value={newOwnerId}
                onChange={e => setNewOwnerId(e.target.value)}
              >
                <option value="">Select roommate…</option>
                {nonOwners.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
              <button
                className="btn btn-success"
                onClick={handleAdd}
                disabled={loading || !newOwnerId}
              >
                ADD
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>DONE</button>
        </div>
      </div>
    </div>
  );
}