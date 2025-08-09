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
  const [endDate, setEndDate] = useState(value?.endDate || fmt(today));
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
    <div
      className="date-range-controls"
      style={{
        display: 'grid',
        gap: 8,
        gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))',
        alignItems: 'end',
        margin: '12px 0',
      }}
    >
      <div>
        <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Preset</label>
        <select value={preset} onChange={(e) => setPreset(e.target.value)}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
          <option value="custom">Custom…</option>
        </select>
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>Start date</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setPreset('custom');
            setStartDate(e.target.value);
          }}
        />
      </div>

      <div>
        <label style={{ display: 'block', fontSize: 12, opacity: 0.8 }}>End date</label>
        <input
          type="date"
          value={endDate}
          max={fmt(today)}
          onChange={(e) => {
            setPreset('custom');
            setEndDate(e.target.value);
          }}
        />
      </div>

      <div>
        <button onClick={apply} style={{ padding: '8px 12px' }}>
          Apply
        </button>
      </div>
    </div>
  );
}
