import React, { useEffect, useState } from 'react';
import LogEntryForm from './LogEntryForm';
import HistoryList from './HistoryList';
import TrendChart from './TrendChart';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [advice, setAdvice] = useState([]);

  useEffect(() => {
    fetchReadings();
  }, []);

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/getReadings?limit=30');
      if (!res.ok) throw new Error('Failed to fetch readings');
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (entry) => {
    setLoading(true);
    setError(null);
    const isEdit = !!entry.id;

    try {
      const res = await fetch(`/api/${isEdit ? 'updateReading' : 'submitReading'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      await res.json();

      await fetchReadings();
      setAdvice([]);
      setEditEntry(null);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err.message || 'Submission failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (entry) => {
    setEditEntry(entry);
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/api/exportCSV');
      if (!res.ok) throw new Error('Failed to export CSV');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pool_readings.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error:', err);
      alert('Error downloading CSV');
    }
  };

  return (
    <div className="dashboard">
      <h1>🏊 Pool Water Health Dashboard</h1>

      <LogEntryForm
        onSubmit={handleSubmit}
        initialValues={editEntry}
        onCancelEdit={() => setEditEntry(null)}
      />

      {error && <div className="error">{error}</div>}
      {loading && <div>Loading...</div>}

      {!loading && entries.length > 0 && (
        <>
          <button onClick={handleDownloadCSV}>⬇️ Download CSV</button>
          <HistoryList entries={entries} onEdit={handleEdit} />
          <TrendChart entries={entries} />
        </>
      )}
    </div>
  );
}
