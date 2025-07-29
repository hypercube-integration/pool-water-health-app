export default function HistoryList({ entries }) {
  return (
    <div className="history-list">
      <h3>Recent Logs</h3>
      <ul>
        {entries.map((entry, i) => (
          <li key={i}>
            {entry.date}: pH {entry.ph}, Cl {entry.chlorine}ppm, Salt {entry.salt}ppm
          </li>
        ))}
      </ul>
    </div>
  );
}
