// src/components/BillSplitPanel.jsx
// Use Case: UC04 — FR-11 (evenly), FR-12 (by item), FR-13 (fixed amount).
// Renders the split-type selector and the appropriate controls for each strategy.

import React from 'react';

const SPLIT_TYPES = [
  { value: 'evenly',       label: '⚖️ Split evenly' },
  { value: 'by_item',      label: '📦 By item' },
  { value: 'fixed_amount', label: '🔒 Fixed amount' },
];

export default function BillSplitPanel({
  splitType, onSplitTypeChange,
  roommates, assignedRoommates, onAssignedChange,
  total, fixedAmounts, onFixedAmountsChange,
  lineItems, onItemOwnersChange,
}) {
  const toggleAssigned = (uid) => {
    if (assignedRoommates.includes(uid)) {
      onAssignedChange(assignedRoommates.filter(id => id !== uid));
    } else {
      onAssignedChange([...assignedRoommates, uid]);
    }
  };

  const fixedSum = Object.values(fixedAmounts).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const fixedDiff = Math.abs(fixedSum - total);

  return (
    <div>
      {/* Split type radio buttons */}
      <div style={{ marginBottom: '1.25rem' }}>
        <p style={{ fontSize: 13, color: '#94a3b8', fontWeight: 600, marginBottom: '.6rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Split method
        </p>
        <div className="split-radio-group">
          {SPLIT_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              className={`split-radio${splitType === t.value ? ' active' : ''}`}
              onClick={() => onSplitTypeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── FR-11 — Split evenly ── */}
      {splitType === 'evenly' && (
        <div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: '.75rem' }}>
            Select who shares this bill:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.75rem' }}>
            {roommates.map(r => (
              <label key={r.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={assignedRoommates.includes(r.id)}
                  onChange={() => toggleAssigned(r.id)}
                />
                <span>{r.name}</span>
                <span style={{ color: '#64748b', fontSize: 12 }}>({r.email})</span>
              </label>
            ))}
          </div>
          {assignedRoommates.length > 0 && (
            <div style={{ padding: '.75rem', background: '#252540', borderRadius: 8, fontSize: 14 }}>
              Each owes:{' '}
              <strong style={{ color: '#a78bfa' }}>
                ${(total / assignedRoommates.length).toFixed(2)}
              </strong>
              {' '}({assignedRoommates.length} people)
            </div>
          )}
        </div>
      )}

      {/* ── FR-12 — Split by item ── */}
      {splitType === 'by_item' && (
        <div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: '.75rem' }}>
            Assign owners to each line item:
          </p>
          {lineItems.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 13 }}>Add line items above first.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 8, overflow: 'hidden', border: '1px solid #2d2d4a' }}>
              {lineItems.map((item, idx) => {
                const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div key={idx} style={{ padding: '.875rem 1rem', background: '#1c1c2e', borderBottom: '1px solid #2d2d4a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
                      <span className="fw-600" style={{ fontSize: 14 }}>{item.name || `Item ${idx + 1}`}</span>
                      <span style={{ color: '#a78bfa', fontSize: 14 }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.4rem' }}>
                      {roommates.map(r => {
                        const owners = item.ownerIds || [];
                        const checked = owners.includes(r.id);
                        return (
                          <label key={r.id} style={{
                            display: 'flex', alignItems: 'center', gap: 5,
                            padding: '3px 10px', borderRadius: 999, fontSize: 12,
                            cursor: 'pointer', fontWeight: 500,
                            background: checked ? 'rgba(124,58,237,.2)' : '#252540',
                            border: `1px solid ${checked ? '#7c3aed' : '#2d2d4a'}`,
                            color: checked ? '#a78bfa' : '#94a3b8',
                          }}>
                            <input
                              type="checkbox"
                              style={{ display: 'none' }}
                              checked={checked}
                              onChange={() => {
                                const next = checked
                                  ? owners.filter(id => id !== r.id)
                                  : [...owners, r.id];
                                onItemOwnersChange(idx, next);
                              }}
                            />
                            {r.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* Running subtotal per roommate */}
          {roommates.length > 0 && (
            <div style={{ marginTop: '.75rem', padding: '.75rem', background: '#252540', borderRadius: 8 }}>
              {roommates.map(r => {
                const owes = lineItems.reduce((sum, item) => {
                  const owners = item.ownerIds || [];
                  if (!owners.includes(r.id)) return sum;
                  const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                  return sum + subtotal / owners.length;
                }, 0);
                return owes > 0 ? (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '3px 0' }}>
                    <span style={{ color: '#94a3b8' }}>{r.name}</span>
                    <span style={{ color: '#a78bfa', fontWeight: 600 }}>${owes.toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── FR-13 — Fixed amounts ── */}
      {splitType === 'fixed_amount' && (
        <div>
          <p style={{ fontSize: 13, color: '#94a3b8', marginBottom: '.75rem' }}>
            Enter each person's fixed share (must sum to bill total):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.5rem', marginBottom: '.75rem' }}>
            {roommates.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                <label className="checkbox-row" style={{ flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={assignedRoommates.includes(r.id)}
                    onChange={() => {
                      toggleAssigned(r.id);
                      if (assignedRoommates.includes(r.id)) {
                        const next = { ...fixedAmounts };
                        delete next[r.id];
                        onFixedAmountsChange(next);
                      }
                    }}
                  />
                  <span>{r.name}</span>
                </label>
                {assignedRoommates.includes(r.id) && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                    style={{ width: 100 }}
                    value={fixedAmounts[r.id] ?? ''}
                    onChange={e => onFixedAmountsChange({ ...fixedAmounts, [r.id]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{
            padding: '.75rem', borderRadius: 8,
            background: fixedDiff > 0.01 ? '#450a0a' : '#052e16',
            border: `1px solid ${fixedDiff > 0.01 ? '#b91c1c' : '#166534'}`,
            fontSize: 13,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Assigned total</span>
              <strong style={{ color: fixedDiff > 0.01 ? '#fca5a5' : '#86efac' }}>
                ${fixedSum.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span>Bill total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            {fixedDiff > 0.01 && (
              <p style={{ color: '#fca5a5', marginTop: 6 }}>
                ⚠ Amounts must sum to ${total.toFixed(2)} (off by ${fixedDiff.toFixed(2)})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
