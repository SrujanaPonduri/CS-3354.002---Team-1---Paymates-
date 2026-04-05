// src/components/ItemOwnershipModal.jsx
// Use Case: UC07 — FR-19, FR-33, FR-34: add and remove owners on an inventory item.

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

export default function ItemOwnershipModal({ item, currentUserId, allRoommates, onClose, onUpdate }) {
  const [owners, setOwners]           = useState([...(item.owners || [])]);
  const [newOwnerId, setNewOwnerId]   = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const nonOwners = allRoommates.filter(r => !owners.includes(r.id));
  const ownerObjects = owners.map(uid => allRoommates.find(r => r.id === uid) || { id: uid, name: uid });

  const handleRemove = async (ownerId) => {
    // This enforces the UC07 guard: minimum one owner at all times
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
        <h2 className="modal-title">🔑 Manage Ownership</h2>
        <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: '1.25rem' }}>
          <strong style={{ color: '#e2e8f0' }}>{item.name}</strong> · {item.category}
        </p>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        {/* Current owners */}
        <div style={{ marginBottom: '1.25rem' }}>
          <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.6rem' }}>
            Current owners
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem' }}>
            {ownerObjects.map(owner => (
              <div key={owner.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '.6rem .85rem', background: '#252540', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar">{(owner.name || '?').charAt(0).toUpperCase()}</div>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{owner.name}</span>
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
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Add new owner */}
        {nonOwners.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.6rem' }}>
              Add owner
            </p>
            <div style={{ display: 'flex', gap: '.75rem' }}>
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
                className="btn btn-primary"
                onClick={handleAdd}
                disabled={loading || !newOwnerId}
              >
                Add
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
