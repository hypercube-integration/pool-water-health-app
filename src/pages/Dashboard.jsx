import { useState, useEffect } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import AdviceCard from '../components/AdviceCard';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState(null);

  const LIMIT = 30;

  const fetchReadings = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/getReadings?limit=${LIMIT}`);
      if (!res.ok) throw new Error(`Failed to load readings (${res.status})`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load readings');
    } finally {
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (entry) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/submitReading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      await res.json();

      await fetchReadings();

      const tips = [];
      if (entry.ph > 7.6) tips.push('Add 300ml acid');
      else if (entry.ph < 7.2) tips.push('Add soda ash');
      if (entry.chlorine < 1.0) tips.push('Add chlorine');
      if (entry.salt < 2000) tips.push('Add 2kg salt');
      setAdvice(tips);
    } catch (err) {
      console.error('Error submitting reading:', err);
      setError(err.message || 'Failed to submit reading');
    } finally {
      setLoading(false);
    }
  };

  // 🚀 CSV Download handler
  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/api/exportCSV');
      if (!res.ok) throw new Error(`Error ${res.status}`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = 'readings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
      alert('Failed to download CSV. See console for details.');
    }
  };

  return (
    <div className="dashboard">
      <LogEntryForm onSubmit={handleSubmit} />

      {initialLoading && <p>⏳ Loading readings...</p>}
      {loading && !initialLoading && <p>⏳ Submitting reading...</p>}
      {error && <p style={{ color: '#b00020' }}>⚠️ {error}</p>}

      <AdviceCard advice={advice} />

      <button onClick={handleDownloadCSV} style={{ marginBottom: '1rem' }}>
        📥 Download CSV
      </button>

      <TrendChart
        data={entries}
        dataKey="ph"
        color="#ff7300"
        label="pH"
        unit=""
      />

      <TrendChart
        data={entries}
        dataKey="chlorine"
        color="#387908"
        label="Chlorine"
        unit="ppm"
      />

      <TrendChart
        data={entries}
        dataKey="salt"
        color="#0088FE"
        label="Salt"
        unit="ppm"
      />

      <HistoryList entries={entries} />
    </div>
  );
}
