import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

export const useSocket = (token) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;
    socketRef.current = io('http://localhost:5000', { auth: { token } });
    socketRef.current.on('connect',    () => setConnected(true));
    socketRef.current.on('disconnect', () => setConnected(false));
    return () => { socketRef.current?.disconnect(); };
  }, [token]);

  const joinSquad  = (id) => socketRef.current?.emit('join_squad', id);
  const leaveSquad = (id) => socketRef.current?.emit('leave_squad', id);
  const on  = (ev, cb) => socketRef.current?.on(ev, cb);
  const off = (ev, cb) => socketRef.current?.off(ev, cb);

  return { connected, joinSquad, leaveSquad, on, off, socket: socketRef.current };
};
