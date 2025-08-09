// src/components/LogEntryForm.jsx
import { useEffect, useMemo, useState } from 'react';

/**
 * LogEntryForm
 *
 * Props:
 *  - initialValue?: { id?: string, date: "YYYY-MM-DD", ph: number, chlorine: number, salt: number }
 *      When provided, the form goes into "edit mode". The `date` field is locked
 *      because it's the Cosmos partition key. `id` is expected for update calls.
 *  - onSaved?: () => void
 *  - onCancel?: () => void
 *
 * Behavior:
 *  - Create (POST /api/submitReading) when no `initialValue` is present.
 *  - Edit   (PUT  /api/updateReading) when `initialValue` is present.
 *  - Basic client-side validation with inline errors.
 */

export default function LogEntryForm({ initialValue = null, onSaved, onCancel }) {
  const editMode = !!initialValue;

  const [date, setDate] = useState('');
  const [ph, setPh] = useState('');
  const [chlorine, setChlorine] = useState('');
  const [salt, setSalt] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');

  // Seed defaults on mount / when initialValue changes
  useEffect(() => {
    if (editMode) {
      setDate(initialValue.date || '');
      setPh(safeStr(initialValue.ph));
      setChlorine(safeStr(initialValue.chlorine));
      setSalt(safeStr(initialValue.salt));
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setDate(today);
      setPh('');
      setChlorine('');
      setSalt('');
    }
    setErr('');
  }, [editMode, initialValue]);

  const title = useMemo(() => (editMode ? `Edit reading (${initialValue?.date})` : 'Add new reading'), [editMode, initialValue]);

  const validate = () => {
    // Very light validation; adjust ranges to your taste
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Please provide a valid date (YYYY-MM-DD).';
    const nPh = toNum(ph);
    const nCl = toNum(chlorine);
    const nSalt = toNum(salt);
    if (nPh == null) return 'Please enter a numeric pH value.';
    if (nPh < 6.5 || nPh > 8.5) return 'pH looks out of typical range (6.5–8.5).';
    if (nCl == null) return 'Please enter a numeric Chlorine value.';
    if (nCl < 0 || nCl > 10) return 'Chlorine looks out of typical range (0–10 ppm).';
    if (nSalt == null) return 'Please enter a numeric Salt value.';
    if (nSalt < 0 || nSalt > 10000) return 'Salt looks out of typical range (0–10000 ppm).';
    if (editMode && !initialValue?.id) return 'Missing reading ID for update.';
    return '';
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    const msg = validate();
    if (msg) { setErr(msg); return; }

    setSubmitting(true);
    setErr('');

    try {
      const body = {
        date,
        ph: toNum(ph),
        chlorine: toNum(chlorine),
        salt: toNum(salt),
      };

      let res;
      if (editMode) {
        // date is partition key and cannot change — ensure we send the original date & id
        res = await fetch('/api/updateReading', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ...body, id: initialValue.id }),
        });
      } else {
        res = await fetch('/api/submitReading', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });
      }

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`${res.status} ${text}`);
      }

      // Clear form for add mode; keep values in edit mode
      if (!editMode) {
        const today = new Date().toISOString().slice(0, 10);
        setDate(today);
        setPh('');
        setChlorine('');
        setSalt('');
      }

      onSaved?.();
    } catch (e2) {
      console.error(e2);
      setErr('Failed to save reading. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} style={formStyle}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>

      <div style={rowStyle}>
        <label style={labelStyle}>Date</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={editMode} // lock when editing (partition key)
          required
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>pH</label>
        <input
          type="number"
          step="0.01"
          inputMode="decimal"
          value={ph}
          onChange={numHandler(setPh)}
          placeholder="e.g., 7.4"
          required
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Chlorine (ppm)</label>
        <input
          type="number"
          step="0.1"
          inputMode="decimal"
          value={chlorine}
          onChange={numHandler(setChlorine)}
          placeholder="e.g., 2.0"
          required
        />
      </div>

      <div style={rowStyle}>
        <label style={labelStyle}>Salt (ppm)</label>
        <input
          type="number"
          step="1"
          inputMode="numeric"
          value={salt}
          onChange={numHandler(setSalt)}
          placeholder="e.g., 3500"
          required
        />
      </div>

      {err && <div style={{ color: 'red', marginTop: 8 }}>{err}</div>}

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button type="submit" disabled={submitting}>
          {submitting ? (editMode ? 'Saving…' : 'Adding…') : (editMode ? 'Save Changes' : 'Add Reading')}
        </button>
        {editMode && (
          <button type="button" onClick={() => onCancel?.()} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

/* ------------------------- helpers & tiny styling ------------------------- */

function numHandler(setter) {
  return (e) => {
    const v = e.target.value;
    // Allow empty string (so user can clear field)
    if (v === '') return setter('');
    setter(v);
  };
}

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeStr(n) {
  return typeof n === 'number' && Number.isFinite(n) ? String(n) : (n ?? '') + '';
}

const formStyle = {
  padding: 12,
  borderRadius: 8,
  background: 'rgba(0,0,0,0.03)',
};

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '160px 1fr',
  gap: 8,
  alignItems: 'center',
  margin: '6px 0',
};

const labelStyle = {
  fontSize: 12,
  opacity: 0.8,
};
