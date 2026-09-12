export async function checkForDesktopUpdates() {
  if (!window.__TAURI_INTERNALS__) return false;

  try {
    const [{ check }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-process'),
    ]);
    const update = await check();
    if (!update) return false;

    const shouldInstall = window.confirm(`Hay una nueva versión (${update.version}) de API Wallet. ¿Instalar ahora?`);
    if (!shouldInstall) return false;

    await update.downloadAndInstall();
    await relaunch();
    return true;
  } catch (error) {
    console.warn('No se pudo comprobar o instalar la actualización:', error);
    return false;
  }
}