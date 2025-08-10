// src/components/OfflineBanner.jsx
import { useEffect, useState } from 'react';

export default function OfflineBanner({ mode = 'hidden' }) {
  // mode: 'hidden' | 'offline' | 'cached'
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  const show = !online || mode !== 'hidden';
  if (!show) return null;

  let text = '';
  if (!online) text = 'Offline: showing last synced data (if available).';
  else if (mode === 'cached') text = 'Showing cached data. The latest data will appear when online.';
  else return null;

  return (
    <div style={{
      background: !online ? 'rgba(251, 191, 36, .15)' : 'rgba(59, 130, 246, .12)',
      color: '#334155',
      border: '1px solid #e5eaef',
      borderRadius: 10,
      padding: '8px 12px',
      marginBottom: 12,
      fontSize: 13
    }}>
      {text}
    </div>
  );
}
