import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AuthContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const authenticate = async (endpoint, payload) => {
    const response = await fetch(`${API_URL}/api/auth/${endpoint}`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Authentication failed');
    if (result.verificationRequired) return result;
    setUser(result.user); setIsAuthenticated(true); return result.user;
  };
  const login = ({ email, password }) => authenticate('login', { email, password });
  const register = ({ name, email, password }) => authenticate('register', { name, email, password });
  const logout = async () => { await fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }); setIsAuthenticated(false); setUser(null); };
  const updateProfile = async ({ name, avatar }) => {
    const response = await fetch(`${API_URL}/api/auth/me`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, avatarUrl: avatar }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.message || 'No se pudo actualizar el perfil');
    setUser(result.user); return result.user;
  };
  const changePassword = async ({ currentPassword, newPassword }) => {
    const response = await fetch(`${API_URL}/api/auth/change-password`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
    if (!response.ok) { const result = await response.json(); return { success: false, message: result.message || 'No se pudo actualizar la contraseña.' }; }
    return { success: true, message: '¡Contraseña actualizada correctamente!' };
  };
  const continueWithGithub = async () => {
    const response = await fetch(`${API_URL}/api/auth/github/status`);
    const { configured } = await response.json();
    if (!configured) throw new Error(`GitHub OAuth no está configurado. Revisa que el backend esté activo en ${API_URL}.`);
    window.location.assign(`${API_URL}/api/auth/github`);
  };
  const refreshSession = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
      if (!response.ok) { setIsAuthenticated(false); setUser(null); return false; }
      const { user: currentUser } = await response.json();
      setUser((previous) => ({ ...previous, ...currentUser })); setIsAuthenticated(true); return true;
    } catch { setIsAuthenticated(false); setUser(null); return false; }
    finally { setIsAuthLoading(false); }
  }, []);
  useEffect(() => { refreshSession(); }, [refreshSession]);
  return <AuthContext.Provider value={{ user, isAuthenticated, isAuthLoading, login, register, logout, updateProfile, changePassword, continueWithGithub, refreshSession }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
export default AuthContext;

