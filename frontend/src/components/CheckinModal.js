import React, { useState } from 'react';
import axios from 'axios';

const CheckinModal = ({ squad, onClose, onSuccess, existingCheckin }) => {
  // existingCheckin is passed when editing today's check-in
  const isEdit = !!existingCheckin;
  const [note,      setNote]      = useState(existingCheckin?.note      || '');
  const [completed, setCompleted] = useState(existingCheckin?.completed ?? true);
  const [amount,    setAmount]    = useState(existingCheckin?.amountLogged != null ? String(existingCheckin.amountLogged) : '');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [success,   setSuccess]   = useState(false);
  const [newBadges, setNewBadges] = useState([]);

  const isAmount  = squad.goalType === 'amount';
  const hasTarget = squad.goalTarget != null && squad.goalTarget > 0;

  const submit = async () => {
    if (isAmount && amount === '') return setError('Enter how much you did today');
    setLoading(true); setError('');
    try {
      const payload = {
        squadId: squad._id, note,
        mood: 3,
        ...(isAmount ? { amountLogged: Number(amount) } : { completed })
      };
      const res = await axios.post('/api/streaks/checkin', payload);
      setSuccess(true);
      if (res.data.badges?.length) setNewBadges(res.data.badges);
      setTimeout(() => onSuccess(squad._id), res.data.badges?.length ? 2500 : 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Check-in failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box checkin-modal" onClick={e => e.stopPropagation()}>
        {success ? (
          <div className="checkin-success">
            <div className="success-ring" />
            <h3>{isEdit ? 'Updated' : 'Checked in'}</h3>
            <p className="success-sub">{isEdit ? 'Your check-in has been updated.' : 'Keep the streak going.'}</p>
            {newBadges.length > 0 && (
              <div className="badge-earned">
                <p>New badge unlocked</p>
                {newBadges.map(b => <div key={b.id} className="badge-popup">{b.name}</div>)}
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="modal-header">
              <div>
                <h3>{isEdit ? 'Edit Today\'s Check-in' : 'Check In'}</h3>
                <p className="modal-sub">{squad.name} — {squad.goal}</p>
              </div>
              <button className="modal-close" onClick={onClose}>
                <CloseIcon />
              </button>
            </div>

            <div className="modal-body">
              {/* BOOLEAN */}
              {!isAmount && (
                <div className="field-group">
                  <label>Did you complete it today?</label>
                  <div className="yn-row">
                    <button className={`yn-btn yes ${completed ? 'active' : ''}`} onClick={() => setCompleted(true)}>
                      <YesIcon /> Yes, I did it
                    </button>
                    <button className={`yn-btn no ${!completed ? 'active' : ''}`} onClick={() => setCompleted(false)}>
                      <NoIcon /> Not today
                    </button>
                  </div>
                  {!completed && <p className="yn-warning">This will not count toward your streak.</p>}
                </div>
              )}

              {/* AMOUNT */}
              {isAmount && (
                <div className="field-group">
                  <label>
                    How many {squad.goalUnit || 'units'} today?
                    {hasTarget && <span className="optional"> (target: {squad.goalTarget})</span>}
                  </label>
                  <div className="amount-input-row">
                    <input type="number" min={0} className="amount-input"
                      value={amount} onChange={e => setAmount(e.target.value)}
                      placeholder="0" inputMode="numeric" autoFocus />
                    <span className="amount-unit">{squad.goalUnit || 'units'}</span>
                  </div>
                  {hasTarget && amount !== '' && (
                    <div className="amount-progress">
                      <div className="amount-bar">
                        <div className="amount-fill" style={{
                          width: `${Math.min((Number(amount) / squad.goalTarget) * 100, 100)}%`,
                          background: Number(amount) >= squad.goalTarget ? 'var(--teal)' : 'var(--fire)'
                        }} />
                      </div>
                      <span className="amount-label">
                        {Number(amount) >= squad.goalTarget
                          ? 'Target reached'
                          : `${squad.goalTarget - Number(amount)} ${squad.goalUnit} to go`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* NOTE */}
              <div className="field-group">
                <label>Note <span className="optional">(optional)</span></label>
                <textarea className="note-input" placeholder="What did you do today?"
                  value={note} onChange={e => setNote(e.target.value)} maxLength={280} rows={3} />
                <span className="char-count">{note.length}/280</span>
              </div>

              {error && <div className="form-error">{error}</div>}
            </div>

            <div className="modal-footer">
              <button className="btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn-primary" onClick={submit} disabled={loading}>
                {loading ? 'Saving...' : isEdit ? 'Update Check-in' : 'Log Check-in'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const YesIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const NoIcon   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="16" height="16" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const CloseIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;

export default CheckinModal;
