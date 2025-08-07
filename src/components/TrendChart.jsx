import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea
} from 'recharts';

export default function TrendChart({ entries }) {
  if (!entries || entries.length === 0) return null;

  const formatData = (key) =>
    entries.map((entry) => ({
      date: entry.date,
      value: parseFloat(entry[key]),
    }));

  const ChartSection = ({ title, data, lower, upper, unit }) => (
    <div style={{ width: '100%', height: 300, marginBottom: '40px' }}>
      <h3 style={{ textAlign: 'center', marginBottom: 10 }}>{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, bottom: 20, left: 30 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis domain={['auto', 'auto']} tickFormatter={(val) => `${val}${unit || ''}`} />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#00bcd4" strokeWidth={2} dot={{ r: 3 }} />
          <ReferenceArea y1={lower} y2={upper} fill="#c8e6c9" stroke="none" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <div style={{ marginTop: '40px' }}>
      <h2 style={{ textAlign: 'center' }}>📈 Trend</h2>

      <ChartSection
        title="pH Trend"
        data={formatData('ph')}
        lower={7.2}
        upper={7.6}
      />

      <ChartSection
        title="Chlorine Trend"
        data={formatData('chlorine')}
        lower={1}
        upper={3}
        unit=" ppm"
      />

      <ChartSection
        title="Salt Trend"
        data={formatData('salt')}
        lower={2500}
        upper={4000}
        unit=" ppm"
      />
    </div>
  );
}
