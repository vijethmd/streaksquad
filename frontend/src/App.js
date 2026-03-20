import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage     from './pages/AuthPage';
import Dashboard    from './pages/Dashboard';
import SquadPage    from './pages/SquadPage';
import DiscoverPage from './pages/DiscoverPage';
import ProfilePage  from './pages/ProfilePage';
import './App.css';
import { LogoMark } from './components/Logo';
import PhotoAvatar from './components/PhotoAvatar';

const AppRouter = () => {
  const { user, loading } = useAuth();
  const [page, setPage]           = useState('dashboard');
  const [activeSquadId, setActiveSquadId]     = useState(null);
  const [activeUsername, setActiveUsername]   = useState(null);
  const [mobileNavOpen, setMobileNavOpen]     = useState(false);

  if (loading) return (
    <div className="splash">
      <div className="splash-ring" />
      <div className="splash-text">StreakSquad</div>
    </div>
  );

  if (!user) return <AuthPage />;

  const navigate = (p, id = null) => {
    setPage(p);
    setMobileNavOpen(false);
    if (p === 'squad')   setActiveSquadId(id);
    if (p === 'profile') setActiveUsername(id || user.username);
  };

  return (
    <div className="app-shell">
      <Sidebar page={page} navigate={navigate} open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="app-body">
        <MobileTopBar navigate={navigate} onMenuToggle={() => setMobileNavOpen(o => !o)} />
        <main className="main-content">
          {page === 'dashboard' && <Dashboard navigate={navigate} />}
          {page === 'squad'     && <SquadPage squadId={activeSquadId} navigate={navigate} />}
          {page === 'discover'  && <DiscoverPage navigate={navigate} />}
          {page === 'profile'   && <ProfilePage username={activeUsername} navigate={navigate} />}
        </main>
      </div>
      {mobileNavOpen && <div className="nav-overlay" onClick={() => setMobileNavOpen(false)} />}
    </div>
  );
};

const MobileTopBar = ({ navigate, onMenuToggle }) => {
  const { user } = useAuth();
  return (
    <div className="mobile-topbar">
      <button className="menu-btn" onClick={onMenuToggle} aria-label="Menu">
        <span /><span /><span />
      </button>
      <div className="mobile-logo-wrap">
        <LogoMark size={22} />
        <span className="mobile-logo">StreakSquad</span>
      </div>
      <button className="mobile-avatar-btn" onClick={() => navigate('profile', user.username)}>
        <AvatarIcon photoUrl={user?.photoUrl} username={user?.username} size={32} />
      </button>
    </div>
  );
};

const Sidebar = ({ page, navigate, open, onClose }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard', icon: 'home',    label: 'Home' },
    { id: 'discover',  icon: 'compass', label: 'Discover' },
    { id: 'profile',   icon: 'user',    label: 'Profile' },
  ];

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="sidebar-logo">
        <LogoMark size={28} />
        <span className="logo-name">StreakSquad</span>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            onClick={() => navigate(item.id, item.id === 'profile' ? user.username : null)}
          >
            <NavIcon name={item.icon} />
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        <button className="user-chip" onClick={() => navigate('profile', user.username)}>
          <AvatarIcon photoUrl={user?.photoUrl} username={user?.username} size={34} />
          <div className="user-info">
            <span className="user-name">{user?.username}</span>
            <span className="user-streak">{user?.totalStreakDays || 0} streak days</span>
          </div>
        </button>
        <button className="logout-btn" onClick={logout} title="Log out">
          <LogoutIcon />
        </button>
      </div>
    </aside>
  );
};

// SVG icon components — no emojis
export const NavIcon = ({ name }) => {
  const icons = {
    home:    <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1V9.5z" />,
    compass: <><circle cx="12" cy="12" r="10"/><polygon points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"/></>,
    user:    <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></>,
    fire:    <path d="M12 2c0 0-5 5-5 10a5 5 0 0010 0C17 7 12 2 12 2zm0 14a3 3 0 01-3-3c0-2 2-4 3-6 1 2 3 4 3 6a3 3 0 01-3 3z"/>,
  };
  return (
    <svg className="nav-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {icons[name] || icons.home}
    </svg>
  );
};

export const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
  </svg>
);

// AvatarIcon is now a thin wrapper over PhotoAvatar
// props: photoUrl (string), username (string), size (number)
// Legacy callers that pass name= will just get the placeholder
export const AvatarIcon = ({ photoUrl, username, name, size = 36 }) => (
  <PhotoAvatar photoUrl={photoUrl} username={username || name} size={size} />
);

const App = () => (
  <AuthProvider>
    <AppRouter />
  </AuthProvider>
);

export default App;
