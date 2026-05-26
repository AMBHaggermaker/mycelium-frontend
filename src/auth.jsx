import { createContext, useContext, useState, useEffect } from 'react';
import api from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('mycelium_token'));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!token) { setReady(true); return; }
    api.me(token)
      .then(setUser)
      .catch(() => { setToken(null); localStorage.removeItem('mycelium_token'); })
      .finally(() => setReady(true));
  }, []);

  function login(newToken, newUser) {
    localStorage.setItem('mycelium_token', newToken);
    setToken(newToken);
    setUser(newUser);
    // Refresh from server to ensure all fields (verified, founding_member, email_pending) are current
    api.me(newToken).then(setUser).catch(() => {});
  }

  function logout() {
    localStorage.removeItem('mycelium_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, ready }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
