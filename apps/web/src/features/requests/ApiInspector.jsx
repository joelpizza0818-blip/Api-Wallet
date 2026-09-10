import { useState } from 'react';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import './ApiInspector.css';

function ApiInspector({ api }) {
  const { updateApi } = useWorkspace();
  const [method, setMethod] = useState(api.method || 'GET');
  const [url, setUrl] = useState(api.url || '');
  const [activeTab, setActiveTab] = useState('params');
  const [bodyContent, setBodyContent] = useState(api.body || '');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(api.responseSample || '');
  const [responseFormat, setResponseFormat] = useState('json');
  const [responseMeta, setResponseMeta] = useState({
    status: api.status || 'Ready',
    time: '--',
    size: '--',
  });
  const [copied, setCopied] = useState(false);
  const [authorization, setAuthorization] = useState({ type: 'none', ...(api.collectionAuthorization || {}), ...(api.authorization || {}) });
  const [preRequestScript, setPreRequestScript] = useState(api.preRequestScript || api.collectionPreRequestScript || '');
  const [testScript, setTestScript] = useState(api.testScript || api.collectionTestScript || '');
  const [saveMessage, setSaveMessage] = useState('');

  const runScript = (source, pm) => {
    if (!source.trim()) return;
    try {
      new Function('pm', source)(pm);
    } catch (error) {
      setResponse(JSON.stringify({ scriptError: error.message }, null, 2));
      setResponseMeta((previous) => ({ ...previous, status: 'Script Error' }));
    }
  };

  const saveRequestSettings = async () => {
    await updateApi(api.id, { authorization, preRequestScript, testScript, body: bodyContent, method, path: url.startsWith('/') ? url : api.path, url, name: api.name });
    setSaveMessage('Guardado');
    setTimeout(() => setSaveMessage(''), 1800);
  };

  const handleSend = async () => {
    setIsLoading(true);
    const startedAt = performance.now();
    try {
      if (!url.trim()) throw new Error('Introduce la URL completa del endpoint.');
      const variables = {};
      const scriptState = { variables: { set: (key, value) => { variables[key] = String(value); }, get: (key) => variables[key] }, request: { method, url, headers: { add: ({ key, value }) => { if (key) headers[key] = value; } } }, response: null };
      let headers = Object.fromEntries((api.headers || []).filter((item) => item.key).map((item) => [item.key, item.value || '']));
      runScript(preRequestScript, { ...scriptState, setNextRequest: () => {} });
      const query = new URLSearchParams((api.params || []).filter((item) => item.key && item.value).map((item) => [item.key, item.value]));
      const targetUrl = query.toString() ? `${url}${url.includes('?') ? '&' : '?'}${query}` : url;
      if (authorization.type === 'bearer' && authorization.token) headers.Authorization = `Bearer ${authorization.token}`;
      if (authorization.type === 'apikey' && authorization.key) headers[authorization.key] = authorization.value || '';
      if (authorization.type === 'basic' && authorization.username) headers.Authorization = `Basic ${btoa(`${authorization.username}:${authorization.password || ''}`)}`;
      if (authorization.type === 'oauth2' && authorization.token) headers.Authorization = `Bearer ${authorization.token}`;
      const result = await fetch(targetUrl, { method, headers, body: !['GET', 'HEAD'].includes(method) && bodyContent ? bodyContent : undefined });
      const text = await result.text();
      let formatted = text;
      if (responseFormat === 'json') { try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
      if (responseFormat === 'html') formatted = text;
      setResponse(formatted);
      setResponseMeta({
        status: `${result.status} ${result.statusText}`,
        time: `${Math.round(performance.now() - startedAt)} ms`,
        size: `${new Blob([text]).size} B`,
      });
      const test = (name, passed) => { if (!passed) throw new Error(name || 'Test failed'); };
      runScript(testScript, { test, expect: (value, message) => ({ to: { eql: (expected) => { if (value !== expected) throw new Error(message || `Expected ${value} to equal ${expected}`); } } }), response: { status: result.status, code: result.status, body: text, text: () => text } });
    } catch (error) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
      setResponseMeta({ status: 'Error', time: `${Math.round(performance.now() - startedAt)} ms`, size: '--' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyResponse = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="wb-inspector">
      {/* Request Bar */}
      <div className="wb-request-bar">
        <div className="wb-method-select-wrap">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={`wb-method-select wb-method-select--${method.toLowerCase()}`}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
            <option value="PATCH">PATCH</option>
          </select>
        </div>

        <input
          type="text"
          className="wb-url-input"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/v1/resource"
        />

        <button
          type="button"
          className="wb-send-btn"
          onClick={handleSend}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="wb-spinner" />
          ) : (
            <>
              <span>Enviar</span>
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </>
          )}
        </button>
        <button type="button" className="wb-copy-btn" onClick={saveRequestSettings}>{saveMessage || 'Guardar'}</button>
      </div>

      {/* Endpoint Description Info */}
      <div className="wb-endpoint-meta">
        <h2 className="wb-endpoint-title">{api.name}</h2>
        {api.description && <p className="wb-endpoint-desc">{api.description}</p>}
      </div>

      {/* Request Tabs */}
      <div className="wb-request-tabs">
        <button
          type="button"
          className={`wb-req-tab ${activeTab === 'params' ? 'wb-req-tab--active' : ''}`}
          onClick={() => setActiveTab('params')}
        >
          Params {api.params?.length > 0 && <span className="wb-tab-dot" />}
        </button>

        <button
          type="button"
          className={`wb-req-tab ${activeTab === 'auth' ? 'wb-req-tab--active' : ''}`}
          onClick={() => setActiveTab('auth')}
        >
          Authorization
        </button>

        <button type="button" className={`wb-req-tab ${activeTab === 'scripts' ? 'wb-req-tab--active' : ''}`} onClick={() => setActiveTab('scripts')}>
          Scripts {(preRequestScript || testScript) && <span className="wb-tab-dot" />}
        </button>

        <button
          type="button"
          className={`wb-req-tab ${activeTab === 'headers' ? 'wb-req-tab--active' : ''}`}
          onClick={() => setActiveTab('headers')}
        >
          Headers {api.headers?.length > 0 && <span className="wb-tab-dot" />}
        </button>

        <button
          type="button"
          className={`wb-req-tab ${activeTab === 'body' ? 'wb-req-tab--active' : ''}`}
          onClick={() => setActiveTab('body')}
        >
          Body {bodyContent && <span className="wb-tab-dot" />}
        </button>
      </div>

      {/* Request Tab Contents */}
      <div className="wb-tab-panel">
        {activeTab === 'params' && (
          <div className="wb-table-wrap">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {api.params && api.params.length > 0 ? (
                  api.params.map((p, i) => (
                    <tr key={i}>
                      <td><code>{p.key}</code></td>
                      <td><code>{p.value}</code></td>
                      <td className="wb-td-muted">Parámetro de consulta</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td><code>page</code></td>
                    <td><code>1</code></td>
                    <td className="wb-td-muted">Número de página</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'auth' && (
          <div className="wb-auth-panel">
            <div className="wb-auth-type-row">
              <span className="wb-auth-label">Tipo de Autenticación:</span>
              <select className="wb-auth-select" value={authorization.type} onChange={(event) => setAuthorization({ ...authorization, type: event.target.value })}>
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key Header</option>
                <option value="basic">Basic Auth</option>
                <option value="oauth2">OAuth 2.0 Bearer</option>
              </select>
            </div>
            {authorization.type === 'bearer' || authorization.type === 'oauth2' ? <input className="wb-url-input" type="password" placeholder="Token de acceso" value={authorization.token || ''} onChange={(event) => setAuthorization({ ...authorization, token: event.target.value })} /> : null}
            {authorization.type === 'apikey' ? <div className="wb-auth-fields"><input className="wb-url-input" placeholder="Nombre del header" value={authorization.key || ''} onChange={(event) => setAuthorization({ ...authorization, key: event.target.value })} /><input className="wb-url-input" type="password" placeholder="Valor de la API key" value={authorization.value || ''} onChange={(event) => setAuthorization({ ...authorization, value: event.target.value })} /></div> : null}
            {authorization.type === 'basic' ? <div className="wb-auth-fields"><input className="wb-url-input" placeholder="Usuario" value={authorization.username || ''} onChange={(event) => setAuthorization({ ...authorization, username: event.target.value })} /><input className="wb-url-input" type="password" placeholder="Contraseña" value={authorization.password || ''} onChange={(event) => setAuthorization({ ...authorization, password: event.target.value })} /></div> : null}
            <div className="wb-auth-desc">
              La autorización se guarda en esta request y se aplica al ejecutar la petición.
            </div>
          </div>
        )}

        {activeTab === 'scripts' && <div className="wb-body-panel"><label>Before request<textarea className="wb-body-textarea" rows={6} value={preRequestScript} onChange={(event) => setPreRequestScript(event.target.value)} placeholder="pm.variables = { token: '...' };" /></label><label>After response<textarea className="wb-body-textarea" rows={6} value={testScript} onChange={(event) => setTestScript(event.target.value)} placeholder="pm.expect(pm.response.status).to.eql(200);" /></label></div>}

        {activeTab === 'headers' && (
          <div className="wb-table-wrap">
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {api.headers && api.headers.length > 0 ? (
                  api.headers.map((h, i) => (
                    <tr key={i}>
                      <td><code>{h.key}</code></td>
                      <td><code>{h.value}</code></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td><code>Content-Type</code></td>
                    <td><code>application/json</code></td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="wb-body-panel">
            <div className="wb-body-type-bar">
              <span>raw</span>
              <span className="wb-json-pill">JSON</span>
            </div>
            <textarea
              className="wb-body-textarea"
              value={bodyContent}
              onChange={(e) => setBodyContent(e.target.value)}
              placeholder="{\n  // JSON Payload aquí\n}"
              rows={6}
            />
          </div>
        )}
      </div>

      {/* Response Viewer Section */}
      <div className="wb-response-section">
        <div className="wb-response-header">
          <div className="wb-response-title">
            <span>Response</span>
            <span className="wb-status-tag">{responseMeta.status}</span>
            <span className="wb-stat-pill">Tiempo: {responseMeta.time}</span>
            <span className="wb-stat-pill">Tamaño: {responseMeta.size}</span>
            <label className="wb-response-format">Formato <select value={responseFormat} onChange={(event) => setResponseFormat(event.target.value)}><option value="json">JSON</option><option value="raw">Raw / texto</option><option value="html">HTML</option></select></label>
          </div>

          <button
            type="button"
            className="wb-copy-btn"
            onClick={handleCopyResponse}
            title="Copiar JSON"
          >
            {copied ? '¡Copiado!' : 'Copiar JSON'}
          </button>
        </div>

        <div className="wb-response-body">
          <pre className="wb-json-code">
            <code>{response}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}

export default ApiInspector;
