// src/components/SettingsPanel.jsx
import { useEffect, useState } from 'react';

const KEY = 'pool-app-settings-v1';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function SettingsPanel({ onChange }) {
  const [poolVolumeL, setPoolVolumeL] = useState('');
  const [chlorineStrengthPct, setChlorineStrengthPct] = useState('12.5');

  useEffect(() => {
    const s = loadSettings();
    if (s.poolVolumeL != null) setPoolVolumeL(String(s.poolVolumeL));
    if (s.chlorineStrengthPct != null) setChlorineStrengthPct(String(s.chlorineStrengthPct));
    onChange?.(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    const s = {
      poolVolumeL: Number(poolVolumeL) || 0,
      chlorineStrengthPct: Number(chlorineStrengthPct) || 12.5,
    };
    saveSettings(s);
    onChange?.(s);
  };

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Settings</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 12, alignItems: 'end' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            Pool volume (L)
          </label>
          <input
            type="number"
            min="0"
            inputMode="numeric"
            value={poolVolumeL}
            onChange={(e) => setPoolVolumeL(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 35000"
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 6 }}>
            Liquid chlorine strength (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="1"
            max="15"
            inputMode="decimal"
            value={chlorineStrengthPct}
            onChange={(e) => setChlorineStrengthPct(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 12.5"
          />
        </div>

        <div>
          <button onClick={save}>Save</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>
        These settings are stored locally in your browser and used to tailor dosage recommendations.
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box', background: '#fff', color: '#0f172a',
  padding: '10px 12px', border: '1px solid #d6dee6', borderRadius: 10, outline: 'none'
};
