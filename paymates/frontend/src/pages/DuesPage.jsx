// src/pages/DuesPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

function CheckIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="var(--success)" strokeWidth="3"/>
      <polyline points="14,25 21,32 35,17" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function BillBadgeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
      <rect x="1" y="1.5" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <line x1="3" y1="4.5" x2="9" y2="4.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
      <line x1="3" y1="7" x2="7" y2="7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function ExpenseBadgeIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ verticalAlign: 'middle', marginRight: '3px' }}>
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <circle cx="6" cy="6" r="1.2" fill="currentColor"/>
    </svg>
  );
}

export default function DuesPage() {
  const { homeId }       = useParams();
  const { currentUser }  = useHome();

  const [dues, setDues]             = useState([]);
  const [summary, setSummary]       = useState({ total_pending: 0, total_paid: 0 });
  const [roommates, setRoommates]   = useState([]);
  const [statusFilter, setStatus]   = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [toggling, setToggling]     = useState('');

  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => {
        setRoommates(r.data.roommates);
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
        total_pending: res.data.total_pending || 0,
        total_paid:    res.data.total_paid || 0,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load dues.');
    } finally {
      setLoading(false);
    }
  }, [homeId, statusFilter, userFilter]);

  useEffect(() => { fetchDues(); }, [fetchDues]);

  const handleToggle = async (due) => {
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
  const totalOwed = summary.total_pending;

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dues</h1>
          <p className="page-subtitle">What you owe and what's owed to you</p>
        </div>
        {totalOwed > 0 && (
          <div
            style={{
              background: 'var(--warning)',
              color: 'white',
              padding: '0.85rem 1.75rem',
              borderRadius: 'var(--r)',
              border: '3px solid var(--border)',
              fontWeight: 700,
              fontSize: '20px',
              boxShadow: '4px 4px 0 rgba(0,0,0,1)',
            }}
          >
            Total Owed: ${totalOwed.toFixed(2)}
          </div>
        )}
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: '180px', background: 'rgba(255,149,0,0.08)', border: '2px solid var(--warning)' }}>
          <p style={{ fontSize: '12px', color: 'var(--warning)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>PENDING</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--warning)' }}>${summary.total_pending.toFixed(2)}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '180px', background: 'rgba(0,208,132,0.08)', border: '2px solid var(--success)' }}>
          <p style={{ fontSize: '12px', color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>PAID</p>
          <p style={{ fontSize: '32px', fontWeight: 700, color: 'var(--success)' }}>${summary.total_paid.toFixed(2)}</p>
        </div>
        <div className="card" style={{ flex: 1, minWidth: '180px' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>TOTAL</p>
          <p style={{ fontSize: '32px', fontWeight: 700 }}>${(summary.total_pending + summary.total_paid).toFixed(2)}</p>
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Filters */} 
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
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

        <select
          className="form-select"
          style={{ width: '220px' }}
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

      
      {loading ? (
        <p className="text-muted">Loading dues…</p>
      ) : dues.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><CheckIcon /></div>
          <p className="empty-title">
            {statusFilter || userFilter ? 'No dues found' : 'All settled up!'}
          </p>
          <p className="text-muted">
            {statusFilter || userFilter
              ? 'Try adjusting your filters.'
              : 'You do not owe anyone right now.'}
          </p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>ROOMMATE</th>
                <th>SOURCE</th>
                <th>TYPE</th>
                <th>DUE DATE</th>
                <th style={{ textAlign: 'right' }}>AMOUNT</th>
                <th>STATUS</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dues.map((due) => {
                const own = isOwnDue(due);
                const statusColor = due.status === 'done' ? 'var(--success)' : 'var(--warning)';
                
                return (
                  <tr key={due.id} style={{ opacity: due.status === 'done' ? 0.65 : 1 }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                          {(due.user_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>
                            {due.user_name}
                            {own && (
                              <span className="badge" style={{ marginLeft: '0.5rem', background: 'var(--accent)', color: 'white', fontSize: '10px' }}>
                                YOU
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{due.user_email}</div>
                        </div>
                      </div>
                    </td>

                    <td style={{ fontWeight: 600, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {due.source_title}
                    </td>

                    <td>
                      <span className={`badge ${due.source_type === 'bill' ? 'badge-orange' : 'badge-blue'}`}>
                        {due.source_type === 'bill' ? <><BillBadgeIcon /> BILL</> : <><ExpenseBadgeIcon /> EXPENSE</>}
                      </span>
                    </td>

                    <td className="text-muted">{due.due_date || '—'}</td>

                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                      ${due.amount.toFixed(2)}
                    </td>

                    <td>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '50px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: due.status === 'done' ? 'rgba(0,208,132,0.12)' : 'rgba(255,149,0,0.12)',
                        border: `2px solid ${statusColor}`,
                        color: statusColor,
                        textTransform: 'uppercase',
                      }}>
                        {due.status === 'done' ? '✓ PAID' : '⏳ PENDING'}
                      </span>
                    </td>

                    <td>
                      {own ? (
                        <button
                          className={`btn btn-sm ${due.status === 'done' ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => handleToggle(due)}
                          disabled={toggling === due.id}
                          style={{ minWidth: '100px', fontSize: '12px' }}
                        >
                          {toggling === due.id
                            ? '…'
                            : due.status === 'done'
                            ? 'MARK UNPAID'
                            : 'MARK PAID'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>—</span>
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