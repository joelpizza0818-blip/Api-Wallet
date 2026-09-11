import { useState, useEffect, useRef } from 'react';
import { useWorkspace } from '../../../features/workspaces/WorkspaceContext';
import './TerminalDrawer.css';

function TerminalDrawer({ isOpen, onClose }) {
  const { consoleLogs, clearConsoleLogs } = useWorkspace();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterType, setFilterType] = useState('all'); // 'all' | 'info' | 'success' | 'error'
  const [logSearch, setLogSearch] = useState('');
  const consoleBottomRef = useRef(null);

  // Auto scroll console view on new log
  useEffect(() => {
    consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  if (!isOpen) return null;

  const filteredLogs = (consoleLogs || []).filter((log) => {
    if (filterType !== 'all' && log.type !== filterType) return false;
    if (logSearch.trim()) {
      const q = logSearch.toLowerCase();
      const textMatch = log.text?.toLowerCase().includes(q);
      const methodMatch = log.method?.toLowerCase().includes(q);
      const statusMatch = String(log.status || '').toLowerCase().includes(q);
      return textMatch || methodMatch || statusMatch;
    }
    return true;
  });

  return (
    <div className={`wb-terminal-drawer ${isExpanded ? 'wb-terminal-drawer--expanded' : ''}`}>
      <div className="wb-term-header">
        <div className="wb-term-tabs">
          <div className="wb-term-title-badge">
            <span className="wb-term-live-dot" />
            <strong>Consola de Ejecución &amp; Logs</strong>
            <span className="wb-term-count">({consoleLogs.length})</span>
          </div>

          <div className="wb-term-filter-group">
            <button
              type="button"
              className={`wb-term-filter-btn ${filterType === 'all' ? 'active' : ''}`}
              onClick={() => setFilterType('all')}
            >
              Todos
            </button>
            <button
              type="button"
              className={`wb-term-filter-btn ${filterType === 'info' ? 'active' : ''}`}
              onClick={() => setFilterType('info')}
            >
              Info
            </button>
            <button
              type="button"
              className={`wb-term-filter-btn ${filterType === 'success' ? 'active' : ''}`}
              onClick={() => setFilterType('success')}
            >
              Éxitos
            </button>
            <button
              type="button"
              className={`wb-term-filter-btn ${filterType === 'error' ? 'active' : ''}`}
              onClick={() => setFilterType('error')}
            >
              Errores
            </button>
          </div>

          <input
            type="text"
            className="wb-term-search-input"
            placeholder="Filtrar logs..."
            value={logSearch}
            onChange={(e) => setLogSearch(e.target.value)}
          />
        </div>

        <div className="wb-term-actions">
          <button
            type="button"
            className="wb-term-action-btn"
            onClick={clearConsoleLogs}
            title="Limpiar registros de consola"
          >
            🗑 Limpiar
          </button>

          <button
            type="button"
            className="wb-term-action-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restaurar tamaño' : 'Maximizar consola'}
          >
            {isExpanded ? '▼ Reducir' : '▲ Maximizar'}
          </button>

          <button
            type="button"
            className="wb-term-close-btn"
            onClick={onClose}
            title="Cerrar Consola (Ctrl+J)"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="wb-term-body">
        <div className="wb-console-view">
          {filteredLogs.length === 0 ? (
            <div className="wb-console-empty">
              {consoleLogs.length === 0
                ? 'No hay registros de consola aún. Ejecuta una petición o script para ver la traza aquí.'
                : 'No se encontraron logs con los filtros aplicados.'}
            </div>
          ) : (
            filteredLogs.map((log) => (
              <div key={log.id} className={`wb-console-line wb-console-line--${log.type || 'info'}`}>
                <span className="wb-console-time">[{log.timestamp}]</span>
                {log.method && (
                  <span className={`wb-console-method wb-console-method--${log.method.toLowerCase()}`}>
                    {log.method}
                  </span>
                )}
                {log.status && <span className="wb-console-status">{log.status}</span>}
                {log.time && <span className="wb-console-meta">{log.time}</span>}
                <span className="wb-console-text">{log.text}</span>
              </div>
            ))
          )}
          <div ref={consoleBottomRef} />
        </div>
      </div>
    </div>
  );
}

export default TerminalDrawer;