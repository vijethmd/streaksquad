import React from 'react';

// Replaces the old AvatarIcon (letter-based colored tiles)
// Shows user's photo if they have one, otherwise a person silhouette placeholder
const PhotoAvatar = ({ photoUrl, username, size = 36 }) => {
  const radius = size * 0.22;

  if (photoUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        overflow: 'hidden', flexShrink: 0, background: '#222228'
      }}>
        <img
          src={photoUrl}
          alt={username || 'User'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none'; }}
        />
      </div>
    );
  }

  // Placeholder — generic person silhouette
  const bg   = '#2a2a35';
  const icon = '#5a5a72';
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0, borderRadius: radius, display: 'block' }}
    >
      <rect width="40" height="40" rx={radius * (40/size)} fill={bg}/>
      {/* Head */}
      <circle cx="20" cy="15" r="6" fill={icon}/>
      {/* Body */}
      <path d="M8 36c0-6.627 5.373-12 12-12s12 5.373 12 12" fill={icon}/>
    </svg>
  );
};

export default PhotoAvatar;
