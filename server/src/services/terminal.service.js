const { spawn } = require('child_process');
const { WebSocketServer } = require('ws');
const os = require('os');
const fs = require('fs');

function resolveShell(requestedShell) {
  const isWin = os.platform() === 'win32';
  if (!isWin) {
    return { shell: process.env.SHELL || 'bash', args: [] };
  }

  const gitBashPath = 'C:\\Program Files\\Git\\bin\\bash.exe';
  const wslPath = 'C:\\Windows\\System32\\wsl.exe';

  switch (requestedShell) {
    case 'cmd':
      return { shell: process.env.COMSPEC || 'cmd.exe', args: [] };
    case 'gitbash':
      if (fs.existsSync(gitBashPath)) return { shell: gitBashPath, args: [] };
      return { shell: 'bash.exe', args: [] };
    case 'wsl':
      if (fs.existsSync(wslPath)) return { shell: wslPath, args: [] };
      return { shell: 'wsl.exe', args: [] };
    case 'powershell':
    default:
      return { shell: 'powershell.exe', args: ['-NoLogo'] };
  }
}

function setupTerminalWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/api/terminal' });

  wss.on('connection', (ws, req) => {
    // Parse requested shell from WebSocket URL query
    const urlObj = new URL(req.url, 'http://localhost');
    const requestedShell = urlObj.searchParams.get('shell') || 'powershell';
    const { shell, args } = resolveShell(requestedShell);

    console.log(`[Terminal WS] Spawning shell: ${shell} (requested: ${requestedShell})`);

    const shellProcess = spawn(shell, args, {
      cwd: process.cwd(),
      env: { ...process.env, TERM: 'xterm-256color' },
    });

    shellProcess.stdout.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data.toString());
      }
    });

    shellProcess.stderr.on('data', (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(data.toString());
      }
    });

    shellProcess.on('exit', (code) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(`\r\n[Process exited with code ${code}]\r\n`);
        ws.close();
      }
    });

    ws.on('message', (msg) => {
      try {
        const payload = msg.toString();
        shellProcess.stdin.write(payload);
      } catch (err) {
        console.error('[Terminal WS Error]', err);
      }
    });

    ws.on('close', () => {
      console.log('[Terminal WS] Client disconnected');
      try {
        shellProcess.kill();
      } catch {}
    });
  });
}

module.exports = { setupTerminalWebSocket };