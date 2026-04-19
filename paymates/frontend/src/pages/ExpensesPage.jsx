// src/pages/ExpensesPage.jsx


// src/pages/ExpensesPage.jsx
// Updated design - PageNav now in RequireAuth

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

export default function ExpensesPage() {
  const { homeId }                = useParams();
  const navigate                  = useNavigate();
  const [expenses, setExpenses]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/homes/${homeId}/expenses`);
      setExpenses(res.data.expenses);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Shared recurring and one-time costs</p>
        </div>
        <button
          className="btn btn-success"
          onClick={() => navigate(`/homes/${homeId}/expenses/new`)}
        >
          + NEW EXPENSE
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading expenses…</p>
      ) : expenses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">💰</div>
          <p className="empty-title">No expenses yet</p>
          <p className="text-muted">Track recurring bills like rent or one-time shared costs.</p>
        </div>
      ) : (
        <div className="card-grid">
          {expenses.map((e) => (
            <div key={e.id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span className={`badge ${e.expense_type === 'recurring' ? 'badge-orange' : 'badge-blue'}`}>
                  {e.expense_type === 'recurring' ? '🔁 RECURRING' : '⚡ ONE-TIME'}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => navigate(`/homes/${homeId}/expenses/${e.id}/edit`)}
                >
                  EDIT →
                </button>
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '0.5rem' }}>{e.title}</h3>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--accent)', marginBottom: '0.75rem' }}>
                ${parseFloat(e.amount).toFixed(2)}
              </p>
              {e.expense_type === 'recurring' && e.next_due_date && (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Next due: <strong>{e.next_due_date}</strong>
                  {e.frequency && ` · ${e.frequency}`}
                </p>
              )}
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                {e.assigned_to?.length ?? 0} roommates · starts {e.start_date}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}