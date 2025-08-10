// src/components/AdvisoriesPanel.jsx
import { TARGETS, buildAdvisories } from '../utils/chemistry';

const badgeColors = {
  ok:    { bg: 'rgba(16,185,129,.15)', fg: '#065f46', label: 'All good' },
  info:  { bg: 'rgba(59,130,246,.15)', fg: '#1e3a8a', label: 'Info' },
  warn:  { bg: 'rgba(245,158,11,.18)', fg: '#78350f', label: 'Attention' },
  crit:  { bg: 'rgba(239,68,68,.18)',  fg: '#7f1d1d', label: 'Action' },
};

export default function AdvisoriesPanel({ latestReading, targets = TARGETS, settings }) {
  const adv = buildAdvisories(latestReading, targets, settings || {});
  const tone = badgeColors[adv.overall] || badgeColors.ok;

  return (
    <div className="section" style={{ background: 'rgba(0,0,0,0.03)', borderRadius: 12, padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{
          padding: '4px 8px', borderRadius: 999,
          background: tone.bg, color: tone.fg, fontSize: 12, fontWeight: 600
        }}>
          {tone.label}
        </span>
        <div style={{ opacity: .7, fontSize: 13 }}>
          {latestReading?.date ? `Based on ${latestReading.date}` : 'No reading available'}
        </div>
      </div>

      {adv.items.length === 0 ? (
        <div style={{ color: '#0f766e' }}>Water chemistry is within target ranges. Keep up the good work!</div>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          {adv.items.map(item => (
            <li key={item.id} style={{ margin: '6px 0' }}>
              <strong>{item.title}:</strong> <span style={{ opacity: .9 }}>{item.detail}</span>
            </li>
          ))}
        </ul>
      )}

      {!!settings && !settings.poolVolumeL && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
          Tip: set your pool volume in <em>Settings</em> to see exact dosage amounts.
        </div>
      )}
    </div>
  );
}
