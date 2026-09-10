import { useState, useEffect } from 'react';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import FlowsView from '../../features/requests/FlowsView';
import { CollectionsView, DocumentsView, EnvironmentsView, LineHistoryView, MocksView } from '../../features/workspaces/ArtifactViewsPro';
import LeftSidebar from '../../features/requests/LeftSidebar';
import SettingsDrawer from '../../features/settings/SettingsDrawer';
import ApiKeysView from '../../features/secrets/ApiKeysView';
import WorkspaceOverview from '../../features/workspaces/WorkspaceOverview';
import ApiInspector from '../../features/requests/ApiInspector';
import TopBar from '../../features/workspaces/TopBar';
import TerminalDrawer from '../../components/common/TerminalDrawer/TerminalDrawer';
import { useWorkspace } from '../../features/workspaces/WorkspaceContext';
import {
  NewKeyModal,
  NewCollectionModal,
  EditResourceModal,
  NewFlowModal,
  ConfirmDeleteApisModal,
  ConfirmDeleteProjectModal,
  NewWorkspaceModal,
} from '../../components/modals/Modals';
import './WorkspacePage.css';

function WorkspacePage() {
  const { collections, addCollection, createBlankRequest, deleteApi, deleteCollection } = useWorkspace();
  const { notify, confirm } = useFeedback();
  // Navigation & view states
  const [activeView, setActiveView] = useState('overview');
  const [selectedApi, setSelectedApi] = useState(null);

  // Tabs for opened items (Postman style)
  const [openTabs, setOpenTabs] = useState([
    { id: 'tab-overview', title: 'My Collection', type: 'overview' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-overview');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setIsTerminalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Modal dialog states
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [isNewCollectionModalOpen, setIsNewCollectionModalOpen] = useState(false);
  const [isDeleteApisModalOpen, setIsDeleteApisModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);
  const [isNewWorkspaceModalOpen, setIsNewWorkspaceModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState(null);
  const [editingResource, setEditingResource] = useState(null);

  // Handler to select an API from left sidebar or overview
  const handleSelectApi = (api) => {
    setSelectedApi(api);
    setActiveView('api-detail');

    const existingTab = openTabs.find((t) => t.id === `api-${api.id}`);
    if (!existingTab) {
      setOpenTabs((prev) => [
        ...prev,
        { id: `api-${api.id}`, title: api.name, method: api.method, type: 'api-detail', data: api },
      ]);
    } else {
      setOpenTabs((prev) =>
        prev.map((t) =>
          t.id === `api-${api.id}`
            ? { ...t, title: api.name, method: api.method, data: api }
            : t
        )
      );
    }
    setActiveTabId(`api-${api.id}`);
  };

  const handleCreateRequest = async (collectionId = collections[0]?.id) => {
    try {
      let targetCollectionId = collectionId;
      if (!targetCollectionId) {
        const createdCollection = await addCollection('My Collection', 'Requests del workspace');
        targetCollectionId = createdCollection.id;
      }
      const created = await createBlankRequest(targetCollectionId);
      handleSelectApi(created);
    } catch (error) {
      notify(error.message || 'No se pudo crear la request.', 'error');
    }
  };

  // Flow view handler
  const handleSelectFlow = () => {
    setActiveView('flows');
    const existingTab = openTabs.find((t) => t.type === 'flows');
    if (!existingTab) {
      setOpenTabs((prev) => [...prev, { id: 'tab-flows', title: 'Flows', type: 'flows' }]);
      setActiveTabId('tab-flows');
    } else {
      setActiveTabId(existingTab.id);
    }
  };

  // Generic view selector – ensures a tab exists for each view
  const handleSelectView = (viewName) => {
    if (viewName === 'flows') {
      handleSelectFlow();
      return;
    }

    setActiveView(viewName);

    const typeToTab = {
      overview: { id: 'tab-overview', title: 'My Collection', type: 'overview' },
      apikeys:  { id: 'tab-apikeys',  title: 'API Keys',      type: 'apikeys'  },
      environments: { id: 'tab-environments', title: 'Entornos', type: 'environments' },
      documents: { id: 'tab-documents', title: 'Documentos', type: 'documents' },
      mocks: { id: 'tab-mocks', title: 'Mocks', type: 'mocks' },
      history: { id: 'tab-history', title: 'Line History', type: 'history' },
    };

    const tabDef = typeToTab[viewName];
    if (!tabDef) return;

    const existing = openTabs.find((t) => t.type === viewName);
    if (existing) {
      setActiveTabId(existing.id);
    } else {
      setOpenTabs((prev) => [...prev, tabDef]);
      setActiveTabId(tabDef.id);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTabId(tab.id);
    setActiveView(tab.type);
    if (tab.type === 'api-detail') {
      const freshApi = collections
        .flatMap((col) => col.apis || [])
        .find((a) => a.id === tab.data?.id);
      setSelectedApi(freshApi || tab.data);
    }
  };

  const handleCloseTab = (e, tabId) => {
    e.stopPropagation();
    const filtered = openTabs.filter((t) => t.id !== tabId);
    setOpenTabs(filtered);

    if (activeTabId === tabId) {
      if (filtered.length > 0) {
        const last = filtered[filtered.length - 1];
        setActiveTabId(last.id);
        setActiveView(last.type);
        if (last.type === 'api-detail') setSelectedApi(last.data);
      } else {
        setActiveView('overview');
      }
    }
  };

  const handleContextMenu = (event, item, kind) => setContextMenu({ x: event.clientX, y: event.clientY, item, kind });
  const closeContextMenu = () => setContextMenu(null);
  const handleDeleteResource = async () => {
    if (!contextMenu) return;
    const { item, kind } = contextMenu;
    const accepted = await confirm({ title: kind === 'collection' ? 'Eliminar carpeta' : 'Eliminar request', message: kind === 'collection' ? `Se eliminará "${item.name}" y su contenido.` : `Se eliminará "${item.name}" permanentemente.`, confirmLabel: 'Eliminar' });
    if (!accepted) return;
    try {
      if (kind === 'collection') await deleteCollection(item.id);
      else await deleteApi(item.id);
      notify(kind === 'collection' ? 'Carpeta eliminada.' : 'Request eliminada.');
    } catch (error) { notify(error.message || 'No se pudo eliminar.', 'error'); }
    closeContextMenu();
  };

  return (
    <div className="wb-app-layout">
      {/* Top Navbar */}
      <TopBar
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
        onOpenNewWorkspaceModal={() => setIsNewWorkspaceModalOpen(true)}
      />

      {/* Main App Work Area */}
      <div className="wb-main-container">
        {/* Left Sidebar */}
        <LeftSidebar
          activeView={activeView}
          setActiveView={handleSelectView}
          selectedApiId={selectedApi?.id}
          onSelectApi={handleSelectApi}
          onOpenNewApiRequest={handleCreateRequest}
          onOpenNewCollection={() => setIsNewCollectionModalOpen(true)}
          onOpenNewKeyModal={() => setIsNewKeyModalOpen(true)}
          onOpenFlowsView={handleSelectFlow}
          onOpenContextMenu={handleContextMenu}
        />

        {/* Center Canvas Area */}
        <main className="wb-canvas">
          {/* Postman-like Top Tab Bar */}
          <div className="wb-tabs-bar">
            {openTabs.map((tab) => {
              const isActive = activeTabId === tab.id;
              return (
                <div
                  key={tab.id}
                  className={`wb-editor-tab ${isActive ? 'wb-editor-tab--active' : ''}`}
                  onClick={() => handleTabClick(tab)}
                >
                  {tab.method && (
                    <span className={`wb-tab-method-tag tag--${tab.method.toLowerCase()}`}>
                      {tab.method}
                    </span>
                  )}
                  <span className="wb-tab-title">{tab.title}</span>
                  <button
                    type="button"
                    className="wb-tab-close"
                    onClick={(e) => handleCloseTab(e, tab.id)}
                    title="Cerrar pestaña"
                  >
                    ✕
                  </button>
                </div>
              );
            })}

            <button
              type="button"
              className="wb-new-tab-btn"
              onClick={() => handleCreateRequest()}
              title="Nueva Petición / Endpoint"
            >
              +
            </button>
          </div>

          {/* Canvas View Switcher */}
          <div className="wb-canvas-content">
            {activeView === 'overview' && (
              <WorkspaceOverview
                onNavigateApis={() => handleSelectView('collections')}
                onNavigateDocs={() => handleSelectView('documents')}
                onNavigateFlows={() => handleSelectView('flows')}
                onNavigateKeys={() => handleSelectView('apikeys')}
                onOpenSettings={() => setIsSettingsOpen(true)}
                onOpenNewFlowModal={() => setIsNewFlowModalOpen(true)}
              />
            )}

            {activeView === 'apikeys' && (
              <ApiKeysView
                onOpenNewKeyModal={() => setIsNewKeyModalOpen(true)}
              />
            )}

            {activeView === 'flows' && (
              <FlowsView onOpenNewFlowModal={() => setIsNewFlowModalOpen(true)} />
            )}

            {activeView === 'environments' && <EnvironmentsView />}
            {activeView === 'collections' && <CollectionsView onSelectApi={handleSelectApi} />}
            {activeView === 'documents' && <DocumentsView />}
            {activeView === 'mocks' && <MocksView />}
            {activeView === 'history' && <LineHistoryView />}
            {activeView === 'api-detail' && selectedApi && <ApiInspector key={selectedApi.id} api={selectedApi} />}
          </div>
        </main>
      </div>

      {contextMenu && <div className="wb-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }} role="menu" onMouseLeave={closeContextMenu}>
        <button type="button" onClick={() => { setEditingResource(contextMenu); closeContextMenu(); }}>✎ {contextMenu.kind === 'collection' ? 'Editar carpeta' : 'Renombrar request'}</button>
        {contextMenu.kind === 'request' && <button type="button" onClick={() => { handleSelectApi(contextMenu.item); closeContextMenu(); }}>⚙ Editar request</button>}
        <button type="button" className="wb-context-menu-danger" onClick={handleDeleteResource}>⌫ Borrar</button>
      </div>}

      {/* Right Settings Drawer */}
      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onConfirmDeleteApis={() => {
          setIsSettingsOpen(false);
          setIsDeleteApisModalOpen(true);
        }}
        onConfirmDeleteProject={() => {
          setIsSettingsOpen(false);
          setIsDeleteProjectModalOpen(true);
        }}
      />

      {/* Modals */}
      <NewKeyModal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
      />

      <NewCollectionModal
        isOpen={isNewCollectionModalOpen}
        onClose={() => setIsNewCollectionModalOpen(false)}
      />

      <EditResourceModal
        isOpen={!!editingResource}
        item={editingResource?.item}
        kind={editingResource?.kind}
        collections={collections}
        onClose={() => setEditingResource(null)}
      />

      <NewFlowModal
        isOpen={isNewFlowModalOpen}
        onClose={() => setIsNewFlowModalOpen(false)}
      />

      <NewWorkspaceModal
        isOpen={isNewWorkspaceModalOpen}
        onClose={() => setIsNewWorkspaceModalOpen(false)}
      />

      <ConfirmDeleteApisModal
        isOpen={isDeleteApisModalOpen}
        onClose={() => setIsDeleteApisModalOpen(false)}
      />

      <ConfirmDeleteProjectModal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setIsDeleteProjectModalOpen(false)}
      />

      {/* Bottom Status Bar */}
      <div className="wb-bottom-bar">
        <div className="wb-bottom-bar-left">
          <button
            type="button"
            className={`wb-bottom-bar-btn ${isTerminalOpen ? 'wb-bottom-bar-btn--active' : ''}`}
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            title="Abrir terminal / consola (Ctrl+J)"
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
            <span>Terminal &amp; Consola</span>
            <kbd className="wb-kbd-badge">Ctrl+J</kbd>
          </button>
          <span className="wb-status-indicator">
            <span className="wb-status-dot" />
            All systems are go!
          </span>
        </div>
        <div className="wb-bottom-bar-right">
          <span className="wb-bottom-stat">Globals</span>
          <span className="wb-bottom-stat">Vault</span>
          <span className="wb-bottom-stat">v1.0.0</span>
        </div>
      </div>

      <TerminalDrawer isOpen={isTerminalOpen} onClose={() => setIsTerminalOpen(false)} />
    </div>
  );
}

export default WorkspacePage;
