// src/components/HistoryList.jsx
import { useEffect, useMemo, useState } from 'react';

/**
 * HistoryList (presentational-first with self-fetch fallback)
 *
 * Prefer passing `readings` from parent (e.g., Dashboard) so charts and table
 * stay in sync. If `readings` is not provided, this component will self-fetch
 * from `/api/getReadings` using optional `startDate`, `endDate`, and `limit`.
 *
 * Props:
 *  - readings?: Array<{ id?: string, date: string, ph: number, chlorine: number, salt: number }>
 *  - canEdit?: boolean
 *  - startDate?: string "YYYY-MM-DD"   // used only in self-fetch mode
 *  - endDate?: string "YYYY-MM-DD"     // used only in self-fetch mode
 *  - limit?: number (default 365)      // used only in self-fetch mode
 *  - onEdit?:  (reading) => void
 *  - onDelete?: (reading) => Promise<void> | void
 */
export default function HistoryList({
  readings,
  canEdit = false,
  startDate,
  endDate,
  limit = 365,
  onEdit,
  onDelete,
}) {
  const [internal, setInternal] = useState([]);
  const [loading, setLoading] = useState(false);

  const usingParentData = Array.isArray(readings);

  // Self-fetch only if parent did not provide readings
  useEffect(() => {
    if (usingParentData) return;

    let cancelled = false;
    const fetchIt = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        params.set('limit', String(limit));

        const res = await fetch(`/api/getReadings?${params.toString()}`, {
          credentials: 'include',
        });
        const data = await res.json().catch(() => []);
        if (!cancelled) setInternal(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setInternal([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchIt();
    return () => {
      cancelled = true;
    };
  }, [usingParentData, startDate, endDate, limit]);

  const rows = useMemo(() => {
    const src = usingParentData ? readings : internal;
    const copy = Array.isArray(src) ? [...src] : [];
    // Show newest first in the table
    copy.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));
    return copy;
  }, [usingParentData, readings, internal]);

  const handleEdit = (r) => {
    if (onEdit) return onEdit(r);
    alert('Edit not wired: pass `onEdit` to HistoryList to handle editing (e.g., open LogEntryForm).');
  };

  const handleDelete = async (r) => {
    if (onDelete) {
      await onDelete(r);
      return;
    }
    // Basic inline delete (fallback) if no handler is supplied
    const ok = window.confirm(`Delete reading for ${r.date}?`);
    if (!ok) return;
    try {
      const params = new URLSearchParams();
      if (r.id) params.set('id', r.id);
      params.set('date', r.date); // partition key
      const res = await fetch(`/api/deleteReading?${params.toString()}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      if (usingParentData) {
        alert('Deleted. Refresh your data to reflect changes.');
      } else {
        setInternal((prev) => prev.filter((x) => x.id !== r.id && x.date !== r.date));
      }
    } catch (e) {
      alert('Failed to delete reading.');
      console.error(e);
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {loading && <div>Loading…</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <Th>Date</Th>
            <Th>pH</Th>
            <Th>Chlorine</Th>
            <Th>Salt</Th>
            {canEdit && <Th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id ?? r.date}>
              <Td>{r.date}</Td>
              <Td>{safeNum(r.ph)}</Td>
              <Td>{safeNum(r.chlorine)}</Td>
              <Td>{safeNum(r.salt)}</Td>
              {canEdit && (
                <Td>
                  <button onClick={() => handleEdit(r)} style={{ marginRight: 6 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(r)}>Delete</button>
                </Td>
              )}
            </tr>
          ))}
          {!rows.length && !loading && (
            <tr>
              <td colSpan={canEdit ? 5 : 4} style={{ padding: 12, textAlign: 'center', opacity: 0.7 }}>
                No readings to display.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{ textAlign: 'left', borderBottom: '1px solid #ddd', padding: 6 }}>
      {children}
    </th>
  );
}

function Td({ children }) {
  return <td style={{ borderBottom: '1px solid #eee', padding: 6 }}>{children}</td>;
}

function safeNum(v) {
  return typeof v === 'number' && isFinite(v) ? v : '';
}
