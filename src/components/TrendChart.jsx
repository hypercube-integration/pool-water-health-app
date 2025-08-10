// src/components/TrendChart.jsx
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea,
} from 'recharts';

const DEFAULT_TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1, 3],
  salt: [3000, 4500],
};

export default function TrendChart({ data, showAverages = true, targets }) {
  const t = normalizeTargets(targets || DEFAULT_TARGETS);

  const common = {
    margin: { top: 10, right: 22, bottom: 0, left: 0 },
  };

  return (
    <div className="chart-grid">
      {/* pH */}
      <div className="chart-panel">
        <h3>pH</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.ph[0]} y2={t.ph[1]} fill="#f59e0b" fillOpacity={0.18} />
            <Line type="monotone" dataKey="ph" name="pH" stroke="#7c3aed" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line
                type="monotone"
                dataKey="phAvg7"
                name="pH (7d avg)"
                stroke="#7c3aed"
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chlorine */}
      <div className="chart-panel">
        <h3>Chlorine (ppm)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.chlorine[0]} y2={t.chlorine[1]} fill="#22c55e" fillOpacity={0.16} />
            <Line type="monotone" dataKey="chlorine" name="Chlorine" stroke="#16a34a" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line
                type="monotone"
                dataKey="chlorineAvg7"
                name="Chlorine (7d avg)"
                stroke="#16a34a"
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Salt */}
      <div className="chart-panel">
        <h3>Salt (ppm)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...common}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.salt[0]} y2={t.salt[1]} fill="#3b82f6" fillOpacity={0.14} />
            <Line type="monotone" dataKey="salt" name="Salt" stroke="#2563eb" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line
                type="monotone"
                dataKey="saltAvg7"
                name="Salt (7d avg)"
                stroke="#2563eb"
                strokeDasharray="5 5"
                dot={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Ensure targets are valid [min, max] arrays with sane fallbacks */
function normalizeTargets(t) {
  const pick = (pair, def) => {
    const a = Number(pair?.[0]), b = Number(pair?.[1]);
    return Number.isFinite(a) && Number.isFinite(b) && a < b ? [a, b] : def;
  };
  return {
    ph: pick(t.ph, DEFAULT_TARGETS.ph),
    chlorine: pick(t.chlorine, DEFAULT_TARGETS.chlorine),
    salt: pick(t.salt, DEFAULT_TARGETS.salt),
  };
}
