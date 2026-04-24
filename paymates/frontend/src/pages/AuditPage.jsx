// src/pages/AuditPage.jsx
// UC-13: Audit Expenses and Budget (frontend — previously missing)
// FR-24: Visual representations of expense trends over time
// FR-25: Visual comparison of expenditures against allocated budgets
// FR-26: Key financial metrics and summary reports
// FR-27: Export expense audit reports in CSV / XLSX format

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const PERIOD_OPTIONS = [
  { value: 'this_month',   label: 'This Month' },
  { value: 'last_month',   label: 'Last Month' },
  { value: 'last_3_months',label: 'Last 3 Months' },
  { value: 'last_6_months',label: 'Last 6 Months' },
  { value: 'ytd',          label: 'Year to Date' },
];

// Tiny inline bar chart for trends (pure CSS/SVG — no extra lib needed)
function TrendChart({ trends }) {
  if (!trends || trends.length === 0) return <p className="text-muted">No data for this period.</p>;

  const maxAmount = Math.max(...trends.map(t => t.amount), 1);
  // Aggregate into at most ~30 bars if range is large
  const bars = trends.slice(-30);

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px', minWidth: `${bars.length * 18}px` }}>
        {bars.map((point, i) => {
          const pct = (point.amount / maxAmount) * 100;
          return (
            <div
              key={i}
              title={`${point.date}: $${point.amount.toFixed(2)}`}
              style={{
                flex: 1,
                height: `${Math.max(pct, 2)}%`,
                background: point.is_today
                  ? 'var(--accent)'
                  : point.amount > 0
                  ? 'var(--primary)'
                  : 'var(--surface-3)',
                borderRadius: '4px 4px 0 0',
                minWidth: '10px',
                cursor: 'default',
                transition: 'height 0.3s ease',
                border: point.is_today ? '2px solid var(--border)' : 'none',
              }}
            />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '11px', color: 'var(--text-dim)' }}>
        <span>{bars[0]?.date}</span>
        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>● today</span>
        <span>{bars[bars.length - 1]?.date}</span>
      </div>
    </div>
  );
}

// Donut chart SVG for category breakdown
function DonutChart({ breakdown }) {
  const entries = Object.entries(breakdown || {}).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, v]) => s + v, 0);
  const COLORS = ['#7C5FFF', '#FFD000', '#00D084', '#FF9500', '#FF3B30', '#5AC8FA', '#AF52DE'];

  let cumAngle = -90; // start at top
  const r = 60, cx = 80, cy = 80, strokeWidth = 22;

  const arcs = entries.map(([cat, val], i) => {
    const pct   = val / total;
    const angle = pct * 360;
    const startRad = (cumAngle * Math.PI) / 180;
    const endRad   = ((cumAngle + angle) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(startRad);
    const y1 = cy + r * Math.sin(startRad);
    const x2 = cx + r * Math.cos(endRad);
    const y2 = cy + r * Math.sin(endRad);
    const large = angle > 180 ? 1 : 0;
    cumAngle += angle;
    return { cat, val, pct, x1, y1, x2, y2, large, color: COLORS[i % COLORS.length] };
  });

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
      <svg width="160" height="160" viewBox="0 0 160 160">
        {arcs.map((a, i) => (
          <path
            key={i}
            d={`M ${a.x1} ${a.y1} A ${r} ${r} 0 ${a.large} 1 ${a.x2} ${a.y2}`}
            fill="none"
            stroke={a.color}
            strokeWidth={strokeWidth}
          />
        ))}
        <text x="80" y="76" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
          ${total.toFixed(0)}
        </text>
        <text x="80" y="92" textAnchor="middle" fontSize="10" fill="#666">total</text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {arcs.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: a.color, flexShrink: 0 }} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.cat}</span>
            <span style={{ fontWeight: 600 }}>${a.val.toFixed(2)}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({(a.pct * 100).toFixed(1)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuditPage() {
  const { homeId }      = useParams();
  const { currentUser } = useHome();

  const [period, setPeriod]           = useState('this_month');
  const [summary, setSummary]         = useState(null);
  const [trends, setTrends]           = useState([]);
  const [budgetVsActual, setBva]      = useState(null);
  const [txHistory, setTxHistory]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [exporting, setExporting]     = useState('');
  const [error, setError]             = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [sumRes, trendsRes, bvaRes, histRes] = await Promise.all([
        client.get(`/homes/${homeId}/audit/summary?period=${period}`),
        client.get(`/homes/${homeId}/audit/trends?period=${period}`),
        client.get(`/homes/${homeId}/audit/budget-vs-actual?period=${period}`),
        client.get(`/homes/${homeId}/history?per_page=10`),
      ]);
      setSummary(sumRes.data);
      setTrends(trendsRes.data.trends || []);
      setBva(bvaRes.data);
      setTxHistory(histRes.data.history || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load audit data.');
    } finally {
      setLoading(false);
    }
  }, [homeId, period]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleExport = async (fmt) => {
    setExporting(fmt);
    try {
      const url = `/api/homes/${homeId}/audit/export/${fmt}?period=${period}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `paymates_audit.${fmt}`;
      a.click();
    } catch {
      setError('Export failed. Please try again.');
    } finally {
      setTimeout(() => setExporting(''), 1500);
    }
  };

  return (
    <div className="main-content">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit & Reports</h1>
          <p className="page-subtitle">Financial overview and export tools</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleExport('csv')}
            disabled={!!exporting}
            style={{ fontSize: '13px' }}
          >
            {exporting === 'csv' ? 'Exporting…' : '⬇ Export CSV'}
          </button>
          <button
            className="btn btn-success"
            onClick={() => handleExport('xlsx')}
            disabled={!!exporting}
            style={{ fontSize: '13px' }}
          >
            {exporting === 'xlsx' ? 'Exporting…' : '⬇ Export XLSX'}
          </button>
        </div>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`btn btn-sm ${period === opt.value ? 'btn-primary' : 'btn-secondary'}`}
            style={{ fontSize: '12px' }}
            onClick={() => setPeriod(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {loading ? (
        <p className="text-muted">Loading audit data…</p>
      ) : (
        <>
          {/* FR-26 — Summary metric cards */}
          {summary && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Total Spending', value: `$${summary.total_spending?.toFixed(2) || '0.00'}`, color: 'var(--accent)' },
                { label: 'Budget Used', value: budgetVsActual?.total_budget > 0
                    ? `${Math.round((budgetVsActual.total_spent / budgetVsActual.total_budget) * 100)}%`
                    : '—',
                  color: 'var(--warning)' },
                { label: 'Top Category', value: summary.top_category || '—', sub: summary.top_category ? `$${summary.top_category_amount?.toFixed(2)} · ${summary.top_category_pct}%` : '' },
                { label: 'Total Expenses', value: `${(summary.total_bills || 0) + (summary.total_expenses || 0)}`, sub: `${summary.total_bills || 0} bills · ${summary.total_expenses || 0} expenses` },
              ].map((card, i) => (
                <div key={i} className="card" style={{ flex: 1, minWidth: '160px' }}>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.4rem' }}>{card.label}</p>
                  <p style={{ fontSize: '26px', fontWeight: 700, color: card.color || 'var(--text)', lineHeight: 1.2 }}>{card.value}</p>
                  {card.sub && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{card.sub}</p>}
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {/* FR-24 — Expense trend chart */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '1rem' }}>
                📈 Expense Trend
                <span style={{ fontWeight: 400, fontSize: '12px', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                  Daily spending
                </span>
              </h3>
              <TrendChart trends={trends} />
            </div>

            {/* FR-26 — Category donut */}
            <div className="card">
              <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '1rem' }}>
                🥧 Top Expense Categories
              </h3>
              {summary?.category_breakdown && Object.keys(summary.category_breakdown).length > 0 ? (
                <DonutChart breakdown={summary.category_breakdown} />
              ) : (
                <p className="text-muted">No categorised expenses this period.</p>
              )}
            </div>
          </div>

          {/* FR-25 — Budget vs. Actual */}
          {budgetVsActual && budgetVsActual.rows?.length > 0 && (
            <div className="card" style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '15px' }}>💼 Budget vs. Actual</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Total budget: ${budgetVsActual.total_budget?.toFixed(2)}
                  {budgetVsActual.over_budget_count > 0 && (
                    <span style={{ color: 'var(--error)', marginLeft: '0.5rem' }}>
                      · {budgetVsActual.over_budget_count} over budget
                    </span>
                  )}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {budgetVsActual.rows.map((row, i) => {
                  const pct = row.budget_amount > 0 ? Math.min((row.actual_spent / row.budget_amount) * 100, 100) : 0;
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 600 }}>{row.category}</span>
                        <span>
                          <span style={{ color: row.over_budget ? 'var(--error)' : 'var(--text)', fontWeight: 600 }}>
                            ${row.actual_spent.toFixed(2)}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}> / ${row.budget_amount.toFixed(2)}</span>
                          {row.over_budget && (
                            <span style={{ color: 'var(--error)', marginLeft: '6px', fontSize: '11px' }}>▲ Over</span>
                          )}
                        </span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${pct}%`,
                          background: row.over_budget ? 'var(--error)' : pct > 80 ? 'var(--warning)' : 'var(--success)',
                          borderRadius: '99px',
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Transaction history table */}
          {txHistory.length > 0 && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontWeight: 700, fontSize: '15px' }}>🧾 Transaction History</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Recent resolved payments</span>
              </div>
              <div className="table-wrap" style={{ margin: 0 }}>
                <table>
                  <thead>
                    <tr>
                      <th>DESCRIPTION</th>
                      <th>CATEGORY</th>
                      <th>DATE</th>
                      <th>PAID BY</th>
                      <th style={{ textAlign: 'right' }}>AMOUNT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {txHistory.map((rec, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 600 }}>{rec.source_title}</td>
                        <td>
                          {rec.source_category ? (
                            <span className="badge badge-blue">{rec.source_category}</span>
                          ) : (
                            <span className={`badge ${rec.source_type === 'bill' ? 'badge-orange' : 'badge-blue'}`}>
                              {rec.source_type === 'bill' ? 'Bill' : 'Expense'}
                            </span>
                          )}
                        </td>
                        <td className="text-muted">{rec.due_date || '—'}</td>
                        <td>{rec.user_name}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                          ${rec.amount?.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
