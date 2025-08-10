// src/components/SyncStatus.jsx
import { useEffect, useRef, useState } from 'react';
import { getStatus, subscribe, syncNow } from '../utils/offline';

function fmtTime(t) {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleString();
}

async function checkReachable() {
  try {
    const ts = Date.now();
    const res = await fetch(`/.auth/me?ts=${ts}`, { credentials: 'include', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function SyncStatus() {
  const [st, setSt] = useState(getStatus());
  const [reachable, setReachable] = useState(null);
  const backoffRef = useRef(0); // ms

  useEffect(() => {
    setSt(getStatus());
    return subscribe((_evt, status) => setSt(status));
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const schedule = (ms) => {
      clearTimeout(timer);
      timer = setTimeout(runCheck, ms);
    };

    const runCheck = async () => {
      const ok = await checkReachable();
      if (cancelled) return;
      setReachable(ok);

      // backoff: if unreachable, gradually increase up to 5 min; if reachable, reset to 10 min
      if (!ok && st.online) {
        backoffRef.current = Math.min((backoffRef.current || 15000) * 2, 5 * 60 * 1000);
        schedule(backoffRef.current);
      } else {
        backoffRef.current = 10 * 60 * 1000; // 10 min
        schedule(backoffRef.current);
      }
    };

    // initial
    runCheck();

    // react to browser online/offline
    const onOnline = () => { backoffRef.current = 0; runCheck(); };
    const onOffline = () => { setReachable(false); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // only check when tab is visible
    const onVis = () => { if (!document.hidden) { backoffRef.current = 0; runCheck(); } };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      document.removeEventListener('visibilitychange', onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st.online]);

  const browserOnline = st.online;
  const effectiveOnline = browserOnline && reachable === true;
  const limited = browserOnline && reachable === false;

  const badgeColor = effectiveOnline ? '#16a34a' : (limited ? '#0ea5e9' : '#f59e0b');
  const label = effectiveOnline ? 'Online' : (limited ? 'Limited' : 'Offline');

  return (
    <div className="section" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        borderRadius: 999, background: 'rgba(148,163,184,.16)', border: '1px solid #e5eaef'
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999, background: badgeColor,
          boxShadow:
            effectiveOnline ? '0 0 0 2px rgba(22,163,74,.15)' :
            limited ?        '0 0 0 2px rgba(14,165,233,.15)' :
                              '0 0 0 2px rgba(245,158,11,.15)'
        }} />
        {label}
      </span>

      <span style={{ color: '#334155' }}>
        Queue: <strong>{st.queued}</strong>{st.syncing ? ' (syncing…)' : ''}
      </span>

      <span style={{ color: '#64748b' }}>
        Last sync: {fmtTime(st.lastSyncAt)}
      </span>

      <button
        className="secondary"
        onClick={() => syncNow()}
        disabled={!st.queued || !effectiveOnline || st.syncing}
        title={effectiveOnline ? 'Replay queued changes' : 'Go online to sync'}
      >
        Sync now
      </button>
    </div>
  );
}
