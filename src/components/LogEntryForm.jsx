import React, { useState, useEffect } from 'react';

export default function LogEntryForm({ onSubmit, initialValues, onCancelEdit }) {
  const [formData, setFormData] = useState({
    id: '',
    date: '',
    ph: '',
    chlorine: '',
    salt: ''
  });

  useEffect(() => {
    if (initialValues) {
      setFormData(initialValues);
    }
  }, [initialValues]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      id: formData.id,
      date: formData.date,
      ph: parseFloat(formData.ph),
      chlorine: parseFloat(formData.chlorine),
      salt: parseFloat(formData.salt)
    });
  };

  return (
    <form className="log-entry-form" onSubmit={handleSubmit}>
      <input
        type="date"
        name="date"
        value={formData.date}
        onChange={handleChange}
        required
        readOnly={!!initialValues?.id} // Prevent date edits in edit mode
      />
      <input
        type="number"
        step="0.01"
        name="ph"
        value={formData.ph}
        placeholder="pH"
        onChange={handleChange}
        required
      />
      <input
        type="number"
        step="0.01"
        name="chlorine"
        value={formData.chlorine}
        placeholder="Chlorine"
        onChange={handleChange}
        required
      />
      <input
        type="number"
        step="0.01"
        name="salt"
        value={formData.salt}
        placeholder="Salt"
        onChange={handleChange}
        required
      />

      <div className="form-actions">
        <button type="submit">
          {initialValues?.id ? '💾 Save Changes' : '➕ Add Reading'}
        </button>
        {initialValues?.id && (
          <button type="button" onClick={onCancelEdit} className="cancel-btn">
            ❌ Cancel
          </button>
        )}
      </div>
    </form>
  );
}