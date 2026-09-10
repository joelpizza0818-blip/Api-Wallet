import { useState } from 'react';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import './FlowsView.css';

function FlowsView({ onOpenNewFlowModal }) {
  const { flows, toggleFlowStatus, deleteFlow, runFlowNow } = useWorkspace();
  const [runningFlowId, setRunningFlowId] = useState(null);

  const handleRunNow = (flowId) => {
    setRunningFlowId(flowId);
    setTimeout(() => {
      runFlowNow(flowId);
      setRunningFlowId(null);
    }, 450);
  };

  const activeFlowsCount = flows.filter((f) => f.status === 'active').length;

  return (
    <div className="wb-flows-view">
      {/* Header */}
      <div className="wb-flows-header">
        <div className="wb-flows-title-col">
          <div className="wb-flows-badge">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Monitoreo Continuo
          </div>
          <h1>Flows de Ejecución Automática</h1>
          <p>
            Programa llamadas automáticas periódicas (por hora, individual o por colección) para monitorizar disponibilidad, alertar sobre caídas y auditar tiempos de respuesta.
          </p>
        </div>

        <button
          type="button"
          className="btn btn--primary btn--md wb-create-flow-btn"
          onClick={onOpenNewFlowModal}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Programar nuevo Flow
        </button>
      </div>

      {/* Metrics Row */}
      <div className="wb-flows-metrics-grid">
        <div className="wb-flows-metric-card">
          <span className="wb-fl-label">Flows Programados</span>
          <div className="wb-fl-metric-row">
            <span className="wb-fl-number">{flows.length}</span>
            <span className="wb-fl-active-tag">{activeFlowsCount} activos</span>
          </div>
          <span className="wb-fl-sub">Monitoreo continuo 24/7</span>
        </div>

        <div className="wb-flows-metric-card">
          <span className="wb-fl-label">Uptime del Sistema</span>
          <div className="wb-fl-metric-row">
            <span className="wb-fl-number text-success">99.9%</span>
          </div>
          <span className="wb-fl-sub">0 fallas críticas en 24h</span>
        </div>

        <div className="wb-flows-metric-card">
          <span className="wb-fl-label">Latencia Promedio</span>
          <div className="wb-fl-metric-row">
            <span className="wb-fl-number">36 ms</span>
          </div>
          <span className="wb-fl-sub">Tráfico saludable</span>
        </div>

        <div className="wb-flows-metric-card">
          <span className="wb-fl-label">Próxima Ejecución</span>
          <div className="wb-fl-metric-row">
            <span className="wb-fl-number text-accent">En 18m</span>
          </div>
          <span className="wb-fl-sub">Programación por hora</span>
        </div>
      </div>

      {/* Scheduled Flows List */}
      <div className="wb-flows-card-container">
        <div className="wb-flows-container-header">
          <h3>Flujos Activos y Programaciones</h3>
          <span className="wb-flows-count-pill">{flows.length} configurados</span>
        </div>

        {flows.length === 0 ? (
          <div className="wb-flows-empty">
            <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <h4>No tienes flows de monitoreo configurados</h4>
            <p>Programa tu primera ejecución recurrente para supervisar la salud de tus APIs de forma automática.</p>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={onOpenNewFlowModal}
            >
              + Crear Flow
            </button>
          </div>
        ) : (
          <div className="wb-flows-list">
            {flows.map((flow) => {
              const isRunning = runningFlowId === flow.id;
              const isActive = flow.status === 'active';

              return (
                <div key={flow.id} className={`wb-flow-item-card ${!isActive ? 'wb-flow--paused' : ''}`}>
                  <div className="wb-flow-item-top">
                    <div className="wb-flow-title-row">
                      <div className="wb-flow-name-wrap">
                        <span className={`wb-flow-status-dot ${isActive ? 'dot-active' : 'dot-paused'}`} />
                        <h4 className="wb-flow-name">{flow.name}</h4>
                        <span className="wb-flow-frequency-badge">{flow.frequency}</span>
                      </div>

                      <div className="wb-flow-actions">
                        <button
                          type="button"
                          className="wb-run-now-btn"
                          onClick={() => handleRunNow(flow.id)}
                          disabled={isRunning}
                          title="Lanzar ejecución manual inmediata"
                        >
                          {isRunning ? (
                            <span className="wb-flow-spinner" />
                          ) : (
                            <>
                              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                              <span>Ejecutar Ahora</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          className={`wb-toggle-status-btn ${isActive ? 'btn-active' : 'btn-paused'}`}
                          onClick={() => toggleFlowStatus(flow.id)}
                          title={isActive ? 'Pausar este flow' : 'Activar este flow'}
                        >
                          {isActive ? 'Pausar' : 'Reanudar'}
                        </button>

                        <button
                          type="button"
                          className="wb-delete-flow-btn"
                          onClick={() => deleteFlow(flow.id)}
                          title="Eliminar este flow"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    <div className="wb-flow-target-meta">
                      <span className="wb-target-badge">
                        {flow.targetType === 'group' ? '📁 Por Grupo:' : '⚡ Individual:'}
                      </span>
                      <code className="wb-target-name">{flow.targetName}</code>
                    </div>
                  </div>

                  {/* Flow Live Telemetry row */}
                  <div className="wb-flow-telemetry-row">
                    <div className="wb-telem-col">
                      <span className="wb-telem-label">Última ejecución</span>
                      <span className="wb-telem-val">{flow.lastRun}</span>
                    </div>

                    <div className="wb-telem-col">
                      <span className="wb-telem-label">Respuesta HTTP</span>
                      <span className="wb-status-pill-ok">{flow.lastStatus}</span>
                    </div>

                    <div className="wb-telem-col">
                      <span className="wb-telem-label">Latencia</span>
                      <span className="wb-telem-val font-mono">{flow.latency}</span>
                    </div>

                    <div className="wb-telem-col">
                      <span className="wb-telem-label">Tasa de Éxito</span>
                      <span className="wb-telem-val text-success">{flow.successRate}</span>
                    </div>

                    <div className="wb-telem-col">
                      <span className="wb-telem-label">Total Ejecuciones</span>
                      <span className="wb-telem-val font-mono">{flow.runsCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Execution Timeline / Logs */}
      <div className="wb-flows-logs-card">
        <div className="wb-logs-header">
          <h3>Historial de Monitoreo en Vivo</h3>
          <span className="wb-logs-live-badge">● Transmisión en vivo</span>
        </div>

        <div className="wb-logs-table-wrap">
          <table className="wb-logs-table">
            <thead>
              <tr>
                <th>Hora</th>
                <th>Flow</th>
                <th>Destino</th>
                <th>Status</th>
                <th>Latencia</th>
                <th>Resultado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>17:58:12</td>
                <td>Auth Health Monitor</td>
                <td><code>Auth Collection</code></td>
                <td><span className="wb-code-200">200 OK</span></td>
                <td>34 ms</td>
                <td><span className="wb-check-green">✓ Passed</span></td>
              </tr>
              <tr>
                <td>17:45:00</td>
                <td>Trailers Feed CDN Check</td>
                <td><code>GET /trailers/feed</code></td>
                <td><span className="wb-code-200">200 OK</span></td>
                <td>48 ms</td>
                <td><span className="wb-check-green">✓ Passed</span></td>
              </tr>
              <tr>
                <td>17:30:00</td>
                <td>Auth Health Monitor</td>
                <td><code>POST /auth/login</code></td>
                <td><span className="wb-code-200">200 OK</span></td>
                <td>29 ms</td>
                <td><span className="wb-check-green">✓ Passed</span></td>
              </tr>
              <tr>
                <td>17:00:00</td>
                <td>Misc Ping Heartbeat</td>
                <td><code>GET /misc/data</code></td>
                <td><span className="wb-code-200">200 OK</span></td>
                <td>18 ms</td>
                <td><span className="wb-check-green">✓ Passed</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default FlowsView;
