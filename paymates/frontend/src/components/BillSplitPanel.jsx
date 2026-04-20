// src/components/BillSplitPanel.jsx

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
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700, marginBottom: '.85rem', textTransform: 'uppercase', letterSpacing: '.05em' }}>
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

      {/* ── Split evenly ── */}
      {splitType === 'evenly' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
            Select who shares this bill:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
            {roommates.map(r => (
              <label key={r.id} className="checkbox-row">
                <input
                  type="checkbox"
                  checked={assignedRoommates.includes(r.id)}
                  onChange={() => toggleAssigned(r.id)}
                />
                <span className="fw-600">{r.name}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({r.email})</span>
              </label>
            ))}
          </div>
          {assignedRoommates.length > 0 && (
            <div style={{ padding: '1rem 1.25rem', background: 'var(--surface-2)', border: '2px solid var(--border-light)', borderRadius: 'var(--r)', fontSize: 14 }}>
              Each owes:{' '}
              <strong style={{ color: 'var(--primary-dark)', fontSize: 16 }}>
                ${(total / assignedRoommates.length).toFixed(2)}
              </strong>
              {' '}({assignedRoommates.length} people)
            </div>
          )}
        </div>
      )}

      {/* ── Split by item ── */}
      {splitType === 'by_item' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
            Assign owners to each line item:
          </p>
          {lineItems.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Add line items above first.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 'var(--r)', overflow: 'hidden', border: '2px solid var(--border)' }}>
              {lineItems.map((item, idx) => {
                const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                return (
                  <div key={idx} style={{ padding: '1rem 1.25rem', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-light)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.75rem' }}>
                      <span className="fw-700" style={{ fontSize: 14 }}>{item.name || `Item ${idx + 1}`}</span>
                      <span style={{ color: 'var(--primary-dark)', fontSize: 14, fontWeight: 700 }}>${subtotal.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.5rem' }}>
                      {roommates.map(r => {
                        const owners = item.ownerIds || [];
                        const checked = owners.includes(r.id);
                        return (
                          <label key={r.id} style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '5px 12px', borderRadius: 999, fontSize: 12,
                            cursor: 'pointer', fontWeight: 600,
                            background: checked ? 'var(--primary)' : 'var(--surface)',
                            border: `2px solid ${checked ? 'var(--border)' : 'var(--border-light)'}`,
                            color: checked ? 'var(--primary-dark)' : 'var(--text-muted)',
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
            <div style={{ marginTop: '1rem', padding: '1rem 1.25rem', background: 'var(--surface-2)', border: '2px solid var(--border-light)', borderRadius: 'var(--r)' }}>
              {roommates.map(r => {
                const owes = lineItems.reduce((sum, item) => {
                  const owners = item.ownerIds || [];
                  if (!owners.includes(r.id)) return sum;
                  const subtotal = (parseFloat(item.qty) || 0) * (parseFloat(item.unitPrice) || 0);
                  return sum + subtotal / owners.length;
                }, 0);
                return owes > 0 ? (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{r.name}</span>
                    <span style={{ color: 'var(--primary-dark)', fontWeight: 700 }}>${owes.toFixed(2)}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Fixed amounts ── */}
      {splitType === 'fixed_amount' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 600 }}>
            Enter each person's fixed share (must sum to bill total):
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem', marginBottom: '1rem' }}>
            {roommates.map(r => (
              <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
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
                  <span className="fw-600">{r.name}</span>
                </label>
                {assignedRoommates.includes(r.id) && (
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="form-input"
                    style={{ width: 120 }}
                    value={fixedAmounts[r.id] ?? ''}
                    onChange={e => onFixedAmountsChange({ ...fixedAmounts, [r.id]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{
            padding: '1rem 1.25rem', borderRadius: 'var(--r)',
            background: fixedDiff > 0.01 ? 'var(--error-bg)' : 'rgba(0,208,132,.08)',
            border: `2px solid ${fixedDiff > 0.01 ? 'var(--error-border)' : 'var(--success)'}`,
            fontSize: 13,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Assigned total</span>
              <strong style={{ color: fixedDiff > 0.01 ? 'var(--error)' : 'var(--success)' }}>
                ${fixedSum.toFixed(2)}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              <span>Bill total</span>
              <strong>${total.toFixed(2)}</strong>
            </div>
            {fixedDiff > 0.01 && (
              <p style={{ color: 'var(--error)', marginTop: 8, fontWeight: 600 }}>
                ⚠ Amounts must sum to ${total.toFixed(2)} (off by ${fixedDiff.toFixed(2)})
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}