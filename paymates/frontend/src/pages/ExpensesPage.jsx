// src/pages/ExpensesPage.jsx
// Use Case: UC05 — FR-07: view all shared expenses for the home.

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function ExpensesPage() {
  const { homeId }              = useParams();
  const navigate                = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await client.get(`/homes/${homeId}/expenses`);
        setExpenses(res.data.expenses);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load expenses.');
      } finally {
        setLoading(false);
      }
    })();
  }, [homeId]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">💸 Expenses</h1>
          <p className="page-subtitle">Shared recurring and one-time costs</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate(`/homes/${homeId}/expenses/new`)}>
          + Add expense
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading expenses…</p>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💸</div>
          <p className="empty-title">No expenses yet</p>
          <p className="empty-text">Track recurring bills like rent or one-time shared costs.</p>
        </div>
      ) : (
        <div className="card-grid">
          {expenses.map(e => (
            <div key={e.id} className="card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '.75rem' }}>
                <span className={`badge ${e.expense_type === 'recurring' ? 'badge-orange' : 'badge-blue'}`}>
                  {e.expense_type === 'recurring' ? '🔁 Recurring' : '⚡ One-time'}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/homes/${homeId}/expenses/${e.id}/edit`)}
                  style={{ fontSize: 12 }}
                >
                  Edit →
                </button>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{e.title}</h3>
              <p style={{ fontSize: 26, fontWeight: 700, color: '#a78bfa', marginBottom: '.5rem' }}>
                ${parseFloat(e.amount).toFixed(2)}
              </p>
              {e.expense_type === 'recurring' && e.next_due_date && (
                <p style={{ fontSize: 12, color: '#64748b' }}>
                  Next due: <strong style={{ color: '#94a3b8' }}>{e.next_due_date}</strong>
                  {e.frequency && ` · ${e.frequency}`}
                </p>
              )}
              <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                {e.assigned_to?.length ?? 0} roommates · starts {e.start_date}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
