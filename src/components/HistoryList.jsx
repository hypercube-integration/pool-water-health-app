import React from 'react';

export default function HistoryList({ entries, onEdit }) {
  return (
    <div className="history-list">
      <h2>📜 History (last {entries.length} entries)</h2>
      {entries.map((entry) => (
        <div className="history-row" key={entry.id}>
          <span className="entry-text">
            📅 {entry.date} | pH: {entry.ph} | Cl: {entry.chlorine} | Salt: {entry.salt}
          </span>
          <div className="entry-actions">
            <button className="edit-btn" onClick={() => onEdit(entry)}>✏️ Edit</button>
            {/* Future: <button className="delete-btn">🗑️ Delete</button> */}
          </div>
        </div>
      ))}
    </div>
  );
}
