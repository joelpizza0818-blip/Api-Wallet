function showUpdateModal(version) {
  return new Promise((resolve) => {
    const root = document.createElement('div');
    root.style.position = 'fixed';
    root.style.inset = '0';
    root.style.zIndex = '99999';
    root.style.display = 'grid';
    root.style.placeItems = 'center';
    root.style.background = 'rgba(7, 10, 18, 0.72)';
    root.style.backdropFilter = 'blur(4px)';

    const modal = document.createElement('div');
    modal.style.width = 'min(420px, calc(100vw - 32px))';
    modal.style.borderRadius = '18px';
    modal.style.background = '#171722';
    modal.style.border = '1px solid rgba(148, 163, 184, 0.25)';
    modal.style.boxShadow = '0 28px 80px rgba(0, 0, 0, 0.42)';
    modal.style.padding = '24px';
    modal.style.color = '#f4f5f7';

    const title = document.createElement('h2');
    title.textContent = 'Actualización disponible';
    title.style.margin = '0 0 12px';
    title.style.fontSize = '1.1rem';

    const text = document.createElement('p');
    text.textContent = `Hay una nueva versión (${version}) de API Wallet. ¿Quieres instalarla ahora?`;
    text.style.margin = '0';
    text.style.color = '#b7bfd1';
    text.style.lineHeight = '1.6';

    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.justifyContent = 'flex-end';
    actions.style.gap = '10px';
    actions.style.marginTop = '22px';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Más tarde';
    cancelBtn.style.border = '1px solid rgba(148, 163, 184, 0.28)';
    cancelBtn.style.borderRadius = '10px';
    cancelBtn.style.background = 'transparent';
    cancelBtn.style.color = '#e2e8f0';
    cancelBtn.style.padding = '10px 14px';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.addEventListener('click', () => {
      resolve(false);
      document.body.removeChild(root);
    });

    const installBtn = document.createElement('button');
    installBtn.type = 'button';
    installBtn.textContent = 'Instalar ahora';
    installBtn.style.border = 'none';
    installBtn.style.borderRadius = '10px';
    installBtn.style.background = 'linear-gradient(135deg, #8b5cf6, #4f46e5)';
    installBtn.style.color = '#fff';
    installBtn.style.padding = '10px 16px';
    installBtn.style.cursor = 'pointer';
    installBtn.style.fontWeight = '700';
    installBtn.addEventListener('click', () => {
      resolve(true);
      document.body.removeChild(root);
    });

    actions.append(cancelBtn, installBtn);
    modal.append(title, text, actions);
    root.append(modal);
    document.body.appendChild(root);
  });
}

export async function checkForDesktopUpdates() {
  if (!window.__TAURI_INTERNALS__) return false;

  try {
    const [{ check }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-process'),
    ]);
    const update = await check();
    if (!update) return false;

    const shouldInstall = await showUpdateModal(update.version);
    if (!shouldInstall) return false;

    await update.downloadAndInstall();
    await relaunch();
    return true;
  } catch (error) {
    console.warn('No se pudo comprobar o instalar la actualización:', error);
    return false;
  }
}