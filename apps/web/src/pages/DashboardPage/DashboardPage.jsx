import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogoIcon } from '../../components/common/Logo/Logo';
import UserProfileBubble from '../../components/common/UserProfileBubble/UserProfileBubble';
import { useAuth } from '../../features/auth/AuthContext';
import { useWorkspace } from '../../features/workspaces/WorkspaceContext';
import SettingsDrawer from '../../features/settings/SettingsDrawer';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import './DashboardPage.css';

function DashboardIcon({ name, size = 16 }) {
  const paths = {
    bolt: <path d="m13 2-9 12h7l-1 8 9-12h-7l1-8Z" />,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" /><path d="M3 9h18" /></>,
    globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
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

const INITIAL_ACTIVITIES = [];
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function DashboardPage() {
  const { user } = useAuth();
  const { workspaceName, apiKeys, projects, collections, environments, workspaceDetails, createProject, activeWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const { notify } = useFeedback();

  // Active section in sidebar: 'overview' | 'projects' | 'apis' | 'environments' | 'secrets' | 'team-members' | 'team-invites'
  const [activeNav, setActiveNav] = useState('overview');
  const [teamOpen, setTeamOpen] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectForm, setProjectForm] = useState({ name: '', description: '' });
  const [projectError, setProjectError] = useState('');
  const [publicProjects, setPublicProjects] = useState([]);

  // Invite state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSentMsg, setInviteSentMsg] = useState('');
  const [invitations, setInvitations] = useState([]);
  const [myInvitations, setMyInvitations] = useState([]);
  const members = workspaceDetails?.members || [];
  useEffect(() => { fetch(`${API_URL}/api/public/projects`).then(async (response) => { if (response.ok) setPublicProjects((await response.json()).data || []); }).catch(() => {}); }, []);
  const allApis = useMemo(() => collections.flatMap((collection) => (collection.apis || []).map((api) => ({ ...api, collectionName: collection.name }))), [collections]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/invitations`, { credentials: 'include' }).then(async (response) => { if (response.ok) setInvitations((await response.json()).data || []); }).catch(() => {});
  }, [activeWorkspaceId, inviteSentMsg]);

  useEffect(() => {
    fetch(`${API_URL}/api/invitations/mine`, { credentials: 'include' }).then(async (response) => { if (response.ok) setMyInvitations((await response.json()).data || []); }).catch(() => {});
  }, []);

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    const role = new FormData(e.currentTarget).get('role') || 'DEVELOPER';
    const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/invitations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: role.toUpperCase() }) });
    const result = await response.json();
    if (!response.ok) { setInviteSentMsg(result.message || 'No se pudo enviar la invitación.'); return; }
    setInviteSentMsg(result.data.delivery?.delivered ? `Invitación enviada a ${inviteEmail}.` : `Invitación preparada para ${inviteEmail}; configura SMTP para entrega externa.`);
    setInviteEmail('');
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    setProjectError('');
    try {
      await createProject(projectForm.name, projectForm.description);
      setProjectForm({ name: '', description: '' });
      setIsProjectModalOpen(false);
    } catch (error) {
      setProjectError(error.message);
    }
  };

  const handleAcceptInvitation = async (invitationId) => {
    const response = await fetch(`${API_URL}/api/invitations/${invitationId}/accept`, { method: 'POST', credentials: 'include' });
    const result = await response.json();
    if (!response.ok) { notify(result.message || 'No se pudo aceptar la invitación.', 'error'); return; }
    notify('Te uniste al workspace.');
    setMyInvitations((items) => items.filter((item) => item.id !== invitationId));
    window.location.reload();
  };

  const handleOpenPublicProject = async (projectId) => {
    const response = await fetch(`${API_URL}/api/public/projects/${projectId}/access`, { method: 'POST', credentials: 'include' });
    const result = await response.json();
    if (!response.ok) { notify(result.message || 'No se pudo abrir el proyecto.', 'error'); return; }
    notify('Acceso concedido como Viewer. Un administrador puede ascender tu rol desde Workspace Settings.');
    window.location.reload();
  };

  return (
    <div className="dash-container">
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header className="dash-topbar">
        <div className="dash-topbar__left">
          <Link to="/" className="dash-brand" title="API-Wallet Home">
            <LogoIcon size={24} className="dash-logo" />
            <span className="dash-brand-name">Api-Wallet</span>
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
              {(invitations.length + myInvitations.length) > 0 && <span className="dash-notif-badge">{invitations.length + myInvitations.length}</span>}
            </button>



            {notificationsOpen && (
              <div className="dash-notif-dropdown">
                <div className="dash-notif-dropdown-header">
                  <span>Notificaciones recientes</span>
                  <span className="dash-notif-count">{invitations.length} pendientes</span>
                </div>
                  <div className="dash-notif-list"><p>No hay notificaciones.</p></div>
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
              <span className="dash-nav-badge">{projects.length}</span>
            </button>

            <button
              type="button"
              className={`dash-nav-item ${activeNav === 'public-projects' ? 'dash-nav-item--active' : ''}`}
              onClick={() => setActiveNav('public-projects')}
            >
              <DashboardIcon name="globe" />
              <span>Proyectos públicos</span>
              <span className="dash-nav-badge">{publicProjects.length}</span>
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
                    <span className="dash-nav-badge">{members.length}</span>
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
                  <span className="dash-stat-number">{projects.length}</span>
                  <span className="dash-stat-desc">Proyectos disponibles</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">API Keys</span>
                    <span className="dash-stat-icon dash-stat-icon--amber"><DashboardIcon name="key" /></span>
                  </div>
                  <span className="dash-stat-number">{apiKeys.length}</span>
                  <span className="dash-stat-desc">Claves del proyecto activo</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">APIs Registradas</span>
                    <span className="dash-stat-icon dash-stat-icon--green"><DashboardIcon name="bolt" /></span>
                  </div>
                  <span className="dash-stat-number">{allApis.length}</span>
                  <span className="dash-stat-desc">Endpoints del proyecto activo</span>
                </div>

                <div className="dash-stat-card">
                  <div className="dash-stat-header">
                    <span className="dash-stat-label">Team Members</span>
                    <span className="dash-stat-icon dash-stat-icon--blue"><DashboardIcon name="users" /></span>
                  </div>
                  <span className="dash-stat-number">{members.length}</span>
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
                    {INITIAL_ACTIVITIES.length === 0 ? <p>No hay actividad registrada todavía.</p> : INITIAL_ACTIVITIES.map((act) => (
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
                    {projects.slice(0, 3).map((p) => (
                      <div key={p.id} className="dash-quick-proj-item">
                        <div className="dash-proj-info">
                          <span className="dash-proj-name">{p.name}</span>
                          <span className="dash-proj-meta">{p._count?.collections || 0} colecciones • {p._count?.apiKeys || 0} keys</span>
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
                    Gestiona los proyectos asociados a tu espacio de trabajo.
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn--primary btn--md"
                  onClick={() => setIsProjectModalOpen(true)}
                >
                  + Nuevo Proyecto
                </button>
              </div>

              <div className="dash-projects-grid">
                {projects.length === 0 ? <div className="dash-card-box"><p>No hay proyectos creados todavía.</p></div> : projects.map((proj) => (
                  <div key={proj.id} className="dash-project-card">
                    <div className="dash-project-header">
                      <h3 className="dash-proj-card-title">{proj.name}</h3>
                      <span className="dash-status-pill">{proj.status || 'ACTIVE'}</span>
                    </div>
                    <p className="dash-proj-card-desc">{proj.description}</p>
                    <div className="dash-proj-metrics">
                      <span><DashboardIcon name="bolt" /> {proj._count?.collections || 0} Colecciones</span>
                      <span><DashboardIcon name="key" /> {proj._count?.apiKeys || 0} Keys</span>
                      <span><DashboardIcon name="clock" /> {new Date(proj.updatedAt).toLocaleDateString()}</span>
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

          {activeNav === 'public-projects' && (
            <div className="dash-content-pane"><div className="dash-pane-header"><div><span className="dash-eyebrow">Comunidad</span><h1>Proyectos públicos</h1><p>Explora proyectos publicados por otros usuarios.</p></div></div><div className="dash-projects-grid">{publicProjects.length === 0 ? <div className="dash-card-box"><p>Aún no hay proyectos públicos.</p></div> : publicProjects.map((project) => <div className="dash-project-card" key={project.id}><div className="dash-project-card__top"><h3>{project.name}</h3><span className="dash-project-card__badge">Público · Viewer</span></div><p>{project.description || 'Sin descripción'}</p><small>{project.workspace.name} · {project._count.collections} colecciones</small><button type="button" className="btn btn--primary btn--sm" onClick={() => handleOpenPublicProject(project.id)}>Abrir proyecto</button></div>)}</div></div>
          )}

          {isProjectModalOpen && (
            <div className="dash-modal-backdrop" role="presentation" onMouseDown={() => setIsProjectModalOpen(false)}>
              <form className="dash-project-modal" onSubmit={handleCreateProject} onMouseDown={(event) => event.stopPropagation()}>
                <h2>Nuevo proyecto</h2>
                <label>Nombre<input autoFocus required value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></label>
                <label>Descripción<textarea value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} /></label>
                {projectError && <p className="dash-alert-error">{projectError}</p>}
                <div className="dash-modal-actions"><button type="button" className="btn btn--secondary btn--sm" onClick={() => setIsProjectModalOpen(false)}>Cancelar</button><button type="submit" className="btn btn--primary btn--sm">Crear proyecto</button></div>
              </form>
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
                    <tbody>{allApis.length === 0 ? <tr><td colSpan="5">No hay endpoints registrados todavía.</td></tr> : allApis.map((api) => <tr key={api.id}><td><span className={api.method === 'POST' ? 'dash-badge-post' : 'dash-badge-get'}>{api.method}</span></td><td>{api.name}</td><td><code>{api.path}</code></td><td>{api.collectionName}</td><td><button type="button" className="dash-link-btn" onClick={() => navigate('/app')}>Probar</button></td></tr>)}</tbody>
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

              <div className="dash-env-grid">{environments.length === 0 ? <p>No hay entornos configurados para este proyecto.</p> : environments.map((environment) => <div className="dash-env-card" key={environment.id}><div className="dash-env-header"><span className={`dash-env-tag ${environment.isDefault ? 'env-prod' : 'env-test'}`}>{environment.name}</span><span className="dash-env-status">● Configurado</span></div><h3>{environment.name}</h3><p>{environment.baseUrl || 'Sin Base URL configurada.'}</p><span className="dash-env-vars">Gestiona sus secretos desde el Workspace</span></div>)}</div>
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

              <div className="dash-card-box"><p>Los secretos se cifran y sus valores no se muestran. Adminístralos desde Entornos en el Workspace.</p><button type="button" className="btn btn--primary btn--sm" onClick={() => navigate('/app')}>Abrir Entornos</button></div>
            </div>
          )}

          {/* ===================== TEAM MEMBERS VIEW ===================== */}
          {activeNav === 'team-members' && (
            <div className="dash-content-pane">
              <div className="dash-pane-header">
                <div>
                  <h1 className="dash-pane-title">Equipo y Colaboradores</h1>
                  <p className="dash-pane-subtitle">
                    {members.length} miembros registrados con acceso al espacio de trabajo.
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


              {/* Members Table */}
              <div className="dash-card-box">
                <div className="dash-members-list">
                  {members.length === 0 ? <p>No hay miembros registrados.</p> : members.map((member) => (
                    <div key={member.id} className="dash-member-row">
                      <div className="dash-member-identity">
                        {member.user.avatarUrl && <img src={member.user.avatarUrl} alt={member.user.name} className="dash-member-avatar" />}
                        <div>
                          <strong>{member.user.name}</strong>
                          <span>{member.user.email}</span>
                        </div>
                      </div>
                      <span className="dash-role-badge">
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
                  <select name="role" defaultValue="developer">
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
                  <div className="dash-pending-invites">{invitations.length === 0 ? <p>No hay invitaciones pendientes.</p> : invitations.map((invitation) => <p key={invitation.id}>{invitation.email} · {invitation.role} · vence {new Date(invitation.expiresAt).toLocaleDateString()}</p>)}</div>
              </div>

              <div className="dash-card-box">
                <h3 className="dash-box-section-title">Invitaciones recibidas</h3>
                <div className="dash-pending-invites">{myInvitations.length === 0 ? <p>No tienes invitaciones recibidas.</p> : myInvitations.map((invitation) => <div className="dash-incoming-invite" key={invitation.id}><div><strong>{invitation.workspace.name}</strong><span>{invitation.role} · vence {new Date(invitation.expiresAt).toLocaleDateString()}</span></div><button type="button" className="btn btn--primary btn--sm" onClick={() => handleAcceptInvitation(invitation.id)}>Aceptar y unirme</button></div>)}</div>
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
          navigate('/app');
          notify('Abre la sección de colecciones para confirmar la eliminación de endpoints.');
        }}
        onConfirmDeleteProject={() => {
          setIsSettingsOpen(false);
          navigate('/app');
          notify('Abre la configuración del Workspace para confirmar esta acción.');
        }}
      />
    </div>
  );
}

export default DashboardPage;
