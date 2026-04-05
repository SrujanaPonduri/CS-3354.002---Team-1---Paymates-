// src/pages/InventoryPage.jsx
// Use Case: UC07 + UC08 — FR-18, FR-19, FR-32, FR-33, FR-34
// View, search, filter, and manage ownership of shared household inventory.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import AddItemModal from '../components/AddItemModal.jsx';
import ItemOwnershipModal from '../components/ItemOwnershipModal.jsx';

const CATEGORIES = ['', 'Groceries', 'Furniture', 'Supplies', 'Electronics', 'Appliances', 'Other'];

export default function InventoryPage() {
  const { homeId }              = useParams();
  const { currentUser }         = useHome();
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [roommates, setRoommates] = useState([]);
  const [search, setSearch]     = useState('');
  const [category, setCategory] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState(null);
  const debounceRef             = useRef(null);

  const fetchItems = useCallback(async (q = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.search)   params.set('search', q.search);
      if (q.category) params.set('category', q.category);
      if (q.owner_id) params.set('owner_id', q.owner_id);
      const res = await client.get(`/homes/${homeId}/items?${params}`);
      setItems(res.data.items);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  // Load roommates for owner dropdown
  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => setRoommates(r.data.roommates))
      .catch(() => {});
  }, [homeId]);

  // Debounced re-fetch whenever filters change (300 ms on search)
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchItems({ search, category, owner_id: ownerFilter }),
      search ? 300 : 0
    );
    return () => clearTimeout(debounceRef.current);
  }, [search, category, ownerFilter, fetchItems]);

  const ownerInitials = (item) =>
    (item.owners || []).map(uid => {
      const r = roommates.find(r => r.id === uid);
      return r ? r.name.charAt(0).toUpperCase() : '?';
    });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">📦 Inventory</h1>
          <p className="page-subtitle">{total} item{total !== 1 ? 's' : ''} in this home</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + Add item
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="search-bar" style={{ flex: 1, minWidth: 180 }}>
          <input
            className="form-input"
            placeholder="Search items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="form-select" style={{ width: 160 }} value={category} onChange={e => setCategory(e.target.value)}>
          {CATEGORIES.map(c => <option key={c} value={c}>{c || 'All categories'}</option>)}
        </select>
        <select className="form-select" style={{ width: 160 }} value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)}>
          <option value="">All owners</option>
          {roommates.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-muted">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-title">{search || category || ownerFilter ? 'No matching items' : 'No items yet'}</p>
          <p className="empty-text">{search || category || ownerFilter ? 'Try adjusting your filters.' : 'Add your first household item!'}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Unit price</th>
                <th>Owners</th>
                <th>Purchased</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id}>
                  <td className="fw-600">{item.name}</td>
                  <td>
                    {item.category
                      ? <span className="badge badge-blue">{item.category}</span>
                      : <span className="text-dim">—</span>}
                  </td>
                  <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                  <td style={{ textAlign: 'right', color: '#a78bfa' }}>
                    ${parseFloat(item.unit_price).toFixed(2)}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {ownerInitials(item).map((init, i) => (
                        <div key={i} className="avatar" title={(roommates.find(r => r.id === item.owners[i]) || {}).name}>
                          {init}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="text-muted text-sm">{item.purchased_on || '—'}</td>
                  <td>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => setSelected(item)}
                    >
                      Manage owners
                    </button>
                  </td>
                </tr>
              ))}
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
            fetchItems({ search, category, owner_id: ownerFilter });
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
            fetchItems({ search, category, owner_id: ownerFilter });
            // Refresh selected item details from the updated list
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}
