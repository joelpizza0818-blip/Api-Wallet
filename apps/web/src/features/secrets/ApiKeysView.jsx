import { useState } from 'react';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import './ApiKeysView.css';

function ApiKeysView({ onOpenNewKeyModal }) {
  const { apiKeys, environments, deleteApiKey } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [revealedKeys, setRevealedKeys] = useState({});
  const [copiedKeyId, setCopiedKeyId] = useState(null);

  const toggleReveal = (id) => {
    setRevealedKeys((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCopy = async (id, keyText) => {
    if (!keyText) return;
    try {
      await navigator.clipboard.writeText(keyText);
      setCopiedKeyId(id);
      setTimeout(() => setCopiedKeyId(null), 2000);
    } catch {
      notify('No se pudo copiar la API Key al portapapeles.', 'error');
    }
  };

  const handleRevoke = async (keyId, keyName) => {
    const accepted = await confirm({
      title: 'Revocar API Key',
      message: `¿Estás seguro de que deseas revocar "${keyName}"? Esta clave dejará de funcionar inmediatamente.`,
      confirmLabel: 'Sí, revocar clave',
    });
    if (!accepted) return;

    try {
      await deleteApiKey(keyId);
      notify('API Key revocada exitosamente.');
    } catch (error) {
      notify(error.message || 'No se pudo revocar la API Key.', 'error');
    }
  };

  const formatKeyDisplay = (keyText, isRevealed) => {
    if (isRevealed) return keyText;
    const prefix = keyText.substring(0, 10);
    return `${prefix}••••••••••••••••••••••••`;
  };

  const activeKeys = apiKeys.filter((key) => key.status !== 'REVOKED' && !key.revokedAt);

  return (
    <div className="wb-keys-view">
      {/* View Header */}
      <div className="wb-keys-header">
        <div className="wb-keys-title-wrap">
          <div className="wb-keys-badge">Seguridad & Credenciales</div>
          <h1>Gestión de API Keys</h1>
          <p>
            Genera, administra y audita tokens de acceso para conectar tus aplicaciones con API-Wallet de forma segura.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--md wb-create-key-btn"
          onClick={onOpenNewKeyModal}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Generar nueva API Key
        </button>
      </div>

      {/* Metrics Row */}
      <div className="wb-keys-metrics-grid">
        <div className="wb-metric-card">
          <span className="wb-metric-label">Total de Claves</span>
          <span className="wb-metric-value">{activeKeys.length}</span>
          <span className="wb-metric-sub">Activas en el workspace</span>
        </div>

        <div className="wb-metric-card">
          <span className="wb-metric-label">Entornos</span>
          <span className="wb-metric-value">{environments.length}</span>
          <span className="wb-metric-sub">Configurados en este proyecto</span>
        </div>

        <div className="wb-metric-card">
          <span className="wb-metric-label">Seguridad</span>
          <span className="wb-metric-value text-success">{activeKeys.length}</span>
          <span className="wb-metric-sub">Claves activas</span>
        </div>
      </div>

      {/* Keys Table Container */}
      <div className="wb-keys-table-container">
        <div className="wb-keys-table-header">
          <h3>Claves de Acceso Activas</h3>
          <span className="wb-keys-count">{activeKeys.length} registradas</span>
        </div>

        {activeKeys.length === 0 ? (
          <div className="wb-empty-keys">
            <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z" />
            </svg>
            <h4>No tienes API Keys creadas</h4>
            <p>Genera tu primera clave para permitir que aplicaciones externas consuman tus endpoints.</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onOpenNewKeyModal}
            >
              + Generar API Key
            </button>
          </div>
        ) : (
          <div className="wb-keys-list">
            {activeKeys.map((keyItem) => {
              const isRevealed = !!revealedKeys[keyItem.id];
              const isCopied = copiedKeyId === keyItem.id;
              const isRevoked = keyItem.status === 'REVOKED';

              return (
                <div key={keyItem.id} className={`wb-key-row-card ${isRevoked ? 'wb-key-row-card--revoked' : ''}`}>
                  <div className="wb-key-card-left">
                    <div className="wb-key-meta">
                      <span className="wb-key-title">{keyItem.name}</span>
                      <span className={`wb-key-env ${keyItem.prefix === 'sk_live' ? 'wb-env-prod' : 'wb-env-dev'}`}>
                        {keyItem.prefix === 'sk_live' ? 'Producción' : 'Staging / Dev'}
                      </span>
                      <span className="wb-key-scope-badge">{(keyItem.scopes || []).join(', ') || 'Sin scopes'}</span>
                      {isRevoked && <span className="wb-key-status-badge wb-status-revoked">Revocada</span>}
                    </div>

                    <div className="wb-key-token-box">
                      <code className="wb-key-token">
                        {keyItem.key ? formatKeyDisplay(keyItem.key, isRevealed) : `${keyItem.prefix}_••••${keyItem.lastFourCharacters}`}
                      </code>

                      <button
                        type="button"
                        className="wb-key-action-btn"
                        onClick={() => toggleReveal(keyItem.id)}
                        title={isRevealed ? 'Ocultar token' : 'Revelar token'}
                        disabled={isRevoked}
                      >
                        {isRevealed ? (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>

                      <button
                        type="button"
                        className={`wb-key-copy-btn ${isCopied ? 'wb-key-copy-btn--copied' : ''}`}
                        onClick={() => handleCopy(keyItem.id, keyItem.key)} disabled={!keyItem.key || isRevoked}
                        title="Copiar API Key al portapapeles"
                      >
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />

                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>{isCopied ? '¡Copiado!' : keyItem.key ? 'Copiar' : 'Copiar '}</span>
                      </button>
                    </div>

                    <div className="wb-key-timestamps">
                      <span>Creada: {new Date(keyItem.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Último uso: {keyItem.lastUsedAt ? new Date(keyItem.lastUsedAt).toLocaleString() : 'Aún no usada'}</span>
                    </div>
                  </div>

                  <div className="wb-key-card-right">
                    <button
                      type="button"
                      className={`wb-revoke-key-btn ${isRevoked ? 'wb-revoke-key-btn--disabled' : ''}`}
                      onClick={() => !isRevoked && handleRevoke(keyItem.id, keyItem.name)}
                      disabled={isRevoked}
                      title={isRevoked ? 'Esta clave ya ha sido revocada' : 'Revocar y desactivar esta API Key'}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      {isRevoked ? 'Revocada' : 'Revocar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ApiKeysView;
