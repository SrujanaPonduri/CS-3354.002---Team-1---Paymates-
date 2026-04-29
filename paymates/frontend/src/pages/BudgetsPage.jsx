// src/pages/BudgetsPage.jsx
// UC-12: Create/Manage Budget (frontend)
// FR-04: Add a Budget to a Home
// FR-05: Create Budgets for various categories
// FR-06: Add a balance to a Budget

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

function UsersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
      <circle cx="6" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 14C2 11.7909 3.79086 10 6 10C8.20914 10 10 11.7909 10 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M10.5 11H14L15 14H9.5L10.5 11Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
      <path d="M2 6L8 2L14 6V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M6 14V9H10V14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ verticalAlign: 'middle', marginRight: '4px' }}>
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M5 7V5C5 3.34315 6.34315 2 8 2C9.65685 2 11 3.34315 11 5V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="8" cy="10.5" r="0.8" fill="currentColor"/>
    </svg>
  );
}

function BudgetIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="12" width="32" height="24" rx="4" stroke="var(--primary)" strokeWidth="2.5"/>
      <path d="M32 18H36C38.2091 18 40 19.7909 40 22V26C40 28.2091 38.2091 30 36 30H32" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round"/>
      <circle cx="32" cy="24" r="3" fill="var(--accent)"/>
      <line x1="12" y1="22" x2="24" y2="22" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="27" x2="20" y2="27" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

const VISIBILITY_OPTIONS = [
  { value: 'all',     label: 'All Roommates',  icon: <UsersIcon /> },
  { value: 'group',   label: 'Group',           icon: <HomeIcon /> },
  { value: 'private', label: 'Private',         icon: <LockIcon /> },
];

const CATEGORY_SUGGESTIONS = [
  'Groceries', 'Utilities', 'Dining Out', 'Cleaning Supplies',
  'Entertainment', 'Rent', 'Internet', 'Miscellaneous',
];

function AddBudgetModal({ homeId, creatorId, onClose, onSuccess }) {
  const [category, setCategory]       = useState('');
  const [customCat, setCustomCat]     = useState('');
  const [amount, setAmount]           = useState('');
  const [visibility, setVisibility]   = useState('all');
  const [month, setMonth]             = useState(new Date().getMonth() + 1);
  const [year, setYear]               = useState(new Date().getFullYear());
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const effectiveCategory = category === '__custom__' ? customCat : category;

  const handleSubmit = async () => {
    setError('');
    if (!effectiveCategory.trim()) { setError('Category is required.'); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Amount must be a positive number.'); return; }

    setSaving(true);
    try {
      await client.post(`/homes/${homeId}/budgets`, {
        creator_id:    creatorId,
        category:      effectiveCategory.trim(),
        budget_amount: amt,
        visibility,
        month,
        year,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Add Budget</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <div className="form-group">
          <label className="form-label">Category *</label>
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">Select a category…</option>
            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            <option value="__custom__">+ Custom category</option>
          </select>
          {category === '__custom__' && (
            <input
              className="form-input"
              style={{ marginTop: '0.5rem' }}
              placeholder="Type custom category name"
              value={customCat}
              onChange={e => setCustomCat(e.target.value)}
            />
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Budget Amount ($) *</label>
          <input
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 300.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Year</label>
            <input
              className="form-input"
              type="number"
              min="2020"
              max="2030"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Visibility</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm ${visibility === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setVisibility(opt.value)}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Add Budget'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Edit Budget modal — allows updating amount, visibility, and period
function EditBudgetModal({ budget, onClose, onSuccess }) {
  const [amount, setAmount]         = useState(String(budget.budget_amount || ''));
  const [visibility, setVisibility] = useState(budget.visibility || 'all');
  const [month, setMonth]           = useState(budget.month || new Date().getMonth() + 1);
  const [year, setYear]             = useState(budget.year || new Date().getFullYear());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const handleSubmit = async () => {
    setError('');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { setError('Amount must be a positive number.'); return; }

    setSaving(true);
    try {
      await client.patch(`/budgets/${budget.id}/edit`, {
        budget_amount: amt,
        visibility,
        month,
        year,
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 className="modal-title" style={{ marginBottom: 0 }}>Edit Budget</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <p className="text-muted" style={{ marginBottom: '1rem' }}>
          Editing: <strong>{budget.category}</strong>
        </p>
        <ErrorBanner message={error} onDismiss={() => setError('')} />

        <div className="form-group">
          <label className="form-label">Budget Amount ($) *</label>
          <input
            className="form-input"
            type="number"
            min="0.01"
            step="0.01"
            placeholder="e.g. 300.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Month</label>
            <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
              {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Year</label>
            <input
              className="form-input"
              type="number"
              min="2020"
              max="2030"
              value={year}
              onChange={e => setYear(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Visibility</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {VISIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                className={`btn btn-sm ${visibility === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1 }}
                onClick={() => setVisibility(opt.value)}
              >
                {opt.icon} {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          <button className="btn btn-success" style={{ flex: 1 }} onClick={handleSubmit} disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BudgetsPage() {
  const { homeId }          = useParams();
  const { currentUser }     = useHome();
  const [budgets, setBudgets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [showAdd, setShowAdd]       = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/homes/${homeId}/budgets`);
      setBudgets(res.data.budgets || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load budgets.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const totalBudget  = budgets.reduce((s, b) => s + (b.budget_amount || 0), 0);
  const totalSpent   = budgets.reduce((s, b) => s + (b.current_balance || 0), 0);
  const overCount    = budgets.filter(b => (b.current_balance || 0) > (b.budget_amount || 0)).length;
  const pctUsed      = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets</h1>
          <p className="page-subtitle">{budgets.length} categor{budgets.length !== 1 ? 'ies' : 'y'} this period</p>
        </div>
        <button className="btn btn-success" onClick={() => setShowAdd(true)}>
          + ADD BUDGET
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {budgets.length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div className="card" style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>TOTAL BUDGET</p>
            <p style={{ fontSize: '28px', fontWeight: 700 }}>${totalBudget.toFixed(2)}</p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>TOTAL SPENT</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: totalSpent > totalBudget ? 'var(--error)' : 'var(--accent)' }}>
              ${totalSpent.toFixed(2)}
            </p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>REMAINING</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)' }}>
              ${Math.max(0, totalBudget - totalSpent).toFixed(2)}
            </p>
          </div>
          <div className="card" style={{ flex: 1, minWidth: '160px' }}>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>% USED</p>
            <p style={{ fontSize: '28px', fontWeight: 700, color: pctUsed > 100 ? 'var(--error)' : 'var(--text)' }}>
              {pctUsed}%
            </p>
            {overCount > 0 && (
              <p style={{ fontSize: '11px', color: 'var(--error)', marginTop: '2px' }}>
                {overCount} over budget
              </p>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-muted">Loading budgets…</p>
      ) : budgets.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><BudgetIcon /></div>
          <p className="empty-title">No budgets yet</p>
          <p className="text-muted">Create budgets to track spending by category.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowAdd(true)}>
            + Add First Budget
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {budgets.map((budget) => {
            const spent    = budget.current_balance || 0;
            const limit    = budget.budget_amount || 0;
            const pct      = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
            const over     = spent > limit && limit > 0;
            const visOption = VISIBILITY_OPTIONS.find(v => v.value === budget.visibility);
            const VisIconComponent = visOption?.icon || <UsersIcon />;

            return (
              <div
                key={budget.id}
                className="card"
                style={{
                  border: over ? '2px solid var(--error)' : '2px solid var(--border-light)',
                  background: over ? 'rgba(255,59,48,0.04)' : 'var(--surface)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '16px' }}>{budget.category}</span>
                      <span title={`Visibility: ${budget.visibility}`}>{VisIconComponent}</span>
                      {over && (
                        <span className="badge" style={{ background: 'var(--error)', color: 'white', fontSize: '10px' }}>
                          OVER BUDGET
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {budget.month && budget.year
                        ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][budget.month - 1]} ${budget.year}`
                        : 'No period set'}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 700, fontSize: '18px', color: over ? 'var(--error)' : 'var(--text)' }}>
                      ${spent.toFixed(2)} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '14px' }}>/ ${limit.toFixed(2)}</span>
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {over
                        ? `$${(spent - limit).toFixed(2)} over`
                        : `$${(limit - spent).toFixed(2)} remaining`}
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: '0.75rem', height: '8px', background: 'var(--surface-3)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${Math.min(pct, 100)}%`,
                    background: over ? 'var(--error)' : pct > 80 ? 'var(--warning)' : 'var(--success)',
                    borderRadius: '99px',
                    transition: 'width 0.4s ease',
                  }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', fontSize: '11px', color: 'var(--text-dim)' }}>
                  <span>{Math.round(pct)}% used</span>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '11px', padding: '2px 10px', height: 'auto' }}
                    onClick={() => setEditTarget(budget)}
                  >
                    ✏ Edit Budget
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && (
        <AddBudgetModal
          homeId={homeId}
          creatorId={currentUser?.id}
          onClose={() => setShowAdd(false)}
          onSuccess={() => { setShowAdd(false); fetchBudgets(); }}
        />
      )}

      {editTarget && (
        <EditBudgetModal
          budget={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => { setEditTarget(null); fetchBudgets(); }}
        />
      )}
    </div>
  );
}