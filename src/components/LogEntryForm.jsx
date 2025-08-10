// src/components/LogEntryForm.jsx
import { useEffect, useState } from 'react';
import { offlineApi } from '../utils/offline';

export default function LogEntryForm({ initialValue = null, onSaved, onCancel }) {
  const isEdit = !!(initialValue && initialValue.id);
  const [date, setDate] = useState(initialValue?.date || today());
  const [ph, setPh] = useState(initialValue?.ph ?? '');
  const [chlorine, setChlorine] = useState(initialValue?.chlorine ?? '');
  const [salt, setSalt] = useState(initialValue?.salt ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialValue) {
      setDate(initialValue.date || today());
      setPh(initialValue.ph ?? '');
      setChlorine(initialValue.chlorine ?? '');
      setSalt(initialValue.salt ?? '');
    }
  }, [initialValue?.id]); // re-run when editing a different entry

  const reset = () => {
    setDate(today());
    setPh(''); setChlorine(''); setSalt('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);

    const payload = {
      date,
      ph: numOrNull(ph),
      chlorine: numOrNull(chlorine),
      salt: numOrNull(salt),
      id: initialValue?.id,
    };

    try {
      let result;
      if (isEdit) {
        result = await offlineApi.put('/api/updateReading', payload);
      } else {
        result = await offlineApi.post('/api/submitReading', payload);
      }

      if (result.queued) {
        alert('Saved (queued offline). It will sync when you’re online.');
      }

      onSaved?.();
      if (!isEdit) reset();
    } catch (err) {
      console.error(err);
      alert('Save failed. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit}>
      <h3 style={{ marginTop: 0 }}>{isEdit ? 'Edit reading' : 'Add a reading'}</h3>
      <div className="form-grid">
        <label className="field">
          <span>Date</span>
          <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} disabled={isEdit /* date is partition key */} />
        </label>
        <label className="field">
          <span>pH</span>
          <input type="number" step="0.01" inputMode="decimal" value={ph} onChange={(e)=>setPh(e.target.value)} placeholder="e.g., 7.4" />
        </label>
        <label className="field">
          <span>Chlorine (ppm)</span>
          <input type="number" step="0.1" inputMode="decimal" value={chlorine} onChange={(e)=>setChlorine(e.target.value)} placeholder="e.g., 2.0" />
        </label>
        <label className="field">
          <span>Salt (ppm)</span>
          <input type="number" step="1" inputMode="numeric" value={salt} onChange={(e)=>setSalt(e.target.value)} placeholder="e.g., 3500" />
        </label>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button type="submit" disabled={busy}>{isEdit ? 'Save changes' : 'Add reading'}</button>
        {isEdit && <button type="button" className="secondary" onClick={()=>onCancel?.()}>Cancel</button>}
      </div>
    </form>
  );
}

function today() { return new Date().toISOString().slice(0, 10); }
function numOrNull(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
