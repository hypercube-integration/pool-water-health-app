import { useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import AdviceCard from '../components/AdviceCard';
import HistoryList from '../components/HistoryList';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [advice, setAdvice] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (entry) => {
    setLoading(true);

    try {
      // Send the reading to the Azure Function API
      const res = await fetch('/api/submitReading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) {
        throw new Error(`Error from API: ${res.status}`);
      }

      const data = await res.json();
      console.log('Azure Function response:', data);

      // Add the new entry to local state
      const newEntries = [entry, ...entries];
      setEntries(newEntries);

      // Generate basic recommendations
      const tips = [];
      if (entry.ph > 7.6) tips.push('Add 300ml acid');
      else if (entry.ph < 7.2) tips.push('Add soda ash');

      if (entry.chlorine < 1.0) tips.push('Add chlorine');
      if (entry.salt < 2000) tips.push('Add 2kg salt');

      setAdvice(tips);
    } catch (error) {
      console.error('Error submitting reading:', error);
      alert('Failed to submit reading. Please try again.');
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