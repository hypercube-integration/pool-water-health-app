// src/components/TrendChart.jsx
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ReferenceArea, ReferenceLine,
} from 'recharts';

const DEFAULT_TARGETS = {
  ph: [7.2, 7.6],
  chlorine: [1, 3],
  salt: [3000, 4500],
};

export default function TrendChart({ data, showAverages = true, targets }) {
  const t = normalizeTargets(targets || DEFAULT_TARGETS);

  const makeDomain = (lo, hi, padLo = 0, padHi = 0) => ([
    (dataMin) => Math.min(isNum(dataMin) ? dataMin : lo, lo) - padLo,
    (dataMax) => Math.max(isNum(dataMax) ? dataMax : hi, hi) + padHi,
  ]);

  const commonChartProps = { margin: { top: 10, right: 22, bottom: 0, left: 0 } };

  return (
    <div className="chart-grid">
      {/* pH */}
      <div className="chart-panel">
        <h3>pH</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={makeDomain(t.ph[0], t.ph[1], 0.05, 0.05)} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.ph[0]} y2={t.ph[1]} fill="#7c3aed" fillOpacity={0.18} />
            <ReferenceLine y={t.ph[0]} stroke="#7c3aed" strokeDasharray="4 4" />
            <ReferenceLine y={t.ph[1]} stroke="#7c3aed" strokeDasharray="4 4" />

            <Line type="monotone" dataKey="ph" name="pH" stroke="#7c3aed" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line type="monotone" dataKey="phAvg7" name="pH (7d avg)" stroke="#7c3aed" strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Chlorine */}
      <div className="chart-panel">
        <h3>Chlorine (ppm)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={makeDomain(t.chlorine[0], t.chlorine[1], 0.1, 0.1)} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.chlorine[0]} y2={t.chlorine[1]} fill="#16a34a" fillOpacity={0.18} />
            <ReferenceLine y={t.chlorine[0]} stroke="#16a34a" strokeDasharray="4 4" />
            <ReferenceLine y={t.chlorine[1]} stroke="#16a34a" strokeDasharray="4 4" />

            <Line type="monotone" dataKey="chlorine" name="Chlorine" stroke="#16a34a" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line type="monotone" dataKey="chlorineAvg7" name="Chlorine (7d avg)" stroke="#16a34a" strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Salt */}
      <div className="chart-panel">
        <h3>Salt (ppm)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={data} {...commonChartProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={makeDomain(t.salt[0], t.salt[1], 100, 100)} />
            <Tooltip />
            <Legend />
            <ReferenceArea y1={t.salt[0]} y2={t.salt[1]} fill="#2563eb" fillOpacity={0.18} />
            <ReferenceLine y={t.salt[0]} stroke="#2563eb" strokeDasharray="4 4" />
            <ReferenceLine y={t.salt[1]} stroke="#2563eb" strokeDasharray="4 4" />

            <Line type="monotone" dataKey="salt" name="Salt" stroke="#2563eb" dot={false} strokeWidth={2} />
            {showAverages && (
              <Line type="monotone" dataKey="saltAvg7" name="Salt (7d avg)" stroke="#2563eb" strokeDasharray="5 5" dot={false} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function normalizeTargets(t) {
  const pick = (pair, def) => {
    const a = Number(pair?.[0]), b = Number(pair?.[1]);
    return isNum(a) && isNum(b) && a < b ? [a, b] : def;
  };
  return {
    ph: pick(t.ph, DEFAULT_TARGETS.ph),
    chlorine: pick(t.chlorine, DEFAULT_TARGETS.chlorine),
    salt: pick(t.salt, DEFAULT_TARGETS.salt),
  };
}

function isNum(n) {
  return Number.isFinite(Number(n));
}
