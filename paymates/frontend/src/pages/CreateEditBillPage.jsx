// src/pages/CreateEditBillPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client.js';
import { useHome } from '../context/HomeContext.jsx';
import ErrorBanner from '../components/ErrorBanner.jsx';
import BillSplitPanel from '../components/BillSplitPanel.jsx';

const BLANK_ITEM = () => ({ name: '', qty: 1, unitPrice: '', ownerIds: [], unitPriceError: '', qtyError: '' });

const BILL_CATEGORIES = [
  'Groceries', 'Utilities', 'Rent', 'Internet', 'Electricity', 'Gas', 'Water',
  'Dining Out', 'Takeout / Delivery', 'Household Supplies', 'Laundry',
  'Transportation', 'Streaming / Subscriptions', 'Medical / Health',
  'Personal Care', 'Entertainment', 'Pet Supplies', 'Repairs / Maintenance',
  'Insurance', 'Other',
];

function validatePrice(val) {
  if (val === '' || val === undefined) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return 'Must be a valid number.';
  if (num < 0) return 'Price cannot be negative.';
  return '';
}

function validateQty(val) {
  if (val === '' || val === undefined) return '';
  const num = parseFloat(val);
  if (isNaN(num)) return 'Must be a valid number.';
  if (num < 0) return 'Quantity cannot be negative.';
  return '';
}

export default function CreateEditBillPage() {
  const { homeId, billId } = useParams();
  const navigate            = useNavigate();
  const { currentUser }     = useHome();
  const isEdit              = Boolean(billId);

  const [title,              setTitle]              = useState('');
  const [date,               setDate]               = useState(new Date().toISOString().split('T')[0]);
  const [category,           setCategory]           = useState('');
  const [splitType,          setSplitType]          = useState('evenly');
  const [lineItems,          setLineItems]          = useState([BLANK_ITEM()]);
  const [tax,                setTax]                = useState('');
  const [taxError,           setTaxError]           = useState('');
  const [assignedRoommates,  setAssignedRoommates]  = useState([]);
  const [fixedAmounts,       setFixedAmounts]       = useState({});
  const [receiptUrl,         setReceiptUrl]         = useState('');
  const [roommates,          setRoommates]          = useState([]);
  const [loading,            setLoading]            = useState(false);
  const [error,              setError]              = useState('');

  useEffect(() => {
    client.get(`/homes/${homeId}/roommates`)
      .then(r => {
        setRoommates(r.data.roommates);
        if (!isEdit) setAssignedRoommates(r.data.roommates.map(r => r.id));
      })
      .catch(() => {});
  }, [homeId, isEdit]);

  useEffect(() => {
    if (!isEdit) return;
    client.get(`/homes/${homeId}/bills`)
      .then(r => {
        const bill = r.data.bills.find(b => b.id === billId);
        if (!bill) return;
        setTitle(bill.title);
        setDate(bill.date);
        setCategory(bill.category || '');
        setSplitType(bill.split_type);
        setLineItems(bill.items.map(i => ({
          name: i.name, qty: i.quantity, unitPrice: i.unit_price,
          ownerIds: i.owner_ids || [], unitPriceError: '', qtyError: '',
        })));
        setTax(bill.tax || '');
        setAssignedRoommates(bill.assigned_roommates);
        setReceiptUrl(bill.receipt_url || '');
      })
      .catch(() => {});
  }, [isEdit, billId, homeId]);

  const total = useMemo(() => {
    const sub = lineItems.reduce((s, i) => {
      const q = parseFloat(i.qty) || 0;
      const p = parseFloat(i.unitPrice) || 0;
      return s + Math.max(0, q) * Math.max(0, p);
    }, 0);
    return Math.max(0, sub + (parseFloat(tax) || 0));
  }, [lineItems, tax]);

  const updateItem = useCallback((idx, field, value) => {
    setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it));
  }, []);

  // Validate price on space key
  const handlePriceKeyDown = useCallback((idx, e) => {
    if (e.key === ' ') {
      e.preventDefault();
      const msg = validatePrice(lineItems[idx].unitPrice);
      updateItem(idx, 'unitPriceError', msg);
    }
  }, [lineItems, updateItem]);

  // Validate qty on space key
  const handleQtyKeyDown = useCallback((idx, e) => {
    if (e.key === ' ') {
      e.preventDefault();
      const msg = validateQty(lineItems[idx].qty);
      updateItem(idx, 'qtyError', msg);
    }
  }, [lineItems, updateItem]);

  // Validate tax on space key
  const handleTaxKeyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      setTaxError(validatePrice(tax));
    }
  };

  const handleItemOwners = useCallback((idx, ownerIds) => {
    setLineItems(prev => prev.map((it, i) => i === idx ? { ...it, ownerIds } : it));
  }, []);

  const handleSave = async () => {
    if (!title.trim()) { setError('Title is required.'); return; }
    if (lineItems.length === 0) { setError('Add at least one line item.'); return; }
    if (assignedRoommates.length === 0 && splitType !== 'by_item') {
      setError('Select at least one roommate.'); return;
    }

    // Run all price/qty validations on save
    let hasFieldErrors = false;
    const checkedItems = lineItems.map((item, i) => {
      const unitPriceError = validatePrice(item.unitPrice);
      const qtyError = validateQty(item.qty);
      if (unitPriceError || qtyError) hasFieldErrors = true;
      return { ...item, unitPriceError, qtyError };
    });
    setLineItems(checkedItems);

    const taxMsg = validatePrice(tax);
    setTaxError(taxMsg);
    if (taxMsg) hasFieldErrors = true;

    if (hasFieldErrors) {
      setError('Please fix the highlighted errors before saving.');
      return;
    }

    setError('');
    setLoading(true);

    const payload = {
      creator_id:         currentUser?.id,
      editor_id:          currentUser?.id,
      title:              title.trim(),
      date,
      category:           category.trim(),
      split_type:         splitType,
      items:              lineItems.map(i => ({
        name:       i.name,
        quantity:   Math.max(0, parseFloat(i.qty) || 1),
        unit_price: Math.max(0, parseFloat(i.unitPrice) || 0),
        owner_ids:  i.ownerIds,
      })),
      tax:                Math.max(0, parseFloat(tax) || 0),
      assigned_roommates: splitType === 'by_item'
        ? [...new Set(lineItems.flatMap(i => i.ownerIds))]
        : assignedRoommates,
      fixed_amounts:      splitType === 'fixed_amount'
        ? Object.fromEntries(Object.entries(fixedAmounts).map(([k, v]) => [k, parseFloat(v) || 0]))
        : {},
      home_id: homeId,
    };

    try {
      let savedId = billId;
      if (isEdit) {
        await client.put(`/bills/${billId}`, payload);
      } else {
        const res = await client.post('/bills', payload);
        savedId = res.data.bill.id;
        if (receiptUrl.trim()) {
          await client.post(`/bills/${savedId}/receipt`, { receipt_url: receiptUrl.trim() });
        }
      }
      navigate(`/homes/${homeId}/bills`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save bill.');
    } finally {
      setLoading(false);
    }
  };

  const perPerson = assignedRoommates.length > 0 ? total / assignedRoommates.length : 0;

  return (
    <div style={{ maxWidth: 900 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">{isEdit ? '✏️ Edit Bill' : '🧾 New Bill'}</h1>
          <p className="page-subtitle">{isEdit ? 'Update line items and split' : 'Add items and choose a split method'}</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate(`/homes/${homeId}/bills`)}>
          CANCEL
        </button>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError('')} />

      {/* Basic info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Bill Details</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
          <div className="form-group" style={{ gridColumn: '1 / 3' }}>
            <label className="form-label">TITLE *</label>
            <input className="form-input" placeholder="e.g. HEB Grocery Run" value={title} onChange={e => setTitle(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">DATE</label>
            <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / 2' }}>
            <label className="form-label">CATEGORY</label>
            <select
              className="form-input"
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="">— Select a category —</option>
              {BILL_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">TAX ($)</label>
            <input
              className="form-input"
              style={{ borderColor: taxError ? 'var(--danger, #e53e3e)' : undefined }}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={tax}
              onChange={e => { setTax(e.target.value); if (taxError) setTaxError(''); }}
              onKeyDown={handleTaxKeyDown}
            />
            {taxError && (
              <p style={{ fontSize: '11px', color: 'var(--danger, #e53e3e)', marginTop: '0.25rem' }}>⚠ {taxError}</p>
            )}
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">RECEIPT IMAGE URL</label>
            <input className="form-input" placeholder="https://…" value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Line Items</h3>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setLineItems(p => [...p, BLANK_ITEM()])}>
            + ADD ITEM
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item name</th>
                <th style={{ width: 140 }}>Qty</th>
                <th style={{ width: 160 }}>Unit price ($)</th>
                <th style={{ width: 100, textAlign: 'right' }}>Subtotal</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {lineItems.map((item, idx) => {
                const qty   = parseFloat(item.qty) || 0;
                const price = parseFloat(item.unitPrice) || 0;
                const sub   = Math.max(0, qty) * Math.max(0, price);
                return (
                  <tr key={idx}>
                    <td>
                      <input
                        className="form-input"
                        style={{ padding: '.5rem .75rem' }}
                        placeholder="Item name"
                        value={item.name}
                        onChange={e => updateItem(idx, 'name', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{
                          padding: '.5rem .75rem',
                          borderColor: item.qtyError ? 'var(--danger, #e53e3e)' : undefined,
                        }}
                        type="text"
                        inputMode="decimal"
                        placeholder="1"
                        value={item.qty}
                        onChange={e => { updateItem(idx, 'qty', e.target.value); if (item.qtyError) updateItem(idx, 'qtyError', ''); }}
                        onKeyDown={e => handleQtyKeyDown(idx, e)}
                      />
                      {item.qtyError && (
                        <p style={{ fontSize: '10px', color: 'var(--danger, #e53e3e)', margin: '2px 0 0' }}>⚠ {item.qtyError}</p>
                      )}
                    </td>
                    <td>
                      <input
                        className="form-input"
                        style={{
                          padding: '.5rem .75rem',
                          borderColor: item.unitPriceError ? 'var(--danger, #e53e3e)' : undefined,
                        }}
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={item.unitPrice}
                        onChange={e => { updateItem(idx, 'unitPrice', e.target.value); if (item.unitPriceError) updateItem(idx, 'unitPriceError', ''); }}
                        onKeyDown={e => handlePriceKeyDown(idx, e)}
                      />
                      {item.unitPriceError && (
                        <p style={{ fontSize: '10px', color: 'var(--danger, #e53e3e)', margin: '2px 0 0' }}>⚠ {item.unitPriceError}</p>
                      )}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--primary-dark)' }}>
                      ${sub.toFixed(2)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        style={{ padding: '4px 10px' }}
                        onClick={() => setLineItems(p => p.filter((_, i) => i !== idx))}
                        disabled={lineItems.length === 1}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
          💡 Press Space in any price or qty field to validate immediately.
        </p>
      </div>

      {/* Split panel */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: '1.25rem', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>Split Configuration</h3>
        <BillSplitPanel
          splitType={splitType}          onSplitTypeChange={setSplitType}
          roommates={roommates}          assignedRoommates={assignedRoommates}
          onAssignedChange={setAssignedRoommates}
          total={total}
          fixedAmounts={fixedAmounts}    onFixedAmountsChange={setFixedAmounts}
          lineItems={lineItems}          onItemOwnersChange={handleItemOwners}
        />
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: '2rem', display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Total</p>
          <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary-dark)' }}>${total.toFixed(2)}</p>
        </div>
        {splitType === 'evenly' && assignedRoommates.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Per person</p>
            <p style={{ fontSize: 36, fontWeight: 900, color: 'var(--success)' }}>${perPerson.toFixed(2)}</p>
          </div>
        )}
        <div>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.05em', fontWeight: 700 }}>Roommates</p>
          <p style={{ fontSize: 36, fontWeight: 900 }}>{assignedRoommates.length}</p>
        </div>
      </div>

      <button className="btn btn-success" onClick={handleSave} disabled={loading} style={{ padding: '1rem 3rem', fontSize: 14 }}>
        {loading ? 'SAVING…' : isEdit ? 'UPDATE BILL' : 'SAVE BILL'}
      </button>
    </div>
  );
}
