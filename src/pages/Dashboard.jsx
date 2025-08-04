import { useState, useEffect } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import AdviceCard from '../components/AdviceCard';
import HistoryList from '../components/HistoryList';

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
      await res.json(); // not used directly, but confirms success

      // Refresh from server so ordering/contents match Cosmos DB
      await fetchReadings();

      // Generate advice based on the submitted entry
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

  return (
    <div className="dashboard">
      <LogEntryForm onSubmit={handleSubmit} />

      {initialLoading && <p>⏳ Loading readings...</p>}
      {loading && !initialLoading && <p>⏳ Submitting reading...</p>}
      {error && <p style={{ color: '#b00020' }}>⚠️ {error}</p>}

      <AdviceCard advice={advice} />
      <HistoryList entries={entries} />
    </div>
  );
}
