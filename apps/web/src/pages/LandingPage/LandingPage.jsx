import { Link } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import Card from '../../components/ui/Card';
import ThemeToggle from '../../components/common/ThemeToggle/ThemeToggle';
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

function LandingPage() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="container landing__header-inner">
          <div className="landing__brand">
            <img src={logo} alt="API-Wallet logo" className="landing__logo" />
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
            <ThemeToggle />
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
            <img src={logo} alt="API-Wallet logo" className="landing__logo landing__logo--sm" />
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
