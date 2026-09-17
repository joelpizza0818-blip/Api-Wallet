import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import { PRIMARY_THEMES, ACCENT_COLORS } from '../workspaces/themeConstants';
import { useAuth } from '../auth/AuthContext';
import './SettingsDrawer.css';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Alex',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Nova',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Shadow',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Cyber',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Titan',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Quantum',
];

function SettingsDrawer({ isOpen, onClose, onConfirmDeleteApis, onConfirmDeleteProject }) {
  const navigate = useNavigate();
  const {
    primaryTheme,
    setPrimaryTheme,
    customBackground,
    setCustomBackground,
    accentColor,
    setAccentColor,
    accentHue,
    setAccentHue,
    accentIntensity,
    setAccentIntensity,
    restoreDefaultWorkspace,
    activeWorkspaceId,
    workspaceDetails,
    addCollection,
    addApi,
    activeProjectId,
    projects,
  } = useWorkspace();
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

  const { user, updateProfile, changePassword, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('workspace'); // 'workspace' | 'teamwork' | 'profile'

  // Teamwork state
  const [projectInviteCode, setProjectInviteCode] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('API Developer');
  const handleRoleChange = async (userId, role) => {
    const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/members/${userId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    if (response.ok) setTeamMembers((items) => items.map((member) => member.id === userId ? { ...member, role } : member));
  };
  const [teamMsg, setTeamMsg] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (!isOpen || !activeWorkspaceId) return;
    fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}`, { credentials: 'include' }).then(async (response) => {
      if (!response.ok) return;
      const workspace = (await response.json()).data;
      setProjectInviteCode(workspace.inviteCode || '');
      setTeamMembers((workspace.members || []).map((member) => ({ id: member.userId, name: member.user.name, email: member.user.email, role: member.role, badge: member.role === 'ADMIN' || member.role === 'OWNER' ? 'role-admin' : member.role === 'QA' ? 'role-qa' : 'role-dev', avatar: member.user.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(member.user.email)}` })));
    }).catch(() => {});
  }, [isOpen, activeWorkspaceId, API_URL]);

  // Profile Form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileEmail, setProfileEmail] = useState(user?.email || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || AVATAR_PRESETS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [profileSavedMsg, setProfileSavedMsg] = useState('');

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState({ type: '', text: '' });
  const [importMsg, setImportMsg] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [projectImporting, setProjectImporting] = useState(false);
  const [analysisModal, setAnalysisModal] = useState({
    isOpen: false,
    status: 'analyzing',
    targetName: '',
    stepIndex: 0,
    message: '',
    error: '',
    collectionsCount: 0,
    importedCount: 0,
  });

  const importProject = async ({ files, repositoryUrl = '' }) => {
    const targetLabel = repositoryUrl || (files?.length ? `Carpeta local (${files.length} archivos)` : 'Proyecto');
    setAnalysisModal({
      isOpen: true,
      status: 'analyzing',
      targetName: targetLabel,
      stepIndex: 0,
      message: 'Leyendo estructura y archivos del proyecto...',
      error: '',
      collectionsCount: 0,
      importedCount: 0,
    });
    setProjectImporting(true);

    const stepTimer1 = setTimeout(() => {
      setAnalysisModal((prev) => prev.isOpen && prev.status === 'analyzing' ? { ...prev, stepIndex: 1, message: 'Analizando rutas, métodos HTTP y controladores...' } : prev);
    }, 1100);

    const stepTimer2 = setTimeout(() => {
      setAnalysisModal((prev) => prev.isOpen && prev.status === 'analyzing' ? { ...prev, stepIndex: 2, message: 'Generando colecciones y requests en Api-Wallet...' } : prev);
    }, 2400);

    try {
      const targetProjectId = activeProjectId || projects?.[0]?.id;
      const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/import-project`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(repositoryUrl ? { githubUrl: repositoryUrl, projectId: targetProjectId } : { files, projectId: targetProjectId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudo analizar el proyecto.');

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const { imported, filesAnalyzed, collections, configKeys } = result.data || {};
      const colCount = collections?.length || 1;

      setAnalysisModal({
        isOpen: true,
        status: 'success',
        targetName: targetLabel,
        stepIndex: 3,
        message: '¡Análisis completado con éxito!',
        error: '',
        importedCount: imported || 0,
        collectionsCount: colCount,
        filesAnalyzedCount: filesAnalyzed || 0,
        configKeysCount: configKeys?.length || 0,
      });

      setGithubUrl('');
      setTimeout(() => {
        window.location.reload();
      }, 1600);
    } catch (error) {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      setAnalysisModal((prev) => ({
        ...prev,
        status: 'error',
        error: error.message || 'Ocurrió un error al procesar el proyecto.',
      }));
    } finally {
      setProjectImporting(false);
    }
  };

  const importProjectFolder = async (event) => {
    const supportedExtensions = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.vue', '.svelte', '.py', '.go', '.java', '.rb', '.php', '.json', '.yml', '.yaml', '.env']);
    const selectedFiles = [...(event.target.files || [])].filter((file) => {
      const parts = (file.webkitRelativePath || file.name).split('/');
      return !parts.some((part) => ['node_modules', '.git', 'dist', 'build', 'target', 'coverage', '.next'].includes(part))
        && (supportedExtensions.has(`.${file.name.split('.').pop().toLowerCase()}`) || file.name.startsWith('.env'))
        && file.size <= 200000;
    }).slice(0, 300);
    event.target.value = '';
    if (!selectedFiles.length) return;
    try {
      const files = await Promise.all(selectedFiles.map((file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.webkitRelativePath || file.name, content: reader.result });
        reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}.`));
        reader.readAsText(file);
      })));
      await importProject({ files });
    } catch (error) {
      setImportMsg(error.message);
    }
  };

  const importGithubProject = (event) => {
    event.preventDefault();
    if (githubUrl.trim()) importProject({ repositoryUrl: githubUrl.trim() });
  };

  const importPostman = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const data = JSON.parse(reader.result);
        const extractRequests = (items, currentFolder = 'Postman Collection') => {
          const result = [];
          for (const item of items) {
            if (item.request) {
              result.push({ folderName: currentFolder, item });
            } else if (Array.isArray(item.item)) {
              result.push(...extractRequests(item.item, item.name || currentFolder));
            }
          }
          return result;
        };

        const allItems = Array.isArray(data.item)
          ? extractRequests(data.item, data.info?.name || 'Postman Collection')
          : [];

        if (!allItems.length) {
          setImportMsg('No se encontraron requests válidos en la colección.');
          return;
        }

        const groups = {};
        for (const entry of allItems) {
          groups[entry.folderName] = groups[entry.folderName] || [];
          groups[entry.folderName].push(entry.item);
        }

        let imported = 0;
        for (const [folderName, reqItems] of Object.entries(groups)) {
          const collection = await addCollection(folderName, 'Importada desde Postman');
          for (const item of reqItems) {
            const request = item.request;
            const rawUrl = typeof request.url === 'string'
              ? request.url
              : (request.url?.raw || (Array.isArray(request.url?.path) ? `/${request.url.path.join('/')}` : ''));
            let pathname = rawUrl;
            try {
              if (rawUrl.startsWith('http')) pathname = new URL(rawUrl).pathname;
            } catch {
              pathname = rawUrl;
            }
            await addApi(collection.id, {
              name: item.name || `${request.method || 'GET'} ${pathname || '/'}`,
              method: (request.method || 'GET').toUpperCase(),
              path: pathname || '/',
              url: rawUrl || '',
              description: typeof request.description === 'string' ? request.description : request.description?.content || '',
              headers: (request.header || []).map((header) => ({ key: header.key, value: header.value || '' })),
              params: Array.isArray(request.url?.query) ? request.url.query.map((q) => ({ key: q.key, value: q.value || '' })) : [],
              body: typeof request.body?.raw === 'string' ? request.body.raw : '',
            });
            imported += 1;
          }
        }
        setImportMsg(`Importación completada: ${imported} requests importados.`);
        setTimeout(() => window.location.reload(), 1200);
      } catch (err) {
        setImportMsg(err.message || 'No se pudo importar. Selecciona un JSON de colección Postman válido.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(projectInviteCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleRegenerateCode = async () => {
    const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerateInviteCode: true }) });
    const result = await response.json();
    if (!response.ok) { setTeamMsg(result.message || 'No se pudo regenerar el código.'); return; }
    setProjectInviteCode(result.data.inviteCode);
    setTeamMsg('Nuevo código de invitación generado.');
    setTimeout(() => setTeamMsg(''), 3000);
  };

  const handleJoinWorkspace = async (event) => {
    event.preventDefault();
    const response = await fetch(`${API_URL}/api/workspaces/join-code`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: joinCode }) });
    const result = await response.json();
    if (!response.ok) { setTeamMsg(result.message || 'No se pudo unir al workspace.'); return; }
    setJoinCode('');
    setTeamMsg(`Te uniste a ${result.data.workspaceName}. Actualizando tus workspaces…`);
    setTimeout(() => window.location.reload(), 700);
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberEmail.trim()) return;
    const roleMap = { Admin: 'ADMIN', 'API Developer': 'DEVELOPER', 'QA Tester': 'QA', Viewer: 'VIEWER' };
    try {
      const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/invitations`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: newMemberEmail, role: roleMap[newMemberRole] || 'VIEWER' }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'No se pudo enviar la invitación');
      setTeamMsg(result.data.delivery?.delivered ? `Invitación enviada a ${newMemberEmail}.` : 'La invitación fue creada; configura SMTP para enviar correo externo.');
      setNewMemberEmail('');
    } catch (error) { setTeamMsg(error.message); }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const finalAvatar = customAvatarUrl.trim() || selectedAvatar;
    try {
      await updateProfile({ name: profileName, avatar: finalAvatar });
      setProfileSavedMsg('¡Perfil actualizado con éxito!');
    } catch (error) { setProfileSavedMsg(error.message); }
    setTimeout(() => setProfileSavedMsg(''), 3000);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg({ type: '', text: '' });

    if (!newPassword) {
      setPasswordMsg({ type: 'error', text: 'Ingresa una nueva contraseña.' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }

    const res = await changePassword({ currentPassword, newPassword });
    if (res.success) {
      setPasswordMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg({ type: '', text: '' }), 4000);
    } else {
      setPasswordMsg({ type: 'error', text: res.message });
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    navigate('/');
  };

  const handleAccentSelect = (accent) => {
    setAccentColor(accent.id);
    setAccentHue(accent.hue);
    setAccentIntensity(accent.intensity);
  };

  const handleBackgroundSelect = (themeId) => {
    setPrimaryTheme(themeId);
  };

  const handleCustomBackgroundChange = (event) => {
    const { r, g, b } = [1, 3, 5].reduce((channels, index, channelIndex) => {
      channels[channelIndex] = Number.parseInt(event.target.value.slice(index, index + 2), 16);
      return channels;
    }, []);
    const luminance = (r * 0.2126 + g * 0.7152 + b * 0.0722) / 255;
    const scale = luminance > 0.22 ? 0.22 / luminance : 1;
    const channel = (value) => Math.round(value * scale).toString(16).padStart(2, '0');
    setCustomBackground(`#${channel(r)}${channel(g)}${channel(b)}`);
    setPrimaryTheme('custom');
  };

  return (
    <div className="wb-settings-overlay" onClick={onClose}>
      <aside
        className="wb-settings-drawer"
        onClick={(e) => e.stopPropagation()}
        aria-label="Panel lateral de configuración"
      >
        {/* Drawer Header */}
        <div className="wb-settings-header">
          <div className="wb-settings-header__title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            <h2>Configuración</h2>
          </div>
          <button
            type="button"
            className="wb-settings-close-btn"
            onClick={onClose}
            aria-label="Cerrar panel de configuración"
          >
            ✕
          </button>
        </div>

        {/* Drawer Tabs */}
        <div className="wb-settings-tabs">
          <button
            type="button"
            className={`wb-settings-tab ${activeTab === 'workspace' ? 'wb-settings-tab--active' : ''}`}
            onClick={() => setActiveTab('workspace')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
              <path d="M3.5 9.5h17M8 5v14" />
            </svg>
            Workspace
          </button>

          <button
            type="button"
            className={`wb-settings-tab ${activeTab === 'teamwork' ? 'wb-settings-tab--active' : ''}`}
            onClick={() => setActiveTab('teamwork')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            Teamwork
          </button>

          <button
            type="button"
            className={`wb-settings-tab ${activeTab === 'profile' ? 'wb-settings-tab--active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Perfil
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="wb-settings-body">
          {/* ==================== WORKSPACE TAB ==================== */}
          {activeTab === 'workspace' && (
            <div className="wb-settings-section-list">
              {/* Color Principal (Background theme) */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Color Principal (Fondo)</h3>
                  <p>Selecciona el tema de fondo para la interfaz.</p>
                </div>

                <div className="wb-theme-swatches-grid">
                  {PRIMARY_THEMES.map((theme) => {
                    const isSelected = primaryTheme === theme.id;
                    return (
                      <button
                        key={theme.id}
                        type="button"
                        className={`wb-theme-swatch ${isSelected ? 'wb-theme-swatch--active' : ''}`}
                        onClick={() => handleBackgroundSelect(theme.id)}
                        style={{ backgroundColor: theme.bg }}
                      >
                        <div className="wb-swatch-header">
                          <span
                            className="wb-swatch-dot"
                            style={{ backgroundColor: theme.isDark ? '#fff' : '#000' }}
                          />
                          {isSelected && (
                            <span className="wb-swatch-check">✓</span>
                          )}
                        </div>
                        <span
                          className="wb-swatch-name"
                          style={{ color: theme.isDark ? '#e2e8f0' : '#1e293b' }}
                        >
                          {theme.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <label className="wb-custom-color-control">
                  <span>Color personalizado</span>
                  <span className="wb-custom-color-input">
                    <input type="color" value={customBackground} onChange={handleCustomBackgroundChange} aria-label="Elegir color de fondo personalizado" />
                    <output>{customBackground.toUpperCase()}</output>
                  </span>
                </label>
              </div>

              {/* Color Secundario (Accent) */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Color Secundario (Acento)</h3>
                  <p>Personaliza los botones, insignias y estados activos.</p>
                </div>

                <div className="wb-accent-swatches-grid">
                  {ACCENT_COLORS.map((accent) => {
                    const isSelected = accentColor === accent.id;
                    return (
                      <button
                        key={accent.id}
                        type="button"
                        className={`wb-accent-swatch ${isSelected ? 'wb-accent-swatch--active' : ''}`}
                        onClick={() => handleAccentSelect(accent)}
                        title={accent.name}
                      >
                        <span
                          className="wb-accent-circle"
                          style={{ backgroundColor: accent.primary }}
                        >
                          {isSelected && <span className="wb-accent-check">✓</span>}
                        </span>
                        <span className="wb-accent-name">{accent.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="wb-accent-controls">
                  <label className="wb-range-control">
                    <span><span>Matiz</span><output>{accentHue}°</output></span>
                    <input
                      className="wb-range-control__hue"
                      type="range"
                      min="0"
                      max="360"
                      value={accentHue}
                      onChange={(event) => setAccentHue(Number(event.target.value))}
                      style={{ '--range-value': `${(accentHue / 360) * 100}%` }}
                    />
                  </label>
                  <label className="wb-range-control">
                    <span><span>Intensidad y opacidad</span><output>{accentIntensity}%</output></span>
                    <input
                      type="range"
                      min="20"
                      max="100"
                      value={accentIntensity}
                      onChange={(event) => setAccentIntensity(Number(event.target.value))}
                      style={{ '--range-value': `${((accentIntensity - 20) / 80) * 100}%` }}
                    />
                  </label>
                </div>
              </div>

              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <div className="wb-postman-heading">
                    <svg className="wb-postman-logo" viewBox="0 0 40 40" aria-hidden="true">
                      <circle cx="20" cy="20" r="20" fill="#ff6c37" />
                      <path d="M11 20a9 9 0 0 1 18 0H11Z" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                      <path d="m20 20 7-7" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
                      <circle cx="20" cy="20" r="2.5" fill="#fff" />
                    </svg>
                    <h3>Importar desde Postman</h3>
                  </div>
                  <p>Importa una colección JSON y sus requests al proyecto actual.</p>
                </div>
                <label className="btn btn--secondary btn--md" style={{ display: 'inline-flex', cursor: 'pointer' }}>Seleccionar colección JSON<input type="file" accept=".json,application/json" hidden onChange={importPostman} /></label>
                {importMsg && <p className="wb-alert-success">{importMsg}</p>}
              </div>

              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Analizar proyecto</h3>
                  <p>Lee el código y la configuración para encontrar APIs externas y crear sus requests.</p>
                </div>
                <label className="btn btn--secondary btn--md wb-import-folder-btn">
                  Seleccionar carpeta del proyecto
                  <input type="file" hidden webkitdirectory="true" directory="true" multiple onChange={importProjectFolder} disabled={projectImporting} />
                </label>
                <form className="wb-github-import-form" onSubmit={importGithubProject}>
                  <input type="url" placeholder="https://github.com/organizacion/repositorio" value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} disabled={projectImporting} aria-label="URL del repositorio GitHub" />
                  <button type="submit" className="btn btn--primary btn--md" disabled={projectImporting || !githubUrl.trim()}>{projectImporting ? 'Analizando…' : 'Analizar GitHub'}</button>
                </form>
                {importMsg && <p className={importMsg.startsWith('Análisis') || importMsg.startsWith('Importación') ? 'wb-alert-success' : 'wb-alert-error'}>{importMsg}</p>}
              </div>

              {/* Danger Zone: Borrar APIs y Proyecto */}
              <div className="wb-settings-card wb-danger-card">
                <div className="wb-card-heading">
                  <div className="wb-danger-badge">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                      <line x1="12" y1="9" x2="12" y2="13" />
                      <line x1="12" y1="17" x2="12.01" y2="17" />
                    </svg>
                    Zona de Peligro
                  </div>
                  <h3>Gestión y Borrado de Datos</h3>
                  <p>Operaciones irreversibles sobre el workspace actual.</p>
                </div>

                <div className="wb-danger-actions">
                  <div className="wb-danger-row">
                    <div className="wb-danger-row-info">
                      <strong>Borrar todas las APIs</strong>
                      <p>Elimina todos los endpoints creados en las colecciones.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-danger-outline"
                      onClick={onConfirmDeleteApis}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                      Borrar APIs
                    </button>
                  </div>

                  <div className="wb-danger-row">
                    <div className="wb-danger-row-info">
                      <strong>Borrar proyecto completo</strong>
                      <p>Elimina todas las colecciones, APIs y API Keys registradas.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-danger-solid"
                      onClick={onConfirmDeleteProject}
                    >
                      Borrar Proyecto
                    </button>
                  </div>

                  <div className="wb-danger-row wb-restore-row">
                    <div className="wb-danger-row-info">
                      <strong>Restaurar datos de demostración</strong>
                      <p>Vuelve a cargar las colecciones y claves iniciales.</p>
                    </div>
                    <button
                      type="button"
                      className="btn-secondary-sm"
                      onClick={() => {
                        restoreDefaultWorkspace();
                        setProfileSavedMsg('¡Workspace restaurado con datos demo!');
                        setTimeout(() => setProfileSavedMsg(''), 3000);
                      }}
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TEAMWORK TAB ==================== */}
          {activeTab === 'teamwork' && (
            <div className="wb-settings-section-list">
              {teamMsg && (
                <div className="wb-alert-success">
                  ✓ {teamMsg}
                </div>
              )}

              {/* Shareable Project Code */}
              <div className="wb-settings-card wb-team-code-card">
                <div className="wb-card-heading">
                  <div className="wb-team-badge">Invitación de Proyecto</div>
                  <h3>Código Compartible por Proyecto</h3>
                  <p>Comparte este código único para que otros desarrolladores se unan a este proyecto.</p>
                </div>

                <div className="wb-code-display-box">
                  <code className="wb-invite-code-text">{projectInviteCode}</code>
                  <div className="wb-code-buttons">
                    <button
                      type="button"
                      className={`btn btn--primary btn--sm ${codeCopied ? 'btn--copied' : ''}`}
                      onClick={handleCopyCode}
                      disabled={workspaceDetails?.visibility === 'PERSONAL'}
                    >
                      {codeCopied ? '✓ ¡Copiado!' : 'Copiar Código'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={handleRegenerateCode}
                      disabled={workspaceDetails?.visibility === 'PERSONAL'}
                      title="Generar un nuevo código aleatorio"
                    >
                      Regenerar
                    </button>
                  </div>
                </div>

                <div className="wb-link-share-row">
                  <span className="wb-link-label">Enlace directo:</span>
                  <code className="wb-link-code">https://apiwallet.io/join/{projectInviteCode}</code>
                </div>
              </div>

              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Unirse a otro Workspace</h3>
                  <p>Introduce un código compartido por un administrador para entrar al equipo.</p>
                </div>
                <form onSubmit={handleJoinWorkspace} className="wb-profile-form">
                  <div className="wb-field-group"><label htmlFor="workspace-join-code">Código del Workspace</label><input id="workspace-join-code" placeholder="Pega aquí el código" value={joinCode} onChange={(event) => setJoinCode(event.target.value)} required /></div>
                  <button type="submit" className="btn btn--primary btn--md wb-save-btn">Unirme al Workspace</button>
                </form>
              </div>

              {/* Members Count & Team Roles */}
              <div className="wb-settings-card">
                <div className="wb-card-heading wb-flex-between">
                  <div>
                    <h3>Miembros y Roles del Equipo</h3>
                    <p>Roles y permisos asignados a cada integrante.</p>
                  </div>
                  <span className="wb-members-count-pill">
                    {teamMembers.length} Miembros en el equipo
                  </span>
                </div>

                <div className="wb-team-roles-list">
                  {teamMembers.map((member) => (
                    <div key={member.id} className="wb-team-member-item">
                      <div className="wb-member-avatar-col">
                        <img src={member.avatar} alt={member.name} className="wb-team-avatar" />
                        <div>
                          <strong className="wb-member-name">{member.name}</strong>
                          <span className="wb-member-email">{member.email}</span>
                        </div>
                      </div>
                      <select className={`wb-team-role-badge ${member.badge}`} value={member.role} onChange={(event) => handleRoleChange(member.id, event.target.value)} disabled={member.role === 'OWNER'} aria-label={`Rol de ${member.name}`}><option value="VIEWER">VIEWER</option><option value="DEVELOPER">DEVELOPER</option><option value="QA">QA</option><option value="ADMIN">ADMIN</option></select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Invite Form */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Invitar nuevo colaborador</h3>
                  <p>Envía una invitación directa por correo para unirse al equipo.</p>
                </div>

                <form onSubmit={handleAddMember} className="wb-profile-form">
                  <div className="wb-field-group">
                    <label htmlFor="invite-email">Correo electrónico</label>
                    <input
                      id="invite-email"
                      type="email"
                      placeholder="desarrollador@empresa.com"
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wb-field-group">
                    <label htmlFor="invite-role">Rol a otorgar</label>
                    <select
                      id="invite-role"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      className="wb-select-input"
                    >
                      <option value="API Developer">API Developer</option>
                      <option value="Admin">Admin</option>
                      <option value="QA Tester">QA Tester</option>
                      <option value="Viewer">Viewer (Solo lectura)</option>
                    </select>
                  </div>

                  <button type="submit" className="btn btn--primary btn--md wb-save-btn">
                    Enviar invitación de equipo
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ==================== PROFILE TAB ==================== */}
          {activeTab === 'profile' && (
            <div className="wb-settings-section-list">
              {profileSavedMsg && (
                <div className="wb-alert-success">
                  ✓ {profileSavedMsg}
                </div>
              )}

              {/* Foto de Perfil / Avatar */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Foto de Perfil</h3>
                  <p>Elige un avatar predeterminado o ingresa tu propia imagen.</p>
                </div>

                <div className="wb-avatar-selection-box">
                  <div className="wb-current-avatar-preview">
                    <img
                      src={customAvatarUrl.trim() || selectedAvatar}
                      alt={user?.name || 'Avatar actual'}
                      className="wb-large-avatar"
                    />
                    <div className="wb-avatar-badge">Activo</div>
                  </div>

                  <div className="wb-presets-container">
                    <span className="wb-sub-label">Avatares rápidos:</span>
                    <div className="wb-presets-grid">
                      {AVATAR_PRESETS.map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`wb-preset-avatar-btn ${selectedAvatar === presetUrl && !customAvatarUrl ? 'wb-preset--active' : ''}`}
                          onClick={() => {
                            setSelectedAvatar(presetUrl);
                            setCustomAvatarUrl('');
                          }}
                        >
                          <img src={presetUrl} alt={`Preset ${idx + 1}`} />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="wb-field-group">
                  <label htmlFor="custom-avatar-url">O URL de imagen personalizada:</label>
                  <input
                    id="custom-avatar-url"
                    type="url"
                    placeholder="https://ejemplo.com/mi-foto.png"
                    value={customAvatarUrl}
                    onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  />
                </div>
              </div>

              {/* Datos de Usuario */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Información del Usuario</h3>
                </div>

                <form onSubmit={handleSaveProfile} className="wb-profile-form">
                  <div className="wb-field-group">
                    <label htmlFor="profile-name">Nombre completo</label>
                    <input
                      id="profile-name"
                      type="text"
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wb-field-group">
                    <label htmlFor="profile-email">Correo electrónico</label>
                    <input
                      id="profile-email"
                      type="email"
                      value={profileEmail}
                      onChange={(e) => setProfileEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wb-field-group">
                    <label>Rol asignado</label>
                    <div className="wb-role-badge">
                      <span className="wb-role-dot" />
                      {user?.role || 'Developer Admin'}
                    </div>
                  </div>

                  <button type="submit" className="btn btn--primary btn--md wb-save-btn">
                    Guardar cambios de perfil
                  </button>
                </form>
              </div>

              {/* Cambiar Contraseña */}
              <div className="wb-settings-card">
                <div className="wb-card-heading">
                  <h3>Cambiar Contraseña</h3>
                  <p>Asegura tu cuenta actualizando tu clave de acceso.</p>
                </div>

                {passwordMsg.text && (
                  <div className={passwordMsg.type === 'error' ? 'wb-alert-error' : 'wb-alert-success'}>
                    {passwordMsg.type === 'error' ? '⚠ ' : '✓ '}
                    {passwordMsg.text}
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="wb-profile-form">
                  <div className="wb-field-group">
                    <label htmlFor="current-pass">Contraseña actual</label>
                    <input
                      id="current-pass"
                      type="password"
                      placeholder="••••••••"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>

                  <div className="wb-field-group">
                    <label htmlFor="new-pass">Nueva contraseña</label>
                    <input
                      id="new-pass"
                      type="password"
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="wb-field-group">
                    <label htmlFor="confirm-pass">Confirmar nueva contraseña</label>
                    <input
                      id="confirm-pass"
                      type="password"
                      placeholder="Repite la nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="btn btn--secondary btn--md wb-save-btn">
                    Actualizar contraseña
                  </button>
                </form>
              </div>

              {/* Cerrar Sesión */}
              <div className="wb-settings-card wb-logout-card">
                <div className="wb-card-heading">
                  <h3>Sesión activa</h3>
                  <p>Finaliza la sesión actual y regresa a la página inicial.</p>
                </div>
                <button
                  type="button"
                  className="btn-logout-full"
                  onClick={handleLogout}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                  Cerrar sesión
                </button>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ── Project Analysis Modal ────────────────────────────────────────── */}
      {analysisModal.isOpen && (
        <div className="wb-analysis-modal-overlay">
          <div className="wb-analysis-modal-card">
            {/* Hub Animation */}
            <div className="wb-analysis-hub">
              {analysisModal.status === 'analyzing' && (
                <>
                  <div className="wb-analysis-ring-outer" />
                  <div className="wb-analysis-ring-inner" />
                  <div className="wb-analysis-icon-center">
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="12 2 2 7 12 12 22 7 12 2" />
                      <polyline points="2 17 12 22 22 17" />
                      <polyline points="2 12 12 17 22 12" />
                    </svg>
                  </div>
                </>
              )}
              {analysisModal.status === 'success' && (
                <div className="wb-analysis-icon-center wb-success">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {analysisModal.status === 'error' && (
                <div className="wb-analysis-icon-center wb-error">
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="15" y1="9" x2="9" y2="15" />
                    <line x1="9" y1="9" x2="15" y2="15" />
                  </svg>
                </div>
              )}
            </div>

            {/* Title & Source */}
            <h3 className="wb-analysis-title">
              {analysisModal.status === 'analyzing' && 'Analizando proyecto…'}
              {analysisModal.status === 'success' && '¡Análisis completado!'}
              {analysisModal.status === 'error' && 'No se pudo completar el análisis'}
            </h3>

            <div className="wb-analysis-source-badge" title={analysisModal.targetName}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>{analysisModal.targetName}</span>
            </div>

            {/* Progress Bar (while analyzing) */}
            {analysisModal.status === 'analyzing' && (
              <div className="wb-analysis-progress-track">
                <div className="wb-analysis-progress-shimmer" />
              </div>
            )}

            {/* Steps Checklist */}
            <div className="wb-analysis-steps">
              <div className={`wb-analysis-step-item ${analysisModal.stepIndex > 0 || analysisModal.status === 'success' ? 'wb-analysis-step-item--done' : analysisModal.stepIndex === 0 ? 'wb-analysis-step-item--active' : 'wb-analysis-step-item--pending'}`}>
                <div className="wb-analysis-step-icon">
                  {analysisModal.stepIndex > 0 || analysisModal.status === 'success' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : analysisModal.stepIndex === 0 && analysisModal.status === 'analyzing' ? (
                    <div className="wb-step-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>
                  )}
                </div>
                <span>Lectura de archivos y configuración</span>
              </div>

              <div className={`wb-analysis-step-item ${analysisModal.stepIndex > 1 || analysisModal.status === 'success' ? 'wb-analysis-step-item--done' : analysisModal.stepIndex === 1 ? 'wb-analysis-step-item--active' : 'wb-analysis-step-item--pending'}`}>
                <div className="wb-analysis-step-icon">
                  {analysisModal.stepIndex > 1 || analysisModal.status === 'success' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : analysisModal.stepIndex === 1 && analysisModal.status === 'analyzing' ? (
                    <div className="wb-step-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>
                  )}
                </div>
                <span>Detección de rutas, métodos y controladores</span>
              </div>

              <div className={`wb-analysis-step-item ${analysisModal.status === 'success' ? 'wb-analysis-step-item--done' : analysisModal.stepIndex === 2 ? 'wb-analysis-step-item--active' : 'wb-analysis-step-item--pending'}`}>
                <div className="wb-analysis-step-icon">
                  {analysisModal.status === 'success' ? (
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#10b981" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : analysisModal.stepIndex === 2 && analysisModal.status === 'analyzing' ? (
                    <div className="wb-step-spinner" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="8" /></svg>
                  )}
                </div>
                <span>Generación de colecciones y requests en Api-Wallet</span>
              </div>
            </div>

            {/* Results / Error Box */}
            {analysisModal.status === 'success' && (
              <div className="wb-analysis-result-box wb-analysis-result-box--success">
                <strong>✓ {analysisModal.importedCount} endpoints importados</strong>
                <div>Organizados en {analysisModal.collectionsCount} colecciones por carpeta/módulo. Actualizando…</div>
              </div>
            )}

            {analysisModal.status === 'error' && (
              <>
                <div className="wb-analysis-result-box wb-analysis-result-box--error">
                  <strong>Error en la importación:</strong>
                  <div>{analysisModal.error}</div>
                </div>
                <button
                  type="button"
                  className="wb-analysis-btn-close"
                  onClick={() => setAnalysisModal((prev) => ({ ...prev, isOpen: false }))}
                >
                  Cerrar
                </button>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default SettingsDrawer;
