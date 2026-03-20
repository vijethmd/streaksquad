import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AvatarIcon } from '../App';
import StreakCalendar from '../components/StreakCalendar';

const CAT_COLORS   = { fitness:'#f97316', learning:'#818cf8', mindfulness:'#34d399', creativity:'#fb7185', health:'#38bdf8', career:'#facc15', social:'#e879f9', other:'#94a3b8' };
const BADGE_COLORS = { fire:'#f97316', diamond:'#38bdf8', lightning:'#facc15', double:'#a855f7', year1:'#22d3ee', year2:'#818cf8', year3:'#f59e0b', year4:'#10b981', year5:'#ec4899' };

const ProfilePage = ({ username, navigate }) => {
  const { user: me, setUser } = useAuth();
  const [profile,       setProfile]       = useState(null);
  const [checkins,      setCheckins]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [tab,           setTab]           = useState('activity');
  const [editing,       setEditing]       = useState(false);
  const [privacyOpen,   setPrivacyOpen]   = useState(false);

  const isOwner = me?.username === username;

  const load = () => {
    setLoading(true);
    axios.get(`/api/users/${username}`)
      .then(res => {
        setProfile(res.data.user);
        setCheckins(res.data.recentCheckins || []);
        if (isOwner) setUser(res.data.user);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { setTab('activity'); load(); }, [username]);



  if (loading) return <div className="loading-state">Loading profile...</div>;
  if (!profile) return <div className="loading-state">Profile not found.</div>;

  if (profile.isPrivate) return (
    <div className="private-profile">
      <AvatarIcon photoUrl={profile.photoUrl} username={profile.username} size={72}/>
      <h2>{profile.username}</h2>
      <p className="muted-text">This profile is private.</p>

    </div>
  );



  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="profile-hero-inner">
          <div className="profile-avatar-wrap">
            <AvatarIcon photoUrl={profile.photoUrl} username={profile.username} size={72}/>
            {isOwner && !profile.privacy?.profilePublic && <span className="private-badge">Private</span>}
          </div>
          <div className="profile-info">
            <h1 className="profile-username">{profile.username}</h1>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
            {profile.website && (
              <a href={profile.website} className="profile-website" target="_blank" rel="noreferrer">
                {profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {profile.socials && (
              <div className="profile-socials">
                {profile.socials.instagram && <a href={`https://instagram.com/${profile.socials.instagram}`} className="social-link insta" target="_blank" rel="noreferrer"><InstagramIcon/> @{profile.socials.instagram}</a>}
                {profile.socials.twitter   && <a href={`https://twitter.com/${profile.socials.twitter}`}    className="social-link twitter" target="_blank" rel="noreferrer"><TwitterIcon/>   @{profile.socials.twitter}</a>}
                {profile.socials.linkedin  && <a href={`https://linkedin.com/in/${profile.socials.linkedin}`} className="social-link linkedin" target="_blank" rel="noreferrer"><LinkedInIcon/>  {profile.socials.linkedin}</a>}
                {profile.socials.github    && <a href={`https://github.com/${profile.socials.github}`}      className="social-link github" target="_blank" rel="noreferrer"><GitHubIcon/>    {profile.socials.github}</a>}
                {profile.socials.youtube   && <a href={`https://youtube.com/@${profile.socials.youtube}`}   className="social-link youtube" target="_blank" rel="noreferrer"><YouTubeIcon/>   {profile.socials.youtube}</a>}
              </div>
            )}

            <p className="profile-joined">Member since {new Date(profile.createdAt).toLocaleDateString('en',{month:'long',year:'numeric'})}</p>
          </div>
          <div className="profile-actions">
            {isOwner && (
  <>
    <button className="btn-ghost small" onClick={() => setEditing(true)}>Edit Profile</button>
    <button className="btn-ghost small" onClick={() => setPrivacyOpen(true)}>Privacy</button>
  </>
)}
          </div>
        </div>

        {profile.privacy?.statsPublic !== false && (
          <div className="profile-stats">
            <div className="pstat"><span className="pstat-n">{profile.totalStreakDays ?? '—'}</span><span className="pstat-l">Total Days</span></div>
            <div className="pstat"><span className="pstat-n">{profile.longestStreak ?? '—'}</span><span className="pstat-l">Best Streak</span></div>
            <div className="pstat"><span className="pstat-n">{profile.squads?.length ?? '—'}</span><span className="pstat-l">Squads</span></div>
            <div className="pstat"><span className="pstat-n">{profile.badges?.length ?? '—'}</span><span className="pstat-l">Badges</span></div>
          </div>
        )}
      </div>

      <div className="profile-tabs">
        {['activity','squads','badges'].map(t => (
          <button key={t} className={`profile-tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="profile-tab-content">
        {tab === 'activity' && <ActivityTab checkins={checkins} activityPublic={profile.privacy?.activityPublic!==false} isOwner={isOwner}/>}
        {tab === 'squads'   && (
          <SquadsTab
            squads={profile.squads}
            squadsPublic={profile.privacy?.squadsPublic!==false}
            isOwner={isOwner}
            profileUserId={profile._id}
            squadPrivacy={profile.squadPrivacy}
            onPrivacyToggle={isOwner ? async (id, val) => {
              await axios.patch('/api/users/me/privacy', { squadPrivacy: { [id]: val } });
              load();
            } : null}
            navigate={navigate}
          />
        )}
        {tab === 'badges' && <BadgesTab badges={profile.badges} badgesPublic={profile.privacy?.badgesPublic!==false} isOwner={isOwner}/>}
      </div>

      {editing     && <EditProfileModal profile={profile} onClose={() => setEditing(false)} onSave={() => { setEditing(false); load(); }}/>}
      {privacyOpen && <PrivacyModal privacy={profile.privacy} squads={profile.squads} squadPrivacy={profile.squadPrivacy} onClose={() => setPrivacyOpen(false)} onSave={() => { setPrivacyOpen(false); load(); }}/>}
    </div>
  );
};

// ---- Activity ----
const ActivityTab = ({ checkins, activityPublic, isOwner }) => {
  if (!activityPublic && !isOwner) return <div className="privacy-notice"><LockIcon/><p>Activity is private.</p></div>;
  if (checkins.length === 0) return <div className="empty-feed"><p>No activity yet.</p></div>;
  const MOOD_COLORS = {1:'#ef4444',2:'#f97316',3:'#eab308',4:'#22c55e',5:'#06b6d4'};
  return (
    <div className="activity-feed">
      {checkins.map(c => (
        <div key={c._id} className="activity-item">
          <div className="activity-left">
            <div className="activity-dot" style={{background: MOOD_COLORS[c.mood]||'#6b7280'}}/>
            <div>
              <span className="activity-squad">{c.squad?.name||'Unknown squad'}</span>
              {c.amountLogged != null && <span className="activity-amount"> · {c.amountLogged} logged</span>}
              {c.note && <p className="activity-note">{c.note}</p>}
            </div>
          </div>
          <div className="activity-right">
            <span className="activity-streak">Day {c.streakDay}</span>
            <span className="activity-date">{new Date(c.date).toLocaleDateString('en',{month:'short',day:'numeric'})}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

// ---- Squads — with heatmap expand ----
const SquadsTab = ({ squads, squadsPublic, isOwner, profileUserId, squadPrivacy, onPrivacyToggle, navigate }) => {
  const [expanded, setExpanded] = useState(null);

  if (!squadsPublic && !isOwner) return <div className="privacy-notice"><LockIcon/><p>Squads are private.</p></div>;
  if (!squads || squads.length === 0) return <div className="empty-feed"><p>No squads yet.</p></div>;

  return (
    <div className="squads-list">
      {squads.map(sq => {
        const isPrivate  = squadPrivacy && squadPrivacy[sq._id] === false;
        const isExpanded = expanded === sq._id;
        return (
          <div key={sq._id} className="squad-list-item-wrap">
            <div className={`squad-list-item ${isExpanded?'expanded':''}`}>
              <div className="sli-left">
                <div className="sli-dot" style={{background: CAT_COLORS[sq.category]||'#94a3b8'}}/>
                <div>
                  <span className="sli-name">{sq.name}</span>
                  <span className="sli-goal">{sq.goal}</span>
                  {sq.memberStreak != null && (
                    <span className="sli-streak">{sq.memberStreak}d best streak</span>
                  )}
                </div>
              </div>
              <div className="sli-right">
                {isOwner && onPrivacyToggle && (
                  <button className={`privacy-toggle ${isPrivate?'private':'public'}`}
                    onClick={() => onPrivacyToggle(sq._id, !isPrivate)}>
                    {isPrivate ? <LockIcon size={13}/> : <GlobeIcon size={13}/>}
                    <span>{isPrivate?'Private':'Public'}</span>
                  </button>
                )}
                <button className="btn-view" onClick={() => setExpanded(isExpanded ? null : sq._id)}>
                  {isExpanded ? 'Hide' : 'Heatmap'}
                </button>
                <button className="btn-view" onClick={() => navigate('squad', sq._id)}>View</button>
              </div>
            </div>
            {isExpanded && (
              <div className="sli-heatmap">
                <StreakCalendar
                  squadId={sq._id}
                  userId={profileUserId}
                  goalType={sq.goalType}
                  goalTarget={sq.goalTarget}
                  goalUnit={sq.goalUnit}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ---- Badges ----
const BadgesTab = ({ badges, badgesPublic, isOwner }) => {
  if (!badgesPublic && !isOwner) return <div className="privacy-notice"><LockIcon/><p>Badges are private.</p></div>;
  if (!badges || badges.length === 0) return <div className="empty-feed"><p>No badges yet. Keep streaking to earn them.</p></div>;
  return (
    <div className="badges-grid">
      {badges.map((b,i) => (
        <div key={i} className="badge-card" style={{'--badge-color': BADGE_COLORS[b.icon]||'#818cf8'}}>
          <div className="badge-icon-wrap"><BadgeIcon name={b.icon}/></div>
          <span className="badge-name">{b.name}</span>
          <span className="badge-date">{new Date(b.earnedAt).toLocaleDateString('en',{month:'short',day:'numeric',year:'numeric'})}</span>
        </div>
      ))}
    </div>
  );
};

// ---- Edit Profile with photo upload ----
const EditProfileModal = ({ profile, onClose, onSave }) => {
  const [form, setForm]       = useState({ bio: profile.bio||'', website: profile.website||'', photoUrl: profile.photoUrl||'', socials: { instagram: profile.socials?.instagram||'', linkedin: profile.socials?.linkedin||'', twitter: profile.socials?.twitter||'', github: profile.socials?.github||'', youtube: profile.socials?.youtube||'' } });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const setSocial = (k,v) => setForm(f => ({...f, socials: {...f.socials, [k]:v}}));

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setError('Photo must be under 2MB'); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setForm(f => ({...f, photoUrl: ev.target.result}));
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => setForm(f => ({...f, photoUrl: ''}));

  const submit = async () => {
    setLoading(true); setError('');
    try { await axios.patch('/api/users/me', form); onSave(); }
    catch(err) { setError(err.response?.data?.error||'Save failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Edit Profile</h3></div>
          <button className="modal-close" onClick={onClose}><CloseIcon/></button>
        </div>
        <div className="modal-body scrollable">
          {/* Photo upload */}
          <div className="field-group">
            <label>Profile Photo</label>
            <div className="photo-upload-row">
              <div className="photo-preview">
                {form.photoUrl
                  ? <img src={form.photoUrl} alt="Preview" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}}/>
                  : <PersonIcon/>}
              </div>
              <div className="photo-upload-actions">
                <button className="btn-ghost small" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? 'Loading...' : 'Upload Photo'}
                </button>
                {form.photoUrl && (
                  <button className="btn-ghost small" onClick={removePhoto} style={{color:'#f87171'}}>Remove</button>
                )}
                <p className="photo-hint">JPG or PNG, max 2MB</p>
              </div>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" style={{display:'none'}} onChange={handlePhotoChange}/>
            </div>
          </div>

          <div className="field-group">
            <label>Bio</label>
            <textarea className="note-input" value={form.bio} onChange={e => setForm(f=>({...f,bio:e.target.value}))} maxLength={160} rows={3} placeholder="Tell people about yourself..."/>
            <span className="char-count">{form.bio.length}/160</span>
          </div>
          <div className="field-group">
            <label>Website</label>
            <input value={form.website} onChange={e => setForm(f=>({...f,website:e.target.value}))} placeholder="https://yoursite.com"/>
          </div>

          <div className="socials-edit-section">
            <p className="socials-edit-title">Social Handles</p>
            <div className="socials-edit-grid">
              {[['instagram','@'],['twitter','@'],['linkedin','in/'],['github','gh/'],['youtube','@']].map(([k,prefix])=>(
                <div key={k} className="field-group">
                  <label>{k.charAt(0).toUpperCase()+k.slice(1)}</label>
                  <div className="social-input-row">
                    <span className="social-at">{prefix}</span>
                    <input value={form.socials[k]} onChange={e=>setSocial(k,e.target.value)} placeholder="username"/>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading||uploading}>{loading?'Saving...':'Save Changes'}</button>
        </div>
      </div>
    </div>
  );
};

// ---- Privacy Modal ----
const PrivacyModal = ({ privacy, squads, squadPrivacy, onClose, onSave }) => {
  const [p,   setP]   = useState({profilePublic:true,activityPublic:true,badgesPublic:true,squadsPublic:true,statsPublic:true,...privacy});
  const [sqP, setSqP] = useState(squadPrivacy||{});
  const [loading, setLoading] = useState(false);
  const toggle   = k  => setP(prev => ({...prev,[k]:!prev[k]}));
  const toggleSq = id => setSqP(prev => ({...prev,[id]: prev[id]===false ? true : false}));
  const submit = async () => {
    setLoading(true);
    try { await axios.patch('/api/users/me/privacy', {privacy:p,squadPrivacy:sqP}); onSave(); }
    catch(e) { console.error(e); } finally { setLoading(false); }
  };
  const SETTINGS = [
    {key:'profilePublic',  label:'Public profile',     desc:'Others can view your profile page'},
    {key:'activityPublic', label:'Public activity',    desc:'Others can see your check-in feed'},
    {key:'squadsPublic',   label:'Public squads list', desc:'Others can see which squads you are in'},
    {key:'statsPublic',    label:'Public stats',       desc:'Others can see your streak numbers'},
    {key:'badgesPublic',   label:'Public badges',      desc:'Others can see your earned badges'},
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box privacy-modal" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <div><h3>Privacy Settings</h3><p className="modal-sub">Control what others can see</p></div>
          <button className="modal-close" onClick={onClose}><CloseIcon/></button>
        </div>
        <div className="modal-body scrollable">
          <div className="privacy-section">
            <p className="privacy-section-title">Profile</p>
            {SETTINGS.map(s => (
              <div key={s.key} className="privacy-row">
                <div className="privacy-row-info">
                  <span className="privacy-row-label">{s.label}</span>
                  <span className="privacy-row-desc">{s.desc}</span>
                </div>
                <button className={`toggle-pill ${p[s.key]?'on':'off'}`} onClick={()=>toggle(s.key)}>
                  <span className="toggle-thumb"/>
                </button>
              </div>
            ))}
          </div>
          {squads && squads.length > 0 && (
            <div className="privacy-section">
              <p className="privacy-section-title">Per-Squad Visibility</p>
              <p className="privacy-hint">Hide specific squads from your public profile</p>
              {squads.map(sq => (
                <div key={sq._id} className="privacy-row">
                  <div className="privacy-row-info">
                    <span className="privacy-row-label">{sq.name}</span>
                    <span className="privacy-row-desc">{sq.goal}</span>
                  </div>
                  <button className={`toggle-pill ${sqP[sq._id]!==false?'on':'off'}`} onClick={()=>toggleSq(sq._id)}>
                    <span className="toggle-thumb"/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={loading}>{loading?'Saving...':'Save Privacy'}</button>
        </div>
      </div>
    </div>
  );
};

// ---- SVG icons ----
const LockIcon   = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>;
const GlobeIcon  = ({size=16}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>;
const CloseIcon  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="14" height="14" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const PersonIcon = () => <svg viewBox="0 0 40 40" fill="none" width="40" height="40"><circle cx="20" cy="15" r="8" fill="#5a5a72"/><path d="M6 38c0-7.732 6.268-14 14-14s14 6.268 14 14" fill="#5a5a72"/></svg>;
const InstagramIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="13" height="13" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>;
const TwitterIcon   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>;
const LinkedInIcon  = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M16 8a6 6 0 016 6v7h-4v-7a2 2 0 00-2-2 2 2 0 00-2 2v7h-4v-7a6 6 0 016-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>;
const GitHubIcon    = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>;
const YouTubeIcon   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13"><path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>;
const BadgeIcon = ({name}) => {
  const p = {
    fire:      <path d="M12 2s-5 5-5 10a5 5 0 0010 0C17 7 12 2 12 2zm0 14a3 3 0 01-3-3c0-2 2-4 3-6 1 2 3 4 3 6a3 3 0 01-3 3z"/>,
    diamond:   <polygon points="12 2 22 12 12 22 2 12"/>,
    lightning: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
    double:    <><polygon points="8 2 16 2 20 12 12 22 4 12"/></>,
    year1:     <><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="monospace">1Y</text></>,
    year2:     <><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="monospace">2Y</text></>,
    year3:     <><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="monospace">3Y</text></>,
    year4:     <><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="monospace">4Y</text></>,
    year5:     <><circle cx="12" cy="12" r="10"/><text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="800" fill="currentColor" fontFamily="monospace">5Y</text></>,
  };
  return <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">{p[name]||p.fire}</svg>;
};

export default ProfilePage;
