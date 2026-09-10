import { createContext, useContext, useState, useEffect } from 'react';
import { PRIMARY_THEMES, ACCENT_COLORS } from './themeConstants';

export { PRIMARY_THEMES, ACCENT_COLORS };

const WORKSPACE_STORAGE_KEY = 'api-wallet-workspace-data';
const THEME_PREF_KEY = 'api-wallet-theme-prefs';

const INITIAL_COLLECTIONS = [
  {
    id: 'col-auth',
    name: 'Auth',
    description: 'Endpoints de autenticación y sesiones de usuario',
    apis: [
      {
        id: 'api-1',
        name: 'Login User',
        method: 'POST',
        path: '/api/v1/auth/login',
        description: 'Autenticación con email y contraseña, retorna JWT.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        body: '{\n  "email": "alex@apiwallet.io",\n  "password": "••••••••"\n}',
        status: '200 OK',
        responseSample: '{\n  "status": "success",\n  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",\n  "user": {\n    "id": "usr_99",\n    "name": "Alex Dev",\n    "email": "alex@apiwallet.io"\n  }\n}'
      },
      {
        id: 'api-2',
        name: 'Register Account',
        method: 'POST',
        path: '/api/v1/auth/register',
        description: 'Registro de nuevas cuentas de desarrolladores.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        body: '{\n  "name": "Alex Dev",\n  "email": "alex@apiwallet.io",\n  "password": "SuperSecret123!"\n}',
        status: '201 Created',
        responseSample: '{\n  "message": "Usuario creado exitosamente",\n  "id": "usr_102"\n}'
      },
      {
        id: 'api-3',
        name: 'Get Current Session',
        method: 'GET',
        path: '/api/v1/auth/me',
        description: 'Obtener datos del usuario activo.',
        headers: [{ key: 'Authorization', value: 'Bearer {{token}}' }],
        params: [],
        body: '',
        status: '200 OK',
        responseSample: '{\n  "id": "usr_99",\n  "name": "Alex Dev",\n  "role": "Admin",\n  "status": "active"\n}'
      }
    ]
  },
  {
    id: 'col-admin',
    name: 'Admin',
    description: 'Administración y métricas del sistema',
    apis: [
      {
        id: 'api-4',
        name: 'List All Users',
        method: 'GET',
        path: '/api/v1/admin/users',
        description: 'Lista paginada de todos los usuarios registrados.',
        headers: [{ key: 'X-Admin-Key', value: '{{admin_secret}}' }],
        params: [{ key: 'page', value: '1' }, { key: 'limit', value: '20' }],
        body: '',
        status: '200 OK',
        responseSample: '{\n  "total": 128,\n  "page": 1,\n  "users": [\n    { "id": 1, "email": "alex@apiwallet.io" },\n    { "id": 2, "email": "dev2@apiwallet.io" }\n  ]\n}'
      },
      {
        id: 'api-5',
        name: 'System Metrics',
        method: 'GET',
        path: '/api/v1/admin/metrics',
        description: 'Estadísticas de consumo de API y latencia.',
        headers: [],
        params: [],
        body: '',
        status: '200 OK',
        responseSample: '{\n  "uptime": "99.98%",\n  "requests_24h": 452901,\n  "avg_latency_ms": 38\n}'
      }
    ]
  },
  {
    id: 'col-trailers',
    name: 'Trailers',
    description: 'Servicios de streaming y catálogo de trailers',
    apis: [
      {
        id: 'api-6',
        name: 'Trailers Feed',
        method: 'GET',
        path: '/api/v1/trailers/feed',
        description: 'Obtiene el listado más reciente de trailers destacados.',
        headers: [],
        params: [{ key: 'genre', value: 'action' }],
        body: '',
        status: '200 OK',
        responseSample: '[\n  { "id": 101, "title": "Cyber City 2099", "duration": "2m 14s", "quality": "4K" },\n  { "id": 102, "title": "Deep Ocean", "duration": "1m 45s", "quality": "1080p" }\n]'
      },
      {
        id: 'api-7',
        name: 'Upload Trailer',
        method: 'POST',
        path: '/api/v1/trailers/create',
        description: 'Publica un nuevo trailer multimedia en la plataforma.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        body: '{\n  "title": "Neon Horizon",\n  "video_url": "https://cdn.apiwallet.io/trailers/103.mp4",\n  "category": "Sci-Fi"\n}',
        status: '201 Created',
        responseSample: '{\n  "status": "published",\n  "trailer_id": "trl_5521",\n  "cdn_url": "https://cdn.apiwallet.io/trailers/103.mp4"\n}'
      }
    ]
  },
  {
    id: 'col-notices',
    name: 'Notices',
    description: 'Notificaciones y avisos del sistema',
    apis: [
      {
        id: 'api-8',
        name: 'Broadcast Notice',
        method: 'POST',
        path: '/api/v1/notices/broadcast',
        description: 'Envía un aviso global a todos los clientes conectados.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        body: '{\n  "type": "maintenance",\n  "message": "Mantenimiento programado a las 02:00 UTC"\n}',
        status: '200 OK',
        responseSample: '{\n  "delivered_to": 18420,\n  "scheduled_at": "2026-09-10T02:00:00Z"\n}'
      }
    ]
  },
  {
    id: 'col-misc',
    name: 'Misc',
    description: 'Utilidades varias, ping y comprobaciones de salud',
    apis: [
      {
        id: 'api-9',
        name: 'Get data',
        method: 'GET',
        path: '/api/v1/misc/data',
        description: 'Comprobación de conectividad y estado básico.',
        headers: [],
        params: [],
        body: '',
        status: '200 OK',
        responseSample: '{\n  "status": "healthy",\n  "version": "v1.4.2",\n  "timestamp": "2026-09-09T17:30:00Z"\n}'
      },
      {
        id: 'api-10',
        name: 'Post data',
        method: 'POST',
        path: '/api/v1/misc/echo',
        description: 'Echo de prueba para validar payload y headers.',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
        params: [],
        body: '{\n  "message": "Hola API-Wallet",\n  "timestamp": 1788996159\n}',
        status: '200 OK',
        responseSample: '{\n  "received": true,\n  "echo": {\n    "message": "Hola API-Wallet",\n    "timestamp": 1788996159\n  }\n}'
      }
    ]
  }
];

const INITIAL_API_KEYS = [
  {
    id: 'key-prod-01',
    name: 'Producción Server API Key',
    key: 'demo_live_9f82c4e1a0b3491ca0f42398dce7412b',
    scope: 'Full Access (Read/Write)',
    environment: 'Producción',
    created: '12 Ago 2026',
    lastUsed: 'Hace 5 minutos',
    status: 'active'
  },
  {
    id: 'key-dev-02',
    name: 'Mobile SDK Client Key',
    key: 'demo_live_1d44bc807e12480fa7b63290e1a89c3f',
    scope: 'Read Only',
    environment: 'Producción',
    created: '25 Ago 2026',
    lastUsed: 'Hace 2 horas',
    status: 'active'
  },
  {
    id: 'key-test-03',
    name: 'Testing & CI/CD Pipeline',
    key: 'demo_test_7a19ff33b8a14b5190d740c0f825e981',
    scope: 'Restricted (Auth & Misc)',
    environment: 'Staging / Dev',
    created: '01 Sep 2026',
    lastUsed: 'Ayer',
    status: 'active'
  }
];

const INITIAL_WORKSPACES = [
  { id: 'ws-default', name: 'Default workspace', description: 'Workspace principal de desarrollo y pruebas', isDefault: true, createdAt: 'Mayo 2026' },
  { id: 'ws-mobile', name: 'Mobile API Workspace', description: 'Endpoints optimizados para iOS y Android', isDefault: false, createdAt: 'Junio 2026' },
  { id: 'ws-payments', name: 'Payments & Billing Core', description: 'Microservicios de transacciones financieras', isDefault: false, createdAt: 'Julio 2026' },
];

const INITIAL_FLOWS = [
  {
    id: 'flow-1',
    name: 'Auth Health Monitor',
    targetType: 'group',
    targetName: 'Auth Collection (3 APIs)',
    frequency: 'Cada 1 hora',
    intervalMinutes: 60,
    status: 'active',
    lastRun: 'Hace 12 min',
    lastStatus: '200 OK',
    latency: '34 ms',
    successRate: '99.9%',
    runsCount: 1420,
    notifyOnError: true,
  },
  {
    id: 'flow-2',
    name: 'Trailers Feed CDN Check',
    targetType: 'individual',
    targetName: 'GET /api/v1/trailers/feed',
    frequency: 'Cada 2 horas',
    intervalMinutes: 120,
    status: 'active',
    lastRun: 'Hace 45 min',
    lastStatus: '200 OK',
    latency: '48 ms',
    successRate: '100%',
    runsCount: 710,
    notifyOnError: true,
  },
  {
    id: 'flow-3',
    name: 'Admin Metrics Heartbeat',
    targetType: 'individual',
    targetName: 'GET /api/v1/admin/metrics',
    frequency: 'Cada 30 minutos',
    intervalMinutes: 30,
    status: 'paused',
    lastRun: 'Ayer',
    lastStatus: '200 OK',
    latency: '29 ms',
    successRate: '98.5%',
    runsCount: 380,
    notifyOnError: false,
  },
];

const WorkspaceContext = createContext(null);

export function WorkspaceProvider({ children }) {
  // Theme & color customization
  const [primaryTheme, setPrimaryTheme] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_PREF_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.primaryTheme || 'dark';
      }
    } catch {}
    return 'dark';
  });

  const [accentColor, setAccentColor] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_PREF_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.accentColor || 'purple';
      }
    } catch {}
    return 'purple';
  });

  // Collections and API Keys data
  const [collections, setCollections] = useState(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.collections || INITIAL_COLLECTIONS;
      }
    } catch {}
    return INITIAL_COLLECTIONS;
  });

  const [apiKeys, setApiKeys] = useState(() => {
    try {
      const saved = localStorage.getItem(WORKSPACE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.apiKeys || INITIAL_API_KEYS;
      }
    } catch {}
    return INITIAL_API_KEYS;
  });

  const [workspaceName, setWorkspaceName] = useState('Default workspace');

  // Workspaces list
  const [workspaces, setWorkspaces] = useState(() => {
    try {
      const saved = localStorage.getItem('api-wallet-workspaces-list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_WORKSPACES;
  });

  const [activeWorkspaceId, setActiveWorkspaceId] = useState('ws-default');

  // Flows list (for automated scheduled API execution & monitoring)
  const [flows, setFlows] = useState(() => {
    try {
      const saved = localStorage.getItem('api-wallet-flows-list');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_FLOWS;
  });

  // Persist workspaces and flows
  useEffect(() => {
    try {
      localStorage.setItem('api-wallet-workspaces-list', JSON.stringify(workspaces));
      localStorage.setItem('api-wallet-flows-list', JSON.stringify(flows));
    } catch (e) {
      console.error(e);
    }
  }, [workspaces, flows]);

  // Apply theme variables dynamically to document
  useEffect(() => {
    const themeObj = PRIMARY_THEMES.find((t) => t.id === primaryTheme) || PRIMARY_THEMES[0];
    const accentObj = ACCENT_COLORS.find((a) => a.id === accentColor) || ACCENT_COLORS[0];

    const root = document.documentElement;

    root.setAttribute('data-theme', themeObj.isDark ? 'dark' : 'light');
    root.setAttribute('data-workspace-theme', themeObj.id);
    root.setAttribute('data-workspace-accent', accentObj.id);

    // Apply primary colors
    root.style.setProperty('--color-background', themeObj.bg);
    root.style.setProperty('--color-surface', themeObj.surface);
    root.style.setProperty('--color-surface-alt', themeObj.surfaceAlt);
    root.style.setProperty('--color-border', themeObj.border);
    root.style.setProperty('--color-text', themeObj.text);

    // Apply accent colors
    root.style.setProperty('--color-primary', accentObj.primary);
    root.style.setProperty('--color-primary-hover', accentObj.hover);
    root.style.setProperty('--color-primary-light', themeObj.isDark ? accentObj.light : accentObj.lightBg);

    try {
      localStorage.setItem(
        THEME_PREF_KEY,
        JSON.stringify({ primaryTheme: themeObj.id, accentColor: accentObj.id })
      );
    } catch (e) {
      console.error(e);
    }
  }, [primaryTheme, accentColor]);

  // Persist collections and apiKeys
  useEffect(() => {
    try {
      localStorage.setItem(
        WORKSPACE_STORAGE_KEY,
        JSON.stringify({ collections, apiKeys, workspaceName })
      );
    } catch (e) {
      console.error(e);
    }
  }, [collections, apiKeys, workspaceName]);

  // API management
  const addApi = (collectionId, newApi) => {
    const apiToAdd = {
      id: `api-${Date.now()}`,
      name: newApi.name || 'Nuevo Endpoint',
      method: newApi.method || 'GET',
      path: newApi.path || '/api/v1/endpoint',
      description: newApi.description || '',
      headers: newApi.headers || [],
      params: newApi.params || [],
      body: newApi.body || '',
      status: '200 OK',
      responseSample: '{\n  "message": "Petición simulada exitosa"\n}',
    };

    setCollections((prev) =>
      prev.map((col) => {
        if (col.id === collectionId) {
          return { ...col, apis: [...col.apis, apiToAdd] };
        }
        return col;
      })
    );
    return apiToAdd;
  };

  const deleteApi = (apiId) => {
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        apis: col.apis.filter((api) => api.id !== apiId),
      }))
    );
  };

  const addCollection = (name, description) => {
    const newCol = {
      id: `col-${Date.now()}`,
      name: name || 'Nueva Colección',
      description: description || '',
      apis: [],
    };
    setCollections((prev) => [...prev, newCol]);
    return newCol;
  };

  const deleteCollection = (collectionId) => {
    setCollections((prev) => prev.filter((col) => col.id !== collectionId));
  };

  // Danger zone: Borrar APIs
  const deleteAllApis = () => {
    setCollections((prev) =>
      prev.map((col) => ({
        ...col,
        apis: [],
      }))
    );
  };

  // Danger zone: Borrar proyecto completo
  const deleteProject = () => {
    setCollections([]);
    setApiKeys([]);
    setWorkspaceName('Workspace Vacío');
  };

  // Reset to initial demo data
  const restoreDefaultWorkspace = () => {
    setCollections(INITIAL_COLLECTIONS);
    setApiKeys(INITIAL_API_KEYS);
    setWorkspaceName('Default workspace');
  };

  // API Keys management
  const addApiKey = ({ name, scope, environment }) => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const prefix = environment === 'Staging / Dev' ? 'sk_test_' : 'sk_live_';

    const newKey = {
      id: `key-${Date.now()}`,
      name: name || 'Nueva API Key',
      key: `${prefix}${randomHex}`,
      scope: scope || 'Full Access (Read/Write)',
      environment: environment || 'Producción',
      created: 'Hoy',
      lastUsed: 'Nunca',
      status: 'active',
    };

    setApiKeys((prev) => [newKey, ...prev]);
    return newKey;
  };

  const deleteApiKey = (keyId) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
  };

  // Workspace Switcher and Creation
  const createWorkspace = ({ name, description }) => {
    const newWs = {
      id: `ws-${Date.now()}`,
      name: name || 'Nuevo Workspace',
      description: description || '',
      isDefault: false,
      createdAt: 'Hoy',
    };
    setWorkspaces((prev) => [...prev, newWs]);
    setActiveWorkspaceId(newWs.id);
    setWorkspaceName(newWs.name);
    return newWs;
  };

  const switchWorkspace = (id) => {
    const target = workspaces.find((w) => w.id === id);
    if (target) {
      setActiveWorkspaceId(target.id);
      setWorkspaceName(target.name);
    }
  };

  // Flows Management (Scheduling & Monitoring)
  const createFlow = (flowData) => {
    const newFlow = {
      id: `flow-${Date.now()}`,
      name: flowData.name || 'Nuevo Flow',
      targetType: flowData.targetType || 'group',
      targetName: flowData.targetName || 'Colección Completa',
      frequency: flowData.frequency || 'Cada 1 hora',
      intervalMinutes: flowData.intervalMinutes || 60,
      status: 'active',
      lastRun: 'Nunca',
      lastStatus: 'Pendiente',
      latency: '--',
      successRate: '100%',
      runsCount: 0,
      notifyOnError: flowData.notifyOnError !== false,
    };
    setFlows((prev) => [newFlow, ...prev]);
    return newFlow;
  };

  const toggleFlowStatus = (id) => {
    setFlows((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: f.status === 'active' ? 'paused' : 'active' } : f))
    );
  };

  const deleteFlow = (id) => {
    setFlows((prev) => prev.filter((f) => f.id !== id));
  };

  const runFlowNow = (id) => {
    const simulatedLatency = `${Math.floor(Math.random() * 35) + 20} ms`;
    setFlows((prev) =>
      prev.map((f) =>
        f.id === id
          ? {
              ...f,
              lastRun: 'Hace unos segundos',
              lastStatus: '200 OK',
              latency: simulatedLatency,
              runsCount: f.runsCount + 1,
            }
          : f
      )
    );
  };

  return (
    <WorkspaceContext.Provider
      value={{
        primaryTheme,
        setPrimaryTheme,
        accentColor,
        setAccentColor,
        collections,
        apiKeys,
        workspaceName,
        setWorkspaceName,
        workspaces,
        activeWorkspaceId,
        createWorkspace,
        switchWorkspace,
        flows,
        createFlow,
        toggleFlowStatus,
        deleteFlow,
        runFlowNow,
        addApi,
        deleteApi,
        addCollection,
        deleteCollection,
        deleteAllApis,
        deleteProject,
        restoreDefaultWorkspace,
        addApiKey,
        deleteApiKey,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}

export default WorkspaceContext;
