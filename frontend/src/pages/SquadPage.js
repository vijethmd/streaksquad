import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import { AvatarIcon } from '../App';
import CheckinModal  from '../components/CheckinModal';
import Leaderboard   from '../components/Leaderboard';
import StreakCalendar from '../components/StreakCalendar';
import SquadChat     from '../components/SquadChat';

const MOOD_COLORS = {1:'#ef4444',2:'#f97316',3:'#eab308',4:'#22c55e',5:'#06b6d4'};

const SquadPage = ({ squadId, navigate }) => {
  const { user, token } = useAuth();
  const { joinSquad, leaveSquad, on, off, socket } = useSocket(token);
  const [squad,       setSquad]       = useState(null);
  const [feed,        setFeed]        = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState('feed');
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkedInToday,  setCheckedInToday]  = useState(false);
  const [myTodayCheckin,  setMyTodayCheckin]  = useState(null);
  const [liveMsg,     setLiveMsg]     = useState('');
  const [leaving,     setLeaving]     = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const leaveSquad_ = async () => {
    setLeaving(true);
    try {
      await axios.post(`/api/squads/${squadId}/leave`);
      navigate('dashboard');
    } catch(e) { alert(e.response?.data?.error || 'Could not leave squad'); }
    finally { setLeaving(false); }
  };

  const deleteSquad = async () => {
    setDeleting(true);
    try {
      await axios.delete(`/api/squads/${squadId}`);
      navigate('dashboard');
    } catch(e) { alert(e.response?.data?.error || 'Could not delete squad'); }
    finally { setDeleting(false); setConfirmDelete(false); }
  };

  const loadSquad = useCallback(async () => {
    try {
      const [sr,lr] = await Promise.all([
        axios.get(`/api/squads/${squadId}`),
        axios.get(`/api/squads/${squadId}/leaderboard`)
      ]);
      setSquad(sr.data.squad); setFeed(sr.data.checkins); setLeaderboard(lr.data);
      const today = new Date().toISOString().slice(0,10);
      const myToday = sr.data.checkins.find(c=>c.user._id===user._id&&c.dateKey===today);
      setCheckedInToday(!!myToday);
      setMyTodayCheckin(myToday||null);
    } catch(e){ console.error(e); } finally { setLoading(false); }
  },[squadId,user._id]);

  useEffect(()=>{ loadSquad(); joinSquad(squadId); return ()=>leaveSquad(squadId); },[squadId]);

  useEffect(()=>{
    const onCheckin=({checkin,memberStreak})=>{
      setFeed(prev=>[checkin,...prev]);
      setLiveMsg(`${checkin.user.username} just checked in — day ${memberStreak}`);
      setTimeout(()=>setLiveMsg(''),5000);
      if(checkin.user._id===user._id){ setCheckedInToday(true); setMyTodayCheckin(checkin); }
      axios.get(`/api/squads/${squadId}/leaderboard`).then(r=>setLeaderboard(r.data));
    };
    const onJoined=({user:u})=>{ setLiveMsg(`${u.username} joined`); setTimeout(()=>setLiveMsg(''),4000); loadSquad(); };
    on('new_checkin',onCheckin); on('member_joined',onJoined);
    return ()=>{ off('new_checkin',onCheckin); off('member_joined',onJoined); };
  },[squadId,user._id]);

  if(loading) return <div className="loading-state">Loading squad...</div>;
  if(!squad)  return <div className="loading-state">Squad not found.</div>;

  const myMember = squad.members?.find(m=>m.user._id===user._id||m.user===user._id);

  return (
    <div className="squad-page">
      <button className="back-btn" onClick={()=>navigate('dashboard')}><BackIcon /> Back</button>

      <div className="squad-hero">
        <div className="squad-hero-left">
          <div className="squad-hero-name-row">
            <h1 className="squad-hero-name">{squad.name}</h1>
            {!squad.isPublic && <span className="private-badge">Private</span>}
            {squad.goalType==='amount'  && <span className="goal-type-tag amount">Amount</span>}
            {squad.goalType==='boolean' && <span className="goal-type-tag boolean">Yes / No</span>}
          </div>
          <p className="squad-hero-goal">
            {squad.goal}
            {squad.goalType==='amount'&&squad.goalUnit&&(
              <span className="goal-unit-tag"> · {squad.goalTarget?`${squad.goalTarget} ${squad.goalUnit}/day`:squad.goalUnit}</span>
            )}
          </p>
          <div className="squad-meta">
            <span className="meta-chip">{squad.members?.length} members</span>
            <span className="meta-chip">{squad.frequency}</span>
            <span className="meta-chip">{squad.category}</span>
            <span className="meta-chip invite">Code: <strong>{squad.inviteCode}</strong></span>
          </div>
        </div>
        <div className="squad-hero-right">
          {checkedInToday
            ? <button className="btn-edit-checkin big" onClick={()=>setShowCheckin(true)}>Edit today</button>
            : <button className="btn-primary big" onClick={()=>setShowCheckin(true)}>Check In</button>}
          <div className="squad-admin-row">
            {squad.creator?._id === user._id || squad.creator === user._id ? (
              <>
                <span className="creator-badge">Admin</span>
                {!confirmDelete ? (
                  <button className="btn-danger-ghost" onClick={() => setConfirmDelete(true)}>Delete Squad</button>
                ) : (
                  <div className="confirm-delete-row">
                    <span className="confirm-text">Are you sure?</span>
                    <button className="btn-danger" onClick={deleteSquad} disabled={deleting}>{deleting?'Deleting...':'Yes, Delete'}</button>
                    <button className="btn-ghost small" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                )}
              </>
            ) : (
              <button className="btn-danger-ghost" onClick={leaveSquad_} disabled={leaving}>
                {leaving ? 'Leaving...' : 'Leave Squad'}
              </button>
            )}
          </div>
        </div>
      </div>

      {myMember && (
        <div className="my-streak-banner">
          <div className="streak-flame">
            <span className="streak-num">{myMember.currentStreak}</span>
            <FlameIcon/>
          </div>
          <div className="streak-detail">
            <span className="streak-label">day streak</span>
            <span className="streak-best">Best: {myMember.longestStreak}d</span>
          </div>
          <div className="streak-progress">
            {squad.targetDays && (
              <>
                <div className="progress-bar">
                  <div className="progress-fill" style={{width:`${Math.min((myMember.currentStreak/squad.targetDays)*100,100)}%`}}/>
                </div>
                <span className="progress-label">{myMember.currentStreak} / {squad.targetDays} day goal</span>
              </>
            )}
          </div>
        </div>
      )}

      {liveMsg && (
        <div className="live-activity">
          <span className="live-dot-badge">LIVE</span>
          <span className="live-msg">{liveMsg}</span>
        </div>
      )}

      <div className="squad-tabs">
        {['feed','members','leaderboard','calendar','chat'].map(t=>(
          <button key={t} className={`squad-tab ${tab===t?'active':''}`} onClick={()=>setTab(t)}>
            {t==='chat' ? 'Chat' : t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      <div className="tab-content">
        {tab==='feed'        && <CheckinFeed feed={feed} currentUserId={user._id} navigate={navigate} goalUnit={squad.goalUnit}/>}
        {tab==='members'     && <MembersTab members={squad.members} leaderboard={leaderboard} currentUserId={user._id} navigate={navigate}/>}
        {tab==='leaderboard' && <Leaderboard members={leaderboard} currentUserId={user._id} navigate={navigate}/>}
        {tab==='calendar'    && <StreakCalendar squadId={squadId} userId={user._id} goalType={squad.goalType} goalTarget={squad.goalTarget} goalUnit={squad.goalUnit}/>}
        {tab==='chat'        && <SquadChat squadId={squadId} socket={socket} token={token}/>}
      </div>

      {showCheckin&&(
        <CheckinModal squad={squad} onClose={()=>setShowCheckin(false)} onSuccess={()=>{setShowCheckin(false);loadSquad();}} existingCheckin={myTodayCheckin}/>
      )}
    </div>
  );
};

const MembersTab = ({members,leaderboard,currentUserId,navigate}) => {
  if(!members||members.length===0) return <div className="empty-feed"><p>No members yet.</p></div>;
  return (
    <div className="members-tab">
      {members.filter(m=>m.isActive).map((m,i)=>{
        const lb=leaderboard.find(l=>l.user?._id===m.user?._id);
        const isMe=m.user?._id===currentUserId;
        return(
          <div key={m.user?._id||i} className={`member-row ${isMe?'me':''}`}>
            <button className="member-row-left" onClick={()=>navigate('profile',m.user?.username)}>
              <AvatarIcon photoUrl={m.user?.photoUrl} username={m.user?.username} size={40}/>
              <div className="member-info">
                <span className="member-name">{m.user?.username}{isMe?' (you)':''}</span>
                <span className="member-joined">Joined {new Date(m.joinedAt).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>
              </div>
            </button>
            <div className="member-stats">
              <div className="member-stat"><span className="ms-n">{lb?.currentStreak??m.currentStreak}</span><span className="ms-l">streak</span></div>
              <div className="member-stat"><span className="ms-n">{lb?.totalCheckins??m.totalCheckins}</span><span className="ms-l">days</span></div>
              <span className={`member-status ${lb?.isOnStreak?'hot':'cold'}`}>{lb?.isOnStreak?'Active':'At risk'}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const CheckinFeed = ({feed,currentUserId,navigate,goalUnit}) => {
  if(feed.length===0) return <div className="empty-feed"><p>No check-ins yet. Be the first.</p></div>;
  return (
    <div className="checkin-feed">
      {feed.map(c=>(
        <div key={c._id} className={`checkin-card ${c.user._id===currentUserId?'mine':''}`}>
          <div className="checkin-top">
            <button className="checkin-user-btn" onClick={()=>navigate('profile',c.user.username)}>
              <AvatarIcon photoUrl={c.user.photoUrl} username={c.user.username} size={34}/>
              <div>
                <span className="ci-username">{c.user.username}</span>
                <span className="ci-time">{new Date(c.date).toLocaleDateString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span>
              </div>
            </button>
            <div className="checkin-right">
              <span className="streak-badge">Day {c.streakDay}</span>
              {c.amountLogged!=null&&<span className="amount-logged-badge">{c.amountLogged}{goalUnit ? ` ${goalUnit}` : ' logged'}</span>}
              {!c.completed&&c.amountLogged==null&&<span className="missed-badge">Not done</span>}
            </div>
          </div>
          {c.note&&<p className="checkin-note">{c.note}</p>}
        </div>
      ))}
    </div>
  );
};

const BackIcon  = ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
const FlameIcon = ()=><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="28" height="28" strokeLinecap="round" strokeLinejoin="round" className="flame-svg"><path d="M12 2s-5 5-5 10a5 5 0 0010 0C17 7 12 2 12 2zm0 14a3 3 0 01-3-3c0-2 2-4 3-6 1 2 3 4 3 6a3 3 0 01-3 3z"/></svg>;

export default SquadPage;
