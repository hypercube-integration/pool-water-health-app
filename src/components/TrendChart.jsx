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
 */
export default function TrendChart({
  data = [],
  height = 280,
  targetBands = {
    ph: [7.2, 7.6],
    chlorine: [1.0, 3.0],
    salt: [3000, 4500],
  },
}) {
  // Ascending sort by date
  const sorted = [...data].sort((a, b) =>
    a.date < b.date ? -1 : a.date > b.date ? 1 : 0
  );

  return (
    <div className="trend-chart" style={{ display: 'grid', gap: 12 }}>
      {/* pH */}
      <ChartCard title="pH" height={height}>
        <div className="chart-inner">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" padding={{ left: 5, right: 20 }} />
              <YAxis domain={[6.8, 8.2]} />
              <Tooltip />
              <Legend />
              {Array.isArray(targetBands?.ph) && (
                <ReferenceArea
                  y1={targetBands.ph[0]}
                  y2={targetBands.ph[1]}
                  fill="#f97316"       // Orange for pH
                  fillOpacity={0.15}
                  stroke="none"
                />
              )}
              <Line
                type="monotone"
                dataKey="ph"
                stroke="#f97316"
                dot
                name="pH"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Chlorine */}
      <ChartCard title="Chlorine (ppm)" height={height}>
        <div className="chart-inner">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" padding={{ left: 5, right: 20 }} />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              {Array.isArray(targetBands?.chlorine) && (
                <ReferenceArea
                  y1={targetBands.chlorine[0]}
                  y2={targetBands.chlorine[1]}
                  fill="#16a34a"       // Green for Chlorine
                  fillOpacity={0.15}
                  stroke="none"
                />
              )}
              <Line
                type="monotone"
                dataKey="chlorine"
                stroke="#16a34a"
                dot
                name="Chlorine"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* Salt */}
      <ChartCard title="Salt (ppm)" height={height}>
        <div className="chart-inner">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" padding={{ left: 5, right: 20 }} />
              <YAxis domain={[2000, 5000]} />
              <Tooltip />
              <Legend />
              {Array.isArray(targetBands?.salt) && (
                <ReferenceArea
                  y1={targetBands.salt[0]}
                  y2={targetBands.salt[1]}
                  fill="#3b82f6"       // Blue for Salt
                  fillOpacity={0.15}
                  stroke="none"
                />
              )}
              <Line
                type="monotone"
                dataKey="salt"
                stroke="#3b82f6"
                dot
                name="Salt"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>
    </div>
  );
}

function ChartCard({ title, height, children }) {
  return (
    <section style={{ margin: '8px 0' }}>
      <h3 style={{ margin: '6px 0' }}>{title}</h3>
      <div
        className="chart-card"
        style={{
          width: '100%',
          height,
        }}
      >
        {children}
      </div>
    </section>
  );
}
