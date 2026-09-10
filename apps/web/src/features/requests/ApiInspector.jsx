import { useState } from 'react';
import './ApiInspector.css';

function ApiInspector({ api }) {
  const [method, setMethod] = useState(api.method || 'GET');
  const [url, setUrl] = useState(`https://api.apiwallet.io${api.path}`);
  const [activeTab, setActiveTab] = useState('params'); // 'params' | 'auth' | 'headers' | 'body'
  const [bodyContent, setBodyContent] = useState(api.body || '');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState(api.responseSample || '{\n  "status": "ready"\n}');
  const [responseMeta, setResponseMeta] = useState({
    status: api.status || '200 OK',
    time: '38 ms',
    size: '1.2 KB',
  });
  const [copied, setCopied] = useState(false);

  const handleSend = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setResponse(api.responseSample || '{\n  "status": "success",\n  "message": "Solicitud procesada con éxito"\n}');
      setResponseMeta({
        status: method === 'POST' ? '201 Created' : '200 OK',
        time: `${Math.floor(Math.random() * 40) + 25} ms`,
        size: '1.4 KB',
      });
    }, 350);
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
          placeholder="https://api.apiwallet.io/v1/resource"
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
              <select className="wb-auth-select" defaultValue="bearer">
                <option value="bearer">Bearer Token (JWT)</option>
                <option value="apikey">API Key Header</option>
                <option value="basic">Basic Auth</option>
                <option value="none">No Auth</option>
              </select>
            </div>
            <div className="wb-auth-desc">
              Esta petición hereda la autorización configurada para la colección o utiliza las API Keys activas en el workspace.
            </div>
          </div>
        )}

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
