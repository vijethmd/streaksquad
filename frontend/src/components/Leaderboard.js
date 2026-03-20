import React, { useState } from 'react';
import { AvatarIcon } from '../App';

const MEDALS = ['1st','2nd','3rd'];

const Leaderboard = ({ members, currentUserId, navigate }) => {
  const [sortBy, setSortBy] = useState('streak'); // 'streak' | 'totalDays' | 'maxStreak'

  if (!members || members.length === 0)
    return <div className="empty-feed"><p>No members yet.</p></div>;

  const sorted = [...members].sort((a,b) => {
    if(sortBy==='streak')    return b.currentStreak - a.currentStreak;
    if(sortBy==='totalDays') return b.totalCheckins - a.totalCheckins;
    if(sortBy==='maxStreak') return b.longestStreak - a.longestStreak;
    return 0;
  });

  return (
    <div className="leaderboard">
      {/* Sort controls */}
      <div className="lb-sort-row">
        <span className="lb-sort-label">Sort by</span>
        {[
          { key:'maxStreak', label:'Max Streak' },
          { key:'streak',    label:'Current Streak' },
          { key:'totalDays', label:'Total Days' },
        ].map(s=>(
          <button key={s.key} className={`lb-sort-btn ${sortBy===s.key?'active':''}`} onClick={()=>setSortBy(s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="lb-header-row">
        <span>#</span>
        <span>Member</span>
        <span title="Current streak">Now</span>
        <span title="Max streak">Max</span>
        <span title="Total check-in days">Days</span>
        <span>Status</span>
      </div>

      {sorted.map((m,i) => {
        const isMe = m.user?._id === currentUserId;
        return (
          <div key={m.user?._id||i}
            className={`lb-row ${isMe?'lb-me':''} ${!m.isOnStreak?'lb-cold':''} ${navigate?'lb-clickable':''}`}
            onClick={()=>navigate?.('profile',m.user?.username)}>
            <span className="lb-rank">{i<3 ? MEDALS[i] : `#${i+1}`}</span>
            <span className="lb-user">
              <AvatarIcon photoUrl={m.user?.photoUrl} username={m.user?.username} size={28}/>
              <span className="lb-name">{m.user?.username}{isMe?' (you)':''}</span>
            </span>
            <span className="lb-streak"><strong>{m.currentStreak}</strong><span className="lb-d">d</span></span>
            <span className="lb-best">{m.longestStreak}d</span>
            <span className="lb-checkins">{m.totalCheckins}</span>
            <span className={`lb-status ${m.isOnStreak?'hot':'cold'}`}>{m.isOnStreak?'Active':'At risk'}</span>
          </div>
        );
      })}
    </div>
  );
};

export default Leaderboard;
