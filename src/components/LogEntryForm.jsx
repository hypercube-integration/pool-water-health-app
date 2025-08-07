import React, { useState, useEffect } from 'react';

export default function LogEntryForm({ onSubmit, initialValues, onCancelEdit }) {
  const [form, setForm] = useState({ date: '', ph: '', chlorine: '', salt: '' });

  useEffect(() => {
    if (initialValues) {
      setForm({
        date: initialValues.date || '',
        ph: initialValues.ph || '',
        chlorine: initialValues.chlorine || '',
        salt: initialValues.salt || '',
        id: initialValues.id || undefined
      });
    } else {
      setForm({ date: '', ph: '', chlorine: '', salt: '' });
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form);
    setForm({ date: '', ph: '', chlorine: '', salt: '' });
  };

  return (
    <form onSubmit={handleSubmit} className="log-entry-form">
      <h2>{initialValues ? '✏️ Edit Reading' : '➕ Add Reading'}</h2>
      <input
        type="date"
        name="date"
        value={form.date}
        onChange={handleChange}
        required
      />
      <input
        type="number"
        name="ph"
        step="0.1"
        value={form.ph}
        onChange={handleChange}
        placeholder="pH"
        required
      />
      <input
        type="number"
        name="chlorine"
        step="0.1"
        value={form.chlorine}
        onChange={handleChange}
        placeholder="Chlorine"
        required
      />
      <input
        type="number"
        name="salt"
        value={form.salt}
        onChange={handleChange}
        placeholder="Salt (ppm)"
        required
      />
      <button type="submit">
        {initialValues ? '💾 Save Changes' : 'Add Reading'}
      </button>
      {initialValues && (
        <button type="button" onClick={onCancelEdit} style={{ marginLeft: '10px' }}>
          ❌ Cancel
        </button>
      )}
    </form>
  );
}
