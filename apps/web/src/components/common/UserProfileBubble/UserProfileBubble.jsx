import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/AuthContext';
import './UserProfileBubble.css';

function UserProfileBubble({ onOpenSettings }) {
  const { user, isAuthenticated, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated) return null;

  return (
    <div className="profile-bubble-container" ref={menuRef}>
      <button
        type="button"
        className="profile-bubble-btn"
        onClick={() => setMenuOpen(!menuOpen)}
        title={`${user.name} (${user.email})`}
        aria-label="Menú de perfil"
        aria-expanded={menuOpen}
      >
        <img
          src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex'}
          alt={user.name}
          className="profile-bubble-img"
        />
        <span className="profile-bubble-status" aria-hidden="true" />
      </button>

      {menuOpen && (
        <div className="profile-bubble-dropdown">
          <div className="profile-bubble-header">
            <img
              src={user.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex'}
              alt={user.name}
              className="profile-dropdown-avatar"
            />
            <div className="profile-dropdown-info">
              <span className="profile-dropdown-name">{user.name}</span>
              <span className="profile-dropdown-email">{user.email}</span>
            </div>
          </div>

          <div className="profile-bubble-divider" />

          <Link
            to="/app"
            className="profile-dropdown-item"
            onClick={() => setMenuOpen(false)}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="3" width="7" height="7" rx="1" />
              <rect x="14" y="14" width="7" height="7" rx="1" />
              <rect x="3" y="14" width="7" height="7" rx="1" />
            </svg>
            <span>Ir al Workspace</span>
          </Link>

          {onOpenSettings && (
            <button
              type="button"
              className="profile-dropdown-item"
              onClick={() => {
                setMenuOpen(false);
                onOpenSettings();
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Ajustes y Perfil</span>
            </button>
          )}

          <div className="profile-bubble-divider" />

          <button
            type="button"
            className="profile-dropdown-item profile-dropdown-item--danger"
            onClick={() => {
              setMenuOpen(false);
              logout();
              navigate('/');
            }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default UserProfileBubble;
