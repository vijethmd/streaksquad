import React from 'react';

// StreakSquad logo — flame with upward bar chart inside
export const LogoMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff5e1a"/>
        <stop offset="100%" stopColor="#ff8c42"/>
      </linearGradient>
      <clipPath id="flameClip">
        <path d="M20 2C20 2 8 12 8 22C8 29.7 13.4 36 20 36C26.6 36 32 29.7 32 22C32 12 20 2 20 2Z"/>
      </clipPath>
    </defs>
    {/* Flame outer shape */}
    <path
      d="M20 2C20 2 8 12 8 22C8 29.7 13.4 36 20 36C26.6 36 32 29.7 32 22C32 12 20 2 20 2Z"
      fill="url(#logoGrad)"
    />
    {/* Bar chart bars clipped inside flame */}
    <g clipPath="url(#flameClip)">
      <rect x="11" y="26" width="4" height="10" rx="1" fill="rgba(0,0,0,0.35)"/>
      <rect x="18" y="20" width="4" height="16" rx="1" fill="rgba(0,0,0,0.35)"/>
      <rect x="25" y="14" width="4" height="22" rx="1" fill="rgba(0,0,0,0.35)"/>
    </g>
    {/* Inner flame highlight */}
    <path
      d="M20 10C20 10 15 16 15 22C15 25.3 17.2 28 20 28C22.8 28 25 25.3 25 22C25 16 20 10 20 10Z"
      fill="rgba(255,255,255,0.18)"
    />
  </svg>
);

export const LogoFull = ({ size = 32 }) => (
  <div style={{ display:'flex', alignItems:'center', gap: 10 }}>
    <LogoMark size={size} />
    <span style={{
      fontFamily: "'Noto Sans', sans-serif",
      fontWeight: 800,
      fontSize: size * 0.55,
      color: '#ff5e1a',
      letterSpacing: '-0.5px',
      lineHeight: 1,
    }}>StreakSquad</span>
  </div>
);

export default LogoMark;
