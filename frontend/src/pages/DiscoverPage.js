import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AvatarIcon } from '../App';

const CATEGORIES = ['all','fitness','learning','mindfulness','creativity','health','career','social','other'];
const CAT_COLORS = {
  all:'#ffffff', fitness:'#f97316', learning:'#818cf8', mindfulness:'#34d399',
  creativity:'#fb7185', health:'#38bdf8', career:'#facc15', social:'#e879f9', other:'#94a3b8'
};

const DiscoverPage = ({ navigate }) => {
  const [activeTab, setActiveTab] = useState('squads');
  const [squads,    setSquads]    = useState([]);
  const [people,    setPeople]    = useState([]);
  const [category,  setCategory]  = useState('all');
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState(false);
  const [joining,   setJoining]   = useState(null);
  const [joinMsg,   setJoinMsg]   = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      if (activeTab === 'squads') fetchSquads();
      else fetchPeople();
    }, 300);
    return () => clearTimeout(t);
  }, [category, search, activeTab]);

  const fetchSquads = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category !== 'all') params.category = category;
      if (search) params.search = search;
      const res = await axios.get('/api/squads', { params });
      setSquads(res.data);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const fetchPeople = async () => {
    setLoading(true);
    try {
      if (search.trim().length >= 2) {
        const res = await axios.get(`/api/users/search?q=${search}`);
        setPeople(res.data);
      } else {
        const res = await axios.get('/api/users/browse');
        setPeople(res.data);
      }
    } catch(e){ console.error(e); } finally { setLoading(false); }
  };

  const joinSquad = async (inviteCode, squadId) => {
    setJoining(squadId);
    try {
      await axios.post(`/api/squads/join/${inviteCode}`);
      setJoinMsg('Joined successfully');
      setTimeout(() => navigate('squad', squadId), 800);
    } catch (err) {
      setJoinMsg(err.response?.data?.error || 'Could not join');
      setTimeout(() => setJoinMsg(''), 2500);
    } finally { setJoining(null); }
  };

  return (
    <div className="discover-page">
      <div className="discover-header">
        <h2 className="page-title">Discover</h2>
        <p className="page-sub">Find squads and connect with people</p>
      </div>

      {/* Top tabs */}
      <div className="discover-tabs">
        <button className={`discover-tab-btn ${activeTab==='squads'?'active':''}`} onClick={()=>setActiveTab('squads')}>Squads</button>
        <button className={`discover-tab-btn ${activeTab==='people'?'active':''}`} onClick={()=>setActiveTab('people')}>People</button>
      </div>

      <input className="search-input"
        placeholder={activeTab==='squads' ? 'Search squads or goals...' : 'Search by username...'}
        value={search} onChange={e=>setSearch(e.target.value)} />

      {activeTab === 'squads' && (
        <div className="cat-pills">
          {CATEGORIES.map(cat => (
            <button key={cat}
              className={`cat-pill ${category===cat?'active':''}`}
              style={category===cat?{borderColor:CAT_COLORS[cat],color:CAT_COLORS[cat]}:{}}
              onClick={()=>setCategory(cat)}>{cat}</button>
          ))}
        </div>
      )}

      {joinMsg && <div className="join-toast">{joinMsg}</div>}

      {loading ? (
        <div className="loading-state">Searching...</div>
      ) : activeTab === 'squads' ? (
        squads.length === 0
          ? <div className="empty-state"><h3>No squads found</h3><p>Try a different search or create one.</p></div>
          : <div className="discover-grid">
              {squads.map(sq => (
                <DiscoverCard key={sq._id} squad={sq}
                  onJoin={()=>joinSquad(sq.inviteCode, sq._id)}
                  onView={()=>navigate('squad', sq._id)}
                  joining={joining===sq._id}/>
              ))}
            </div>
      ) : (
        people.length === 0
          ? <div className="empty-state"><h3>No people found</h3><p>Try searching a username.</p></div>
          : <div className="people-grid">
              {people.map(p => (
                <PersonCard key={p._id} person={p} onView={()=>navigate('profile', p.username)}/>
              ))}
            </div>
      )}
    </div>
  );
};

const DiscoverCard = ({ squad, onJoin, onView, joining }) => {
  const color = CAT_COLORS[squad.category] || '#94a3b8';
  const top   = squad.members?.reduce((mx,m)=>Math.max(mx,m.currentStreak||0),0);
  return (
    <div className="discover-card" style={{'--card-accent':color}}>
      <div className="dc-top">
        <div className="dc-dot" style={{background:color}}/>
        <span className="dc-cat">{squad.category}</span>
        {squad.goalType==='amount' && <span className="goal-type-tag amount">{squad.goalUnit}</span>}
      </div>
      <h3 className="dc-name">{squad.name}</h3>
      {squad.description && <p className="dc-desc">{squad.description}</p>}
      <p className="dc-goal">{squad.goal}</p>
      <div className="dc-stats">
        <span>{squad.members?.length||0} / {squad.maxMembers} members</span>
        <span>{squad.frequency}</span>
        <span>Top streak: {top}d</span>
      </div>
      <div className="dc-creator">by {squad.creator?.username}</div>
      <div className="dc-actions">
        <button className="btn-ghost small" onClick={onView}>View</button>
        <button className="btn-primary small" onClick={onJoin} disabled={joining}>{joining?'Joining...':'Join Squad'}</button>
      </div>
    </div>
  );
};

const PersonCard = ({ person, onView }) => (
  <div className="person-card" onClick={onView}>
    <AvatarIcon photoUrl={person.photoUrl} username={person.username} size={48}/>
    <div className="pc-info">
      <span className="pc-name">{person.username}</span>
      {person.bio && <span className="pc-bio">{person.bio}</span>}
      <div className="pc-stats">
        <span>{person.totalStreakDays || 0} days</span>
        <span>{person.badges?.length || 0} badges</span>
      </div>
    </div>
    <div className="pc-arrow">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  </div>
);

export default DiscoverPage;
