import { useEffect, useState } from 'react';

const fmt = (d) => d.toISOString().slice(0, 10);
const today = new Date();
const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

export default function DateRangeControls({ value, onChange }) {
  const [startDate, setStartDate] = useState(value?.startDate || fmt(daysAgo(30)));
  const [endDate, setEndDate] = useState(value?.endDate || fmt(today)));
  const [preset, setPreset] = useState('30d'); // 7d | 30d | 90d | custom

  useEffect(() => {
    if (preset === 'custom') return;
    const map = { '7d': 7, '30d': 30, '90d': 90 };
    const n = map[preset] ?? 30;
    setStartDate(fmt(daysAgo(n)));
    setEndDate(fmt(today));
  }, [preset]);

  const apply = () => onChange?.({ startDate, endDate });

  return (
    <div className="date-range">
      <div className="card">
        <label>Preset</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom…</option>
        </select>
      </div>

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

      <div className="card actions">
        <button onClick={apply}>Apply</button>
      </div>
    </div>
  );
}
