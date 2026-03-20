import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AvatarIcon } from '../App';
import CheckinModal from '../components/CheckinModal';
import CreateSquadModal from '../components/CreateSquadModal';
import JoinSquadModal from '../components/JoinSquadModal';

const CAT_COLORS = {
  fitness:'#f97316', learning:'#818cf8', mindfulness:'#34d399',
  creativity:'#fb7185', health:'#38bdf8', career:'#facc15',
  social:'#e879f9', other:'#94a3b8'
};

const Dashboard = ({ navigate }) => {
  const { user } = useAuth();
  const [mySquads, setMySquads]           = useState([]);
  const [loading, setLoading]             = useState(true);
  const [checkinSquad, setCheckinSquad]   = useState(null);
  const [showCreate, setShowCreate]       = useState(false);
  const [showJoin, setShowJoin]           = useState(false);
  const [todayCheckins,    setTodayCheckins]    = useState(new Set());
  const [existingCheckins, setExistingCheckins] = useState({}); // squadId -> checkin object

  const loadSquads = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/auth/me');
      setMySquads(res.data.squads || []);
      const today = new Date().toISOString().slice(0, 10);
      const checkedIn = new Set();
      const existingMap = {};
      for (const sq of res.data.squads || []) {
        try {
          const feed = await axios.get(`/api/streaks/squad/${sq._id}?limit=5`);
          const mine = feed.data.find(c => c.user._id === res.data._id && c.dateKey === today);
          if (mine) { checkedIn.add(sq._id); existingMap[sq._id] = mine; }
        } catch {}
      }
      setTodayCheckins(checkedIn);
      setExistingCheckins(existingMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSquads(); }, []);

  const timeLeft = () => {
    const now = new Date();
    const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
    const diff = midnight - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}m left today`;
  };

  return (
    <div className="dashboard">
      <div className="dash-header">
        <div className="dash-header-left">
          <h2 className="dash-greeting">Welcome back, {user?.username}</h2>
          <p className="dash-sub">
            {mySquads.length === 0
              ? 'Join or create a squad to start building streaks'
              : `${todayCheckins.size} of ${mySquads.length} squads checked in  ·  ${timeLeft()}`}
          </p>
        </div>
        <div className="dash-actions">
          <button className="btn-ghost" onClick={() => setShowJoin(true)}>Join Squad</button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Squad</button>
        </div>
      </div>

      <div className="stats-row">
        <StatCard label="Total Streak Days" value={user?.totalStreakDays || 0} icon="flame" />
        <StatCard label="Longest Streak"    value={`${user?.longestStreak || 0}d`} icon="trophy" />
        <StatCard label="Squads"            value={mySquads.length} icon="users" />
        <StatCard label="Badges"            value={user?.badges?.length || 0} icon="award" />
      </div>

      {loading ? (
        <div className="loading-state">Loading your squads...</div>
      ) : mySquads.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon-wrap"><EmptyIcon /></div>
          <h3>No squads yet</h3>
          <p>Create a squad or join one with an invite code to start building streaks with others.</p>
          <div className="empty-actions">
            <button className="btn-ghost" onClick={() => setShowJoin(true)}>Join with Code</button>
            <button className="btn-primary" onClick={() => setShowCreate(true)}>Create a Squad</button>
          </div>
        </div>
      ) : (
        <div className="squads-grid">
          {mySquads.map(squad => (
            <SquadCard
              key={squad._id}
              squad={squad}
              checkedIn={todayCheckins.has(squad._id)}
              onCheckin={() => setCheckinSquad(squad)}
              existingCheckin={existingCheckins[squad._id]}
              onView={() => navigate('squad', squad._id)}
            />
          ))}
        </div>
      )}

      {user?.badges?.length > 0 && (
        <div className="badges-section">
          <p className="section-title">Earned Badges</p>
          <div className="badges-row">
            {user.badges.map((b, i) => (
              <div key={i} className="badge-chip">
                <span className="badge-chip-name">{b.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {checkinSquad && <CheckinModal squad={checkinSquad} onClose={() => setCheckinSquad(null)} onSuccess={() => { setCheckinSquad(null); loadSquads(); }} existingCheckin={existingCheckins[checkinSquad._id]} />}
      {showCreate && <CreateSquadModal onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); loadSquads(); }} />}
      {showJoin   && <JoinSquadModal  onClose={() => setShowJoin(false)}   onSuccess={() => { setShowJoin(false);   loadSquads(); }} />}
    </div>
  );
};

const StatCard = ({ label, value, icon }) => {
  const ICONS = {
    flame:  <path d="M12 2s-5 5-5 10a5 5 0 0010 0C17 7 12 2 12 2zm0 14a3 3 0 01-3-3c0-2 2-4 3-6 1 2 3 4 3 6a3 3 0 01-3 3z"/>,
    trophy: <><path d="M6 2h12l-3 7H9L6 2z"/><path d="M12 9v6M8 21h8M10 18h4"/><path d="M5 2H3v4a4 4 0 004 4h.5M19 2h2v4a4 4 0 01-4 4h-.5"/></>,
    users:  <><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></>,
    award:  <><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></>,
  };
  return (
    <div className="stat-card">
      <svg className="stat-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        {ICONS[icon]}
      </svg>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
};

const SquadCard = ({ squad, checkedIn, onCheckin, onView, existingCheckin }) => {
  const color = CAT_COLORS[squad.category] || '#94a3b8';
  const memberCount = squad.members?.length || 0;
  return (
    <div className="squad-card" style={{ '--accent-color': color }}>
      <div className="squad-card-top">
        <div className="squad-color-dot" style={{ background: color }} />
        <span className="squad-cat">{squad.category}</span>
        {squad.goalType === 'amount' && (
          <span className="goal-type-tag amount">{squad.goalUnit}</span>
        )}
      </div>
      <h3 className="squad-name">{squad.name}</h3>
      <p className="squad-goal">{squad.goal}</p>
      <div className="squad-card-meta">
        <span className="squad-meta-item">
          <MembersIcon />
          {memberCount} member{memberCount !== 1 ? 's' : ''}
        </span>
        <span className="squad-meta-item">{squad.frequency}</span>
      </div>
      <div className="squad-card-footer">
        <button className="btn-view" onClick={onView}>View</button>
        {checkedIn
          ? <button className="btn-edit-checkin" onClick={onCheckin}>Edit today</button>
          : <button className="btn-checkin" onClick={onCheckin}>Check In</button>}
      </div>
    </div>
  );
};

const MembersIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="12" height="12" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const EmptyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="40" height="40" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/>
  </svg>
);

export default Dashboard;
