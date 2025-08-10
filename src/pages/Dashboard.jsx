// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import DateRangeControls from '../components/DateRangeControls';
import AdvisoriesPanel from '../components/AdvisoriesPanel';
import SettingsPanel from '../components/SettingsPanel';
import OfflineBanner from '../components/OfflineBanner';
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';
import { withMovingAverages, targetsFromSettings } from '../utils/chemistry';
import { makeCsv, downloadText, exportXlsx } from '../utils/export';

const LS_KEY = 'pool-app-cache:getReadings';

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
  const [settings, setSettings] = useState({});
  const [offlineMode, setOfflineMode] = useState('hidden'); // 'hidden' | 'offline' | 'cached'

  const cacheKey = useMemo(() => {
    // Keep cache simple: we store the last successful payload regardless of range
    return LS_KEY;
  }, [range.startDate, range.endDate]);

  const saveCache = (payload) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), data: payload }));
    } catch {}
  };
  const loadCache = () => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const { data } = JSON.parse(raw);
      return Array.isArray(data) ? data : null;
    } catch { return null; }
  };

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true); setErr('');
    setOfflineMode('hidden');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', asISO(startDate));
      if (endDate) params.set('endDate', asISO(endDate));
      params.set('limit', '365');

      const req = new Request(`/api/getReadings?${params.toString()}`, { credentials: 'include' });
      let data;
      // Network-first
      const res = await fetch(req);
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
      saveCache(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn('[Dashboard] fetch failed, falling back to cache:', e?.message || e);
      const cached = loadCache();
      if (cached) {
        setReadings(cached);
        setOfflineMode(navigator.onLine ? 'cached' : 'offline');
      } else {
        setErr('Failed to load readings.');
        setOfflineMode(navigator.onLine ? 'hidden' : 'offline');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReadings(range); /* eslint-disable-next-line */ }, [range.startDate, range.endDate]);

  const chartData = useMemo(() => {
    const coerce = (v) => (v === '' || v == null ? NaN : Number(v));
    const base = readings
      .map((r) => ({ ...r, ph: coerce(r.ph), chlorine: coerce(r.chlorine), salt: coerce(r.salt) }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return withMovingAverages(base, 7);
  }, [readings]);

  const latest = useMemo(() => {
    if (!readings.length) return null;
    const sorted = [...readings].sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return sorted[0];
  }, [readings]);

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

  const filenameBase = useMemo(() => {
    const s = range.startDate || 'start', e = range.endDate || 'end';
    return `pool-readings_${s}_to_${e}`;
  }, [range.startDate, range.endDate]);

  const exportRows = useMemo(() => {
    const copy = [...readings].sort((a, b) => (a.date < b.date ? -1 : 1));
    return copy.map((r) => ({ date: r.date, ph: r.ph, chlorine: r.chlorine, salt: r.salt }));
  }, [readings]);

  const doExportCsv = () => {
    const csv = makeCsv(exportRows, ['date', 'ph', 'chlorine', 'salt']);
    downloadText(`${filenameBase}.csv`, csv, 'text/csv;charset=utf-8');
  };
  const doExportXlsx = async () => {
    try { await exportXlsx(`${filenameBase}.xlsx`, exportRows, 'Readings'); }
    catch (e) { alert(e.message || 'Excel export failed. See console for details.'); }
  };
  const doServerCsv = () => {
    const params = new URLSearchParams();
    if (range.startDate) params.set('startDate', range.startDate);
    if (range.endDate) params.set('endDate', range.endDate);
    params.set('limit', '20000');
    window.location.href = `/api/exportCSV?${params.toString()}`;
  };

  const [editing, setEditing] = useState(null);
  const handleEdit = (reading) => {
    setEditing(reading);
    setTimeout(() => document.getElementById('log-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const handleSaved = async () => { setEditing(null); await fetchReadings(range); };
  const handleCancel = () => setEditing(null);
  const handleDelete = async (r) => {
    if (!window.confirm(`Delete reading for ${r.date}?`)) return;
    const params = new URLSearchParams();
    if (r.id) params.set('id', r.id);
    params.set('date', r.date);
    const res = await fetch(`/api/deleteReading?${params.toString()}`, { method:'DELETE', credentials:'include' });
    if (!res.ok) { alert('Delete failed.'); return; }
    await fetchReadings(range);
  };

  const targets = useMemo(() => targetsFromSettings(settings), [settings]);

  return (
    <div className="container">
      <AuthStatus />
      <h1>Pool Dashboard</h1>

      {/* Offline/cached banner */}
      <OfflineBanner mode={offlineMode} />

      <DateRangeControls value={range} onChange={setRange} />

      {/* Export toolbar */}
      <div className="section" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={doExportCsv} disabled={!exportRows.length}>Export CSV</button>
        <button onClick={doExportXlsx} disabled={!exportRows.length} className="secondary">Export Excel (.xlsx)</button>
        <button onClick={doServerCsv} disabled={!readings.length} className="secondary">Export CSV (Server)</button>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
          <input type="checkbox" checked={showAvg} onChange={(e)=>setShowAvg(e.target.checked)} />
          Show 7-day averages
        </label>
      </div>

      <SettingsPanel onChange={setSettings} />
      <AdvisoriesPanel latestReading={latest} settings={settings} />

      <div className="section chart-card">
        <TrendChart data={chartData} showAverages={showAvg} targets={targets} />
      </div>

      {canWrite && (
        <div className="section" id="log-entry-form">
          <LogEntryForm initialValue={editing} onSaved={handleSaved} onCancel={handleCancel} />
        </div>
      )}

      <div className="section table-wrap">
        <HistoryList readings={readings} canEdit={canWrite} onEdit={handleEdit} onDelete={handleDelete} />
      </div>
    </div>
  );
}
