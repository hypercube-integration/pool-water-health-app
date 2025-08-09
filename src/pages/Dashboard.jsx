import React, { useEffect, useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import HistoryList from '../components/HistoryList';
import TrendChart from '../components/TrendChart';
import AuthStatus from '../components/AuthStatus';
import useAuth from '../hooks/useAuth';
import useRoleCheck from '../hooks/useRoleCheck';

export default function Dashboard() {
  const { user, authLoading } = useAuth();

  // Role guards
  const { has: canWrite }  = useRoleCheck(['writer', 'admin']);
  const { has: canEdit }   = useRoleCheck(['editor', 'admin']);
  const { has: canDelete } = useRoleCheck(['deleter', 'admin']);
  const { has: canExport } = useRoleCheck(['exporter', 'admin']);

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

    // Enforce role UI-side (server still enforces)
    if (isEdit && !canEdit) {
      setLoading(false);
      alert('You do not have permission to edit readings.');
      return;
    }
    if (!isEdit && !canWrite) {
      setLoading(false);
      alert('You do not have permission to add readings.');
      return;
    }

    try {
      const res = await fetch(`/api/${isEdit ? 'updateReading' : 'submitReading'}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });

      if (res.status === 401) {
        setLoading(false);
        alert('Please sign in to continue.');
        redirectToLogin();
        return;
      }
      if (res.status === 403) {
        setLoading(false);
        alert('You do not have the required role to perform this action.');
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
    if (!canEdit) {
      alert('You do not have permission to edit readings.');
      return;
    }
    setEditEntry(entry);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (entry) => {
    if (!canDelete) {
      alert('You do not have permission to delete readings.');
      return;
    }
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
      if (res.status === 403) {
        setLoading(false);
        alert('You do not have permission to delete readings.');
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
    if (!canExport) {
      alert('You do not have permission to export CSV.');
      return;
    }
    try {
      const res = await fetch('/api/exportCSV');
      if (res.status === 401) {
        alert('Please sign in to download CSV.');
        redirectToLogin();
        return;
      }
      if (res.status === 403) {
        alert('You do not have permission to export CSV.');
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

  const showForm = user && (canWrite || canEdit);

  return (
    <div className="dashboard">
      <AuthStatus />
      <h1>🏊 Pool Water Health Dashboard</h1>

      {authLoading ? (
        <p>🔍 Checking sign-in status...</p>
      ) : showForm ? (
        <LogEntryForm
          onSubmit={handleSubmit}
          initialValues={editEntry}
          onCancelEdit={() => setEditEntry(null)}
        />
      ) : (
        <div className="login-banner">
          <p>🔐 Please sign in with the appropriate role to add or edit readings.</p>
          <button onClick={() => window.location.assign('/.auth/login/github?post_login_redirect_uri=/')}>
            Sign in with GitHub
          </button>
        </div>
      )}

      {error && <div className="error">⚠️ {error}</div>}
      {loading && <div>⏳ Loading...</div>}

      {!loading && (
        <>
          {canExport && (
            <button className="download-btn" onClick={handleDownloadCSV}>
              📥 Download CSV
            </button>
          )}

          <TrendChart entries={entries} />

          <HistoryList
            entries={entries}
            onEdit={canEdit ? handleEdit : undefined}
            onDelete={canDelete ? handleDelete : undefined}
            canEdit={canEdit}
            canDelete={canDelete}
          />
        </>
      )}
    </div>
  );
}
