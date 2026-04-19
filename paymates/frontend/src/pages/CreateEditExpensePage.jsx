// src/pages/CreateEditExpensePage.jsx

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';

const FREQUENCIES = ['weekly', 'monthly', 'yearly'];

function addFrequency(dateStr, freq) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  if (freq === 'weekly')  d.setDate(d.getDate() + 7);
  if (freq === 'monthly') d.setMonth(d.getMonth() + 1);
  if (freq === 'yearly')  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export default function CreateEditExpensePage() {
  const { homeId, expId }   = useParams();
  const navigate             = useNavigate();
  const { currentUser }      = useHome();
  const isEdit               = Boolean(expId);

  const [title, setTitle]                   = useState('');
  const [amount, setAmount]                 = useState('');
  const [expenseType, setExpenseType]       = useState('one_time');
  const [frequency, setFrequency]           = useState('monthly');
  const [startDate, setStartDate]           = useState(new Date().toISOString().split('T')[0]);
  const [assignedTo, setAssignedTo]         = useState([]);
  const [roommates, setRoommates]           = useState([]);
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');

  const nextDuePreview = useMemo(
    () => expenseType === 'recurring' ? addFrequency(startDate, frequency) : null,
    [expenseType, frequency, startDate]
  );

  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => {
        setRoommates(r.data.roommates);
        if (!isEdit) setAssignedTo(r.data.roommates.map(r => r.id));
      })
      .catch(() => {});
  }, [homeId, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    client.get(`/homes/${homeId}/expenses`)
      .then(r => {
        const exp = r.data.expenses.find(e => e.id === expId);
        if (!exp) return;
        setTitle(exp.title);
        setAmount(exp.amount);
        setExpenseType(exp.expense_type);
        setFrequency(exp.frequency || 'monthly');
        setStartDate(exp.start_date);
        setAssignedTo(exp.assigned_to);
      })
      .catch(() => {});
  }, [isEdit, expId, homeId]);

  const toggleAssigned = (uid) => {
    setAssignedTo(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (!amount || parseFloat(amount) <= 0) { setError('Amount must be greater than 0.'); return; }
    if (assignedTo.length === 0) { setError('Select at least one roommate.'); return; }
    setError('');
    setLoading(true);

    const payload = {
      creator_id:   currentUser?.id,
      editor_id:    currentUser?.id,
      title:        title.trim(),
      amount:       parseFloat(amount),
      expense_type: expenseType,
      frequency:    expenseType === 'recurring' ? frequency : undefined,
      start_date:   startDate,
      assigned_to:  assignedTo,
      home_id:      homeId,
    };

    try {
      if (isEdit) {
        await client.put(`/expenses/${expId}`, payload);
      } else {
        await client.post('/expenses', payload);
      }
      navigate(`/homes/${homeId}/expenses`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save expense.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? '✏️ Edit Expense' : '💸 New Expense'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update expense details' : 'Add a shared or recurring cost'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/homes/${homeId}/expenses`)}>
          CANCEL
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Details</h3>

        <div className="form-group">
          <label className="form-label">TITLE *</label>
          <input className="form-input" placeholder="e.g. Monthly Rent" value={title} onChange={e => setTitle(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">AMOUNT ($) *</label>
            <input className="form-input" type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">START DATE</label>
            <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">EXPENSE TYPE</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            {['one_time', 'recurring'].map(t => (
              <label key={t} className="checkbox-row" style={{ cursor: 'pointer' }}>
                <input type="radio" name="expenseType" value={t} checked={expenseType === t} onChange={() => setExpenseType(t)} />
                <span style={{ textTransform: 'capitalize' }}>{t.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
        </div>

        {expenseType === 'recurring' && (
          <div>
            <div className="form-group">
              <label className="form-label">FREQUENCY</label>
              <select className="form-select" value={frequency} onChange={e => setFrequency(e.target.value)}>
                {FREQUENCIES.map(f => (
                  <option key={f} value={f}>{f.charAt(0).toUpperCase() + f.slice(1)}</option>
                ))}
              </select>
            </div>
            {nextDuePreview && (
              <div style={{ padding: '.85rem 1.25rem', background: 'var(--accent-light)', border: '2px solid var(--accent)', borderRadius: 'var(--r)', fontSize: 14, color: 'var(--accent)', marginBottom: '1rem', fontWeight: 600 }}>
                📅 Next due: <strong>{nextDuePreview}</strong>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Assign to</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          {roommates.map(r => (
            <label key={r.id} className="checkbox-row">
              <input type="checkbox" checked={assignedTo.includes(r.id)} onChange={() => toggleAssigned(r.id)} />
              <span className="fw-600">{r.name}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>({r.email})</span>
            </label>
          ))}
        </div>
        {assignedTo.length > 0 && amount && (
          <div style={{ marginTop: '1rem', padding: '.85rem 1.25rem', background: 'var(--surface-2)', border: '2px solid var(--border-light)', borderRadius: 'var(--r)', fontSize: 14 }}>
            Each owes: <strong style={{ color: 'var(--primary-dark)', fontSize: 16 }}>${(parseFloat(amount) / assignedTo.length).toFixed(2)}</strong>
            {' '}({assignedTo.length} people)
          </div>
        )}
      </div>

      <button className="btn btn-success" onClick={handleSave} disabled={loading} style={{ padding: '1rem 3rem', fontSize: 14 }}>
        {loading ? 'SAVING…' : isEdit ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'}
      </button>
    </div>
  );
}