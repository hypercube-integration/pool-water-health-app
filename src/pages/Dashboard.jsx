// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import DateRangeControls from '../components/DateRangeControls';
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';

export default function Dashboard() {
  const { user, authLoading } = useAuth();
  const canWrite = useRoleCheck(['writer', 'editor', 'admin']).has;

  // --- Helpers --------------------------------------------------------------
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const asISO = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(s).toISOString().slice(0, 10));

  // --- Date range state -----------------------------------------------------
  const [range, setRange] = useState({
    startDate: fmt(daysAgo(30)),
    endDate: fmt(new Date()),
  });

  // --- Readings + fetch -----------------------------------------------------
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', asISO(startDate));
      if (endDate) params.set('endDate', asISO(endDate));
      params.set('limit', '365'); // generous cap for filtered views

      const res = await fetch(`/api/getReadings?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr('Failed to load readings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate]);

  // --- Chart data: coerce numbers & sort asc for L→R time flow -------------
  const chartData = useMemo(() => {
    const coerce = (v) => (v === '' || v == null ? NaN : Number(v));
    const copy = readings.map((r) => ({
      ...r,
      ph: coerce(r.ph),
      chlorine: coerce(r.chlorine),
      salt: coerce(r.salt),
    }));
    copy.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return copy;
  }, [readings]);

  // --- Edit flow ------------------------------------------------------------
  const [editing, setEditing] = useState(null); // null or a reading object

  const handleEdit = (reading) => {
    setEditing(reading);
    // Scroll to form (handy on small screens)
    setTimeout(() => {
      const el = document.getElementById('log-entry-form');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleDelete = async (reading) => {
    const ok = window.confirm(`Delete reading for ${reading.date}?`);
    if (!ok) return;
    const params = new URLSearchParams();
    if (reading.id) params.set('id', reading.id);
    params.set('date', reading.date); // partition key
    const res = await fetch(`/api/deleteReading?${params.toString()}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) {
      alert('Delete failed.');
      return;
    }
    await fetchReadings(range);
  };

  const handleSaved = async () => {
    setEditing(null);
    await fetchReadings(range);
  };

  // --- Orientation/resize kick for Recharts on mobile ----------------------
  useEffect(() => {
    const kick = () => {
      // Let layout settle, then trigger a resize for ResponsiveContainer
      requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    };

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

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: 'red' }}>{err}</div>}
      {!loading && !err && readings.length === 0 && (
        <div style={{ margin: '8px 0', color: '#64748b' }}>
          No readings in the selected date range.
        </div>
      )}

      <div className="section chart-card">
        <TrendChart data={chartData} />
      </div>

      {canWrite && (
        <div className="section" id="log-entry-form">
          <LogEntryForm
            initialValue={editing}
            onSaved={handleSaved}
            onCancel={() => setEditing(null)}
          />
        </div>
      )}

      <div className="section table-wrap">
        <HistoryList
          readings={readings}
          canEdit={canWrite}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
