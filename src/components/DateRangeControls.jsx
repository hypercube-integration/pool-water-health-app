import { useEffect, useState } from 'react';

const fmt = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export default function DateRangeControls({ value, onChange }) {
  // Local state
  const [startDate, setStartDate] = useState(value?.startDate || fmt(daysAgo(30)));
  const [endDate, setEndDate] = useState(value?.endDate || fmt(today));
  const [preset, setPreset] = useState('30d'); // 7d | 30d | 90d | custom

  // ✅ Keep local state in sync with parent prop
  useEffect(() => {
    const s = value?.startDate || fmt(daysAgo(30));
    const e = value?.endDate || fmt(today);
    setStartDate(s);
    setEndDate(e);
    // If the incoming range matches a known preset, select it; else custom
    const diffDays = Math.max(0, Math.round((new Date(e) - new Date(s)) / 86400000));
    if (diffDays === 6) setPreset('7d');
    else if (diffDays === 29) setPreset('30d');
    else if (diffDays === 89) setPreset('90d');
    else setPreset('custom');
  }, [value?.startDate, value?.endDate]);

  // Update start/end when preset changes
  useEffect(() => {
    if (preset === 'custom') return;
    const map = { '7d': 7, '30d': 30, '90d': 90 };
    const n = map[preset] ?? 30;
    const s = fmt(daysAgo(n));
    const e = fmt(today);
    setStartDate(s);
    setEndDate(e);
  }, [preset]);

  const apply = () => onChange?.({ startDate, endDate });

  return (
    <div className="date-range">
      {/* Row 1: Start | End */}
      <div className="card">
        <label>Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setPreset('custom'); setStartDate(e.target.value); }}
        />
      </div>
      <div className="card">
        <label>End date</label>
        <input
          type="date"
          value={endDate}
          max={fmt(today)}
          onChange={(e) => { setPreset('custom'); setEndDate(e.target.value); }}
        />
      </div>

      {/* Row 2: Preset | Apply */}
      <div className="card">
        <label>Preset</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom…</option>
        </select>
      </div>
      <div className="card actions">
        <button onClick={apply}>Apply</button>
      </div>
    </div>
  );
}
