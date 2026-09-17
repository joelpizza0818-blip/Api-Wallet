import { Component } from 'react';
import { buildLog } from '../../../utils/clientLogger';
import './ErrorBoundary.css';

export default class ErrorBoundary extends Component {
  state = { hasError: false, errorId: '' };

  static getDerivedStateFromError() { return { hasError: true, errorId: crypto.randomUUID() }; }

  componentDidCatch(error, info) { buildLog('error', 'React render failure', { errorId: this.state.errorId, message: error.message, componentStack: info.componentStack }); }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <main className="error-page" role="alert">
        <div className="error-page__card">
          <p className="error-page__code">ERROR 500</p>
          <h1>Algo salió mal</h1>
          <p>La pantalla encontró un problema inesperado. El error fue registrado con el identificador <code>{this.state.errorId}</code>.</p>
          <div className="error-page__actions">
            <button type="button" onClick={() => window.location.reload()}>Reintentar</button>
            <a href="/">Volver al inicio</a>
          </div>
        </div>
      </main>
    );
  }
}
