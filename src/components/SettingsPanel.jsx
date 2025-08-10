// src/components/SettingsPanel.jsx
import { useEffect, useState } from 'react';

const KEY = 'pool-app-settings-v2';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function SettingsPanel({ onChange }) {
  const [poolVolumeL, setPoolVolumeL] = useState('');
  const [saltPoolMode, setSaltPoolMode] = useState(true);
  const [chlorinatorRated_g_per_hr, setRated] = useState(''); // g/hr @100%
  const [dailyPumpHours, setHours] = useState('');
  const [currentOutputPercent, setPct] = useState('');
  const [chlorineStrengthPct, setClStrength] = useState('12.5'); // optional fallback for shock

  // Load persisted settings once
  useEffect(() => {
    const s = loadSettings();
    if (s.poolVolumeL != null) setPoolVolumeL(String(s.poolVolumeL));
    if (s.saltPoolMode != null) setSaltPoolMode(!!s.saltPoolMode);
    if (s.chlorinatorRated_g_per_hr != null) setRated(String(s.chlorinatorRated_g_per_hr));
    if (s.dailyPumpHours != null) setHours(String(s.dailyPumpHours));
    if (s.currentOutputPercent != null) setPct(String(s.currentOutputPercent));
    if (s.chlorineStrengthPct != null) setClStrength(String(s.chlorineStrengthPct));
    onChange?.(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = () => {
    const s = {
      poolVolumeL: Number(poolVolumeL) || 0,
      saltPoolMode: !!saltPoolMode,
      chlorinatorRated_g_per_hr: Number(chlorinatorRated_g_per_hr) || 0,
      dailyPumpHours: Number(dailyPumpHours) || 0,
      currentOutputPercent: Number(currentOutputPercent),
      chlorineStrengthPct: Number(chlorineStrengthPct) || 12.5,
    };
    saveSettings(s);
    onChange?.(s);
  };

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Settings</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' }}>
        <Labeled label="Pool volume (L)">
          <input type="number" inputMode="numeric" value={poolVolumeL} onChange={(e)=>setPoolVolumeL(e.target.value)} style={inputStyle} placeholder="e.g., 34500" />
        </Labeled>

        <Labeled label="Salt pool mode">
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={saltPoolMode} onChange={(e)=>setSaltPoolMode(e.target.checked)} />
            Enabled
          </label>
        </Labeled>

        <Labeled label="Cell rating (g/hr @100%)">
          <input type="number" inputMode="numeric" value={chlorinatorRated_g_per_hr} onChange={(e)=>setRated(e.target.value)} style={inputStyle} placeholder="e.g., 20" />
        </Labeled>

        <Labeled label="Daily pump hours">
          <input type="number" inputMode="numeric" value={dailyPumpHours} onChange={(e)=>setHours(e.target.value)} style={inputStyle} placeholder="e.g., 8" />
        </Labeled>

        <Labeled label="Current output (%)">
          <input type="number" inputMode="numeric" value={currentOutputPercent} onChange={(e)=>setPct(e.target.value)} style={inputStyle} placeholder="e.g., 60" />
        </Labeled>

        <Labeled label="Liquid chlorine strength (%) (optional)">
          <input type="number" step="0.1" min="1" max="15" inputMode="decimal" value={chlorineStrengthPct} onChange={(e)=>setClStrength(e.target.value)} style={inputStyle} placeholder="e.g., 12.5" />
        </Labeled>

        <div>
          <button onClick={save}>Save</button>
        </div>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
        <div><strong>Tip:</strong> Your chlorinator’s rating (g/hr) is usually on the label/spec sheet. If unknown, leave it blank and the app will give general guidance.</div>
        <div>“Liquid chlorine strength” is only used for occasional shock dosing; it’s optional for salt pools.</div>
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f172a',
  padding: '10px 12px',
  border: '1px solid #d6dee6',
  borderRadius: 10,
  outline: 'none',
};
