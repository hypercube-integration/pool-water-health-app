import React, { useEffect, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import useAuth from '../hooks/useAuth';

export default function Dashboard() {
  const { user, authLoading } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [advice, setAdvice] = useState([]);

  const LIMIT = 30;

  useEffect(() => {
    fetchReadings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchReadings = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/getReadings?limit=${LIMIT}`);
      if (!res.ok) throw new Error(`Failed to fetch readings (${res.status})`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message || 'Error fetching data.');
    } finally {
      setLoading(false);
    }
  };

  const redirectToLogin = () => {
    window.location.href = '/.auth/login/github?post_login_redirect_uri=/';
  };

  const handleSubmit = async (entry) => {
    setLoading(true);
    setError(null);

    if (!user) {
      setLoading(false);
      alert('Please sign in to add or edit a reading.');
      redirectToLogin();
      return;
    }

    const isEdit = !!entry.id;

    try {
      const res = await fetch(`/api/${isEdit ? 'updateReading' : 'submitReading'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (res.status === 401) {
        setLoading(false);
        alert('Please sign in to add or edit a reading.');
        redirectToLogin();
        return;
      }

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
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entry) => {
    if (!entry?.id || !entry?.date) {
      alert('Missing id or date for this entry; cannot delete.');
      return;
    }
    const confirmDelete = window.confirm(`Delete reading for ${entry.date}?`);
    if (!confirmDelete) return;

    setLoading(true);
    setError(null);

    try {
      const url = `/api/deleteReading?id=${encodeURIComponent(entry.id)}&date=${encodeURIComponent(entry.date)}`;
      const res = await fetch(url, { method: 'DELETE' });

      if (res.status === 401) {
        setLoading(false);
        alert('Please sign in to delete a reading.');
        redirectToLogin();
        return;
      }

      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
      await fetchReadings();
      if (editEntry?.id === entry.id) setEditEntry(null);
    } catch (err) {
      console.error('Delete error:', err);
      setError(err.message || 'Failed to delete reading.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await fetch('/api/exportCSV');
      if (res.status === 401) {
        alert('Please sign in to download CSV.');
        redirectToLogin();
        return;
      }
      if (!res.ok) throw new Error(`Failed to export CSV (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pool_readings.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV download error:', err);
      alert('Error downloading CSV. Check console for details.');
    }
  };

  return (
    <div className="dashboard">
      <AuthStatus />
      <h1>🏊 Pool Water Health Dashboard</h1>

      {authLoading ? (
        <p>🔍 Checking sign-in status...</p>
      ) : user ? (
        <LogEntryForm
          onSubmit={handleSubmit}
          initialValues={editEntry}
          onCancelEdit={() => setEditEntry(null)}
        />
      ) : (
        <div className="login-banner">
          <p>🔐 Please sign in to add, edit, or delete readings.</p>
          <button onClick={redirectToLogin}>Sign in with GitHub</button>
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}
      {loading && <div>⏳ Loading...</div>}

      {!loading && (
        <>
          <button className="download-btn" onClick={handleDownloadCSV}>
            📥 Download CSV
          </button>

          <TrendChart entries={entries} />

          <HistoryList
            entries={entries}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}
