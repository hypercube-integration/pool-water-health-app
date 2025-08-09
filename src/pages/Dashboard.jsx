import { useEffect, useMemo, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import DateRangeControls from '../components/DateRangeControls'; // ⟵ NEW
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';

export default function Dashboard() {
  const { user, authLoading } = useAuth();
  const canWrite = useRoleCheck(['writer', 'editor', 'admin']).has;

  // --- Date range state ------------------------------------------------------
  const fmt = (d) => d.toISOString().slice(0, 10);
  const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
  };
  const [range, setRange] = useState({
    startDate: fmt(daysAgo(30)),
    endDate: fmt(new Date()),
  });

  // --- Data load for charts + history (single source of truth) ---------------
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true);
    setErr('');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      // Optional cap:
      // params.set('limit', '365');

      const res = await fetch(`/api/getReadings?${params.toString()}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Fetch failed (${res.status}) ${text}`);
      }
      const data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr('Failed to load readings.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.startDate, range.endDate]);

  // Sort ascending for nicer L→R time flow on charts
  const chartData = useMemo(() => {
    const copy = [...readings];
    copy.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return copy;
  }, [readings]);

  return (
    <div className="dashboard" style={{ padding: 16 }}>
      <AuthStatus />

      <h1>Pool Dashboard</h1>

      {/* Date range controls */}
      <DateRangeControls value={range} onChange={setRange} />

      {loading && <div>Loading…</div>}
      {err && <div style={{ color: 'red' }}>{err}</div>}

      {/* Trend charts (now filtered to the selected date range) */}
      <section style={{ margin: '12px 0' }}>
        <TrendChart data={chartData} />
      </section>

      {/* Log entry form unchanged */}
      {canWrite && (
        <section style={{ margin: '12px 0' }}>
          <LogEntryForm
            onSaved={() => {
              // Re-fetch to reflect any new/edited entry inside the current range
              fetchReadings(range);
            }}
          />
        </section>
      )}

      {/* History: if your HistoryList supports an incoming `readings` prop, pass it.
          If not, you can remove the prop and let HistoryList fetch as it did before. */}
      <section style={{ margin: '12px 0' }}>
        <HistoryList readings={readings} />
      </section>
    </div>
  );
}
