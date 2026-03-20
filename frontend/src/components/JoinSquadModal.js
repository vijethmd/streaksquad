import React, { useState } from 'react';
import axios from 'axios';

const JoinSquadModal = ({ onClose, onSuccess }) => {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const submit = async () => {
    if (!code.trim()) return setError('Enter an invite code');
    setLoading(true); setError('');
    try {
      await axios.post(`/api/squads/join/${code.trim().toUpperCase()}`);
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not join squad');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box join-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Join a Squad</h3><p className="modal-sub">Enter the 6-character invite code</p></div>
          <button className="modal-close" onClick={onClose}>x</button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <label>Invite Code</label>
            <input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="e.g. A1B2C3" maxLength={6} className="code-input" onKeyDown={e => e.key === 'Enter' && submit()} />
          </div>
          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading || code.length !== 6}>{loading ? 'Joining...' : 'Join Squad'}</button>
        </div>
      </div>
    </div>
  );
};

export default JoinSquadModal;
