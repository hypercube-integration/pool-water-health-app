// src/components/SyncStatus.jsx
import { useEffect, useState } from 'react';
import { getStatus, subscribe, syncNow } from '../utils/offline';

function fmtTime(t) {
  if (!t) return '—';
  const d = new Date(t);
  return d.toLocaleString();
}

export default function SyncStatus() {
  const [st, setSt] = useState(getStatus());

  useEffect(() => {
    setSt(getStatus());
    return subscribe((_evt, status) => setSt(status));
  }, []);

  const badgeColor = st.online ? '#16a34a' : '#f59e0b';

  return (
    <div className="section" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
        borderRadius: 999, background: 'rgba(148,163,184,.16)', border: '1px solid #e5eaef'
      }}>
        <span style={{
          width: 8, height: 8, borderRadius: 999, background: badgeColor,
          boxShadow: st.online ? '0 0 0 2px rgba(22,163,74,.15)' : '0 0 0 2px rgba(245,158,11,.15)'
        }} />
        {st.online ? 'Online' : 'Offline'}
      </span>

      <span style={{ color: '#334155' }}>
        Queue: <strong>{st.queued}</strong>{st.syncing ? ' (syncing…)' : ''}
      </span>

      <span style={{ color: '#64748b' }}>
        Last sync: {fmtTime(st.lastSyncAt)}
      </span>

      <button className="secondary" onClick={() => syncNow()} disabled={!st.queued || !st.online || st.syncing}>
        Sync now
      </button>
    </div>
  );
}
