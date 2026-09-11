import { createContext, useContext, useEffect, useState } from 'react';
import { PRIMARY_THEMES, ACCENT_COLORS } from './themeConstants';
import { useAuth } from '../auth/AuthContext';

export { PRIMARY_THEMES, ACCENT_COLORS };

const THEME_PREF_KEY = 'api-wallet-theme-prefs';
const WorkspaceContext = createContext(null);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [primaryTheme, setPrimaryTheme] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(THEME_PREF_KEY) || '{}').primaryTheme || 'dark';
    } catch {
      return 'dark';
    }
  });
  const [accentColor, setAccentColor] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(THEME_PREF_KEY) || '{}').accentColor || 'purple';
    } catch {
      return 'purple';
    }
  });
  const [accentHue, setAccentHue] = useState(() => {
    try {
      return Number(JSON.parse(localStorage.getItem(THEME_PREF_KEY) || '{}').accentHue) || 262;
    } catch {
      return 262;
    }
  });
  const [accentIntensity, setAccentIntensity] = useState(() => {
    try {
      return Number(JSON.parse(localStorage.getItem(THEME_PREF_KEY) || '{}').accentIntensity) || 100;
    } catch {
      return 100;
    }
  });
  const [collections, setCollections] = useState([]);
  const [projects, setProjects] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [flows, setFlows] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [workspaceDetails, setWorkspaceDetails] = useState(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState(null);
  const [consoleLogs, setConsoleLogs] = useState([
    { id: '1', type: 'info', text: 'API Wallet Console lista. Presiona Ctrl + J para abrir la terminal.', timestamp: new Date().toLocaleTimeString() }
  ]);

  const addConsoleLog = (log) => {
    const entry = typeof log === 'string'
      ? { id: String(Date.now() + Math.random()), type: 'info', text: log, timestamp: new Date().toLocaleTimeString() }
      : { id: String(Date.now() + Math.random()), type: 'info', timestamp: new Date().toLocaleTimeString(), ...log };
    setConsoleLogs((prev) => [...prev, entry]);
  };

  const clearConsoleLogs = () => setConsoleLogs([]);

  const loadWorkspace = async (workspaceId) => {
    const projectsResponse = await fetch(`${API_URL}/api/workspaces/${workspaceId}/projects`, { credentials: 'include' });
    if (!projectsResponse.ok) return;
    const projects = (await projectsResponse.json()).data;
    setProjects(projects);
    const project = projects[0];
    if (!project) { setActiveProjectId(null); setCollections([]); setApiKeys([]); setFlows([]); return; }
    setActiveProjectId(project.id);
    const [projectResponse, flowsResponse] = await Promise.all([fetch(`${API_URL}/api/projects/${project.id}`, { credentials: 'include' }), fetch(`${API_URL}/api/projects/${project.id}/flows`, { credentials: 'include' })]);
    if (projectResponse.ok) {
      const details = (await projectResponse.json()).data;
      setCollections((details.collections || []).map((collection) => ({ ...collection, apis: (collection.requests || []).map((request) => ({ ...request, collectionPreRequestScript: collection.preRequestScript || '', collectionTestScript: collection.testScript || '', collectionAuthorization: collection.authorization || {} })) })));
      setApiKeys(details.apiKeys || []);
      setEnvironments(details.environments || []);
    }
    if (flowsResponse.ok) setFlows(((await flowsResponse.json()).data || []).map((flow) => ({ ...flow, status: flow.status.toLowerCase(), targetType: flow.targetType === 'REQUEST' ? 'individual' : 'group', targetName: flow.request?.name || flow.collection?.name || '', frequency: `Cada ${flow.intervalMinutes} minutos`, lastRun: flow.lastRunAt ? new Date(flow.lastRunAt).toLocaleString() : 'Nunca', lastStatus: flow.lastStatusCode ? String(flow.lastStatusCode) : 'Pendiente', latency: flow.lastLatencyMs ? `${flow.lastLatencyMs} ms` : '--' })));
  };

  useEffect(() => {
    if (!isAuthenticated) { setWorkspaces([]); setProjects([]); setCollections([]); return; }
    fetch(`${API_URL}/api/workspaces`, { credentials: 'include' }).then(async (response) => {
      if (!response.ok) return;
      const items = (await response.json()).data || []; setWorkspaces(items);
      const preferredWorkspace = items.find((workspace) => (workspace._count?.projects || 0) > 0) || items[0];
      if (preferredWorkspace) { setActiveWorkspaceId(preferredWorkspace.id); setWorkspaceName(preferredWorkspace.name); await loadWorkspace(preferredWorkspace.id); const detailResponse = await fetch(`${API_URL}/api/workspaces/${preferredWorkspace.id}`, { credentials: 'include' }); if (detailResponse.ok) setWorkspaceDetails((await detailResponse.json()).data); }
    }).catch(() => {});
  }, [isAuthenticated]);

  useEffect(() => {
    const theme = PRIMARY_THEMES.find((item) => item.id === primaryTheme) || PRIMARY_THEMES[0];
    const accent = ACCENT_COLORS.find((item) => item.id === accentColor) || ACCENT_COLORS[0];
    const saturation = 30 + (accentIntensity * 0.55);
    const lightness = 70 - (accentIntensity * 0.15);
    const opacity = 0.35 + (accentIntensity * 0.0065);
    const accentValue = `hsla(${accentHue}, ${saturation}%, ${lightness}%, ${opacity})`;
    const accentHoverValue = `hsla(${accentHue}, ${saturation}%, ${Math.max(lightness - 8, 25)}%, ${opacity})`;
    const accentLightValue = `hsla(${accentHue}, ${saturation}%, ${theme.isDark ? 25 : 90}%, ${theme.isDark ? 0.45 : 0.3})`;
    const solidAccent = `hsl(${accentHue}, ${Math.min(95, Math.max(50, saturation))}%, ${Math.min(65, Math.max(38, lightness))}%)`;
    const root = document.documentElement;
    root.setAttribute('data-theme', theme.isDark ? 'dark' : 'light');
    root.setAttribute('data-workspace-theme', theme.id);
    root.setAttribute('data-workspace-accent', accent.id);
    root.style.setProperty('--color-background', theme.bg);
    root.style.setProperty('--color-surface', theme.surface);
    root.style.setProperty('--color-surface-alt', theme.surfaceAlt);
    root.style.setProperty('--color-border', theme.border);
    root.style.setProperty('--color-text', theme.text);
    root.style.setProperty('--color-primary', accentValue);
    root.style.setProperty('--color-primary-hover', accentHoverValue);
    root.style.setProperty('--color-primary-light', accentLightValue);
    root.style.setProperty('--logo-fill', solidAccent);

    // Update dynamic browser tab favicon with the workspace accent color
    try {
      const svgFavicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="${solidAccent}"/><rect x="7" y="14" width="26" height="18" rx="3" fill="white" opacity="0.18"/><rect x="7" y="14" width="26" height="18" rx="3" stroke="white" stroke-width="1.8"/><path d="M7 18h26V14a3 3 0 0 0-3-3H10a3 3 0 0 0-3 3v4z" fill="white" opacity="0.28"/><rect x="23" y="19" width="8" height="8" rx="2" fill="white" opacity="0.35"/><rect x="23" y="19" width="8" height="8" rx="2" stroke="white" stroke-width="1.2"/><circle cx="27" cy="23" r="1.5" fill="white"/><line x1="10" y1="21" x2="19" y2="21" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/><line x1="10" y1="24" x2="17" y2="24" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.6"/><line x1="10" y1="27" x2="15" y2="27" stroke="white" stroke-width="1.8" stroke-linecap="round" opacity="0.4"/></svg>`;
      const dataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgFavicon)}`;
      let link = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.type = 'image/svg+xml';
      link.href = dataUri;
    } catch {}

    localStorage.setItem(THEME_PREF_KEY, JSON.stringify({ primaryTheme: theme.id, accentColor: accent.id, accentHue, accentIntensity }));
  }, [primaryTheme, accentColor, accentHue, accentIntensity]);

  const addApi = async (collectionId, api) => {
    const response = await fetch(`${API_URL}/api/collections/${collectionId}/requests`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(api) });
    if (!response.ok) throw new Error((await response.json()).message || 'No se pudo crear la API');
    const created = (await response.json()).data;
    setCollections((items) => items.map((item) => item.id === collectionId
      ? { ...item, apis: [...(item.apis || []), created] }
      : item));
    return created;
  };
  const createBlankRequest = async (collectionId) => {
    const collection = collections.find((item) => item.id === collectionId);
    const existingNames = new Set((collection?.apis || []).map((item) => item.name));
    let suffix = 1;
    let name = `Request ${suffix}`;
    while (existingNames.has(name)) name = `Request ${++suffix}`;
    return addApi(collectionId, { name, method: 'GET', path: '/', url: '', description: '', headers: [], params: [], body: '' });
  };
  const updateApi = async (apiId, changes) => {
    const response = await fetch(`${API_URL}/api/requests/${apiId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo actualizar la API');
    setCollections((items) => items.map((collection) => ({ ...collection, apis: (collection.apis || []).map((api) => api.id === apiId ? result.data : api) })));
    return result.data;
  };
  const updateCollection = async (collectionId, changes) => {
    const response = await fetch(`${API_URL}/api/collections/${collectionId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo actualizar la colección');
    setCollections((items) => items.map((collection) => collection.id === collectionId ? { ...collection, ...result.data, apis: (collection.apis || []).map((request) => ({ ...request, collectionPreRequestScript: result.data.preRequestScript || '', collectionTestScript: result.data.testScript || '', collectionAuthorization: result.data.authorization || {} })) } : collection));
    return result.data;
  };
  const deleteApi = async (apiId) => {
    const response = await fetch(`${API_URL}/api/requests/${apiId}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo eliminar la API');
    setCollections((items) => items.map((item) => ({ ...item, apis: (item.apis || []).filter((api) => api.id !== apiId) })));
  };
  const addCollection = async (name, description, parentId = null) => {
    if (!activeProjectId) throw new Error('Selecciona un proyecto primero');
    const response = await fetch(`${API_URL}/api/projects/${activeProjectId}/collections`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, parentId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo crear la colección');
    const created = { ...result.data, apis: [] };
    setCollections((items) => [...items, created]);
    return created;
  };
  const createProject = async (name, description = '') => {
    if (!activeWorkspaceId) throw new Error('Selecciona un workspace primero');
    const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/projects`, {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo crear el proyecto');
    setProjects((items) => [result.data, ...items]);
    return result.data;
  };
  const deleteCollection = async (collectionId) => {
    const response = await fetch(`${API_URL}/api/collections/${collectionId}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo eliminar la colección');
    setCollections((items) => {
      const removed = new Set([collectionId]);
      let changed = true;
      while (changed) { changed = false; items.forEach((item) => { if (item.parentId && removed.has(item.parentId) && !removed.has(item.id)) { removed.add(item.id); changed = true; } }); }
      return items.filter((item) => !removed.has(item.id));
    });
  };
  const deleteAllApis = async () => {
    await Promise.all(collections.flatMap((collection) => (collection.apis || []).map((api) => deleteApi(api.id))));
  };
  const deleteProject = async () => {
    if (!activeProjectId) return;
    const response = await fetch(`${API_URL}/api/projects/${activeProjectId}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo eliminar el proyecto');
    setProjects((items) => items.filter((item) => item.id !== activeProjectId));
    await loadWorkspace(activeWorkspaceId);
  };
  const restoreDefaultWorkspace = async () => {
    if (!activeWorkspaceId) return;
    const current = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}/projects`, { credentials: 'include' });
    if (!current.ok) throw new Error('No se pudo recuperar el workspace');
    if (!(await current.json()).data.length) await createProject('Default Project', 'Proyecto inicial restaurado');
    await loadWorkspace(activeWorkspaceId);
  };
  const addApiKey = async ({ name, key: keyText, environment, scope }) => {
    if (!activeProjectId) throw new Error('Selecciona un proyecto primero');
    const response = await fetch(`${API_URL}/api/projects/${activeProjectId}/api-keys`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, key: keyText, prefix: environment === 'Staging / Dev' ? 'sk_test' : 'sk_live', scopes: [scope] }) });
    if (!response.ok) throw new Error((await response.json()).message || 'No se pudo crear la API key');
    const key = (await response.json()).data;
    setApiKeys((items) => [key, ...items]);
    return key;
  };
  const deleteApiKey = async (keyId) => {
    const response = await fetch(`${API_URL}/api/api-keys/${keyId}/revoke`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo revocar la API key');
    setApiKeys((items) => items.filter((item) => item.id !== keyId));
  };
  const regenerateInviteCode = async () => {
    if (!activeWorkspaceId) throw new Error('Selecciona un workspace primero');
    const response = await fetch(`${API_URL}/api/workspaces/${activeWorkspaceId}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ regenerateInviteCode: true }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo generar el código de invitación');
    setWorkspaceDetails(result.data);
    return result.data.inviteCode;
  };
  const createWorkspace = async ({ name, description }) => {
    const response = await fetch(`${API_URL}/api/workspaces`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'No se pudo crear el workspace');
    const workspace = result.data;
    setWorkspaces((items) => [workspace, ...items]);
    setActiveWorkspaceId(workspace.id); setWorkspaceName(workspace.name || ''); await loadWorkspace(workspace.id);
    return workspace;
  };
  const switchWorkspace = (id) => {
    const workspace = workspaces.find((item) => item.id === id);
    if (workspace) {
      setActiveWorkspaceId(id);
      setWorkspaceName(workspace.name || '');
      loadWorkspace(id);
      fetch(`${API_URL}/api/workspaces/${id}`, { credentials: 'include' }).then(async (response) => { if (response.ok) setWorkspaceDetails((await response.json()).data); }).catch(() => {});
    }
  };
  const createFlow = async (flow) => {
    if (!activeProjectId) throw new Error('Selecciona un proyecto primero');
    const collection = collections.find((item) => item.name === flow.targetName || item.id === flow.targetName);
    const request = collections.flatMap((item) => item.apis || []).find((item) => item.id === flow.targetName);
    const payload = flow.targetType === 'individual' ? { ...flow, targetType: 'REQUEST', requestId: request?.id } : { ...flow, targetType: 'COLLECTION', collectionId: collection?.id };
    const response = await fetch(`${API_URL}/api/projects/${activeProjectId}/flows`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!response.ok) throw new Error((await response.json()).message || 'No se pudo crear el flow');
    const created = (await response.json()).data;
    const normalized = { ...created, status: created.status.toLowerCase(), targetType: created.targetType === 'REQUEST' ? 'individual' : 'group', targetName: created.request?.name || created.collection?.name || flow.targetName, frequency: `Cada ${created.intervalMinutes} minutos`, lastRun: 'Nunca', lastStatus: 'Pendiente', latency: '--' };
    setFlows((items) => [normalized, ...items]);
    return normalized;
  };
  const toggleFlowStatus = async (id) => {
    const flow = flows.find((item) => item.id === id);
    if (!flow) return;
    const status = flow.status === 'active' ? 'PAUSED' : 'ACTIVE';
    const response = await fetch(`${API_URL}/api/flows/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!response.ok) throw new Error('No se pudo actualizar el flow');
    setFlows((items) => items.map((item) => item.id === id ? { ...item, status: status.toLowerCase() } : item));
  };
  const deleteFlow = async (id) => {
    const response = await fetch(`${API_URL}/api/flows/${id}`, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) throw new Error('No se pudo eliminar el flow');
    setFlows((items) => items.filter((flow) => flow.id !== id));
  };
  const runFlowNow = async (id) => {
    const response = await fetch(`${API_URL}/api/flows/${id}/run`, { method: 'POST', credentials: 'include' });
    if (!response.ok) throw new Error((await response.json()).message || 'No se pudo ejecutar el flow');
    await loadWorkspace(activeWorkspaceId);
    return (await response.json()).data;
  };

  return (
    <WorkspaceContext.Provider value={{
      primaryTheme, setPrimaryTheme, accentColor, setAccentColor, accentHue, setAccentHue, accentIntensity, setAccentIntensity,
      collections, apiKeys, workspaceName, setWorkspaceName, workspaces,
      projects, activeWorkspaceId, activeProjectId, createWorkspace, createProject, switchWorkspace, flows, environments, workspaceDetails, createFlow,
      toggleFlowStatus, deleteFlow, runFlowNow, addApi, createBlankRequest, deleteApi,
      addCollection, updateApi, updateCollection, deleteCollection, deleteAllApis, deleteProject,
      restoreDefaultWorkspace, addApiKey, deleteApiKey, regenerateInviteCode, consoleLogs, addConsoleLog, clearConsoleLogs,
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used within a WorkspaceProvider');
  return context;
}

export default WorkspaceContext;
