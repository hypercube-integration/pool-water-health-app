// src/pages/Dashboard.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import DateRangeControls from '../components/DateRangeControls';
import AdvisoriesPanel from '../components/AdvisoriesPanel';
import SettingsPanel from '../components/SettingsPanel';
import OfflineBanner from '../components/OfflineBanner';
import SyncStatus from '../components/SyncStatus';
import ReportModal from '../components/ReportModal';
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';
import { withMovingAverages, targetsFromSettings } from '../utils/chemistry';
import { makeCsv, downloadText, exportXlsx } from '../utils/export';
import { initOfflineQueue, subscribe as offlineSubscribe, offlineApi } from '../utils/offline';

const UI_KEY = 'pool-ui-pref-v1';
const LS_CACHE = 'pool-app-cache:getReadings';

const fmt = (d) => d.toISOString().slice(0, 10);
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const asISO = (s) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date(s).toISOString().slice(0, 10));

export default function Dashboard() {
  const { user } = useAuth();
  const canWrite = useRoleCheck(['writer', 'editor', 'admin']).has;

  // URL/LS init
  const initFromUrlOrStorage = () => {
    const url = new URL(window.location.href);
    const qs = url.searchParams;
    const stored = loadJSON(UI_KEY) || {};
    const start = qs.get('start') || stored.startDate || fmt(daysAgo(30));
    const end   = qs.get('end')   || stored.endDate   || fmt(new Date());
    const preset= qs.get('preset')|| stored.preset    || '30d';
    const avg   = (qs.get('avg') ?? `${stored.showAvg ?? '1'}`) === '1';
    return { range: { startDate: start, endDate: end, preset }, showAvg: avg };
  };

  const [{ startDate, endDate, preset }, setRangeState] = useState(initFromUrlOrStorage().range);
  const [showAvg, setShowAvg] = useState(initFromUrlOrStorage().showAvg);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('start', startDate);
    url.searchParams.set('end', endDate);
    url.searchParams.set('preset', preset || 'custom');
    url.searchParams.set('avg', showAvg ? '1' : '0');
    window.history.replaceState({}, '', url.toString());
    saveJSON(UI_KEY, { startDate, endDate, preset, showAvg });
  }, [startDate, endDate, preset, showAvg]);

  const setRange = (r) => setRangeState({
    startDate: r.startDate || startDate,
    endDate: r.endDate || endDate,
    preset: r.preset || 'custom',
  });

  // Offline queue lifecycle
  useEffect(() => {
    const cleanup = initOfflineQueue();
    const unsub = offlineSubscribe((evt) => {
      if (evt.type === 'sync-end') fetchReadings({ startDate, endDate });
    });
    return () => { cleanup(); unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Data
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [settings, setSettings] = useState({});
  const [offlineMode, setOfflineMode] = useState('hidden');

  const fetchReadings = async ({ startDate, endDate }) => {
    setLoading(true); setErr(''); setOfflineMode('hidden');
    try {
      const params = new URLSearchParams();
      if (startDate) params.set('startDate', asISO(startDate));
      if (endDate) params.set('endDate', asISO(endDate));
      params.set('limit', '365');
      const res = await fetch(`/api/getReadings?${params.toString()}`, { credentials: 'include' });
      if (!res.ok) throw new Error(`Fetch failed ${res.status}`);
      const data = await res.json();
      setReadings(Array.isArray(data) ? data : []);
      saveJSON(LS_CACHE, Array.isArray(data) ? data : []);
    } catch {
      const cached = loadJSON(LS_CACHE);
      if (cached) { setReadings(cached); setOfflineMode(navigator.onLine ? 'cached' : 'offline'); }
      else { setErr('Failed to load readings.'); setOfflineMode(navigator.onLine ? 'hidden' : 'offline'); }
    } finally { setLoading(false); }
  };
  useEffect(() => { fetchReadings({ startDate, endDate }); /* eslint-disable-next-line */ }, [startDate, endDate]);

  const chartData = useMemo(() => {
    const coerce = (v) => (v === '' || v == null ? NaN : Number(v));
    const base = readings
      .map(r => ({ ...r, ph: coerce(r.ph), chlorine: coerce(r.chlorine), salt: coerce(r.salt) }))
      .sort((a,b)=>a.date<b.date?-1: a.date>b.date?1:0);
    return withMovingAverages(base, 7);
  }, [readings]);

  const latest = useMemo(() => {
    if (!readings.length) return null;
    const [first] = [...readings].sort((a,b)=>a.date>b.date?-1:1);
    return first;
  }, [readings]);

  // Orientation reflow nudge
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

  const filenameBase = useMemo(() => `pool-readings_${startDate}_to_${endDate}`, [startDate, endDate]);
  const exportRows = useMemo(() => {
    const copy = [...readings].sort((a,b)=>a.date<b.date?-1:1);
    return copy.map(r => ({ date: r.date, ph: r.ph, chlorine: r.chlorine, salt: r.salt }));
  }, [readings]);

  const doExportCsv   = () => downloadText(`${filenameBase}.csv`, makeCsv(exportRows, ['date','ph','chlorine','salt']), 'text/csv;charset=utf-8');
  const doExportXlsx  = async () => { try { await exportXlsx(`${filenameBase}.xlsx`, exportRows, 'Readings'); } catch (e) { alert(e.message || 'Excel export failed.'); } };
  const doServerCsv   = () => { const p = new URLSearchParams({ startDate, endDate, limit: '20000' }); window.location.href = `/api/exportCSV?${p}`; };

  const [editing, setEditing] = useState(null);
  const handleEdit = (reading) => {
    setEditing(reading);
    setTimeout(() => document.getElementById('log-entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };
  const handleSaved = async () => { setEditing(null); await fetchReadings({ startDate, endDate }); };
  const handleCancel = () => setEditing(null);
  const handleDelete = async (r) => {
    if (!window.confirm(`Delete reading for ${r.date}?`)) return;
    const params = new URLSearchParams();
    if (r.id) params.set('id', r.id);
    params.set('date', r.date);
    const url = `/api/deleteReading?${params.toString()}`;
    const result = await offlineApi.delete(url);
    if (result.queued) alert('Delete queued (offline). It will sync when you’re online.');
    await fetchReadings({ startDate, endDate });
  };

  const targets = useMemo(() => targetsFromSettings(settings), [settings]);

  // --- Report modal
  const [reportOpen, setReportOpen] = useState(false);
  const chartHostRef = useRef(null);

  return (
    <div className="container">
      <AuthStatus />
      <h1>Pool Dashboard</h1>

      <OfflineBanner mode={offlineMode} />
      <SyncStatus />

      <DateRangeControls value={{ startDate, endDate, preset }} onChange={setRange} />

      <div className="section" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={doExportCsv}  disabled={!exportRows.length}>Export CSV</button>
        <button onClick={doExportXlsx} disabled={!exportRows.length} className="secondary">Export Excel (.xlsx)</button>
        <button onClick={doServerCsv}  disabled={!readings.length} className="secondary">Export CSV (Server)</button>
        <button onClick={() => setReportOpen(true)} className="secondary">PDF report</button>
        <label style={{ display:'flex', alignItems:'center', gap:8, marginLeft:'auto' }}>
          <input type="checkbox" checked={showAvg} onChange={(e)=>setShowAvg(e.target.checked)} />
          Show 7-day averages
        </label>
      </div>

      <SettingsPanel onChange={setSettings} />
      <AdvisoriesPanel latestReading={latest} settings={settings} />

      <div ref={chartHostRef} className="section chart-card">
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

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        readings={readings}
        targets={targets}
        range={{ startDate, endDate }}
        chartEl={chartHostRef.current}
      />
    </div>
  );
}

// utils
function loadJSON(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function saveJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }
