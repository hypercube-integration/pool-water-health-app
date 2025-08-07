// HistoryList.jsx
export default function HistoryList({ entries, onEdit }) {
  return (
    <div className="history-list">
      <h2>📜 History (last {entries.length} entries)</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            📅 {entry.date} | pH: {entry.ph} | Cl: {entry.chlorine} | Salt: {entry.salt}
            <button onClick={() => onEdit(entry)} style={{ marginLeft: '10px' }}>
              ✏️ Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
