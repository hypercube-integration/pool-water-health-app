// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import DateRangeControls from '../components/DateRangeControls';
import AdvisoriesPanel from '../components/AdvisoriesPanel'; // NEW
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';
import { withMovingAverages } from '../utils/chemistry';

export default function Dashboard() {
  const { user, authLoading } = useAuth();
  const canWrite = useRoleCheck(['writer', 'editor', 'admin']).has;

  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const asISO = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(s).toISOString().slice(0, 10));

  const [range, setRange] = useState({ startDate: fmt(daysAgo(30)), endDate: fmt(new Date()) });
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showAvg, setShowAvg] = useState(true);

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', asISO(startDate));
      if (endDate) params.set('endDate', asISO(endDate));
      params.set('limit', '365');

      const res = await fetch(`/api/getReadings?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e); setErr('Failed to load readings.');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReadings(range); /* eslint-disable-next-line */ }, [range.startDate, range.endDate]);

  // Coerce numbers, sort ASC, add 7-day moving averages
  const chartData = useMemo(() => {
    const coerce = (v) => (v === '' || v == null ? NaN : Number(v));
    const base = readings.map(r => ({
      ...r,
      ph: coerce(r.ph),
      chlorine: coerce(r.chlorine),
      salt: coerce(r.salt),
    })).sort((a,b)=> (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return withMovingAverages(base, 7);
  }, [readings]);

  // Latest reading in range (most recent date)
  const latest = useMemo(() => {
    if (!readings.length) return null;
    const sorted = [...readings].sort((a,b)=> (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return sorted[0];
  }, [readings]);

  // Orientation/resize kick for Recharts on mobile
  useEffect(() => {
    const kick = () => requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    const mq = window.matchMedia('(orientation: portrait)');
    mq.addEventListener?.('change', kick);
    window.addEventListener('orientationchange', kick);
    window.addEventListener('resize', kick);
    return () => {
      mq.removeEventListener?.('change', kick);
      window.removeEventListener('orientationchange', kick);
      window.removeEventListener('resize', kick);
    };
  }, []);

  return (
    <div className="container">
      <AuthStatus />
      <h1>Pool Dashboard</h1>

      <DateRangeControls value={range} onChange={setRange} />

      <div className="section" style={{ display:'flex', alignItems:'center', gap:12 }}>
        <label style={{ display:'flex', alignItems:'center', gap:8 }}>
          <input type="checkbox" checked={showAvg} onChange={(e)=>setShowAvg(e.target.checked)} />
          Show 7-day averages
        </label>
      </div>

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: 'red' }}>{err}</div>}
      {!loading && !err && readings.length === 0 && (
        <div style={{ margin: '8px 0', color: '#64748b' }}>No readings in the selected date range.</div>
      )}

      <AdvisoriesPanel latestReading={latest} />

      <div className="section chart-card">
        <TrendChart data={chartData} showAverages={showAvg} />
      </div>

      {canWrite && (
        <div className="section" id="log-entry-form">
          <LogEntryForm
            initialValue={null}
            onSaved={() => fetchReadings(range)}
            onCancel={() => {}}
          />
        </div>
      )}

      <div className="section table-wrap">
        <HistoryList
          readings={readings}
          canEdit={canWrite}
          onEdit={(r)=>{/* If you use in-place editing, wire your form here */}}
          onDelete={async (r)=>{
            const ok = window.confirm(`Delete reading for ${r.date}?`);
            if (!ok) return;
            const params = new URLSearchParams();
            if (r.id) params.set('id', r.id);
            params.set('date', r.date);
            const res = await fetch(`/api/deleteReading?${params.toString()}`, { method:'DELETE', credentials:'include' });
            if (!res.ok) { alert('Delete failed.'); return; }
            await fetchReadings(range);
          }}
        />
      </div>
    </div>
  );
}
