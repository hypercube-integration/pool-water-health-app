// src/components/AdvisoriesPanel.jsx
import { TARGETS, buildAdvisories, targetsFromSettings } from '../utils/chemistry';

const badgeColors = {
  ok:   { bg: 'rgba(16,185,129,.15)', fg: '#065f46', label: 'All good' },
  info: { bg: 'rgba(59,130,246,.15)', fg: '#1e3a8a', label: 'Info' },
  warn: { bg: 'rgba(245,158,11,.18)', fg: '#78350f', label: 'Attention' },
  crit: { bg: 'rgba(239,68,68,.18)',  fg: '#7f1d1d', label: 'Action' },
};

export default function AdvisoriesPanel({ latestReading, settings }) {
  const t = targetsFromSettings(settings);
  const adv = buildAdvisories(latestReading, t, settings || {});
  const tone = badgeColors[adv.overall] || badgeColors.ok;

  const chips = buildChips(settings || {}, t);

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 600 }}>
          {tone.label}
        </span>
        <div style={{ opacity: .7, fontSize: 13 }}>
          {latestReading?.date ? `Based on ${latestReading.date}` : 'No reading available'}
        </div>
      </div>

      {/* Items */}
      {adv.items.length === 0 ? (
        <div style={{ color: '#0f766e' }}>
          Water chemistry is within target ranges. Keep up the good work!
        </div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {adv.items.map(item => (
            <li key={item.id} style={{ margin: '6px 0' }}>
              <strong>{item.title}:</strong> <span style={{ opacity: .9 }}>{item.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Settings summary */}
      {chips.length > 0 && (
        <div aria-label="Based on your settings"
          style={{ marginTop: 10, paddingTop: 8, borderTop: '1px dashed #e5eaef', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>Based on your settings:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {chips.map((c, i) => (
              <span key={i} style={{ fontSize: 12, color: '#334155', background: '#ffffff', border: '1px solid #e5eaef', borderRadius: 999, padding: '3px 8px' }} title={c.title}>
                {c.text}
              </span>
            ))}
          </div>
        </div>
      )}

      {!!settings && !settings.poolVolumeL && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
          Tip: set your pool volume in <em>Settings</em> to see precise dosage recommendations.
        </div>
      )}
    </div>
  );
}

function buildChips(s, t) {
  const chips = [];
  if (s?.saltPoolMode) chips.push({ text: 'Salt pool mode', title: 'Advisories use chlorinator % / runtime' });
  if (Number.isFinite(Number(s?.poolVolumeL)) && s.poolVolumeL > 0) chips.push({ text: `${Math.round(Number(s.poolVolumeL)).toLocaleString()} L`, title: 'Pool volume' });
  if (Number.isFinite(Number(s?.chlorinatorRated_g_per_hr)) && s.chlorinatorRated_g_per_hr > 0) chips.push({ text: `${Number(s.chlorinatorRated_g_per_hr)} g/hr cell`, title: 'Cell rating at 100%' });
  if (Number.isFinite(Number(s?.dailyPumpHours)) && s.dailyPumpHours > 0) chips.push({ text: `${Number(s.dailyPumpHours)} h/day`, title: 'Pump schedule' });
  if (s?.currentOutputPercent != null && !Number.isNaN(Number(s.currentOutputPercent))) chips.push({ text: `${Number(s.currentOutputPercent)}% output`, title: 'Current chlorinator %' });

  // Targets chips
  if (t) {
    chips.push({ text: `pH ${t.ph[0]}–${t.ph[1]}`, title: 'Custom pH range' });
    chips.push({ text: `Cl ${t.chlorine[0]}–${t.chlorine[1]} ppm`, title: 'Custom chlorine range' });
    chips.push({ text: `Salt ${t.salt[0]}–${t.salt[1]} ppm`, title: 'Custom salt range' });
  }
  return chips;
}
