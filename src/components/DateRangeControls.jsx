// src/components/DateRangeControls.jsx
import { useEffect, useMemo, useState } from 'react';

const PRESETS = [
  { id: '7d',   label: 'Last 7 days', days: 7 },
  { id: '30d',  label: 'Last 30 days', days: 30 },
  { id: '90d',  label: 'Last 90 days', days: 90 },
  { id: 'ytd',  label: 'Year to date' },
  { id: '12m',  label: 'Last 12 months' },
  { id: 'custom', label: 'Custom' },
];

const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const startOfYear = () => new Date(new Date().getFullYear(), 0, 1);

export default function DateRangeControls({ value, onChange }) {
  const initial = useMemo(() => ({
    preset: value?.preset || '30d',
    startDate: value?.startDate || fmt(daysAgo(30)),
    endDate: value?.endDate || fmt(new Date()),
  }), [value]);

  const [preset, setPreset] = useState(initial.preset);
  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);

  // Keep internal state in sync if parent changes externally
  useEffect(() => {
    if (!value) return;
    setPreset(value.preset || 'custom');
    if (value.startDate) setStartDate(value.startDate);
    if (value.endDate) setEndDate(value.endDate);
  }, [value?.startDate, value?.endDate, value?.preset]);

  const applyPreset = (id) => {
    const today = new Date();
    let s = startDate, e = endDate;
    if (id === 'custom') {
      // Keep current fields
    } else if (id === 'ytd') {
      s = fmt(startOfYear()); e = fmt(today);
    } else if (id === '12m') {
      const d = new Date(); d.setFullYear(d.getFullYear() - 1);
      s = fmt(d); e = fmt(today);
    } else {
      const p = PRESETS.find(p => p.id === id);
      if (p?.days) { s = fmt(daysAgo(p.days)); e = fmt(today); }
    }
    setPreset(id);
    setStartDate(s);
    setEndDate(e);
    onChange?.({ startDate: s, endDate: e, preset: id });
  };

  const applyCustom = () => {
    setPreset('custom');
    onChange?.({ startDate, endDate, preset: 'custom' });
  };

  return (
    <div className="section" style={{ display: 'grid', gap: 12 }}>
      <div className="date-grid">
        <div className="date-field">
          <label>Start date</label>
          <input type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} />
        </div>
        <div className="date-field">
          <label>End date</label>
          <input type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} />
        </div>
      </div>

      <div className="date-grid">
        <div className="date-field">
          <label>Preset</label>
          <select value={preset} onChange={(e)=>applyPreset(e.target.value)}>
            {PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div className="date-field" style={{ alignSelf: 'end' }}>
          <button onClick={applyCustom}>Apply</button>
        </div>
      </div>
    </div>
  );
}
