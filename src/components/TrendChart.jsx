import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer
} from 'recharts';

// Target zones for guidance
const targetZones = {
  ph: { min: 7.2, max: 7.6, unit: '' },
  chlorine: { min: 1.0, max: 3.0, unit: 'ppm' },
  salt: { min: 2000, max: 3500, unit: 'ppm' }
};

export default function TrendChart({ data, dataKey, color, label, unit }) {
  const zone = targetZones[dataKey] || null;

  return (
    <div style={{ width: '100%', height: 300, marginBottom: '2rem' }}>
      <h3 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>
        {label} Trend
      </h3>
      <ResponsiveContainer>
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 60, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis
            unit={unit}
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ dx: -4 }}
          />
          <Tooltip
            formatter={(value) => `${value} ${unit}`}
            labelFormatter={formatDate}
          />
          <Legend />

          {zone && (
            <>
              <ReferenceArea
                y1={zone.min}
                y2={zone.max}
                strokeOpacity={0.1}
                fill="#a0f0a0"
                fillOpacity={0.3}
              />
              {/* Optional visual guide line — can remove if not needed */}
              <ReferenceLine
                y={zone.min}
                stroke="red"
                strokeDasharray="3 3"
                label={`Min ${zone.min}${zone.unit}`}
              />
            </>
          )}

          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={label}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Helper: Format date for X-axis and tooltip
function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
