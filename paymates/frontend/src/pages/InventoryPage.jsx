// src/pages/InventoryPage.jsx
// FR-18: View all items with owners
// FR-19: Search for items (search bar — name, category, owner names)
// FR-32: Add item to inventory list
// FR-33: Search for a specific item in inventory
// FR-34: View the inventory list

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import AddItemModal from '../components/AddItemModal.jsx';
import ItemOwnershipModal from '../components/ItemOwnershipModal.jsx';

const CATEGORIES = ['All', 'Groceries', 'Furniture', 'Supplies', 'Electronics', 'Other'];

// Helper: highlight matching substring
function HighlightMatch({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const q = query.trim().toLowerCase();
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ background: 'var(--primary)', borderRadius: '3px', padding: '0 2px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

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

  // Search & filter state (FR-19 / FR-33)
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');

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

  // Client-side search + category filter
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryFilter !== 'All' && item.category !== categoryFilter) return false;
      if (q) {
        const ownerNames = (item.owners || [])
          .map(uid => (roommates.find(r => r.id === uid) || {}).name || '')
          .join(' ').toLowerCase();
        const haystack = [item.name || '', item.category || '', ownerNames].join(' ').toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [items, searchQuery, categoryFilter, roommates]);

  const isFiltering = searchQuery.trim() !== '' || categoryFilter !== 'All';
  const clearSearch = () => { setSearchQuery(''); setCategoryFilter('All'); };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Inventory</h1>
          <p className="page-subtitle">
            {isFiltering
              ? `${filteredItems.length} of ${total} item${total !== 1 ? 's' : ''} shown`
              : `${total} item${total !== 1 ? 's' : ''} in this home`}
          </p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAdd(true)}>
          + ADD ITEM
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Search bar + category filter (FR-19 / FR-33) */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontSize: '15px', color: 'var(--text-dim)', pointerEvents: 'none',
          }}>🔍</span>
          <input
            className="form-input"
            style={{ paddingLeft: '38px', paddingRight: searchQuery ? '36px' : '12px', height: '42px', fontSize: '14px' }}
            type="text"
            placeholder="Search items, categories, owners…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-dim)', fontSize: '18px', lineHeight: 1,
              }}
              title="Clear search"
            >×</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px', height: '36px' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {isFiltering && (
          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', color: 'var(--text-muted)' }}
            onClick={clearSearch}
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <p className="empty-title">No items yet</p>
          <p className="text-muted">Add items to track what belongs to whom.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔍</div>
          <p className="empty-title">No matching items</p>
          <p className="text-muted">
            {categoryFilter !== 'All' && searchQuery
              ? `No "${categoryFilter}" items matching "${searchQuery}".`
              : categoryFilter !== 'All'
              ? `No items in category "${categoryFilter}".`
              : `No items match "${searchQuery}".`}
          </p>
          <button className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={clearSearch}>
            Clear search
          </button>
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
              {filteredItems.map((item) => {
                const ownerRoommates = (item.owners || [])
                  .map(uid => roommates.find(r => r.id === uid))
                  .filter(Boolean);

                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>
                      <HighlightMatch text={item.name} query={searchQuery} />
                    </td>
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
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {ownerRoommates.map((rm, i) => (
                          <div
                            key={i}
                            className="avatar"
                            style={{ width: '28px', height: '28px', fontSize: '11px' }}
                            title={rm.name}
                          >
                            {rm.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {ownerRoommates.length === 0 && (
                          <span className="text-dim" style={{ fontSize: '13px' }}>—</span>
                        )}
                      </div>
                    </td>
                    <td className="text-muted">{item.purchased_on || '—'}</td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelected(item)}>
                        MANAGE
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {isFiltering && (
            <div style={{ padding: '0.75rem 1rem', borderTop: '1px solid var(--border-light)', fontSize: '13px', color: 'var(--text-muted)' }}>
              Showing {filteredItems.length} of {total} items
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <AddItemModal
          homeId={homeId}
          addedByUserId={currentUser?.id}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchItems(); }}
        />
      )}

      {selected && (
        <ItemOwnershipModal
          item={selected}
          currentUserId={currentUser?.id}
          allRoommates={roommates}
          onClose={() => setSelected(null)}
          onUpdate={() => { fetchItems(); setSelected(null); }}
        />
      )}
    </div>
  );
}