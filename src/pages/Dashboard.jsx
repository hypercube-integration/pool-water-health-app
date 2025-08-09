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

  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  const [range, setRange] = useState({ startDate: fmt(daysAgo(30)), endDate: fmt(new Date()) });

  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true); setErr('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      const res = await fetch(`/api/getReadings?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr('Failed to load readings.');
      console.error(e);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReadings(range); /* eslint-disable-next-line */ }, [range.startDate, range.endDate]);

  const chartData = useMemo(() => {
    const copy = [...readings];
    copy.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return copy;
  }, [readings]);

  return (
    <div className="container">
      <AuthStatus />
      <h1>Pool Dashboard</h1>

      <DateRangeControls value={range} onChange={setRange} />

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: 'red' }}>{err}</div>}

      <div className="section chart-card">
        <TrendChart data={chartData} />
      </div>

      {canWrite && (
        <div className="section">
          <LogEntryForm onSaved={() => fetchReadings(range)} />
        </div>
      )}

      <div className="section table-wrap">
        <HistoryList readings={readings} canEdit={canWrite} />
      </div>
    </div>
  );
}
