import React, { useState } from 'react';
import axios from 'axios';

const CATEGORIES = ['fitness','learning','mindfulness','creativity','health','career','social','other'];

const CreateSquadModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: '', description: '', goal: '',
    goalType: 'boolean',   // 'boolean' | 'amount'
    goalUnit: '',          // e.g. "pages", "km", "minutes"
    goalTarget: '',        // numeric target for amount type
    category: 'fitness', frequency: 'daily',
    targetDays: '', maxMembers: 10, isPublic: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim() || !form.goal.trim()) return setError('Name and goal are required');
    if (form.goalType === 'amount' && !form.goalUnit.trim()) return setError('Unit is required for amount goals (e.g. pages, km)');
    setLoading(true); setError('');
    try {
      await axios.post('/api/squads', {
        ...form,
        targetDays: form.targetDays === '' ? null : Number(form.targetDays),
        goalTarget: form.goalType === 'amount' && form.goalTarget ? Number(form.goalTarget) : null
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create squad');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box create-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Create a Squad</h3><p className="modal-sub">Build your accountability crew</p></div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>

        <div className="modal-body scrollable">
          <div className="field-group">
            <label>Squad Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Morning Readers Club" maxLength={50} />
          </div>

          <div className="field-group">
            <label>Goal Description *</label>
            <input value={form.goal} onChange={e => set('goal', e.target.value)} placeholder="e.g. Read every day" maxLength={100} />
          </div>

          {/* Goal type picker */}
          <div className="field-group">
            <label>Goal Type</label>
            <div className="goal-type-row">
              <button
                className={`goal-type-btn ${form.goalType === 'boolean' ? 'active' : ''}`}
                onClick={() => set('goalType', 'boolean')}
              >
                <CheckBoxIcon />
                <div>
                  <span className="gtb-title">Yes / No</span>
                  <span className="gtb-desc">Did you do it today?</span>
                </div>
              </button>
              <button
                className={`goal-type-btn ${form.goalType === 'amount' ? 'active' : ''}`}
                onClick={() => set('goalType', 'amount')}
              >
                <AmountIcon />
                <div>
                  <span className="gtb-title">Amount</span>
                  <span className="gtb-desc">Log a number each day</span>
                </div>
              </button>
            </div>
          </div>

          {/* Amount-specific fields */}
          {form.goalType === 'amount' && (
            <div className="field-row">
              <div className="field-group">
                <label>Unit *</label>
                <input value={form.goalUnit} onChange={e => set('goalUnit', e.target.value)}
                  placeholder="e.g. pages, km, mins" maxLength={30} />
              </div>
              <div className="field-group">
                <label>Daily Target <span className="optional">(optional)</span></label>
                <input type="number" min={1} value={form.goalTarget}
                  onChange={e => set('goalTarget', e.target.value)}
                  placeholder="e.g. 20" />
              </div>
            </div>
          )}

          <div className="field-group">
            <label>Description</label>
            <textarea className="note-input" value={form.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Tell people what this squad is about..." maxLength={200} rows={2} />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)} className="select-input">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="field-group">
              <label>Frequency</label>
              <select value={form.frequency} onChange={e => set('frequency', e.target.value)} className="select-input">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>

          <div className="field-row">
            <div className="field-group">
              <label>Duration (days) <span className="optional">(optional — leave blank for no end date)</span></label>
              <input type="number" min={1} max={3650} value={form.targetDays}
                onChange={e => set('targetDays', e.target.value === '' ? '' : parseInt(e.target.value))}
                placeholder="e.g. 30, 90, 365" />
            </div>
            <div className="field-group">
              <label>Max Members</label>
              <input type="number" min={2} max={50} value={form.maxMembers}
                onChange={e => set('maxMembers', parseInt(e.target.value))} />
            </div>
          </div>

          <div className="field-group toggle-group">
            <div>
              <label>Visibility</label>
              <p className="field-hint">{form.isPublic ? 'Anyone can find and join this squad' : 'Only people with the invite link can join'}</p>
            </div>
            <button className={`toggle-pill ${form.isPublic ? 'on' : 'off'}`} onClick={() => set('isPublic', !form.isPublic)}>
              <span className="toggle-thumb" />
            </button>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>

        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? 'Creating...' : `Create ${form.name || 'Squad'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

const CheckBoxIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <polyline points="9 11 12 14 22 4"/>
    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);

const AmountIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
    <line x1="12" y1="20" x2="12" y2="10"/>
    <line x1="18" y1="20" x2="18" y2="4"/>
    <line x1="6"  y1="20" x2="6"  y2="16"/>
  </svg>
);

export default CreateSquadModal;
