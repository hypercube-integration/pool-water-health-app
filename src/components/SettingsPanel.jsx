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

  // --- volume calculator state (Helpers) ---
  const [lenM, setLenM] = useState('7.0');
  const [widM, setWidM] = useState('3.2');
  const [shallowM, setShallowM] = useState('1.22');
  const [deepM, setDeepM] = useState('1.86');
  const [calcLitres, setCalcLitres] = useState(0);

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

  // Helper setters
  const setAndFocus = (setter, value, id) => {
    setter(String(value));
    if (id) setTimeout(() => document.getElementById(id)?.focus(), 0);
  };

  // --- tiny volume calculator ---
  const toNum = (v) => (v === '' || v == null ? NaN : Number(v));
  const calcVolume = () => {
    const L = toNum(lenM), W = toNum(widM), S = toNum(shallowM), D = toNum(deepM);
    if (![L, W, S, D].every((n) => Number.isFinite(n) && n >= 0)) {
      setCalcLitres(0);
      return;
    }
    const avgDepth = (S + D) / 2;
    const m3 = L * W * avgDepth;
    setCalcLitres(Math.round(m3 * 1000)); // litres
  };

  useEffect(() => { calcVolume(); /* auto-recalc on change */ }, [lenM, widM, shallowM, deepM]);

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Settings</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' }}>
        <Labeled label="Pool volume (L)">
          <input
            id="poolVolumeL"
            type="number"
            inputMode="numeric"
            value={poolVolumeL}
            onChange={(e)=>setPoolVolumeL(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 34500"
          />
        </Labeled>

        <Labeled label="Salt pool mode">
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={saltPoolMode} onChange={(e)=>setSaltPoolMode(e.target.checked)} />
            Enabled
          </label>
        </Labeled>

        <Labeled label="Cell rating (g/hr @100%)">
          <input
            id="cellRate"
            type="number"
            inputMode="numeric"
            value={chlorinatorRated_g_per_hr}
            onChange={(e)=>setRated(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 20"
          />
        </Labeled>

        <Labeled label="Daily pump hours">
          <input
            id="pumpHours"
            type="number"
            inputMode="numeric"
            value={dailyPumpHours}
            onChange={(e)=>setHours(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 8"
          />
        </Labeled>

        <Labeled label="Current output (%)">
          <input
            id="outputPct"
            type="number"
            inputMode="numeric"
            value={currentOutputPercent}
            onChange={(e)=>setPct(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 60"
          />
        </Labeled>

        <Labeled label="Liquid chlorine strength (%) (optional)">
          <input
            id="clStrength"
            type="number"
            step="0.1"
            min="1"
            max="15"
            inputMode="decimal"
            value={chlorineStrengthPct}
            onChange={(e)=>setClStrength(e.target.value)}
            style={inputStyle}
            placeholder="e.g., 12.5"
          />
        </Labeled>

        <div>
          <button onClick={save}>Save</button>
        </div>
      </div>

      {/* Helpers */}
      <div style={{ marginTop: 14 }}>
        <details>
          <summary style={summaryStyle}>Helpers & how to read each value</summary>
          <div style={{ paddingTop: 10, display: 'grid', gap: 12 }}>
            {/* NEW: Volume calculator */}
            <HelperCard title="Quick volume calculator (metres)">
              <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <MiniField label="Length (m)">
                  <input type="number" step="0.01" value={lenM} onChange={(e)=>setLenM(e.target.value)} style={inputStyle} />
                </MiniField>
                <MiniField label="Width (m)">
                  <input type="number" step="0.01" value={widM} onChange={(e)=>setWidM(e.target.value)} style={inputStyle} />
                </MiniField>
                <MiniField label="Shallow (m)">
                  <input type="number" step="0.01" value={shallowM} onChange={(e)=>setShallowM(e.target.value)} style={inputStyle} />
                </MiniField>
                <MiniField label="Deep (m)">
                  <input type="number" step="0.01" value={deepM} onChange={(e)=>setDeepM(e.target.value)} style={inputStyle} />
                </MiniField>
              </div>
              <p style={pStyle}>
                Average depth = (Shallow + Deep) / 2. Volume (L) = Length × Width × AvgDepth × 1000.
              </p>
              <div className="helper-actions" style={{ display:'flex', gap: 8, alignItems:'center', flexWrap:'wrap' }}>
                <div><strong>Estimated volume:</strong> {calcLitres ? calcLitres.toLocaleString() : '—'} L</div>
                <button onClick={()=>setAndFocus(setPoolVolumeL, calcLitres || '', 'poolVolumeL')} disabled={!calcLitres}>
                  Use result
                </button>
                <button className="secondary" onClick={calcVolume}>Recalculate</button>
              </div>
            </HelperCard>

            {/* Pool volume notes + presets */}
            <HelperCard title="Pool volume (L)">
              <p style={pStyle}>
                For your Cervantes 7.0 × 3.2 m with depths 1.22–1.86 m, avg depth = 1.54 m → ≈ <strong>34,500 L</strong>.
              </p>
              <div className="helper-actions">
                <button onClick={()=>setAndFocus(setPoolVolumeL, 34500, 'poolVolumeL')}>Use 34,500 L</button>
                <button className="secondary" onClick={()=>setAndFocus(setPoolVolumeL, 35000, 'poolVolumeL')}>Round to 35,000 L</button>
              </div>
            </HelperCard>

            {/* Salt pool mode */}
            <HelperCard title="Salt pool mode">
              <p style={pStyle}>
                Turn this on for a salt chlorinator. Advisories will suggest <em>chlorinator % / runtime</em>
                adjustments rather than liquid chlorine dosing.
              </p>
              <div className="helper-actions">
                <button onClick={()=>setSaltPoolMode(true)}>Enable salt mode</button>
              </div>
            </HelperCard>

            {/* Cell rating */}
            <HelperCard title="Cell rating (g/hr @100%)">
              <p style={pStyle}>
                Find this on the chlorinator label/manual (e.g., 15–35 g/hr). It’s how many grams of chlorine the cell
                makes per hour at 100% output. If unsure, leave blank; advice still works, just less precise.
              </p>
              <div className="helper-actions" style={{ gap: 6 }}>
                {[15,20,25,30].map(v=>(
                  <button key={v} className="secondary" onClick={()=>setAndFocus(setRated, v, 'cellRate')}>{v} g/hr</button>
                ))}
              </div>
            </HelperCard>

            {/* Pump hours */}
            <HelperCard title="Daily pump hours">
              <p style={pStyle}>
                Use your timer schedule (e.g., 2×4h = 8h). Longer runs make more chlorine. In hotter water, you may need more.
              </p>
              <div className="helper-actions" style={{ gap: 6 }}>
                {[6,8,10,12].map(v=>(
                  <button key={v} className="secondary" onClick={()=>setAndFocus(setHours, v, 'pumpHours')}>{v} h</button>
                ))}
              </div>
            </HelperCard>

            {/* Output percent */}
            <HelperCard title="Current output (%)">
              <p style={pStyle}>
                On your <strong>Pool Controls XLS (Xtra Low Salt)</strong> unit:
                press <strong>Menu</strong>, use <strong>◀ ▶</strong> to find <em>OUTPUT xx%</em>, then use <strong>▲ ▼</strong> to adjust.
                Let it sit to save.
              </p>
              <div className="helper-actions" style={{ gap: 6 }}>
                {[40,60,80,100].map(v=>(
                  <button key={v} className="secondary" onClick={()=>setAndFocus(setPct, v, 'outputPct')}>{v}%</button>
                ))}
              </div>
            </HelperCard>

            {/* Liquid strength */}
            <HelperCard title="Liquid chlorine strength (%) (optional)">
              <p style={pStyle}>
                Only used for occasional <em>shock</em> dosing. Pool shop liquid is commonly <strong>12.5%</strong>.
                Supermarket bleach is often <strong>4–6%</strong>.
              </p>
              <div className="helper-actions" style={{ gap: 6 }}>
                {[12.5,10,6].map(v=>(
                  <button key={v} className="secondary" onClick={()=>setAndFocus(setClStrength, v, 'clStrength')}>{v}%</button>
                ))}
              </div>
            </HelperCard>

            <div style={{ textAlign: 'right' }}>
              <button onClick={save}>Save all</button>
            </div>
          </div>
        </details>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
        These settings are stored locally in your browser and used to tailor dosage recommendations.
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

function HelperCard({ title, children }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5eaef', borderRadius: 10, padding: 12
    }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {children}
    </div>
  );
}

function MiniField({ label, children }) {
  return (
    <label style={{ display: 'grid', gap: 6 }}>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{label}</span>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0f172a',
  padding: '10px 12px',
  border: '1px solid '#d6dee6',
  borderRadius: 10,
  outline: 'none',
};

const summaryStyle = { cursor: 'pointer', fontWeight: 600 };
const pStyle = { margin: 0, lineHeight: 1.35, color: '#334155' };
