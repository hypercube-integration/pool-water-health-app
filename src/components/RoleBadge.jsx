// src/components/RoleBadge.jsx
export default function RoleBadge({ r }) {
  const palette = {
    admin:    { bg: 'rgba(99,102,241,.18)', fg: '#3730a3' },   // indigo
    writer:   { bg: 'rgba(16,185,129,.18)', fg: '#065f46' },   // green
    editor:   { bg: 'rgba(59,130,246,.18)', fg: '#1e3a8a' },   // blue
    deleter:  { bg: 'rgba(244,63,94,.18)',  fg: '#7f1d1d' },   // red
    exporter: { bg: 'rgba(234,179,8,.22)',  fg: '#78350f' },   // amber
    default:  { bg: 'rgba(148,163,184,.18)', fg: '#334155' },  // slate
  };
  const c = palette[r] || palette.default;
  return (
    <span style={{
      display: 'inline-block',
      padding: '3px 8px',
      borderRadius: 999,
      background: c.bg,
      color: c.fg,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {r}
    </span>
  );
}
