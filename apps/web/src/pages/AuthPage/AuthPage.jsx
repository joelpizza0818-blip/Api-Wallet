import { Link, useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.svg';
import ThemeToggle from '../../components/common/ThemeToggle/ThemeToggle';
import { useAuth } from '../../features/auth/AuthContext';
import './AuthPage.css';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.4h3.2c1.9-1.8 3-4.3 3-7.1Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.6l-3.2-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.4.3-1.9V7.6H3.1A10 10 0 0 0 3.1 16l3.3-2.1Z" />
      <path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 2.9 14.7 2 12 2a10 10 0 0 0-8.9 5.6l3.3 2.5C7.2 7.7 9.4 6 12 6Z" />
    </svg>
  );
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const title = isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  const subtitle = isRegister ? 'Organiza tus APIs y credenciales desde un solo lugar.' : 'Inicia sesión para continuar con API-Wallet.';
  const { login, register } = useAuth();
  const navigate = useNavigate();

  function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const name = formData.get('name');
    if (isRegister) {
      register({ name, email });
    } else {
      login({ email, name });
    }
    navigate('/dashboard');
  }

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <Link className="auth-page__brand" to="/" aria-label="Volver al inicio de API-Wallet">
          <img src={logo} alt="" className="auth-page__logo" />
          <span>API-Wallet</span>
        </Link>
        <ThemeToggle />
      </header>

      <section className="auth-page__content" aria-labelledby="auth-title">
        <div className="auth-card">
          <div className="auth-card__heading">
            <h1 id="auth-title">{title}</h1>
            <p>{subtitle}</p>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {isRegister && <label>Nombre<input type="text" name="name" autoComplete="name" placeholder="Tu nombre" /></label>}
            <label>Correo electrónico<input type="email" name="email" autoComplete="email" placeholder="tu@correo.com" required /></label>
            <label>Contraseña<input type="password" name="password" autoComplete={isRegister ? 'new-password' : 'current-password'} placeholder="••••••••" required /></label>
            <button className="btn btn--primary btn--md" type="submit">{isRegister ? 'Crear cuenta' : 'Iniciar sesión'}</button>
          </form>
          {isRegister && <><div className="auth-divider"><span>o</span></div><button className="auth-google-button" type="button"><GoogleIcon />Continuar con Google</button></>}
          {isRegister ? (
            <div className="auth-card__create-account">
              <p>¿Ya tienes una cuenta?</p>
              <Link className="btn btn--primary btn--md" to="/login">Iniciar sesión</Link>
            </div>
          ) : (
            <div className="auth-card__create-account">
              <p>¿Aún no tienes cuenta?</p>
              <Link className="btn btn--primary btn--md" to="/register">Crear cuenta</Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default AuthPage;
