// src/components/TrendChart.jsx
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceArea,
} from 'recharts';

export default function TrendChart({ data, showAverages = true, targets }) {
  const t = targets || {
    ph: [7.2, 7.6],
    chlorine: [1, 3],
    salt: [3000, 4500],
  };

  const common = {
    margin: { top: 10, right: 18, bottom: 0, left: 0 },
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
            <ReferenceArea y1={t.ph[0]} y2={t.ph[1]} fill="orange" fillOpacity={0.12} />
            <Line type="monotone" dataKey="ph" name="pH" dot={false} />
            {showAverages && <Line type="monotone" dataKey="phAvg7" name="pH (7d avg)" strokeDasharray="5 5" dot={false} />}
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
            <ReferenceArea y1={t.chlorine[0]} y2={t.chlorine[1]} fill="green" fillOpacity={0.12} />
            <Line type="monotone" dataKey="chlorine" name="Chlorine" dot={false} />
            {showAverages && <Line type="monotone" dataKey="chlorineAvg7" name="Chlorine (7d avg)" strokeDasharray="5 5" dot={false} />}
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
            <ReferenceArea y1={t.salt[0]} y2={t.salt[1]} fill="blue" fillOpacity={0.12} />
            <Line type="monotone" dataKey="salt" name="Salt" dot={false} />
            {showAverages && <Line type="monotone" dataKey="saltAvg7" name="Salt (7d avg)" strokeDasharray="5 5" dot={false} />}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
