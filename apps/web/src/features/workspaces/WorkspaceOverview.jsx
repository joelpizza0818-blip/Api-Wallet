import { useEffect, useState } from 'react';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import { useWorkspace } from './WorkspaceContext';
import { useAuth } from '../auth/AuthContext';
import { EnvironmentsView } from './ArtifactViewsPro';
import FlowsView from '../requests/FlowsView';
import './WorkspaceOverview.css';

function WorkspaceOverview({ onNavigateApis, onNavigateDocs, onNavigateFlows, onNavigateKeys, onOpenSettings, onOpenNewFlowModal }) {
  const { collections, apiKeys, workspaceName, workspaceDetails, updateCollection, addApiKey, regenerateInviteCode } = useWorkspace();
  const { user } = useAuth();
  const { notify } = useFeedback();
  const [activeTab, setActiveTab] = useState('overview');
  const collection = collections[0];
  const [authorization, setAuthorization] = useState({ type: 'none', ...(collection?.authorization || {}) });
  const [preRequestScript, setPreRequestScript] = useState(collection?.preRequestScript || '');
  const [testScript, setTestScript] = useState(collection?.testScript || '');
  const [saved, setSaved] = useState(false);

  const handleShare = async () => {
    try {
      const inviteCode = workspaceDetails?.inviteCode || await regenerateInviteCode();
      await navigator.clipboard.writeText(inviteCode);
      notify('Código de invitación copiado al portapapeles.');
    } catch (error) {
      notify(error.message || 'No se pudo copiar el código de invitación.', 'error');
    }
  };

  useEffect(() => {
    setAuthorization({ type: 'none', ...(collection?.authorization || {}) });
    setPreRequestScript(collection?.preRequestScript || '');
    setTestScript(collection?.testScript || '');
  }, [collection?.authorization, collection?.id, collection?.preRequestScript, collection?.testScript]);

  const totalApis = (collections || []).reduce((acc, collection) => acc + (collection.apis || []).length, 0);
  const userName = user?.name || user?.email || 'Usuario';

  return (
    <div className="wb-overview">
      {/* Overview Top Bar */}
      <div className="wb-overview-top">
        <div className="wb-overview-breadcrumbs">
          <span>Overview</span>
          <span className="wb-breadcrumb-sep">/</span>
          <span className="wb-breadcrumb-current">{workspaceName}</span>
        </div>

        <div className="wb-overview-actions">
          <button type="button" className="wb-ov-btn" onClick={onNavigateDocs}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            Publish docs
          </button>

          <button type="button" className="wb-ov-btn" onClick={onNavigateFlows}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run
          </button>

          <button type="button" className="wb-ov-btn wb-ov-btn--primary" onClick={handleShare}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            Share
          </button>
        </div>
      </div>

      {/* Postman-like Navigation Tabs */}
      <div className="wb-overview-tabs">
        <button
          type="button"
          className={`wb-ov-tab ${activeTab === 'overview' ? 'wb-ov-tab--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button
          type="button"
          className={`wb-ov-tab ${activeTab === 'authorization' ? 'wb-ov-tab--active' : ''}`}
          onClick={() => setActiveTab('authorization')}
        >
          Authorization
        </button>
        <button
          type="button"
          className={`wb-ov-tab ${activeTab === 'scripts' ? 'wb-ov-tab--active' : ''}`}
          onClick={() => setActiveTab('scripts')}
        >
          Scripts <span className="wb-tab-green-dot" />
        </button>
        <button
          type="button"
          className={`wb-ov-tab ${activeTab === 'variables' ? 'wb-ov-tab--active' : ''}`}
          onClick={() => setActiveTab('variables')}
        >
          Variables <span className="wb-tab-green-dot" />
        </button>
        <button
          type="button"
          className={`wb-ov-tab ${activeTab === 'runs' ? 'wb-ov-tab--active' : ''}`}
          onClick={() => setActiveTab('runs')}
        >
          Runs
        </button>
      </div>

      {/* Main Overview Content */}
      <div className="wb-overview-body">
        <h1 className="wb-ov-title">{workspaceName}</h1>

        <div className="wb-ov-meta-row">
          <div className="wb-ov-author">
            <span className="wb-ov-author-dot" />
            <span>{userName}</span>
          </div>

          <div className="wb-ov-counter">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            <span>{totalApis} endpoints</span>
          </div>

          <div className="wb-ov-counter">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z" />
            </svg>
            <span>{apiKeys.length} API Keys</span>
          </div>

          <div className="wb-ov-date">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>Última sincronización: {new Date().toLocaleDateString()}</span>
          </div>
        </div>

        {activeTab === 'authorization' && (
          <div className="wb-postman-welcome-card">
            <h2>Autorización de la colección</h2>
            <p>Configura credenciales compartidas para las requests de esta colección.</p>
            <select
              className="wb-auth-select"
              value={authorization.type}
              onChange={(event) => setAuthorization({ ...authorization, type: event.target.value })}
            >
              <option value="none">No Auth</option>
              <option value="bearer">Bearer Token</option>
              <option value="apikey">API Key Header</option>
              <option value="basic">Basic Auth</option>
              <option value="oauth2">OAuth 2.0 Bearer</option>
            </select>

            {(authorization.type === 'bearer' || authorization.type === 'oauth2') && (
              <input
                className="wb-url-input"
                type="password"
                placeholder="Token"
                value={authorization.token || ''}
                onChange={(event) => setAuthorization({ ...authorization, token: event.target.value })}
              />
            )}

            {authorization.type === 'apikey' && (
              <div className="wb-auth-fields-stack">
                <input
                  className="wb-url-input"
                  placeholder="Nombre del header (ej. X-API-Key)"
                  value={authorization.key || ''}
                  onChange={(event) => setAuthorization({ ...authorization, key: event.target.value })}
                />

                {apiKeys && apiKeys.length > 0 && (
                  <select
                    className="wb-auth-select"
                    value={authorization.apiKeyId || ''}
                    onChange={(e) => {
                      const chosenId = e.target.value;
                      const chosen = apiKeys.find((k) => k.id === chosenId);
                      if (chosen) {
                        setAuthorization({
                          ...authorization,
                          apiKeyId: chosen.id,
                          value: chosen.key || `${chosen.prefix}_••••${chosen.lastFourCharacters || ''}`,
                        });
                      } else {
                        setAuthorization({
                          ...authorization,
                          apiKeyId: '',
                        });
                      }
                    }}
                  >
                    <option value="">-- Seleccionar de mis API Keys guardadas --</option>
                    {apiKeys.map((k) => (
                      <option key={k.id} value={k.id}>
                        🔑 {k.name} ({k.prefix || 'sk'}_••••{k.lastFourCharacters || '••••'})
                      </option>
                    ))}
                  </select>
                )}

                <input
                  className="wb-url-input"
                  type="password"
                  placeholder="Valor de la API key"
                  value={authorization.value || ''}
                  onChange={(event) => setAuthorization({ ...authorization, apiKeyId: '', value: event.target.value })}
                />

                {authorization.value && !authorization.apiKeyId && (
                  <div className="wb-auth-save-box">
                    <button
                      type="button"
                      className="wb-auth-save-inline-btn"
                      onClick={async () => {
                        try {
                          const created = await addApiKey({
                            name: `Key ${collection?.name || 'Colección'}`,
                            key: authorization.value,
                            environment: 'Producción',
                            scope: 'Full Access',
                          });
                          setAuthorization({ ...authorization, apiKeyId: created.id });
                          notify('API Key guardada en la lista de keys del proyecto.');
                        } catch (err) {
                          notify(err.message || 'Error al guardar la API Key', 'error');
                        }
                      }}
                    >
                      💾 Guardar en API Keys del proyecto
                    </button>
                    <small className="wb-auth-save-hint">Si no la guardas, se usará únicamente en esta cabecera.</small>
                  </div>
                )}
              </div>
            )}

            {authorization.type === 'basic' && (
              <>
                <input
                  className="wb-url-input"
                  placeholder="Usuario"
                  value={authorization.username || ''}
                  onChange={(event) => setAuthorization({ ...authorization, username: event.target.value })}
                />
                <input
                  className="wb-url-input"
                  type="password"
                  placeholder="Contraseña"
                  value={authorization.password || ''}
                  onChange={(event) => setAuthorization({ ...authorization, password: event.target.value })}
                />
              </>
            )}

            <button
              type="button"
              className="wb-ov-btn wb-ov-btn--primary"
              onClick={async () => {
                if (collection) {
                  await updateCollection(collection.id, { authorization });
                  setSaved(true);
                  setTimeout(() => setSaved(false), 1600);
                }
              }}
            >
              {saved ? 'Guardado' : 'Guardar autorización'}
            </button>
          </div>
        )}

        {activeTab === 'scripts' && <div className="wb-postman-welcome-card"><h2>Scripts de la colección</h2><p>Estos scripts pueden preparar variables o validar respuestas comunes.</p><label>Before request<textarea className="wb-body-textarea" rows={7} value={preRequestScript} onChange={(event) => setPreRequestScript(event.target.value)} placeholder="pm.variables.token = '...';" /></label><label>After response<textarea className="wb-body-textarea" rows={7} value={testScript} onChange={(event) => setTestScript(event.target.value)} placeholder="pm.expect(pm.response.status).to.eql(200);" /></label><button type="button" className="wb-ov-btn wb-ov-btn--primary" onClick={async () => { if (collection) { await updateCollection(collection.id, { preRequestScript, testScript }); setSaved(true); setTimeout(() => setSaved(false), 1600); } }}>{saved ? 'Guardado' : 'Guardar scripts'}</button></div>}

        {activeTab === 'variables' && <div className="wb-overview-tab-content"><EnvironmentsView /></div>}

        {activeTab === 'runs' && <div className="wb-overview-tab-content"><FlowsView onOpenNewFlowModal={onOpenNewFlowModal} /></div>}

        {activeTab === 'overview' && <div className="wb-postman-welcome-card">
          <h2>¡Bienvenido a API-Wallet! Este es tu espacio centralizado.</h2>
          <p>
            Las colecciones son tu punto de partida para organizar, probar y documentar tus servicios web. Puedes utilizar este workspace para:
          </p>
          <ul className="wb-welcome-list">
            <li>
              <strong>Agrupar peticiones relacionadas</strong>: Estructura endpoints por microservicios o categorías (Auth, Admin, Trailers, Notices, Misc).
            </li>
            <li>
              <strong>Probar tus APIs en escenarios reales</strong>: Ejecuta peticiones HTTP instantáneas con parámetros, cabeceras y payloads JSON.
            </li>
            <li>
              <strong>Gestionar API Keys seguras</strong>: Genera y revoca tokens de autenticación para desarrolladores y clientes.
            </li>
            <li>
              <strong>Personalizar tu entorno</strong>: Modifica los colores del workspace y ajusta tu perfil desde la barra lateral derecha <span className="wb-inline-icon" aria-label="configuración"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></span>.
            </li>
          </ul>

          <p className="wb-welcome-sub">
            Actualiza el nombre, crea nuevas colecciones o genera credenciales siempre que estés listo.
          </p>

          <div className="wb-quick-shortcuts">
            <button type="button" className="wb-shortcut-btn" onClick={onNavigateApis}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              </svg>
              Explorar APIs
            </button>

            <button type="button" className="wb-shortcut-btn" onClick={onNavigateKeys}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z" />
              </svg>
              Administrar API Keys
            </button>

            <button type="button" className="wb-shortcut-btn" onClick={onOpenSettings}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
              Personalizar Colores (Settings)
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}

export default WorkspaceOverview;
