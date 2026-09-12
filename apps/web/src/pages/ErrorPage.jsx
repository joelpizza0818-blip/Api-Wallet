import { Link, useLocation } from 'react-router-dom';
import './ErrorPage.css';

export default function ErrorPage({ status = 404, title = 'Página no encontrada', message = 'La dirección que buscas no existe o ya no está disponible.' }) {
  const location = useLocation();
  return <main className="error-page" role="main"><div className="error-page__card"><p className="error-page__code">ERROR {status}</p><h1>{title}</h1><p>{message}</p><p className="error-page__path">Ruta: <code>{location.pathname}</code></p><div className="error-page__actions"><Link to="/">Volver al inicio</Link><Link to="/login">Iniciar sesión</Link></div></div></main>;
}
