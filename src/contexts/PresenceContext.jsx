import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth';
import { getSocket } from '../socket';

const PresenceContext = createContext(null);

export const STATUS_LABELS = {
  online:  'Online',
  busy:    'Busy',
  away:    'Away',
  offline: 'Appear Offline',
};

export function PresenceProvider({ children }) {
  const { user, token } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [myStatus, setMyStatusState]  = useState('online');
  const pingTimerRef = useRef(null);
  const debounceRef  = useRef(null);

  // Socket: receive presence updates
  useEffect(() => {
    if (!token) { setOnlineUsers([]); return; }
    const socket = getSocket(token);
    function onPresence({ users }) {
      if (Array.isArray(users)) setOnlineUsers(users);
    }
    socket.on('presence_update', onPresence);
    return () => socket.off('presence_update', onPresence);
  }, [token]);

  // Activity ping — debounced on user action + keep-alive every 60s
  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);
    function ping() { socket.emit('activity_ping'); }
    function onActivity() {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(ping, 2000);
    }
    const evts = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    evts.forEach(e => window.addEventListener(e, onActivity, { passive: true }));
    pingTimerRef.current = setInterval(ping, 60_000);
    return () => {
      evts.forEach(e => window.removeEventListener(e, onActivity));
      clearInterval(pingTimerRef.current);
      clearTimeout(debounceRef.current);
    };
  }, [token]);

  const setMyStatus = useCallback((status) => {
    if (!token) return;
    setMyStatusState(status);
    getSocket(token).emit('set_presence_status', { status });
  }, [token]);

  const getStatus = useCallback((userId) => {
    if (!userId) return null;
    return onlineUsers.find(u => String(u.id) === String(userId))?.presence_status ?? null;
  }, [onlineUsers]);

  const presenceMap = new Map(onlineUsers.map(u => [String(u.id), u]));

  return (
    <PresenceContext.Provider value={{ onlineUsers, myStatus, setMyStatus, getStatus, presenceMap }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext) ?? {
    onlineUsers: [], myStatus: 'online',
    setMyStatus: () => {}, getStatus: () => null,
    presenceMap: new Map(),
  };
}
