// src/pages/BillsPage.jsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import ErrorBanner from '../components/ErrorBanner.jsx';

function EmptyBillsIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <rect x="8" y="8" width="32" height="36" rx="3" stroke="var(--text-muted)" strokeWidth="2.5"/>
      <line x1="14" y1="18" x2="34" y2="18" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="25" x2="30" y2="25" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
      <line x1="14" y1="32" x2="26" y2="32" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export default function BillsPage() {
  const { homeId }            = useParams();
  const navigate              = useNavigate();
  const [bills, setBills]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchBills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(`/homes/${homeId}/bills`);
      setBills(res.data.bills);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load bills.');
    } finally {
      setLoading(false);
    }
  }, [homeId]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bills</h1>
          <p className="page-subtitle">Track and split shared bills</p>
        </div>
        <button
          className="btn btn-success"
          onClick={() => navigate(`/homes/${homeId}/bills/new`)}
        >
          + NEW BILL
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading bills…</p>
      ) : bills.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><EmptyBillsIcon /></div>
          <p className="empty-title">No bills yet</p>
          <p className="text-muted">Create one to start splitting costs.</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>TITLE</th>
                <th>DATE</th>
                <th>CATEGORY</th>
                <th style={{ textAlign: 'right' }}>TOTAL</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr key={bill.id}>
                  <td style={{ fontWeight: 600 }}>{bill.title}</td>
                  <td>{bill.date}</td>
                  <td>{bill.category || '—'}</td>
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>
                    ${bill.total?.toFixed(2) || '0.00'}
                  </td>
                  <td>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => navigate(`/homes/${homeId}/bills/${bill.id}/edit`)}
                    >
                      EDIT
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}