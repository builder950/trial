import React, { useEffect, useState } from 'react';

/**
 * EditRowModal
 * Props:
 *  - open: boolean
 *  - rowData: object | null
 *  - onClose: function()
 *  - onSave: async function(row) => should persist and resolve
 */
export default function EditRowModal({ open = false, rowData = null, onClose = () => {}, onSave = async () => {} }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setForm(rowData ? { ...rowData } : {});
    setError(null);
  }, [rowData, open]);

  if (!open) return null;

  const handleChange = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSaving(false);
    }
  };

  // render a simple modal (style to taste)
  return (
    <div className="modal-overlay" style={{
      position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)'
    }}>
      <div className="modal" style={{ width: 640, background: '#fff', borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>Edit Row</h3>

        {error && <div style={{ color: 'red', marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {Object.keys(form || {}).map((k) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: '#555' }}>{k}</div>
              <input
                value={form[k] ?? ''}
                onChange={(e) => handleChange(k, e.target.value)}
                style={{ width: '100%', padding: '6px 8px' }}
              />
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
          <button onClick={onClose} disabled={saving}>Cancel</button>
          <button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
