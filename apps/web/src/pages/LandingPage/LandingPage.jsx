import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LogoIcon } from '../../components/common/Logo/Logo';
import Card from '../../components/ui/Card';
import UserProfileBubble from '../../components/common/UserProfileBubble/UserProfileBubble';
import { useAuth } from '../../features/auth/AuthContext';
import './LandingPage.css';

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect
        x="3.5"
        y="5"
        width="17"
        height="14"
        rx="2.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M3.5 9.5h17M8 5v14"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M3.5 12h17M12 3.5c2.3 2 3.6 4.9 3.6 8.5S14.3 18.5 12 20.5M12 3.5C9.7 5.5 8.4 8.4 8.4 12S9.7 18.5 12 20.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M13.2 2.8 5.8 13h5l-1 8.2 8.4-11h-5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: <KeyIcon />,
    title: 'Organiza APIs & Keys',
    description:
      'Centraliza todas tus APIs y credenciales en un único lugar. Sin hojas de cálculo, sin desorden.',
  },
  {
    icon: <WorkspaceIcon />,
    title: 'Workspaces & Projects',
    description:
      'Separa recursos por proyectos y workspaces. Cada equipo o cliente en su propio espacio.',
  },
  {
    icon: <GlobeIcon />,
    title: 'Múltiples entornos',
    description:
      'Maneja dev, staging y producción sin mezclar credenciales. Cambia de entorno con un clic.',
  },
  {
    icon: <BoltIcon />,
    title: 'Ejecuta requests',
    description:
      'Lanza peticiones directamente desde la plataforma. Pronto con programación automática.',
  },
];

const GUIDE_SHOTS = [
  { title: 'Dashboard', description: 'Estadísticas y actividad del workspace.', image: '/guide/02-dashboard.png', steps: ['Revisa Projects, API Keys, APIs registradas y miembros.', 'Consulta la actividad reciente del workspace.', 'Abre el Workspace para ejecutar y organizar requests.'] },
  { title: 'Invitaciones', description: 'Invita colaboradores y gestiona roles.', image: '/guide/03-invitations.png', steps: ['Escribe el correo del colaborador.', 'Selecciona Developer, Admin, QA o Viewer.', 'Pulsa Enviar Invitación y revisa el estado pendiente.'] },
  { title: 'Configuración', description: 'Ajusta preferencias y seguridad.', image: '/guide/03-settings.png', steps: ['Abre Workspace, Teamwork o Perfil.', 'Personaliza colores y preferencias del espacio.', 'Usa las acciones de seguridad con cuidado porque pueden ser irreversibles.'] },
  { title: 'Workspace', description: 'Organiza colecciones, requests y entornos.', image: '/guide/03-workspace.png', steps: ['Selecciona un proyecto desde la barra lateral.', 'Abre una colección para ver sus endpoints.', 'Ejecuta una request, revisa la respuesta y guarda los cambios.'] },
  { title: 'API Keys', description: 'Administra credenciales del proyecto.', image: '/guide/03-apikeys.png', steps: ['Consulta el contador de API Keys del proyecto.', 'Crea o revoca credenciales desde la sección Keys.', 'Asigna una key guardada desde Authorization en una request.'] },
];

function LandingPage() {
  const { isAuthenticated, logout } = useAuth();
  const [selectedGuide, setSelectedGuide] = useState(null);

  useEffect(() => {
    if (!selectedGuide) return undefined;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSelectedGuide(null); };
    document.addEventListener('keydown', closeOnEscape);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', closeOnEscape); document.body.style.overflow = ''; };
  }, [selectedGuide]);

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="container landing__header-inner">
          <div className="landing__brand">
            <LogoIcon size={28} className="landing__logo" />
            <span className="landing__brand-name">API-Wallet</span>
          </div>

          <nav className="landing__nav">
            {isAuthenticated ? (
              <>
                <Link className="btn btn--secondary btn--sm" to="/dashboard">
                  Dashboard
                </Link>
                <Link className="btn btn--primary btn--sm" to="/app">
                  Workspace
                </Link>
                <button
                  type="button"
                  className="landing__logout-btn"
                  onClick={logout}
                >
                  Cerrar sesión
                </button>
                <UserProfileBubble />
              </>
            ) : (
              <>
                <Link className="landing__login-link" to="/login">Iniciar sesión</Link>
                <Link className="btn btn--primary btn--sm" to="/register">Regístrate</Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="landing__hero">
        <div className="container landing__hero-inner">
          <div className="landing__hero-badge">Gestión de APIs</div>
          <h1 className="landing__hero-title">
            Tu centro de control
            <br />
            para <span className="landing__accent">APIs y credenciales</span>
          </h1>
          <p className="landing__hero-description">
            API-Wallet centraliza, organiza y administra todas tus APIs y API Keys.
            Trabaja con múltiples proyectos, workspaces y entornos desde un único lugar,
            de forma segura y estructurada. "No pierdas tus llaves nunca más".
          </p>
          <div className="landing__hero-actions">
            {isAuthenticated ? (
              <>
                <Link className="btn btn--primary btn--lg" to="/dashboard">Ir al Dashboard</Link>
                <Link className="btn btn--secondary btn--lg" to="/app">Abrir Workspace</Link>
                <button className="btn btn--ghost btn--lg" onClick={logout} type="button">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <Link className="btn btn--primary btn--lg" to="/register">Comenzar</Link>
            )}
          </div>
        </div>
      </section>

      <section className="landing__features">
        <div className="container">
          <h2 className="landing__section-title">Todo lo que necesitas</h2>
          <p className="landing__section-subtitle">
            Diseñado para desarrolladores y equipos que trabajan con múltiples APIs.
          </p>
          <div className="landing__features-grid">
            {FEATURES.map((feature) => (
              <Card key={feature.title} className="landing__feature-card">
                <div className="landing__feature-icon" aria-hidden="true">
                  {feature.icon}
                </div>
                <h3 className="landing__feature-title">{feature.title}</h3>
                <p className="landing__feature-description">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="landing__guide">
        <div className="container">
          <h2 className="landing__section-title">Conoce el workspace</h2>
          <p className="landing__section-subtitle">Una guía visual rápida de las áreas principales de API-Wallet.</p>
          <div className="landing__guide-grid">
            {GUIDE_SHOTS.map((shot) => (
              <article className="landing__guide-card" key={shot.title} role="button" tabIndex={0} onClick={() => setSelectedGuide(shot)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedGuide(shot); }}>
                <div className="landing__guide-image-wrap"><img src={shot.image} alt={`Vista de ${shot.title}`} loading="lazy" /></div>
                <div className="landing__guide-copy"><h3>{shot.title}</h3><p>{shot.description}</p><span className="landing__guide-link">Abrir guía →</span></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {selectedGuide && (
        <div className="landing__guide-modal" role="presentation" onClick={() => setSelectedGuide(null)}>
          <div className="landing__guide-modal-card" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="landing__guide-modal-close" aria-label="Cerrar guía" onClick={() => setSelectedGuide(null)}>×</button>
            <div className="landing__guide-modal-image"><img src={selectedGuide.image} alt={`Captura ampliada de ${selectedGuide.title}`} /></div>
            <div className="landing__guide-modal-content"><span className="landing__hero-badge">Guía rápida</span><h2 id="guide-title">{selectedGuide.title}</h2><p>{selectedGuide.description}</p><ol>{selectedGuide.steps.map((step) => <li key={step}>{step}</li>)}</ol><Link className="btn btn--primary" to={isAuthenticated ? '/app' : '/login'} onClick={() => setSelectedGuide(null)}>Probarlo en API-Wallet →</Link></div>
          </div>
        </div>
      )}

      <section className="landing__cta">
        <div className="container landing__cta-inner">
          <h2 className="landing__cta-title">Empieza a organizar tus APIs</h2>
          <p className="landing__cta-description">
            Crea tu cuenta o inicia sesión para tener todas tus credenciales bajo control.
          </p>
          <div className="landing__hero-actions">
            {isAuthenticated ? (
              <>
                <Link className="btn btn--primary btn--lg" to="/dashboard">Entrar al Dashboard</Link>
                <Link className="btn btn--secondary btn--lg" to="/app">Abrir Workspace</Link>
                <button className="btn btn--ghost btn--lg" onClick={logout} type="button">
                  Cerrar sesión
                </button>
              </>
            ) : (
              <>
                <Link className="btn btn--primary btn--lg" to="/register">Crear cuenta</Link>
                <Link className="btn btn--secondary btn--lg" to="/login">Iniciar sesión</Link>
              </>
            )}
          </div>
        </div>
      </section>

      <footer className="landing__footer">
        <div className="container landing__footer-inner">
          <div className="landing__brand">
            <LogoIcon size={24} className="landing__logo landing__logo--sm" />
            <span className="landing__brand-name landing__brand-name--sm">API-Wallet</span>
          </div>
          <p className="landing__footer-copy">
            &copy; {new Date().getFullYear()} API-Wallet. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
