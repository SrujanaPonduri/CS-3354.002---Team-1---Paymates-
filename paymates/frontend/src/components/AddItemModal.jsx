// src/components/AddItemModal.jsx
// Use Case: UC08 — FR-32: add a new item to the household inventory.
// The item is automatically owned by addedByUserId (the person adding it).

import React, { useState } from 'react';
import client from '../api/client.js';
import ErrorBanner from './ErrorBanner.jsx';

const CATEGORIES = ['Groceries', 'Furniture', 'Supplies', 'Electronics', 'Appliances', 'Other'];

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
    if (!name.trim()) { setError('Item name is required.'); return; }
    if (parseFloat(quantity) <= 0) { setError('Quantity must be greater than zero.'); return; }
    setError('');
    setLoading(true);
    try {
      // The new item is automatically owned by addedByUserId — see backend route
      await client.post(`/homes/${homeId}/items`, {
        added_by:    addedByUserId,
        name:        name.trim(),
        category,
        quantity:    parseFloat(quantity) || 1,
        unit_price:  parseFloat(unitPrice) || 0,
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
        <h2 className="modal-title">📦 Add Inventory Item</h2>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Item name *</label>
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
            <label className="form-label">Category</label>
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Quantity *</label>
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
              <label className="form-label">Unit price ($)</label>
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
            <label className="form-label">Purchase date</label>
            <input
              className="form-input"
              type="date"
              value={purchasedOn}
              onChange={e => setPurchasedOn(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Adding…' : 'Add item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
