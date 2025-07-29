export default function AdviceCard({ advice = [] }) {
  return (
    <div className="advice-card">
      <h3>Today's Recommendations</h3>
      <ul>
        {advice.length ? advice.map((tip, i) => <li key={i}>{tip}</li>) : <li>No advice yet</li>}
      </ul>
    </div>
  );
}
