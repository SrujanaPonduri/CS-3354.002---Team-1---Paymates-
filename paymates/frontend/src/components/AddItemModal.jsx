// src/components/AddItemModal.jsx

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';
import { ITEM_CATEGORIES } from '../constants/categories.js';

function BoxIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '6px' }}>
      <path d="M2 5L8 2L14 5L8 8L2 5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M2 5V11L8 14L14 11V5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <line x1="8" y1="8" x2="8" y2="14" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

export default function AddItemModal({ homeId, addedByUserId, onClose, onSuccess }) {
  const [name, setName]               = useState('');
  const [category, setCategory]       = useState('');
  const [quantity, setQuantity]       = useState(1);
  const [unitPrice, setUnitPrice]     = useState('');
  const [purchasedOn, setPurchasedOn] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (addedByUserId == null) { setError('User ID is required.'); return; }
    if (!name.trim()) { setError('Item name is required.'); return; }
    if (parseFloat(quantity) <= 0) { setError('Quantity must be greater than zero.'); return; }
    setError('');
    setLoading(true);
    try {
      await client.post(`/homes/${homeId}/items`, {
        added_by:     addedByUserId,
        name:         name.trim(),
        category,
        quantity:     parseFloat(quantity) || 1,
        unit_price:   parseFloat(unitPrice) || 0,
        purchased_on: purchasedOn,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add item.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2 className="modal-title"><BoxIcon /> Add Inventory Item</h2>
        <ErrorBanner message={error} onDismiss={() => setError('')} />
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">ITEM NAME *</label>
            <input
              className="form-input"
              placeholder="e.g. Whole Milk"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">CATEGORY</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {ITEM_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">QUANTITY *</label>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="any"
                placeholder="1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">UNIT PRICE ($)</label>
              <input
                className="form-input"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={unitPrice}
                onChange={e => setUnitPrice(e.target.value)}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">PURCHASE DATE</label>
            <input
              className="form-input"
              type="date"
              value={purchasedOn}
              onChange={e => setPurchasedOn(e.target.value)}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>CANCEL</button>
            <button type="submit" className="btn btn-success" disabled={loading}>
              {loading ? 'ADDING…' : 'ADD ITEM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
