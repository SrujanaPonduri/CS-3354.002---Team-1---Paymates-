// src/pages/InventoryPage.jsx

// src/pages/InventoryPage.jsx
// Updated design - PageNav now in RequireAuth

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import AddItemModal from '../components/AddItemModal.jsx';
import ItemOwnershipModal from '../components/ItemOwnershipModal.jsx';

export default function InventoryPage() {
  const { homeId }            = useParams();
  const { currentUser }       = useHome();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/homes/${homeId}/items`);
      setItems(res.data.items);
      setTotal(res.data.total || res.data.items.length);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => setRoommates(r.data.roommates))
      .catch(() => {});
  }, [homeId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">{total} item{total !== 1 ? 's' : ''} in this home</p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAdd(true)}>
          + ADD ITEM
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-title">No items yet</p>
          <p className="text-muted">Add items to track what belongs to whom.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>NAME</th>
                <th>CATEGORY</th>
                <th style={{ textAlign: 'right' }}>QTY</th>
                <th style={{ textAlign: 'right' }}>UNIT PRICE</th>
                <th>OWNERS</th>
                <th>PURCHASED</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const ownerInitials = (item.owners || []).map((uid) => {
                  const r = roommates.find((r) => r.id === uid);
                  return r ? r.name.charAt(0).toUpperCase() : '?';
                });

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      {item.category ? (
                        <span className="badge badge-blue">{item.category}</span>
                      ) : (
                        <span className="text-dim">—</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                      ${parseFloat(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {ownerInitials.map((init, i) => (
                          <div
                            key={i}
                            className="avatar"
                            style={{ width: '28px', height: '28px', fontSize: '11px' }}
                            title={(roommates.find((r) => r.id === item.owners[i]) || {}).name}
                          >
                            {init}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="text-muted">{item.purchased_on || '—'}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setSelected(item)}
                      >
                        MANAGE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddItemModal
          homeId={homeId}
          addedByUserId={currentUser?.id}
          onClose={() => setShowAdd(false)}
          onSuccess={() => {
            setShowAdd(false);
            fetchItems();
          }}
        />
      )}

      {selected && (
        <ItemOwnershipModal
          item={selected}
          currentUserId={currentUser?.id}
          allRoommates={roommates}
          onClose={() => setSelected(null)}
          onUpdate={() => {
            fetchItems();
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}