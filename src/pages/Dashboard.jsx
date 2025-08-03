import { useState } from 'react';
import LogEntryForm from '../components/LogEntryForm';
import AdviceCard from '../components/AdviceCard';
import HistoryList from '../components/HistoryList';

export default function Dashboard() {
  const [entries, setEntries] = useState([]);
  const [advice, setAdvice] = useState([]);

  const handleSubmit = (entry) => {
    const newEntries = [entry, ...entries];
    setEntries(newEntries);
    const tips = [];

    if (entry.ph > 7.6) tips.push("Add 300ml acid");
    else if (entry.ph < 7.2) tips.push("Add soda ash");

    if (entry.chlorine < 1.0) tips.push("Add chlorine");
    if (entry.salt < 2000) tips.push("Add 2kg salt");

    setAdvice(tips);
  };

  return (
    <div className="dashboard">
      <LogEntryForm onSubmit={handleSubmit} />
      <AdviceCard advice={advice} />
      <HistoryList entries={entries} />
    </div>
  );

}