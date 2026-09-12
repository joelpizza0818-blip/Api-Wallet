function createLogEntry(level, message, context = {}) {
  return { timestamp: new Date().toISOString(), level, message, context, location: window.location.pathname };
}

export function buildLog(level, message, context = {}) {
  const entry = createLogEntry(level, message, context);
  const method = level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info';
  console[method](`[API-Wallet] ${JSON.stringify(entry)}`);
  return entry;
}

export function installClientErrorLogging() {
  window.addEventListener('error', (event) => buildLog('error', 'Unhandled client error', { message: event.message, source: event.filename, line: event.lineno }));
  window.addEventListener('unhandledrejection', (event) => buildLog('error', 'Unhandled promise rejection', { reason: String(event.reason?.message || event.reason || 'Unknown error') }));
}
