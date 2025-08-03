import { useState, useEffect } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import AdviceCard from '../components/AdviceCard';
import HistoryList from '../components/HistoryList';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch readings from API when the component loads
  useEffect(() => {
    const fetchReadings = async () => {
      try {
        const res = await fetch('/api/getReadings');
        if (!res.ok) throw new Error('Failed to load readings');
        const data = await res.json();
        setEntries(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchReadings();
  }, []);

  const handleSubmit = async (entry) => {
    setLoading(true);
    try {
      const res = await fetch('/api/submitReading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      console.log('Azure Function response:', data);

      setEntries([entry, ...entries]);

      const tips = [];
      if (entry.ph > 7.6) tips.push('Add 300ml acid');
      else if (entry.ph < 7.2) tips.push('Add soda ash');
      if (entry.chlorine < 1.0) tips.push('Add chlorine');
      if (entry.salt < 2000) tips.push('Add 2kg salt');

      setAdvice(tips);
    } catch (err) {
      console.error('Error submitting reading:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard">
      <LogEntryForm onSubmit={handleSubmit} />
      {loading && <p>⏳ Submitting reading...</p>}
      <AdviceCard advice={advice} />
      <HistoryList entries={entries} />
    </div>
  );
}