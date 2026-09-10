import { useState, useEffect, useRef } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { useWorkspace } from '../../../features/workspaces/WorkspaceContext';
import './TerminalDrawer.css';

function TerminalDrawer({ isOpen, onClose }) {
  const { consoleLogs, clearConsoleLogs } = useWorkspace();
  const [activeTab, setActiveTab] = useState('terminal'); // 'terminal' (real shell) | 'console' (HTTP logs)
  const [isExpanded, setIsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedShell, setSelectedShell] = useState(() => {
    return localStorage.getItem('api-wallet-preferred-shell') || 'powershell';
  });

  const xtermContainerRef = useRef(null);
  const xtermInstanceRef = useRef(null);
  const socketRef = useRef(null);
  const fitAddonRef = useRef(null);
  const consoleBottomRef = useRef(null);

  // Auto scroll console view
  useEffect(() => {
    if (activeTab === 'console') {
      consoleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consoleLogs, activeTab]);

  // Real OS Terminal initialization via WebSockets & xterm.js
  useEffect(() => {
    if (!isOpen || activeTab !== 'terminal' || !xtermContainerRef.current) return;

    // Clean up previous terminal instance if any
    if (xtermInstanceRef.current) {
      xtermInstanceRef.current.dispose();
      xtermInstanceRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 12,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      theme: {
        background: '#0c0e14',
        foreground: '#d0d7e0',
        cursor: '#8b5cf6',
        selectionBackground: 'rgba(139, 92, 246, 0.3)',
      },
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(xtermContainerRef.current);
    fitAddon.fit();

    fitAddonRef.current = fitAddon;
    xtermInstanceRef.current = term;

    // Connect to WebSocket server on backend with selected shell
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:3000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/terminal?shell=${selectedShell}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      term.writeln('\x1b[1;32m✓ Conectado a la terminal del sistema (CMD / PowerShell / Bash)\x1b[0m\r\n');
    };

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    ws.onerror = () => {
      term.writeln('\r\n\x1b[1;31m✗ Error de conexión con el WebSocket de la terminal.\x1b[0m\r\n');
    };

    ws.onclose = () => {
      setIsConnected(false);
      term.writeln('\r\n\x1b[1;33mi Sesión de terminal finalizada.\x1b[0m\r\n');
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      try {
        fitAddon.fit();
      } catch {}
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        ws.close();
        term.dispose();
      } catch {}
    };
  }, [isOpen, activeTab, selectedShell]);

  // Fit terminal when expanding/reducing height
  useEffect(() => {
    if (fitAddonRef.current) {
      setTimeout(() => {
        try {
          fitAddonRef.current.fit();
        } catch {}
      }, 150);
    }
  }, [isExpanded]);

  if (!isOpen) return null;

  return (
    <div className={`wb-terminal-drawer ${isExpanded ? 'wb-terminal-drawer--expanded' : ''}`}>
      <div className="wb-term-header">
        <div className="wb-term-tabs">
          <button
            type="button"
            className={`wb-term-tab ${activeTab === 'terminal' ? 'wb-term-tab--active' : ''}`}
            onClick={() => setActiveTab('terminal')}
          >
            Terminal SO {isConnected && <span className="wb-term-live-dot" title="Terminal en vivo" />}
          </button>

          {activeTab === 'terminal' && (
            <select
              className="wb-term-shell-select"
              value={selectedShell}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedShell(val);
                localStorage.setItem('api-wallet-preferred-shell', val);
              }}
              title="Seleccionar shell de terminal"
            >
              <option value="powershell">PowerShell</option>
              <option value="cmd">Command Prompt (CMD)</option>
              <option value="gitbash">Git Bash</option>
              <option value="wsl">WSL / Linux (Ubuntu)</option>
            </select>
          )}

          <button
            type="button"
            className={`wb-term-tab ${activeTab === 'console' ? 'wb-term-tab--active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            Consola HTTP ({consoleLogs.length})
          </button>
        </div>

        <div className="wb-term-actions">
          {activeTab === 'console' && (
            <button type="button" className="wb-term-action-btn" onClick={clearConsoleLogs} title="Limpiar consola">
              🗑 Limpiar
            </button>
          )}

          <button
            type="button"
            className="wb-term-action-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restaurar tamaño' : 'Maximizar'}
          >
            {isExpanded ? '▼ Reducir' : '▲ Maximizar'}
          </button>

          <button type="button" className="wb-term-close-btn" onClick={onClose} title="Cerrar Terminal (Ctrl+J)">
            ✕
          </button>
        </div>
      </div>

      <div className="wb-term-body">
        {activeTab === 'terminal' && (
          <div className="wb-xterm-wrapper" ref={xtermContainerRef} />
        )}

        {activeTab === 'console' && (
          <div className="wb-console-view">
            {consoleLogs.length === 0 ? (
              <div className="wb-console-empty">No hay registros de consola aún. Ejecuta una petición o script.</div>
            ) : (
              consoleLogs.map((log) => (
                <div key={log.id} className={`wb-console-line wb-console-line--${log.type || 'info'}`}>
                  <span className="wb-console-time">[{log.timestamp}]</span>
                  {log.method && <span className={`wb-console-method wb-console-method--${log.method.toLowerCase()}`}>{log.method}</span>}
                  {log.status && <span className="wb-console-status">{log.status}</span>}
                  {log.time && <span className="wb-console-meta">{log.time}</span>}
                  <span className="wb-console-text">{log.text}</span>
                </div>
              ))
            )}
            <div ref={consoleBottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}

export default TerminalDrawer;