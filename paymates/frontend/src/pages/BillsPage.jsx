// src/pages/BillsPage.jsx
// Use Case: UC04 — FR-09: view all itemized bills for the home.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

const SPLIT_BADGE = {
  evenly:       { label: 'Evenly',       cls: 'badge-blue' },
  by_item:      { label: 'By item',      cls: 'badge-orange' },
  fixed_amount: { label: 'Fixed amount', cls: 'badge-purple' },
};

export default function BillsPage() {
  const { homeId }          = useParams();
  const navigate            = useNavigate();
  const [bills, setBills]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`/homes/${homeId}/bills`);
        setBills(res.data.bills);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load bills.');
      } finally {
        setLoading(false);
      }
    })();
  }, [homeId]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">🧾 Bills</h1>
          <p className="page-subtitle">Itemized bills split among roommates</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/homes/${homeId}/bills/new`)}>
          + Create bill
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading bills…</p>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🧾</div>
          <p className="empty-title">No bills yet</p>
          <p className="empty-text">Create your first itemized bill to split costs with roommates.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Category</th>
                <th>Split</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map(b => {
                const badge = SPLIT_BADGE[b.split_type] || { label: b.split_type, cls: 'badge-blue' };
                return (
                  <tr key={b.id}>
                    <td className="fw-600">{b.title}</td>
                    <td className="text-muted">{b.date}</td>
                    <td className="text-muted">{b.category || '—'}</td>
                    <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                    <td style={{ textAlign: 'right', fontWeight: 600, color: '#a78bfa' }}>
                      ${b.total?.toFixed(2)}
                    </td>
                    <td>
                      <Link
                        to={`/homes/${homeId}/bills/${b.id}/edit`}
                        style={{ color: '#94a3b8', fontSize: 13, textDecoration: 'none' }}
                      >
                        Edit →
                      </Link>
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
