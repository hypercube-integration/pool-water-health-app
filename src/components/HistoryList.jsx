import React from 'react';

export default function HistoryList({ entries, onEdit, onDelete }) {
  if (!entries || entries.length === 0) {
    return (
      <div className="history-list">
        <h2>📜 History</h2>
        <p>No readings yet.</p>
      </div>
    );
  }

  return (
    <div className="history-list">
      <h2>📜 History (last {entries.length} entries)</h2>

      {entries.map((entry) => (
        <div
          className="history-row"
          key={entry.id || `${entry.date}-${entry.ph}-${entry.chlorine}-${entry.salt}`}
        >
          <span className="entry-text">
            📅 {entry.date} &nbsp;|&nbsp; pH: {entry.ph} &nbsp;|&nbsp; Cl: {entry.chlorine} &nbsp;|&nbsp; Salt: {entry.salt}
          </span>

          <div className="entry-actions">
            <button
              className="edit-btn"
              type="button"
              onClick={() => onEdit && onEdit(entry)}
              aria-label={`Edit reading for ${entry.date}`}
              title="Edit"
            >
              ✏️ Edit
            </button>

            <button
              className="delete-btn"
              type="button"
              onClick={() => onDelete && onDelete(entry)}
              aria-label={`Delete reading for ${entry.date}`}
              title="Delete"
            >
              🗑️ Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
