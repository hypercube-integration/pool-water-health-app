// src/components/SettingsPanel.jsx
import { useEffect, useState } from 'react';
import { TARGETS } from '../utils/chemistry';

const KEY = 'pool-app-settings-v3'; // bump key to persist new fields

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function saveSettings(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {}
}

export default function SettingsPanel({ onChange }) {
  const [poolVolumeL, setPoolVolumeL] = useState('');
  const [saltPoolMode, setSaltPoolMode] = useState(true);
  const [chlorinatorRated_g_per_hr, setRated] = useState('');
  const [dailyPumpHours, setHours] = useState('');
  const [currentOutputPercent, setPct] = useState('');
  const [chlorineStrengthPct, setClStrength] = useState('12.5');

  // Target ranges
  const [phMin, setPhMin] = useState(String(TARGETS.ph[0]));
  const [phMax, setPhMax] = useState(String(TARGETS.ph[1]));
  const [clMin, setClMin] = useState(String(TARGETS.chlorine[0]));
  const [clMax, setClMax] = useState(String(TARGETS.chlorine[1]));
  const [saltMin, setSaltMin] = useState(String(TARGETS.salt[0]));
  const [saltMax, setSaltMax] = useState(String(TARGETS.salt[1]));

  // Volume calculator (defaults to your pool dims)
  const [lenM, setLenM] = useState('7.0');
  const [widM, setWidM] = useState('3.2');
  const [shallowM, setShallowM] = useState('1.22');
  const [deepM, setDeepM] = useState('1.86');
  const [calcLitres, setCalcLitres] = useState(0);

  useEffect(() => {
    const s = loadSettings();
    if (s.poolVolumeL != null) setPoolVolumeL(String(s.poolVolumeL));
    if (s.saltPoolMode != null) setSaltPoolMode(!!s.saltPoolMode);
    if (s.chlorinatorRated_g_per_hr != null) setRated(String(s.chlorinatorRated_g_per_hr));
    if (s.dailyPumpHours != null) setHours(String(s.dailyPumpHours));
    if (s.currentOutputPercent != null) setPct(String(s.currentOutputPercent));
    if (s.chlorineStrengthPct != null) setClStrength(String(s.chlorineStrengthPct));

    if (s.phMin != null) setPhMin(String(s.phMin));
    if (s.phMax != null) setPhMax(String(s.phMax));
    if (s.chlorineMin != null) setClMin(String(s.chlorineMin));
    if (s.chlorineMax != null) setClMax(String(s.chlorineMax));
    if (s.saltMin != null) setSaltMin(String(s.saltMin));
    if (s.saltMax != null) setSaltMax(String(s.saltMax));

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

      phMin: Number(phMin),
      phMax: Number(phMax),
      chlorineMin: Number(clMin),
      chlorineMax: Number(clMax),
      saltMin: Number(saltMin),
      saltMax: Number(saltMax),
    };
    saveSettings(s);
    onChange?.(s);
  };

  const setAndFocus = (setter, value, id) => {
    setter(String(value));
    if (id) setTimeout(() => document.getElementById(id)?.focus(), 0);
  };

  // Volume calculator
  const toNum = (v) => (v === '' || v == null ? NaN : Number(v));
  const calcVolume = () => {
    const L = toNum(lenM), W = toNum(widM), S = toNum(shallowM), D = toNum(deepM);
    if (![L, W, S, D].every((n) => Number.isFinite(n) && n >= 0)) { setCalcLitres(0); return; }
    const avgDepth = (S + D) / 2;
    const m3 = L * W * avgDepth;
    setCalcLitres(Math.round(m3 * 1000));
  };
  useEffect(() => { calcVolume(); }, [lenM, widM, shallowM, deepM]);

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      <h3 style={{ marginTop: 0 }}>Settings</h3>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', alignItems: 'end' }}>
        <Labeled label="Pool volume (L)">
          <input id="poolVolumeL" type="number" inputMode="numeric" value={poolVolumeL} onChange={(e)=>setPoolVolumeL(e.target.value)} style={inputStyle} placeholder="e.g., 34500" />
        </Labeled>

        <Labeled label="Salt pool mode">
          <label style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={saltPoolMode} onChange={(e)=>setSaltPoolMode(e.target.checked)} /> Enabled
          </label>
        </Labeled>

        <Labeled label="Cell rating (g/hr @100%)">
          <input id="cellRate" type="number" inputMode="numeric" value={chlorinatorRated_g_per_hr} onChange={(e)=>setRated(e.target.value)} style={inputStyle} placeholder="e.g., 20" />
        </Labeled>

        <Labeled label="Daily pump hours">
          <input id="pumpHours" type="number" inputMode="numeric" value={dailyPumpHours} onChange={(e)=>setHours(e.target.value)} style={inputStyle} placeholder="e.g., 8" />
        </Labeled>

        <Labeled label="Current output (%)">
          <input id="outputPct" type="number" inputMode="numeric" value={currentOutputPercent} onChange={(e)=>setPct(e.target.value)} style={inputStyle} placeholder="e.g., 60" />
        </Labeled>

        <Labeled label="Liquid chlorine strength (%) (optional)">
          <input id="clStrength" type="number" step="0.1" min="1" max="15" inputMode="decimal" value={chlorineStrengthPct} onChange={(e)=>setClStrength(e.target.value)} style={inputStyle} placeholder="e.g., 12.5" />
        </Labeled>

        {/* Editable target ranges */}
        <Fieldset legend="Target ranges">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
            <MiniRange label="pH" minId="phMin" maxId="phMax" minVal={phMin} maxVal={phMax} onMin={setPhMin} onMax={setPhMax} />
            <MiniRange label="Chlorine (ppm)" minId="clMin" maxId="clMax" minVal={clMin} maxVal={clMax} onMin={setClMin} onMax={setClMax} />
            <MiniRange label="Salt (ppm)" minId="saltMin" maxId="saltMax" minVal={saltMin} maxVal={saltMax} onMin={setSaltMin} onMax={setSaltMax} />
          </div>
        </Fieldset>

        <div><button onClick={save}>Save</button></div>
      </div>

      {/* Helpers */}
      <div style={{ marginTop: 14 }}>
        <details>
          <summary style={summaryStyle}>Helpers & how to read each value</summary>
          <div style={{ paddingTop: 10, display: 'grid', gap: 12 }}>
            {/* Volume calculator */}
            <HelperCard title="Quick volume calculator (metres)">
              <div style={{ display:'grid', gap:8, gridTemplateColumns:'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <MiniField label="Length (m)"><input type="number" step="0.01" value={lenM} onChange={(e)=>setLenM(e.target.value)} style={inputStyle} /></MiniField>
                <MiniField label="Width (m)"><input type="number" step="0.01" value={widM} onChange={(e)=>setWidM(e.target.value)} style={inputStyle} /></MiniField>
                <MiniField label="Shallow (m)"><input type="number" step="0.01" value={shallowM} onChange={(e)=>setShallowM(e.target.value)} style={inputStyle} /></MiniField>
                <MiniField label="Deep (m)"><input type="number" step="0.01" value={deepM} onChange={(e)=>setDeepM(e.target.value)} style={inputStyle} /></MiniField>
              </div>
              <p style={pStyle}>Average depth = (Shallow + Deep) / 2. Volume (L) = Length × Width × AvgDepth × 1000.</p>
              <div className="helper-actions" style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <div><strong>Estimated volume:</strong> {calcLitres ? calcLitres.toLocaleString() : '—'} L</div>
                <button onClick={()=>setAndFocus(setPoolVolumeL, calcLitres || '', 'poolVolumeL')} disabled={!calcLitres}>Use result</button>
                <button className="secondary" onClick={calcVolume}>Recalculate</button>
              </div>
            </HelperCard>

            {/* Presets */}
            <HelperCard title="Quick presets">
              <div className="helper-actions" style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button className="secondary" onClick={()=>{ setPhMin('7.2'); setPhMax('7.6'); }}>pH 7.2–7.6</button>
                <button className="secondary" onClick={()=>{ setClMin('1'); setClMax('3'); }}>Chlorine 1–3 ppm</button>
                <button className="secondary" onClick={()=>{ setSaltMin('3000'); setSaltMax('4500'); }}>Salt 3000–4500 ppm</button>
              </div>
            </HelperCard>

            {/* Device reading tips */}
            <HelperCard title="Reading your chlorinator %">
              <p style={pStyle}>
                On your <strong>Pool Controls XLS (Xtra Low Salt)</strong>: press <strong>Menu</strong>, use <strong>◀ ▶</strong> to find <em>OUTPUT xx%</em>, then <strong>▲ ▼</strong> to adjust. Let it sit to save.
              </p>
            </HelperCard>

            <div style={{ textAlign: 'right' }}><button onClick={save}>Save all</button></div>
          </div>
        </details>
      </div>

      <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, lineHeight: 1.4 }}>
        These settings are stored locally in your browser and used to tailor advisories and chart bands.
      </div>
    </div>
  );
}

function Labeled({ label, children }) {
  return (<div><label style={{ display:'block', fontSize:12, opacity:.8, marginBottom:6 }}>{label}</label>{children}</div>);
}
function Fieldset({ legend, children }) {
  return (
    <fieldset style={{ border:'1px solid #e5eaef', borderRadius:10, padding:12 }}>
      <legend style={{ padding:'0 6px', fontSize:12, color:'#475569' }}>{legend}</legend>
      {children}
    </fieldset>
  );
}
function MiniRange({ label, minId, maxId, minVal, maxVal, onMin, onMax }) {
  return (
    <div>
      <div style={{ fontSize:12, opacity:.8, marginBottom:6 }}>{label}</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        <input id={minId} type="number" step="0.01" value={minVal} onChange={(e)=>onMin(e.target.value)} style={inputStyle} placeholder="min" />
        <input id={maxId} type="number" step="0.01" value={maxVal} onChange={(e)=>onMax(e.target.value)} style={inputStyle} placeholder="max" />
      </div>
    </div>
  );
}
function HelperCard({ title, children }) {
  return (
    <div style={{ background:'#fff', border:'1px solid #e5eaef', borderRadius:10, padding:12 }}>
      <div style={{ fontWeight:600, marginBottom:6 }}>{title}</div>
      {children}
    </div>
  );
}
function MiniField({ label, children }) {
  return (<label style={{ display:'grid', gap:6 }}><span style={{ fontSize:12, opacity:.8 }}>{label}</span>{children}</label>);
}
const inputStyle = {
  width:'100%', boxSizing:'border-box', background:'#fff', color:'#0f172a',
  padding:'10px 12px', border:'1px solid #d6dee6', borderRadius:10, outline:'none',
};
const summaryStyle = { cursor:'pointer', fontWeight:600 };
const pStyle = { margin:0, lineHeight:1.35, color:'#334155' };
