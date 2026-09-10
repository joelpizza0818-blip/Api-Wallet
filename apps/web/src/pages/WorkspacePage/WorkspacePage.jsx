import { useState } from 'react';
import FlowsView from '../../features/requests/FlowsView';
import { DocumentsView, EnvironmentsView, LineHistoryView, MocksView } from '../../features/workspaces/ArtifactViews';
import LeftSidebar from '../../features/requests/LeftSidebar';
import SettingsDrawer from '../../features/settings/SettingsDrawer';
import ApiKeysView from '../../features/secrets/ApiKeysView';
import WorkspaceOverview from '../../features/workspaces/WorkspaceOverview';
import TopBar from '../../features/workspaces/TopBar';
import {
  NewApiModal,
  NewKeyModal,
  NewFlowModal,
  ConfirmDeleteApisModal,
  ConfirmDeleteProjectModal,
} from '../../components/modals/Modals';
import './WorkspacePage.css';

function WorkspacePage() {
  // Navigation & view states
  const [activeView, setActiveView] = useState('overview');
  const [selectedApi, setSelectedApi] = useState(null);

  // Tabs for opened items (Postman style)
  const [openTabs, setOpenTabs] = useState([
    { id: 'tab-overview', title: 'My Collection', type: 'overview' },
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-overview');

  // Settings Drawer state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Modal dialog states
  const [isNewApiModalOpen, setIsNewApiModalOpen] = useState(false);
  const [isNewKeyModalOpen, setIsNewKeyModalOpen] = useState(false);
  const [isDeleteApisModalOpen, setIsDeleteApisModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [isNewFlowModalOpen, setIsNewFlowModalOpen] = useState(false);

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
    }
    setActiveTabId(`api-${api.id}`);
  };

  // Handler when a new API is created from the modal
  const handleApiCreated = (newApi) => {
    if (newApi) handleSelectApi(newApi);
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
      setSelectedApi(tab.data);
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

  return (
    <div className="wb-app-layout">
      {/* Top Navbar */}
      <TopBar
        isSettingsOpen={isSettingsOpen}
        onToggleSettings={() => setIsSettingsOpen(!isSettingsOpen)}
      />

      {/* Main App Work Area */}
      <div className="wb-main-container">
        {/* Left Sidebar */}
        <LeftSidebar
          activeView={activeView}
          setActiveView={handleSelectView}
          selectedApiId={selectedApi?.id}
          onSelectApi={handleSelectApi}
          onOpenNewApiModal={() => setIsNewApiModalOpen(true)}
          onOpenNewKeyModal={() => setIsNewKeyModalOpen(true)}
          onOpenFlowsView={handleSelectFlow}
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
              onClick={() => setIsNewApiModalOpen(true)}
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
                onNavigateKeys={() => handleSelectView('apikeys')}
                onOpenSettings={() => setIsSettingsOpen(true)}
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
            {activeView === 'documents' && <DocumentsView />}
            {activeView === 'mocks' && <MocksView />}
            {activeView === 'history' && <LineHistoryView />}
          </div>
        </main>
      </div>

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
      <NewApiModal
        isOpen={isNewApiModalOpen}
        onClose={() => setIsNewApiModalOpen(false)}
        onApiCreated={handleApiCreated}
      />

      <NewKeyModal
        isOpen={isNewKeyModalOpen}
        onClose={() => setIsNewKeyModalOpen(false)}
      />

      <NewFlowModal
        isOpen={isNewFlowModalOpen}
        onClose={() => setIsNewFlowModalOpen(false)}
      />

      <ConfirmDeleteApisModal
        isOpen={isDeleteApisModalOpen}
        onClose={() => setIsDeleteApisModalOpen(false)}
      />

      <ConfirmDeleteProjectModal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setIsDeleteProjectModalOpen(false)}
      />
    </div>
  );
}

export default WorkspacePage;
