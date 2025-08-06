import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function TrendChart({ data, dataKey, color, label, unit }) {
  return (
    <div style={{ width: '100%', height: 300, marginBottom: '2rem' }}>
      <h3 style={{ textTransform: 'capitalize', marginBottom: '0.5rem' }}>{label} Trend</h3>
      <ResponsiveContainer>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} />
          <YAxis unit={unit} />
          <Tooltip formatter={(value) => `${value} ${unit}`} labelFormatter={formatDate} />
          <Legend />
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

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
