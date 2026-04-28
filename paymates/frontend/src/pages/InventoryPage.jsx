// src/pages/InventoryPage.jsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import AddItemModal from '../components/AddItemModal.jsx';
import ItemOwnershipModal from '../components/ItemOwnershipModal.jsx';
import { ITEM_CATEGORIES } from '../constants/categories.js';

const MAIN_CATEGORIES = ['All', 'Groceries', 'Furniture', 'Supplies', 'Electronics', 'Appliances', 'Other'];
const EXTENDED_CATEGORIES = ITEM_CATEGORIES.filter(c => !MAIN_CATEGORIES.includes(c));

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6.5" cy="6.5" r="4.5" stroke="var(--text-dim)" strokeWidth="1.8"/>
      <line x1="10" y1="10" x2="14.5" y2="14.5" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

function EmptyBoxIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="12" width="32" height="28" rx="3" stroke="var(--text-muted)" strokeWidth="2.5"/>
      <path d="M8 12L18 4H30L40 12" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="24" y1="18" x2="24" y2="34" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="18" y1="26" x2="30" y2="26" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

function EmptySearchIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="22" cy="22" r="10" stroke="var(--text-muted)" strokeWidth="2.5"/>
      <line x1="30" y1="30" x2="38" y2="38" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="18" y1="22" x2="26" y2="22" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

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
  const { homeId }              = useParams();
  const { currentUser }         = useHome();
  const [items, setItems]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [roommates, setRoommates] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [showAdd, setShowAdd]   = useState(false);
  const [selected, setSelected] = useState(null);
  const [deletingId, setDeletingId] = useState('');

  const [searchQuery, setSearchQuery]         = useState('');
  const [categoryFilter, setCategoryFilter]   = useState('All');
  const [showAllCategories, setShowAllCategories] = useState(false);

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

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setDeletingId(item.id);
    setError('');
    try {
      await client.delete(`/items/${item.id}`, { data: { requester_id: currentUser?.id } });
      setItems(prev => prev.filter(i => i.id !== item.id));
      setTotal(prev => prev - 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete item.');
    } finally {
      setDeletingId('');
    }
  };

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

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '380px' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <SearchIcon />
          </span>
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
              style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '18px', lineHeight: 1 }}
              title="Clear search"
            >×</button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {MAIN_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px', height: '36px' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}

          {/* Extended categories — shown when expanded */}
          {showAllCategories && EXTENDED_CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px', padding: '6px 14px', height: '36px' }}
              onClick={() => setCategoryFilter(cat)}
            >
              {cat}
            </button>
          ))}

          <button
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', height: '36px', color: 'var(--accent)', borderColor: 'var(--accent)', border: '1.5px dashed' }}
            onClick={() => {
              setShowAllCategories(p => !p);
              // If collapsing and an extended category is selected, reset to All
              if (showAllCategories && EXTENDED_CATEGORIES.includes(categoryFilter)) {
                setCategoryFilter('All');
              }
            }}
          >
            {showAllCategories ? '▲ Show less' : '▼ More categories'}
          </button>
        </div>

        {isFiltering && (
          <button className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: 'var(--text-muted)' }} onClick={clearSearch}>
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-muted">Loading inventory…</p>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><EmptyBoxIcon /></div>
          <p className="empty-title">No items yet</p>
          <p className="text-muted">Add items to track what belongs to whom.</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><EmptySearchIcon /></div>
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
                <th style={{ textAlign: 'center' }}>ACTIONS</th>
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
                      {item.category
                        ? <span className="badge badge-blue">{item.category}</span>
                        : <span className="text-dim">—</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 600 }}>
                      ${parseFloat(item.unit_price || 0).toFixed(2)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {ownerRoommates.map((rm, i) => (
                          <div key={i} className="avatar" style={{ width: '28px', height: '28px', fontSize: '11px' }} title={rm.name}>
                            {rm.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                        {ownerRoommates.length === 0 && <span className="text-dim" style={{ fontSize: '13px' }}>—</span>}
                      </div>
                    </td>
                    <td className="text-muted">{item.purchased_on || '—'}</td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setSelected(item)}>
                          MANAGE
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteItem(item)}
                          disabled={deletingId === item.id}
                          title="Delete item"
                        >
                          {deletingId === item.id ? '…' : '✕'}
                        </button>
                      </div>
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