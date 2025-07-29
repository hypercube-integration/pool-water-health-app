import { useState } from 'react';

export default function LogEntryForm({ onSubmit }) {
  const [ph, setPh] = useState('');
  const [chlorine, setChlorine] = useState('');
  const [salt, setSalt] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ph: parseFloat(ph), chlorine: parseFloat(chlorine), salt: parseInt(salt), date: new Date().toISOString().split('T')[0] });
    setPh('');
    setChlorine('');
    setSalt('');
  };

  return (
    <form onSubmit={handleSubmit} className="form">
      <h2>Log Today's Reading</h2>
      <label>🌡️ pH Level:</label>
      <input type="number" step="0.1" value={ph} onChange={(e) => setPh(e.target.value)} required />

      <label>💧 Chlorine (ppm):</label>
      <input type="number" step="0.1" value={chlorine} onChange={(e) => setChlorine(e.target.value)} required />

      <label>🧂 Salt (ppm):</label>
      <input type="number" value={salt} onChange={(e) => setSalt(e.target.value)} required />

      <button type="submit">Submit</button>
    </form>
  );
}
