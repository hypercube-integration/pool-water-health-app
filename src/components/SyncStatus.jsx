// src/components/SyncStatus.jsx
import { useEffect, useState } from 'react';
import { getStatus, subscribe, syncNow } from '../utils/offline';

function fmtTime(t) {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleString();
}

async function checkReachable() {
  try {
    const ts = Date.now();
    // SW never caches /.auth/* in our setup
    const res = await fetch(`/.auth/me?ts=${ts}`, { credentials: 'include', cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export default function SyncStatus() {
  const [st, setSt] = useState(getStatus());
  const [reachable, setReachable] = useState(null); // null | boolean

  // Subscribe to queue status
  useEffect(() => {
    setSt(getStatus());
    return subscribe((_evt, status) => setSt(status));
  }, []);

  // Online/offline listeners + periodic reachability checks
  useEffect(() => {
    let cancelled = false;

    const update = async () => {
      const ok = await checkReachable();
      if (!cancelled) setReachable(ok);
    };

    const handleOnline = () => { update(); };
    const handleOffline = () => { setReachable(false); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check + periodic
    update();
    const id = setInterval(update, 15000);
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) update();
    });

    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const browserOnline = st.online; // from navigator.onLine via getStatus()
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
