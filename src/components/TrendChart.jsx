// src/components/TrendChart.jsx
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
  Legend,
} from 'recharts';

/**
 * TrendChart
 * Props:
 *  - data: Array<{ date: string, ph?: number, chlorine?: number, salt?: number }>
 *  - height?: number (default 280)
 *  - targetBands?: {
 *      ph?: [number, number],
 *      chlorine?: [number, number],
 *      salt?: [number, number]
 *    }
 *
 * Renders three time-series charts (pH, Chlorine, Salt) using the given `data`.
 * If a band is not provided, a sensible default is used for that metric.
 */
export default function TrendChart({
  data = [],
  height = 280,
  targetBands = {
    ph: [7.2, 7.6],
    chlorine: [1.0, 3.0],
    salt: [3000, 4500], // ppm (adjust if your pool's target differs)
  },
}) {
  // Defensive copy to ensure ascending order for nicer L→R reading
  const sorted = [...data].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  return (
    <div className="trend-chart" style={{ display: 'grid', gap: 12 }}>
      {/* pH */}
      <ChartCard title="pH" height={height}>
        <ResponsiveContainer>
          <LineChart data={sorted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[6.8, 8.2]} />
            <Tooltip />
            <Legend />
            {Array.isArray(targetBands?.ph) && (
              <ReferenceArea y1={targetBands.ph[0]} y2={targetBands.ph[1]} />
            )}
            <Line type="monotone" dataKey="ph" dot name="pH" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Chlorine */}
      <ChartCard title="Chlorine (ppm)" height={height}>
        <ResponsiveContainer>
          <LineChart data={sorted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(targetBands?.chlorine) && (
              <ReferenceArea y1={targetBands.chlorine[0]} y2={targetBands.chlorine[1]} />
            )}
            <Line type="monotone" dataKey="chlorine" dot name="Chlorine" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* Salt */}
      <ChartCard title="Salt (ppm)" height={height}>
        <ResponsiveContainer>
          <LineChart data={sorted}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            {Array.isArray(targetBands?.salt) && (
              <ReferenceArea y1={targetBands.salt[0]} y2={targetBands.salt[1]} />
            )}
            <Line type="monotone" dataKey="salt" dot name="Salt" />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, height, children }) {
  return (
    <section style={{ margin: '8px 0' }}>
      <h3 style={{ margin: '6px 0' }}>{title}</h3>
      <div
        style={{
          width: '100%',
          height,
          background: 'rgba(0,0,0,0.02)',
          borderRadius: 8,
          padding: 8,
        }}
      >
        {children}
      </div>
    </section>
  );
}
