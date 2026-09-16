import { useState, useEffect } from 'react';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import './ApiInspector.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function parseCurlCommand(input) {
  const tokens = [...String(input || '').matchAll(/'([^']*)'|"((?:\\.|[^"\\])*)"|(\S+)/g)].map((m) => (m[1] ?? m[2]?.replace(/\\(["'\\])/g, '$1') ?? m[3]));
  if (tokens[0]?.toLowerCase() === 'curl') tokens.shift();
  let parsedMethod = 'GET'; let parsedUrl = ''; let parsedBody = ''; const parsedHeaders = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (['-X', '--request'].includes(token)) parsedMethod = tokens[++i] || parsedMethod;
    else if (['-H', '--header'].includes(token)) { const value = tokens[++i] || ''; const split = value.indexOf(':'); if (split > 0) parsedHeaders.push({ key: value.slice(0, split).trim(), value: value.slice(split + 1).trim() }); }
    else if (['-d', '--data', '--data-raw', '--data-binary', '--data-urlencode'].includes(token)) { parsedBody = tokens[++i] || ''; if (parsedMethod === 'GET') parsedMethod = 'POST'; }
    else if (!token.startsWith('-') && !parsedUrl) parsedUrl = token;
  }
  return { method: parsedMethod.toUpperCase(), url: parsedUrl, headers: parsedHeaders, body: parsedBody };
}

function shellQuote(value) { return `'${String(value).replace(/'/g, "'\\''")}'`; }

export function generateCurl({ method, url, headers = [], body = '' }) {
  const parts = ['curl', shellQuote(url || '')];
  if (method && method !== 'GET') parts.push('-X', method);
  headers.filter((h) => h.key).forEach((h) => parts.push('-H', shellQuote(`${h.key}: ${h.value || ''}`)));
  if (body && !['GET', 'HEAD'].includes(method)) parts.push('--data-raw', shellQuote(body));
  return parts.join(' ');
}

export function generateFetch({ method, url, headers = [], body = '' }) {
  const headerObject = Object.fromEntries(headers.filter((h) => h.key).map((h) => [h.key, h.value || '']));
  return `const response = await fetch(${JSON.stringify(url || '')}, {\n  method: ${JSON.stringify(method || 'GET')},\n  headers: ${JSON.stringify(headerObject, null, 2)},${body ? `\n  body: ${JSON.stringify(body)},` : ''}\n});\nconst data = await response.text();`;
}

function ApiInspector({ api }) {
  const { updateApi, addConsoleLog, apiKeys, addApiKey } = useWorkspace();
  const { notify } = useFeedback();
  const [method, setMethod] = useState(api.method || 'GET');
  const [url, setUrl] = useState(api.url || api.path || '');
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
  const [scriptSubTab, setScriptSubTab] = useState('pre'); // 'pre' | 'post'
  const [showSnippets, setShowSnippets] = useState(false);
  const [showCurl, setShowCurl] = useState(false);
  const [curlText, setCurlText] = useState('');
  const [snippetType, setSnippetType] = useState('curl');
  const [headers, setHeaders] = useState(api.headers || []);

  const insertSnippet = (snippetText) => {
    if (scriptSubTab === 'pre') {
      setPreRequestScript((prev) => (prev ? `${prev}\n${snippetText}` : snippetText));
    } else {
      setTestScript((prev) => (prev ? `${prev}\n${snippetText}` : snippetText));
    }
  };

  useEffect(() => {
    if (!api) return;
    setMethod(api.method || 'GET');
    setUrl(api.url || api.path || '');
    setBodyContent(api.body || '');
    setHeaders(api.headers || []);
    setResponse(api.responseSample || '');
    setResponseMeta({
      status: api.status || 'Ready',
      time: '--',
      size: '--',
    });
    setAuthorization({ type: 'none', ...(api.collectionAuthorization || {}), ...(api.authorization || {}) });
    setPreRequestScript(api.preRequestScript || api.collectionPreRequestScript || '');
    setTestScript(api.testScript || api.collectionTestScript || '');
    setSaveMessage('');
  }, [api]);

  const runScript = (source, pm, scriptName = 'Script') => {
    if (!source.trim()) return;
    try {
      // Scripts are user-editable data. Never execute them as page JavaScript:
      // arbitrary code could issue credentialed requests from this origin.
      const statements = source.split(';').map((statement) => statement.trim()).filter(Boolean);
      statements.forEach((statement) => {
        let match = statement.match(/^pm\.variables\.set\(\s*(['"])([^'"\\]+)\1\s*,\s*(['"])([^'"\\]*)\3\s*\)$/);
        if (match && pm.variables?.set) { pm.variables.set(match[2], match[4]); return; }
        match = statement.match(/^pm\.request\.headers\.add\(\s*\{\s*key:\s*(['"])([^'"\\]+)\1\s*,\s*value:\s*(['"])([^'"\\]*)\3\s*\}\s*\)$/);
        if (match && pm.request?.headers?.add) { pm.request.headers.add({ key: match[2], value: match[4] }); return; }
        match = statement.match(/^pm\.expect\(pm\.response\.(status|code)\)\.to\.eql\(\s*(\d+)\s*\)$/);
        if (match && pm.expect && pm.response) { pm.expect(pm.response[match[1]]).to.eql(Number(match[2])); return; }
        throw new Error('Operación de script no permitida');
      });
      if (addConsoleLog) addConsoleLog({ type: 'script', text: `[Script OK] ${scriptName} ejecutado correctamente.` });
    } catch (error) {
      if (addConsoleLog) addConsoleLog({ type: 'error', text: `[Script Error] ${scriptName}: ${error.message}` });
      setResponse(JSON.stringify({ scriptError: error.message }, null, 2));
      setResponseMeta((previous) => ({ ...previous, status: 'Script Error' }));
    }
  };

  const saveRequestSettings = async () => {
    await updateApi(api.id, { authorization, preRequestScript, testScript, headers, body: bodyContent, method, path: url.startsWith('/') ? url : api.path, url, name: api.name });
    setSaveMessage('Guardado');
    setTimeout(() => setSaveMessage(''), 1800);
  };

  const handleSend = async () => {
    setIsLoading(true);
    const startedAt = performance.now();
    try {
      const requestUrl = url.trim();
      if (!requestUrl) throw new Error('Introduce la URL completa del endpoint.');
      const hasEnvironmentVariable = /\{\{\s*(?:API_URL|BASE_URL)\s*\}\}/i.test(requestUrl);
      if (!hasEnvironmentVariable) {
        let parsedTarget;
        try { parsedTarget = new URL(requestUrl); } catch { throw new Error('La URL debe ser absoluta e incluir http:// o https://.'); }
        if (!['http:', 'https:'].includes(parsedTarget.protocol)) throw new Error('La URL solo puede usar http:// o https://.');
      }
      await updateApi(api.id, { authorization, preRequestScript, testScript, headers, body: bodyContent, method, path: url.startsWith('/') ? url : api.path, url, name: api.name });
      const executionResponse = await fetch(`${API_URL}/api/requests/${api.id}/execute`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const executionPayload = await executionResponse.json();
      if (!executionResponse.ok) throw new Error(executionPayload.message || 'No se pudo ejecutar la petición.');
      const result = executionPayload.data;
      const text = result.body || '';
      let formatted = text;
      if (responseFormat === 'json') { try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch {} }
      if (responseFormat === 'html') formatted = text;
      setResponse(formatted);
      setResponseMeta({
        status: result.statusCode ? `${result.statusCode}` : 'Error',
        time: `${Math.round(performance.now() - startedAt)} ms`,
        size: `${new Blob([text]).size} B`,
      });
      if (addConsoleLog) {
        addConsoleLog({
          type: result.ok ? 'info' : 'error',
          method,
          url: requestUrl,
          status: result.statusCode ? `${result.statusCode}` : 'Error',
          time: `${Math.round(performance.now() - startedAt)}ms`,
          size: `${new Blob([text]).size} B`,
          text: `${method} ${requestUrl} -> ${result.statusCode || 'Error'} (${Math.round(performance.now() - startedAt)}ms)`,
        });
      }
      const test = (name, passed) => { if (!passed) throw new Error(name || 'Test failed'); };
      const pmTest = (name, callback) => { try { callback(); if (addConsoleLog) addConsoleLog({ type: 'success', text: `[Test OK] ${name}` }); } catch (error) { throw new Error(`${name}: ${error.message}`); } };
      const pmExpect = (value) => ({ to: { eql: (expected) => { if (value !== expected) throw new Error(`Expected ${value} to equal ${expected}`); }, include: (expected) => { if (!String(value).includes(expected)) throw new Error(`Expected value to include ${expected}`); } } });
    } catch (error) {
      if (addConsoleLog) {
        addConsoleLog({
          type: 'error',
          method,
          url,
          status: 'Error',
          text: `[Error] ${method} ${url}: ${error.message}`,
        });
      }
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
        <button type="button" className="wb-copy-btn" onClick={() => setShowCurl(true)}>cURL / JS</button>
        <button type="button" className="wb-copy-btn" onClick={saveRequestSettings}>{saveMessage || 'Guardar'}</button>
      </div>

      {showCurl && <div className="wb-snippets-popover wb-curl-modal"><div className="wb-snippets-popover-header"><span>cURL / JavaScript</span><button type="button" className="wb-snippets-close-btn" onClick={() => setShowCurl(false)}>✕</button></div><textarea className="wb-scripts-textarea" rows={7} value={curlText} onChange={(e) => setCurlText(e.target.value)} placeholder="Pega aquí un comando cURL para importarlo" /><div className="wb-snippets-popover-list"><button type="button" onClick={() => { const parsed = parseCurlCommand(curlText); setMethod(parsed.method); setUrl(parsed.url); setHeaders(parsed.headers); setBodyContent(parsed.body); setShowCurl(false); }}>Importar cURL</button><button type="button" onClick={() => { setSnippetType('curl'); setCurlText(generateCurl({ method, url, headers, body: bodyContent })); }}>Generar cURL</button><button type="button" onClick={() => { setSnippetType('fetch'); setCurlText(generateFetch({ method, url, headers, body: bodyContent })); }}>Generar fetch()</button><button type="button" onClick={() => navigator.clipboard.writeText(curlText)}>Copiar {snippetType}</button></div></div>}

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
            {authorization.type === 'bearer' || authorization.type === 'oauth2' ? (
              <input
                className="wb-url-input"
                type="password"
                placeholder="Token de acceso"
                value={authorization.token || ''}
                onChange={(event) => setAuthorization({ ...authorization, token: event.target.value })}
              />
            ) : null}

            {authorization.type === 'apikey' ? (
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
                            name: `Key para ${api.name || 'Endpoint'}`,
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
            ) : null}

            {authorization.type === 'basic' ? (
              <div className="wb-auth-fields">
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
              </div>
            ) : null}
            <div className="wb-auth-desc">
              La autorización se guarda en esta request y se aplica al ejecutar la petición.
            </div>
          </div>
        )}

        {activeTab === 'scripts' && (
          <div className="wb-scripts-layout">
            <div className="wb-scripts-sidebar">
              <button
                type="button"
                className={`wb-scripts-subtab ${scriptSubTab === 'pre' ? 'wb-scripts-subtab--active' : ''}`}
                onClick={() => setScriptSubTab('pre')}
              >
                Before request
              </button>
              <button
                type="button"
                className={`wb-scripts-subtab ${scriptSubTab === 'post' ? 'wb-scripts-subtab--active' : ''}`}
                onClick={() => setScriptSubTab('post')}
              >
                After response
              </button>
            </div>

            <div className="wb-scripts-editor-pane">
              <div className="wb-scripts-editor-wrap">
                <div className="wb-scripts-gutter">
                  {(scriptSubTab === 'pre' ? preRequestScript : testScript)
                    .split('\n')
                    .map((_, i) => (
                      <span key={i} className="wb-scripts-line-num">{i + 1}</span>
                    ))}
                </div>
                <textarea
                  className="wb-scripts-textarea"
                  value={scriptSubTab === 'pre' ? preRequestScript : testScript}
                  onChange={(e) => scriptSubTab === 'pre' ? setPreRequestScript(e.target.value) : setTestScript(e.target.value)}
                  placeholder={
                    scriptSubTab === 'pre'
                      ? '// Use JavaScript to configure this request dynamically.\n// Example: pm.variables.set("token", "12345");'
                      : '// Use JavaScript to write tests, visualize response, and more.\n// Example: pm.test("Status is 200", () => pm.expect(pm.response.code).to.eql(200));'
                  }
                  rows={10}
                />
              </div>

              <div className="wb-scripts-footer-bar">
                <button
                  type="button"
                  className="wb-snippets-trigger-btn"
                  onClick={() => setShowSnippets(!showSnippets)}
                >
                  <code>&lt;/&gt;</code> Snippets {showSnippets ? '▲' : '▼'}
                </button>
              </div>

              {showSnippets && (
                <div className="wb-snippets-popover">
                  <div className="wb-snippets-popover-header">
                    <span>Insertar Snippet</span>
                    <button type="button" className="wb-snippets-close-btn" onClick={() => setShowSnippets(false)}>✕</button>
                  </div>
                  <div className="wb-snippets-popover-list">
                    <button type="button" onClick={() => insertSnippet('pm.variables.set("variable_key", "variable_value");')}>
                      Set a variable
                    </button>
                    <button type="button" onClick={() => insertSnippet('const value = pm.variables.get("variable_key");')}>
                      Get a variable
                    </button>
                    <button type="button" onClick={() => insertSnippet('pm.test("Status code is 200", () => {\n  pm.expect(pm.response.code).to.eql(200);\n});')}>
                      Status code: Code is 200
                    </button>
                    <button type="button" onClick={() => insertSnippet('pm.test("Response body contains string", () => {\n  pm.expect(pm.response.text()).to.include("string_to_check");\n});')}>
                      Response body: Contains string
                    </button>
                    <button type="button" onClick={() => insertSnippet('const jsonData = JSON.parse(pm.response.body);\npm.expect(jsonData.status).to.eql("success");')}>
                      Response body: JSON value check
                    </button>
                    <button type="button" onClick={() => insertSnippet('pm.request.headers.add({ key: "X-Run-Id", value: Date.now().toString() });')}>
                      Add header to request
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="wb-table-wrap">
            <div className="wb-headers-toolbar">
              <button type="button" className="wb-copy-btn" onClick={() => setHeaders((items) => [...items, { key: '', value: '' }])}>+ Agregar header</button>
            </div>
            <table className="wb-table">
              <thead>
                <tr>
                  <th>Header</th>
                  <th>Value</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {headers && headers.length > 0 ? (
                  headers.map((h, i) => (
                    <tr key={i}>
                      <td><input className="wb-header-input" value={h.key || ''} placeholder="Authorization" onChange={(event) => setHeaders((items) => items.map((item, index) => index === i ? { ...item, key: event.target.value } : item))} /></td>
                      <td><input className="wb-header-input" value={h.value || ''} placeholder="Bearer ..." onChange={(event) => setHeaders((items) => items.map((item, index) => index === i ? { ...item, value: event.target.value } : item))} /></td>
                      <td><button type="button" className="wb-copy-btn" onClick={() => setHeaders((items) => items.filter((_, index) => index !== i))}>Eliminar</button></td>
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
