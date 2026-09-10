import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoIcon } from '../../components/common/Logo/Logo';
import UserProfileBubble from '../../components/common/UserProfileBubble/UserProfileBubble';
import { useWorkspace } from './WorkspaceContext';
import './TopBar.css';

function TopBar({ onToggleSettings, isSettingsOpen, onOpenNewWorkspaceModal }) {
  const navigate = useNavigate();
  const { workspaceName, workspaces, activeWorkspaceId, switchWorkspace } = useWorkspace();
  const [isWsMenuOpen, setIsWsMenuOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState('');
  const wsDropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(event.target)) {
        setIsWsMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredWorkspaces = (workspaces || []).filter((w) =>
    w.name.toLowerCase().includes(wsSearch.toLowerCase())
  );

  return (
    <header className="wb-topbar">
      <div className="wb-topbar__left">
        {/* Navigation history controls */}
        <div className="wb-nav-controls">
          <button type="button" className="wb-icon-btn" title="Volver al dashboard" onClick={() => navigate('/dashboard')}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button type="button" className="wb-icon-btn" title="Avanzar" onClick={() => window.history.forward()}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* HOME BUTTON TO RETURN TO LANDING */}
          <Link to="/" className="wb-home-btn" title="Volver al Inicio / Landing" aria-label="Inicio">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            <span className="wb-home-btn__text">Home</span>
          </Link>
        </div>

        {/* Workspace selector badge with DROPDOWN */}
        <div className="wb-workspace-dropdown-container" ref={wsDropdownRef}>
          <button
            type="button"
            className={`wb-workspace-badge ${isWsMenuOpen ? 'wb-workspace-badge--active' : ''}`}
            onClick={() => setIsWsMenuOpen(!isWsMenuOpen)}
            aria-expanded={isWsMenuOpen}
          >
            <LogoIcon size={18} className="wb-brand-icon" />
            <span className="wb-workspace-name">{workspaceName}</span>
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{
                transform: isWsMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.15s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Workspace Dropdown Menu */}
          {isWsMenuOpen && (
            <div className="wb-ws-menu-dropdown">
              <div className="wb-ws-menu-header">
                <span>Espacios de Trabajo</span>
                <button
                  type="button"
                  className="wb-ws-create-inline-btn"
                  onClick={() => {
                    setIsWsMenuOpen(false);
                    onOpenNewWorkspaceModal();
                  }}
                  title="Crear un nuevo workspace"
                >
                  + Nuevo
                </button>
              </div>

              {/* Filter search */}
              <div className="wb-ws-filter-box">
                <input
                  type="text"
                  placeholder="Buscar workspace..."
                  value={wsSearch}
                  onChange={(e) => setWsSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Workspace list */}
              <div className="wb-ws-list">
                {filteredWorkspaces.map((ws) => {
                  const isCurrent = ws.id === activeWorkspaceId;
                  return (
                    <div
                      key={ws.id}
                      className={`wb-ws-item ${isCurrent ? 'wb-ws-item--active' : ''}`}
                      onClick={() => {
                        switchWorkspace(ws.id);
                        setIsWsMenuOpen(false);
                      }}
                    >
                      <div className="wb-ws-item-avatar">
                        {ws.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="wb-ws-item-info">
                        <span className="wb-ws-item-title">{ws.name}</span>
                        {ws.description && (
                          <span className="wb-ws-item-desc">{ws.description}</span>
                        )}
                      </div>
                      {isCurrent && <span className="wb-ws-check">✓</span>}
                    </div>
                  );
                })}
              </div>

              <div className="wb-ws-menu-footer">
                <button
                  type="button"
                  className="wb-ws-create-btn-full"
                  onClick={() => {
                    setIsWsMenuOpen(false);
                    onOpenNewWorkspaceModal();
                  }}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>Crear nuevo Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Global Search */}
      <div className="wb-topbar__center">
        <div className="wb-search-bar">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar APIs, colecciones o API Keys..."
            aria-label="Buscar en API-Wallet"
          />
          <span className="wb-search-shortcut">Ctrl K</span>
        </div>
      </div>

      {/* Topbar Right actions */}
      <div className="wb-topbar__right">
        {/* Environment badge */}
        <div className="wb-env-selector" title="Entorno activo">
          <span className="wb-env-indicator" />
          <span>Producción</span>
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>

        <div className="wb-topbar-divider" />

        {/* Settings gear button */}
        <button
          type="button"
          className={`wb-icon-btn wb-settings-btn ${isSettingsOpen ? 'wb-settings-btn--active' : ''}`}
          onClick={onToggleSettings}
          title="Configuración y Ajustes (Workspace & Perfil)"
          aria-label="Abrir Configuración"
          aria-expanded={isSettingsOpen}
        >
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>

        {/* User profile bubble */}
        <UserProfileBubble onOpenSettings={onToggleSettings} />
      </div>
    </header>
  );
}

export default TopBar;
