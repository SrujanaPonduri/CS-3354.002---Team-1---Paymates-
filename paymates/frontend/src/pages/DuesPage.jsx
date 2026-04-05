// src/pages/DuesPage.jsx
// Use Case: UC06 — FR-15 (dues from bills), FR-16 (dues from expenses),
// FR-21 (filter by status/user), FR-22 (mark paid / revert to pending).

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const STATUS_COLORS = {
  pending: { bg: 'rgba(251,146,60,.12)', border: '#f97316', text: '#fb923c' },
  done:    { bg: 'rgba(74,222,128,.12)', border: '#22c55e', text: '#4ade80' },
};

export default function DuesPage() {
  const { homeId }       = useParams();
  const { currentUser }  = useHome();

  const [dues, setDues]             = useState([]);
  const [summary, setSummary]       = useState({ total_pending: 0, total_paid: 0 });
  const [roommates, setRoommates]   = useState([]);
  const [statusFilter, setStatus]   = useState('');        // ''|'pending'|'done'
  const [userFilter, setUserFilter] = useState('');        // '' = all members
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [toggling, setToggling]     = useState('');        // due_id being toggled

  // Fetch roommates once for the filter dropdown
  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => {
        setRoommates(r.data.roommates);
        // Default: show only current user's dues
        setUserFilter(currentUser?.id || '');
      })
      .catch(() => {});
  }, [homeId, currentUser]);

  const fetchDues = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (userFilter)   params.set('user_id', userFilter);
      const res = await client.get(`/homes/${homeId}/dues?${params}`);
      setDues(res.data.dues);
      setSummary({
        total_pending: res.data.total_pending,
        total_paid:    res.data.total_paid,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dues.');
    } finally {
      setLoading(false);
    }
  }, [homeId, statusFilter, userFilter]);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  // FR-22: toggle a due between pending ↔ done
  const handleToggle = async (due) => {
    // Only the user who owes the due can toggle it
    if (due.user_id !== currentUser?.id) {
      setError('You can only mark your own dues as paid.');
      return;
    }
    setToggling(due.id);
    setError('');
    const newStatus = due.status === 'done' ? 'pending' : 'done';
    try {
      const res = await client.patch(`/dues/${due.id}/status`, {
        user_id: currentUser.id,
        status:  newStatus,
      });
      setDues(prev => prev.map(d => d.id === due.id ? res.data.due : d));
      // Recompute local summary
      setSummary(prev => ({
        total_pending: newStatus === 'done'
          ? prev.total_pending - due.amount
          : prev.total_pending + due.amount,
        total_paid: newStatus === 'done'
          ? prev.total_paid + due.amount
          : prev.total_paid - due.amount,
      }));
    } catch (err) {
      if (err.response?.status === 403) {
        setError('You can only update your own dues.');
      } else {
        setError(err.response?.data?.error || 'Failed to update status.');
      }
    } finally {
      setToggling('');
    }
  };

  const isOwnDue = (due) => due.user_id === currentUser?.id;

  return (
    <div>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">💳 Dues</h1>
          <p className="page-subtitle">Settlement tracking for bills and shared expenses</p>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 160, background: 'rgba(251,146,60,.08)', border: '1px solid rgba(249,115,22,.35)' }}>
          <p style={{ fontSize: 12, color: '#fb923c', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Pending</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#fb923c' }}>${summary.total_pending.toFixed(2)}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 160, background: 'rgba(74,222,128,.08)', border: '1px solid rgba(34,197,94,.35)' }}>
          <p style={{ fontSize: 12, color: '#4ade80', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Paid</p>
          <p style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>${summary.total_paid.toFixed(2)}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: 160 }}>
          <p style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Total</p>
          <p style={{ fontSize: 28, fontWeight: 700 }}>${(summary.total_pending + summary.total_paid).toFixed(2)}</p>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* FR-21 filters */}
      <div style={{ display: 'flex', gap: '.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {/* Status filter */}
        <div style={{ display: 'flex', gap: 4 }}>
          {[['', 'All'], ['pending', 'Pending'], ['done', 'Paid']].map(([val, label]) => (
            <button
              key={val}
              className={`btn btn-sm ${statusFilter === val ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatus(val)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* User filter — FR-21 */}
        <select
          className="form-select"
          style={{ width: 200 }}
          value={userFilter}
          onChange={e => setUserFilter(e.target.value)}
        >
          <option value="">All roommates</option>
          {roommates.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}{r.id === currentUser?.id ? ' (you)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Dues list */}
      {loading ? (
        <p className="text-muted">Loading dues…</p>
      ) : dues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💳</div>
          <p className="empty-title">No dues found</p>
          <p className="empty-text">
            {statusFilter || userFilter
              ? 'Try adjusting your filters.'
              : 'Create a bill or expense — dues are generated automatically.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Roommate</th>
                <th>Source</th>
                <th>Type</th>
                <th>Due date</th>
                <th style={{ textAlign: 'right' }}>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dues.map(due => {
                const sc = STATUS_COLORS[due.status] || STATUS_COLORS.pending;
                const own = isOwnDue(due);
                return (
                  <tr key={due.id} style={{ opacity: due.status === 'done' ? 0.65 : 1 }}>
                    {/* Roommate */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="avatar" style={{ fontSize: 12 }}>
                          {(due.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="fw-600" style={{ fontSize: 14 }}>
                            {due.user_name}
                            {own && <span className="badge badge-purple" style={{ marginLeft: 6, fontSize: 10 }}>You</span>}
                          </div>
                          <div style={{ fontSize: 12, color: '#64748b' }}>{due.user_email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Source bill/expense title */}
                    <td className="fw-600" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {due.source_title}
                    </td>

                    {/* FR-15 vs FR-16 badge */}
                    <td>
                      <span className={`badge ${due.source_type === 'bill' ? 'badge-orange' : 'badge-blue'}`}>
                        {due.source_type === 'bill' ? '🧾 Bill' : '💸 Expense'}
                      </span>
                    </td>

                    <td className="text-muted">{due.due_date || '—'}</td>

                    {/* Amount */}
                    <td style={{ textAlign: 'right', fontWeight: 700, color: '#a78bfa' }}>
                      ${due.amount.toFixed(2)}
                    </td>

                    {/* Status badge */}
                    <td>
                      <span style={{
                        padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      }}>
                        {due.status === 'done' ? '✓ Paid' : '⏳ Pending'}
                      </span>
                    </td>

                    {/* FR-22: toggle action — only available for own dues */}
                    <td>
                      {own ? (
                        <button
                          className={`btn btn-sm ${due.status === 'done' ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => handleToggle(due)}
                          disabled={toggling === due.id}
                          style={{ fontSize: 12, minWidth: 90 }}
                        >
                          {toggling === due.id
                            ? '…'
                            : due.status === 'done'
                            ? 'Mark unpaid'
                            : 'Mark paid ✓'}
                        </button>
                      ) : (
                        <span style={{ fontSize: 12, color: '#475569' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
