import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import UserProfileBubble from '../../components/common/UserProfileBubble/UserProfileBubble';
import { useAuth } from '../../features/auth/AuthContext';
import { useWorkspace } from '../../features/workspaces/WorkspaceContext';
import SettingsDrawer from '../../features/settings/SettingsDrawer';
import './DashboardPage.css';

function DashboardIcon({ name, size = 16 }) {
  const paths = {
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 9h18" /></>,
    key: <><circle cx="8" cy="15" r="3" /><path d="m10.2 12.8 8.8-8.8M16 6l2 2m-5 1 2 2" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

const DEFAULT_PROJECTS = [
  { id: 'proj-1', name: 'Core API Gateway', description: 'Servicios de autenticación, usuarios y enrutamiento central', apis: 14, keys: 6, status: 'Activo', updated: 'Hace 1 hora' },
  { id: 'proj-2', name: 'Payment & Billing Vault', description: 'Integración con pasarelas de pago, webhooks y facturación', apis: 8, keys: 12, status: 'Activo', updated: 'Hace 3 horas' },
  { id: 'proj-3', name: 'Streaming & Trailers Feed', description: 'Catálogo multimedia, compresión de video y CDN', apis: 6, keys: 4, status: 'Activo', updated: 'Ayer' },
  { id: 'proj-4', name: 'Notification Service', description: 'Push notifications, SMS y emails transaccionales', apis: 5, keys: 8, status: 'Activo', updated: 'Hace 2 días' },
  { id: 'proj-5', name: 'Mobile App Client SDK', description: 'Endpoints optimizados para clientes iOS y Android', apis: 9, keys: 5, status: 'Activo', updated: 'Hace 3 días' },
  { id: 'proj-6', name: 'Admin Operations Suite', description: 'Métricas, auditoría de usuarios y logs del sistema', apis: 7, keys: 3, status: 'En revisión', updated: 'Hace 4 días' },
];

const INITIAL_ACTIVITIES = [
  { id: 1, user: 'Joel M.', action: 'creó la API', target: 'Payment Webhook', time: 'Hace 10 min', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Joel' },
  { id: 2, user: 'Alex Dev', action: 'actualizó el proyecto', target: 'Core API Gateway', time: 'Hace 1 hora', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex' },
  { id: 3, user: 'Sofia R.', action: 'generó la API Key', target: 'sk_live_mobile_sdk_99', time: 'Hace 3 horas', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sofia' },
  { id: 4, user: 'Carlos T.', action: 'invitó al miembro', target: 'laura@team.io', time: 'Ayer', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Carlos' },
  { id: 5, user: 'Joel M.', action: 'desplegó el entorno', target: 'Staging-v2', time: 'Hace 2 días', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Joel' },
];

const TEAM_MEMBERS = [
  { id: 'm-1', name: 'Alex Dev', email: 'alex@apiwallet.io', role: 'Owner / Admin', badgeClass: 'role-owner', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex' },
  { id: 'm-2', name: 'Joel M.', email: 'joel@apiwallet.io', role: 'Lead Backend Engineer', badgeClass: 'role-admin', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Joel' },
  { id: 'm-3', name: 'Sofia R.', email: 'sofia@apiwallet.io', role: 'API Developer', badgeClass: 'role-dev', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Sofia' },
  { id: 'm-4', name: 'Carlos T.', email: 'carlos@apiwallet.io', role: 'QA Tester', badgeClass: 'role-qa', avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=Carlos' },
];

function DashboardPage() {
  const { user } = useAuth();
  const { workspaceName, apiKeys } = useWorkspace();
  const navigate = useNavigate();

  // Active section in sidebar: 'overview' | 'projects' | 'apis' | 'environments' | 'secrets' | 'team-members' | 'team-invites'
  const [activeNav, setActiveNav] = useState('overview');
  const [teamOpen, setTeamOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSentMsg, setInviteSentMsg] = useState('');

  const handleSendInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteSentMsg(`¡Invitación enviada a ${inviteEmail}!`);
    setInviteEmail('');
    setTimeout(() => setInviteSentMsg(''), 3500);
  };

  return (
    <div className="dash-container">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="dash-topbar">
        <div className="dash-topbar__left">
          <Link to="/" className="dash-brand" title="API-Wallet Home">
            <img src={logo} alt="Logo" className="dash-logo" />
            <span className="dash-brand-name">API Vault</span>
          </Link>
          <span className="dash-badge-pro">Workspace Cloud</span>
        </div>

        <div className="dash-topbar__right">
          {/* Quick link to Workspace */}
          <Link to="/app" className="dash-workspace-cta-btn" title="Abrir Workspace en modo Postman">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Ir al Workspace</span>
          </Link>

          {/* Notification Bell */}
          <div className="dash-notif-container">
            <button
              type="button"
              className={`dash-notif-btn ${notificationsOpen ? 'dash-notif-btn--active' : ''}`}
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              title="Notificaciones"
              aria-label="Ver notificaciones"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="dash-notif-badge">3</span>
            </button>

            {notificationsOpen && (
              <div className="dash-notif-dropdown">
                <div className="dash-notif-dropdown-header">
                  <span>Notificaciones recientes</span>
                  <span className="dash-notif-count">3 nuevas</span>
                </div>
                <div className="dash-notif-list">
                  <div className="dash-notif-item">
                    <span className="dash-notif-dot" />
                    <div>
                      <p><strong>Joel M.</strong> agregó el endpoint <code>/auth/verify</code></p>
                      <small>Hace 10 minutos</small>
                    </div>
                  </div>
                  <div className="dash-notif-item">
                    <span className="dash-notif-dot" />
                    <div>
                      <p>API Key <strong>sk_live_prod</strong> fue utilizada desde AWS</p>
                      <small>Hace 45 minutos</small>
                    </div>
                  </div>
                  <div className="dash-notif-item">
                    <span className="dash-notif-dot" />
                    <div>
                      <p>Mantenimiento de la base de datos completado</p>
                      <small>Ayer</small>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="dash-topbar-divider" />

          {/* User Profile Bubble */}
          <UserProfileBubble onOpenSettings={() => setIsSettingsOpen(true)} />
        </div>
      </header>

      {/* ── Main Layout (Sidebar + Content) ────────────────────── */}
      <div className="dash-body">
        {/* Left Sidebar */}
        <aside className="dash-sidebar">
          {/* Workspace selector dropdown */}
          <div className="dash-workspace-select-card">
            <div className="dash-workspace-avatar">W</div>
            <div className="dash-workspace-info">
              <span className="dash-workspace-title">{workspaceName}</span>
              <span className="dash-workspace-sub">Plan Desarrollador</span>
            </div>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>

          {/* Nav List */}
          <nav className="dash-nav-menu">
            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'overview' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('overview')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>Overview</span>
            </button>

            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'projects' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('projects')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <span>Projects</span>
              <span className="dash-nav-badge">12</span>
            </button>

            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'apis' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('apis')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>APIs</span>
            </button>

            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'environments' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('environments')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M3.5 12h17M12 3.5c2.3 2 3.6 4.9 3.6 8.5S14.3 18.5 12 20.5M12 3.5C9.7 5.5 8.4 8.4 8.4 12S9.7 18.5 12 20.5" />
              </svg>
              <span>Environments</span>
            </button>

            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'secrets' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('secrets')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Secrets</span>
            </button>

            {/* Team Dropdown section */}
            <div className="dash-nav-group">
              <button
                type="button"
                className="dash-nav-group-header"
                onClick={() => setTeamOpen(!teamOpen)}
              >
                <span>Team</span>
                <svg
                  viewBox="0 0 24 24"
                  width="12"
                  height="12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ transform: teamOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {teamOpen && (
                <div className="dash-nav-subitems">
                  <button
                    type="button"
                    className={`dash-nav-subitem ${activeNav === 'team-members' ? 'dash-nav-subitem--active' : ''}`}
                    onClick={() => setActiveNav('team-members')}
                  >
                    <span>Members</span>
                    <span className="dash-nav-badge">4</span>
                  </button>

                  <button
                    type="button"
                    className={`dash-nav-subitem ${activeNav === 'team-invites' ? 'dash-nav-subitem--active' : ''}`}
                    onClick={() => setActiveNav('team-invites')}
                  >
                    <span>Invitations</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="dash-nav-item"
              onClick={() => setIsSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              <span>Settings</span>
            </button>
          </nav>

          {/* Quick link button to open Postman-style workspace */}
          <div className="dash-sidebar-footer">
            <button
              type="button"
              className="dash-enter-workspace-btn"
              onClick={() => navigate('/app')}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="3" y1="9" x2="21" y2="9" />
                <line x1="9" y1="21" x2="9" y2="9" />
              </svg>
              <span>Abrir Workspace</span>
            </button>
          </div>
        </aside>

        {/* Main Content View */}
        <main className="dash-main">
          {/* ===================== OVERVIEW VIEW ===================== */}
          {activeNav === 'overview' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Overview</h1>
                  <p className="dash-pane-subtitle">
                    Bienvenido de vuelta, <strong>{user?.name || 'Developer'}</strong>. Resumen general de tu cuenta y recursos.
                  </p>
                </div>

                <div className="dash-header-action-group">
                  <button
                    type="button"
                    className="btn btn--primary btn--md"
                    onClick={() => navigate('/app')}
                  >
                    <DashboardIcon name="bolt" />
                    Abrir Workspace de APIs
                  </button>
                </div>
              </div>

              {/* Stats Counters Grid (Projects 12, API Keys 38, etc.) */}
              <div className="dash-stats-grid">
                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">Projects</span>
                    <span className="dash-stat-icon dash-stat-icon--purple"><DashboardIcon name="folder" /></span>
                  </div>
                  <span className="dash-stat-number">12</span>
                  <span className="dash-stat-desc">+2 nuevos este mes</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">API Keys</span>
                    <span className="dash-stat-icon dash-stat-icon--amber"><DashboardIcon name="key" /></span>
                  </div>
                  <span className="dash-stat-number">{apiKeys.length >= 3 ? 38 : apiKeys.length}</span>
                  <span className="dash-stat-desc">38 tokens autorizados</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">APIs Registradas</span>
                    <span className="dash-stat-icon dash-stat-icon--green"><DashboardIcon name="bolt" /></span>
                  </div>
                  <span className="dash-stat-number">49</span>
                  <span className="dash-stat-desc">Endpoints activos</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">Team Members</span>
                    <span className="dash-stat-icon dash-stat-icon--blue"><DashboardIcon name="users" /></span>
                  </div>
                  <span className="dash-stat-number">4</span>
                  <span className="dash-stat-desc">Colaboradores activos</span>
                </div>
              </div>

              {/* 2-Column Section: Recent Activity & Featured Projects */}
              <div className="dash-overview-columns">
                {/* Recent Activity List */}
                <div className="dash-card-box">
                  <div className="dash-box-header">
                    <h3>Recent activity</h3>
                    <span className="dash-box-link">Tiempo real</span>
                  </div>

                  <div className="dash-activity-list">
                    {INITIAL_ACTIVITIES.map((act) => (
                      <div key={act.id} className="dash-activity-item">
                        <img src={act.avatar} alt={act.user} className="dash-act-avatar" />
                        <div className="dash-act-content">
                          <p className="dash-act-text">
                            <strong>{act.user}</strong> {act.action} <code>{act.target}</code>
                          </p>
                          <span className="dash-act-time">{act.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Workspace launcher & Top Projects */}
                <div className="dash-card-box">
                  <div className="dash-box-header">
                    <h3>Workspace de Desarrollo</h3>
                    <Link to="/app" className="dash-box-link">Ver todo ›</Link>
                  </div>

                  <div className="dash-workspace-banner">
                    <div className="dash-banner-info">
                      <h4>API Workspace (Postman Layout)</h4>
                      <p>Prueba endpoints HTTP en vivo, organiza carpetas y gestiona credenciales de acceso con visualización directa.</p>
                    </div>
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => navigate('/app')}
                    >
                      Abrir Canvas de APIs
                    </button>
                  </div>

                  <div className="dash-quick-projects">
                    <h5>Proyectos destacados:</h5>
                    {DEFAULT_PROJECTS.slice(0, 3).map((p) => (
                      <div key={p.id} className="dash-quick-proj-item">
                        <div className="dash-proj-info">
                          <span className="dash-proj-name">{p.name}</span>
                          <span className="dash-proj-meta">{p.apis} APIs • {p.keys} Keys</span>
                        </div>
                        <button
                          type="button"
                          className="dash-open-btn"
                          onClick={() => navigate('/app')}
                        >
                          Abrir
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================== PROJECTS VIEW ===================== */}
          {activeNav === 'projects' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Proyectos del Workspace</h1>
                  <p className="dash-pane-subtitle">
                    Gestiona los 12 proyectos asociados a tu espacio de trabajo.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--md"
                  onClick={() => alert('Nuevo proyecto creado!')}
                >
                  + Nuevo Proyecto
                </button>
              </div>

              <div className="dash-projects-grid">
                {DEFAULT_PROJECTS.map((proj) => (
                  <div key={proj.id} className="dash-project-card">
                    <div className="dash-project-header">
                      <h3 className="dash-proj-card-title">{proj.name}</h3>
                      <span className="dash-status-pill">{proj.status}</span>
                    </div>
                    <p className="dash-proj-card-desc">{proj.description}</p>
                    <div className="dash-proj-metrics">
                      <span><DashboardIcon name="bolt" /> {proj.apis} Endpoints</span>
                      <span><DashboardIcon name="key" /> {proj.keys} Keys</span>
                      <span><DashboardIcon name="clock" /> {proj.updated}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm dash-proj-btn"
                      onClick={() => navigate('/app')}
                    >
                      Abrir en Workspace
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ===================== APIS VIEW ===================== */}
          {activeNav === 'apis' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Catálogo Central de APIs</h1>
                  <p className="dash-pane-subtitle">
                    Endpoints documentados y listos para ejecutar.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--md"
                  onClick={() => navigate('/app')}
                >
                  Ir al Tester de APIs
                </button>
              </div>

              <div className="dash-card-box">
                <div className="dash-apis-table-wrap">
                  <table className="dash-table">
                    <thead>
                      <tr>
                        <th>Método</th>
                        <th>Nombre</th>
                        <th>Path</th>
                        <th>Colección</th>
                        <th>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td><span className="dash-badge-get">GET</span></td>
                        <td>Get Current User</td>
                        <td><code>/api/v1/auth/me</code></td>
                        <td>Auth</td>
                        <td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td>
                      </tr>
                      <tr>
                        <td><span className="dash-badge-post">POST</span></td>
                        <td>User Login</td>
                        <td><code>/api/v1/auth/login</code></td>
                        <td>Auth</td>
                        <td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td>
                      </tr>
                      <tr>
                        <td><span className="dash-badge-get">GET</span></td>
                        <td>List All Users</td>
                        <td><code>/api/v1/admin/users</code></td>
                        <td>Admin</td>
                        <td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td>
                      </tr>
                      <tr>
                        <td><span className="dash-badge-get">GET</span></td>
                        <td>Trailers Feed</td>
                        <td><code>/api/v1/trailers/feed</code></td>
                        <td>Trailers</td>
                        <td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td>
                      </tr>
                      <tr>
                        <td><span className="dash-badge-post">POST</span></td>
                        <td>Broadcast Notice</td>
                        <td><code>/api/v1/notices/broadcast</code></td>
                        <td>Notices</td>
                        <td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ===================== ENVIRONMENTS VIEW ===================== */}
          {activeNav === 'environments' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Entornos de Ejecución</h1>
                  <p className="dash-pane-subtitle">
                    Configura variables de entorno para Producción, Staging y Desarrollo.
                  </p>
                </div>
              </div>

              <div className="dash-env-grid">
                <div className="dash-env-card">
                  <div className="dash-env-header">
                    <span className="dash-env-tag env-prod">Producción</span>
                    <span className="dash-env-status">● Activo</span>
                  </div>
                  <h3>Production Gateway</h3>
                  <p><code>https://api.apiwallet.io/v1</code></p>
                  <span className="dash-env-vars">18 Variables de entorno</span>
                </div>

                <div className="dash-env-card">
                  <div className="dash-env-header">
                    <span className="dash-env-tag env-test">Staging</span>
                    <span className="dash-env-status">● Activo</span>
                  </div>
                  <h3>Staging Cluster</h3>
                  <p><code>https://staging-api.apiwallet.io/v1</code></p>
                  <span className="dash-env-vars">14 Variables de entorno</span>
                </div>

                <div className="dash-env-card">
                  <div className="dash-env-header">
                    <span className="dash-env-tag env-dev">Local Dev</span>
                    <span className="dash-env-status">● Localhost</span>
                  </div>
                  <h3>Localhost Sandbox</h3>
                  <p><code>http://localhost:3000/api</code></p>
                  <span className="dash-env-vars">8 Variables de entorno</span>
                </div>
              </div>
            </div>
          )}

          {/* ===================== SECRETS VIEW ===================== */}
          {activeNav === 'secrets' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Secrets & Certificados</h1>
                  <p className="dash-pane-subtitle">
                    Almacén seguro cifrado para llaves maestras y certificados SSL.
                  </p>
                </div>
              </div>

              <div className="dash-card-box">
                <div className="dash-secret-item">
                  <div>
                    <strong>JWT_PRIVATE_KEY</strong>
                    <p>Llave asimétrica RSA-256 para firma de tokens</p>
                  </div>
                  <code>••••••••••••••••••••••••••••••••</code>
                </div>
                <div className="dash-secret-item">
                  <div>
                    <strong>STRIPE_WEBHOOK_SECRET</strong>
                    <p>Firma de validación para eventos de pago</p>
                  </div>
                  <code>whsec_••••••••••••••••••••••••</code>
                </div>
                <div className="dash-secret-item">
                  <div>
                    <strong>DATABASE_ENCRYPTION_KEY</strong>
                    <p>Llave AES para datos en reposo</p>
                  </div>
                  <code>aes_••••••••••••••••••••••••</code>
                </div>
              </div>
            </div>
          )}

          {/* ===================== TEAM MEMBERS VIEW ===================== */}
          {activeNav === 'team-members' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Equipo y Colaboradores</h1>
                  <p className="dash-pane-subtitle">
                    4 miembros registrados con acceso al espacio de trabajo.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--md"
                  onClick={() => setActiveNav('team-invites')}
                >
                  + Invitar Miembro
                </button>
              </div>

              {/* Shareable Project Code Banner */}
              <div className="dash-share-code-card">
                <div className="dash-share-code-info">
                  <span className="dash-share-badge">Código de Invitación del Proyecto</span>
                  <h3>Código para unirse al Workspace</h3>
                  <p>Comparte este código con tus compañeros para que se unan al proyecto con 1 clic:</p>
                </div>
                <div className="dash-code-action-box">
                  <code className="dash-code-display">PRJ-WALLET-7894-INV</code>
                  <button
                    type="button"
                    className="dash-copy-code-btn"
                    onClick={() => {
                      navigator.clipboard.writeText('PRJ-WALLET-7894-INV');
                      alert('¡Código PRJ-WALLET-7894-INV copiado al portapapeles!');
                    }}
                  >
                    Copiar Código
                  </button>
                </div>
              </div>

              {/* Members Table */}
              <div className="dash-card-box">
                <div className="dash-members-list">
                  {TEAM_MEMBERS.map((member) => (
                    <div key={member.id} className="dash-member-row">
                      <div className="dash-member-identity">
                        <img src={member.avatar} alt={member.name} className="dash-member-avatar" />
                        <div>
                          <strong>{member.name}</strong>
                          <span>{member.email}</span>
                        </div>
                      </div>
                      <span className={`dash-role-badge ${member.badgeClass}`}>
                        {member.role}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===================== TEAM INVITATIONS VIEW ===================== */}
          {activeNav === 'team-invites' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Invitaciones del Equipo</h1>
                  <p className="dash-pane-subtitle">
                    Envía invitaciones por correo o comparte el código único de proyecto.
                  </p>
                </div>
              </div>

              {inviteSentMsg && (
                <div className="dash-alert-success">
                  ✓ {inviteSentMsg}
                </div>
              )}

              <div className="dash-card-box">
                <h3 className="dash-box-section-title">Invitar a un nuevo colaborador</h3>
                <form onSubmit={handleSendInvite} className="dash-invite-form">
                  <input
                    type="email"
                    placeholder="compañero@empresa.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                  <select defaultValue="developer">
                    <option value="developer">Rol: Developer</option>
                    <option value="admin">Rol: Admin</option>
                    <option value="qa">Rol: QA Tester</option>
                    <option value="viewer">Rol: Viewer</option>
                  </select>
                  <button type="submit" className="btn btn--primary btn--md">
                    Enviar Invitación
                  </button>
                </form>
              </div>

              <div className="dash-card-box">
                <h3 className="dash-box-section-title">Invitaciones pendientes</h3>
                <div className="dash-pending-invites">
                  <div className="dash-pending-item">
                    <div>
                      <strong>laura@team.io</strong>
                      <span>Invitado por Carlos T. • Rol: Developer</span>
                    </div>
                    <span className="dash-pending-badge">Pendiente</span>
                  </div>
                  <div className="dash-pending-item">
                    <div>
                      <strong>dev-externo@partner.io</strong>
                      <span>Invitado por Alex Dev • Rol: Viewer</span>
                    </div>
                    <span className="dash-pending-badge">Pendiente</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfirmDeleteApis={() => {
          setIsSettingsOpen(false);
          alert('Acción de borrado disponible desde el Workspace.');
        }}
        onConfirmDeleteProject={() => {
          setIsSettingsOpen(false);
          alert('Acción de reseteo disponible desde el Workspace.');
        }}
      />
    </div>
  );
}

export default DashboardPage;
