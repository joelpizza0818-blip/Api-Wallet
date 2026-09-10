import { createContext, useContext, useState, useEffect } from 'react';

const AUTH_STORAGE_KEY = 'api-wallet-auth-user';
const AUTH_STATUS_KEY = 'api-wallet-auth-status';

const DEFAULT_USER = {
  id: 'usr_dev_01',
  name: 'Alex Dev',
  email: 'alex@apiwallet.io',
  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
  role: 'Developer Admin',
  joinedDate: 'Mayo 2026',
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    try {
      const savedStatus = localStorage.getItem(AUTH_STATUS_KEY);
      return savedStatus !== null ? savedStatus === 'true' : true; // Default to true for quick workspace access
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(AUTH_STATUS_KEY, String(isAuthenticated));
    } catch (e) {
      console.error('Error saving auth to localStorage', e);
    }
  }, [user, isAuthenticated]);

  const login = ({ email, name }) => {
    setUser((prev) => ({
      ...prev,
      email: email || prev.email,
      name: name || (email ? email.split('@')[0] : prev.name),
    }));
    setIsAuthenticated(true);
  };

  const register = ({ name, email }) => {
    setUser({
      id: `usr_${Date.now().toString(36)}`,
      name: name || 'Nuevo Usuario',
      email: email || 'usuario@apiwallet.io',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(name || 'User')}`,
      role: 'Developer Admin',
      joinedDate: 'Hoy',
    });
    setIsAuthenticated(true);
  };

  const logout = () => {
    setIsAuthenticated(false);
  };

  const updateProfile = ({ name, avatar, email }) => {
    setUser((prev) => ({
      ...prev,
      ...(name !== undefined && { name }),
      ...(avatar !== undefined && { avatar }),
      ...(email !== undefined && { email }),
    }));
  };

  const changePassword = ({ currentPassword: _currentPassword, newPassword }) => {
    if (!newPassword || newPassword.length < 6) {
      return { success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    return { success: true, message: '¡Contraseña actualizada correctamente!' };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        register,
        logout,
        updateProfile,
        changePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
