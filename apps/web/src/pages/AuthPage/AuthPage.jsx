import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LogoIcon } from '../../components/common/Logo/Logo';
import { useAuth } from '../../features/auth/AuthContext';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import './AuthPage.css';

function GoogleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.3-.2-1.9H12v3.6h5.4a4.6 4.6 0 0 1-2 3v2.4h3.2c1.9-1.8 3-4.3 3-7.1Z" /><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.6l-3.2-2.4c-.9.6-2 1-3.4 1-2.6 0-4.8-1.7-5.6-4.1H3.1v2.5A10 10 0 0 0 12 22Z" /><path fill="#FBBC05" d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.4.3-1.9V7.6H3.1A10 10 0 0 0 3.1 16l3.3-2.1Z" /><path fill="#EA4335" d="M12 6c1.5 0 2.9.5 3.9 1.5l2.9-2.9C17 2.9 14.7 2 12 2a10 10 0 0 0-8.9 5.6l3.3 2.5C7.2 7.7 9.4 6 12 6Z" /></svg>;
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">
      <path d="M12 .7a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.2c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.8.1-.8.1-.8 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.6.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.3.8 1 .8 2v2.9c0 .3.2.7.8.6A12 12 0 0 0 12 .7Z" />
    </svg>
  );
}

function AuthPage({ mode }) {
  const isRegister = mode === 'register';
  const title = isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  const subtitle = isRegister ? 'Organiza tus APIs y credenciales desde un solo lugar.' : 'Inicia sesión para continuar con API-Wallet.';
  const { login, register, continueWithGoogle, continueWithGithub } = useAuth();
  const [verificationMessage, setVerificationMessage] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useFeedback();

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email');
    const name = formData.get('name');
    const password = formData.get('password');
    try {
      const result = isRegister ? await register({ name, email, password }) : await login({ email, password });
      if (isRegister && result?.verificationRequired) {
        setVerificationMessage(result.message);
        return;
      }
      const inviteToken = new URLSearchParams(location.search).get('invite');
      navigate(inviteToken ? `/invitations/accept?token=${encodeURIComponent(inviteToken)}` : '/dashboard');
    } catch (error) { notify(error.message, 'error'); }
  }

  return (
    <main className="auth-page">
      <header className="auth-page__header">
        <Link className="auth-page__brand" to="/" aria-label="Volver al inicio de API-Wallet">
          <LogoIcon size={30} className="auth-page__logo" />
          <span>API-Wallet</span>
        </Link>
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
          {verificationMessage && <p role="status">{verificationMessage}</p>}
          {!window.__TAURI_INTERNALS__ && window.location.protocol !== 'tauri:' && window.location.hostname !== 'tauri.local' && <>
            <div className="auth-divider"><span>o</span></div>
            <button className="auth-google-button" type="button" onClick={() => continueWithGoogle().catch((error) => notify(error.message, 'error'))}><GoogleIcon />Continuar con Google</button>
            <button className="auth-google-button" type="button" onClick={() => continueWithGithub().catch((error) => notify(error.message, 'error'))}><GithubIcon />Continuar con GitHub</button>
          </>}
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
