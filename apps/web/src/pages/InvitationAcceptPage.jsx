import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';

export default function InvitationAcceptPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { isAuthenticated, refreshSession } = useAuth();
  const [message, setMessage] = useState('Validando tu invitación…');
  useEffect(() => {
    const token = params.get('token');
    if (!token) { setMessage('La invitación no contiene un token válido.'); return; }
    if (!isAuthenticated) { refreshSession(); return; }
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/invitations/accept`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token }) }).then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudo aceptar la invitación');
      setMessage('Invitación aceptada. Abriendo tu workspace…'); setTimeout(() => navigate('/dashboard', { replace: true }), 800);
    }).catch((error) => setMessage(error.message));
  }, [isAuthenticated, navigate, params, refreshSession]);
  return <main className="auth-page"><section className="auth-page__content"><div className="auth-card"><h1>Invitación al workspace</h1><p>{message}</p>{!isAuthenticated && <Link className="btn btn--primary btn--md" to={`/login?invite=${encodeURIComponent(params.get('token') || '')}`}>Inicia sesión para aceptar</Link>}</div></section></main>;
}
