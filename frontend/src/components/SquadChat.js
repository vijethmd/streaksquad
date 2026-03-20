import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { AvatarIcon } from '../App';

const EMOJI_LIST = [
  '😀','😂','😍','🔥','💪','👏','🎉','🏆','✅','❤️',
  '😎','🤔','😅','🙌','👍','💯','🚀','⚡','🎯','💎'
];

const BADGE_ICONS = { fire:'fire', diamond:'diamond', lightning:'lightning' };

const SquadChat = ({ squadId, socket, token }) => {
  const { user } = useAuth();
  const [messages,     setMessages]     = useState([]);
  const [text,         setText]         = useState('');
  const [loading,      setLoading]      = useState(true);
  const [showEmoji,    setShowEmoji]    = useState(false);
  const [showBadges,   setShowBadges]   = useState(false);
  const [sending,      setSending]      = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Load history
  useEffect(()=>{
    axios.get(`/api/chat/${squadId}`)
      .then(res=>setMessages(res.data))
      .catch(console.error)
      .finally(()=>setLoading(false));
  },[squadId]);

  // Scroll to bottom on new messages
  useEffect(()=>{
    bottomRef.current?.scrollIntoView({behavior:'smooth'});
  },[messages]);

  // Socket listener
  useEffect(()=>{
    if(!socket) return;
    const handler = (msg) => setMessages(prev=>[...prev,msg]);
    socket.on('new_message', handler);
    return ()=>socket.off('new_message', handler);
  },[socket]);

  const sendMessage = useCallback(async (payload) => {
    if(sending) return;
    setSending(true);
    try {
      if(socket?.connected){
        socket.emit('send_message',{
          squadId, userId: user._id,
          text: payload.text||'',
          type: payload.type||'text',
          badge: payload.badge
        });
      } else {
        await axios.post(`/api/chat/${squadId}`, payload);
      }
      setText('');
      setShowEmoji(false);
      setShowBadges(false);
    } catch(e){ console.error(e); }
    finally{ setSending(false); inputRef.current?.focus(); }
  },[squadId,user._id,socket,sending]);

  const handleSend = () => {
    if(!text.trim()) return;
    sendMessage({ text: text.trim() });
  };

  const insertEmoji = (emoji) => {
    setText(t=>t+emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  const sendBadge = (badge) => {
    sendMessage({ text:'', type:'badge', badge:{ badgeId:badge.id, badgeName:badge.name, badgeIcon:badge.icon } });
  };

  const myBadges = user?.badges || [];

  return (
    <div className="squad-chat">
      {/* Messages */}
      <div className="chat-messages">
        {loading ? (
          <div className="chat-loading">Loading messages...</div>
        ) : messages.length===0 ? (
          <div className="chat-empty">No messages yet. Start the conversation.</div>
        ) : (
          messages.map((msg,i)=>{
            const isMe = msg.user?._id===user._id || msg.user?.username===user.username;
            const prevMsg = messages[i-1];
            const sameUser = prevMsg?.user?._id===msg.user?._id;
            const timeGap = prevMsg ? (new Date(msg.createdAt)-new Date(prevMsg.createdAt)) > 5*60*1000 : true;
            const showHeader = !sameUser || timeGap;

            return (
              <div key={msg._id||i} className={`chat-msg ${isMe?'me':''}`}>
                {!isMe && showHeader && (
                  <div className="chat-msg-header">
                    <AvatarIcon photoUrl={msg.user?.photoUrl} username={msg.user?.username} size={24}/>
                    <span className="chat-msg-user">{msg.user?.username}</span>
                    <span className="chat-msg-time">{formatTime(msg.createdAt)}</span>
                  </div>
                )}
                {isMe && showHeader && (
                  <div className="chat-msg-header me">
                    <span className="chat-msg-time">{formatTime(msg.createdAt)}</span>
                    <span className="chat-msg-user">{msg.user?.username}</span>
                    <AvatarIcon photoUrl={msg.user?.photoUrl} username={msg.user?.username} size={24}/>
                  </div>
                )}
                <div className={`chat-bubble ${isMe?'me':''}`}>
                  {msg.type==='badge' ? (
                    <div className="chat-badge-msg">
                      <BadgeSvg name={msg.badge?.badgeIcon}/>
                      <span>{msg.badge?.badgeName}</span>
                    </div>
                  ) : (
                    <span>{msg.text}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="emoji-panel">
          {EMOJI_LIST.map(e=>(
            <button key={e} className="emoji-panel-btn" onClick={()=>insertEmoji(e)}>{e}</button>
          ))}
        </div>
      )}

      {/* Badge picker */}
      {showBadges && myBadges.length>0 && (
        <div className="badge-panel">
          <p className="badge-panel-title">Share a badge</p>
          <div className="badge-panel-list">
            {myBadges.map((b,i)=>(
              <button key={i} className="badge-panel-item" onClick={()=>sendBadge(b)}>
                <BadgeSvg name={b.icon}/>
                <span>{b.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input row */}
      <div className="chat-input-row">
        <button className={`chat-tool-btn ${showEmoji?'active':''}`} onClick={()=>{setShowEmoji(p=>!p);setShowBadges(false);}}>
          <EmojiIcon/>
        </button>
        {myBadges.length>0 && (
          <button className={`chat-tool-btn ${showBadges?'active':''}`} onClick={()=>{setShowBadges(p=>!p);setShowEmoji(false);}}>
            <BadgePanelIcon/>
          </button>
        )}
        <input
          ref={inputRef}
          className="chat-input"
          value={text}
          onChange={e=>setText(e.target.value)}
          onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();} }}
          placeholder="Send a message..."
          maxLength={1000}
        />
        <button className="chat-send-btn" onClick={handleSend} disabled={!text.trim()||sending}>
          <SendIcon/>
        </button>
      </div>
    </div>
  );
};

const formatTime = (dateStr) => {
  if(!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now-d;
  if(diff<60000)    return 'just now';
  if(diff<3600000)  return `${Math.floor(diff/60000)}m ago`;
  if(diff<86400000) return d.toLocaleTimeString('en',{hour:'2-digit',minute:'2-digit'});
  return d.toLocaleDateString('en',{month:'short',day:'numeric'});
};

const BadgeSvg = ({name}) => {
  const p = {
    fire:      <path d="M12 2s-5 5-5 10a5 5 0 0010 0C17 7 12 2 12 2zm0 14a3 3 0 01-3-3c0-2 2-4 3-6 1 2 3 4 3 6a3 3 0 01-3 3z" fill="currentColor"/>,
    diamond:   <polygon points="12 2 22 12 12 22 2 12" fill="currentColor"/>,
    lightning: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" fill="currentColor"/>,
  };
  const colors = {fire:'var(--fire2)',diamond:'#38bdf8',lightning:'var(--yellow)'};
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" style={{color:colors[name]||'var(--fire2)'}}>
      {p[name]||p.fire}
    </svg>
  );
};

const EmojiIcon    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 13s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>;
const BadgePanelIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>;
const SendIcon     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;

export default SquadChat;
