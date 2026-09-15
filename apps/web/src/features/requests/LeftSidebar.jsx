import { useState } from 'react';
import { useWorkspace } from '../workspaces/WorkspaceContext';
import './LeftSidebar.css';

function CollectionNode({ collection, collections, expandedFolders, toggleFolder, selectedApiId, activeView, onSelectApi, onOpenNewApiRequest, deleteApi, getMethodClass, onOpenContextMenu }) {
  const isExpanded = expandedFolders[collection.id] !== false;
  const children = collections.filter((item) => item.parentId === collection.id);

  return (
    <div className="wb-folder-group" key={collection.id}>
      <div className="wb-tree-item wb-tree-item--folder" onClick={() => toggleFolder(collection.id)} onContextMenu={(event) => { event.preventDefault(); onOpenContextMenu(event, collection, 'collection'); }}>
        <span className="wb-chevron-icon">
          <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s ease' }}>
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </span>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" className="wb-folder-icon">
          <path d="M22 19a2 2 0 0 1-2-2V7a2 2 0 0 0-2-2h-7l-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z" />
        </svg>
        <span className="wb-tree-label">{collection.name}</span>
        <span className="wb-count-badge">{collection.apis.length}</span>
      </div>

      {isExpanded && <div className="wb-folder-children">
        {collection.apis.length === 0 && children.length === 0 && <div className="wb-empty-folder"><span>Carpeta vacía</span><button type="button" className="wb-add-request-inline" onClick={(event) => { event.stopPropagation(); onOpenNewApiRequest(collection.id); }}>↗ Add request</button></div>}
        {collection.apis.map((api) => {
          const isSelected = selectedApiId === api.id && activeView === 'api-detail';
          return <div key={api.id} className={`wb-tree-item wb-tree-item--api ${isSelected ? 'wb-tree-item--selected' : ''}`} onClick={() => onSelectApi({ ...api, collectionAuthorization: collection.authorization, collectionPreRequestScript: collection.preRequestScript, collectionTestScript: collection.testScript })} onContextMenu={(event) => { event.preventDefault(); onOpenContextMenu(event, api, 'request'); }}>
            <span className={`wb-method-badge ${getMethodClass(api.method)}`}>{api.method}</span>
            <span className="wb-api-name" title={api.path}>{api.name}</span>
            <button type="button" className="wb-item-delete-btn" title="Eliminar este endpoint" onClick={(event) => { event.stopPropagation(); deleteApi(api.id); }}>✕</button>
          </div>;
        })}
        {children.map((child) => <CollectionNode key={child.id} collection={child} collections={collections} expandedFolders={expandedFolders} toggleFolder={toggleFolder} selectedApiId={selectedApiId} activeView={activeView} onSelectApi={onSelectApi} onOpenNewApiRequest={onOpenNewApiRequest} deleteApi={deleteApi} getMethodClass={getMethodClass} onOpenContextMenu={onOpenContextMenu} />)}
      </div>}
    </div>
  );
}

function LeftSidebar({
  activeView,
  setActiveView,
  selectedApiId,
  onSelectApi,
  onOpenNewApiRequest,
  onOpenNewCollection,
  onOpenNewKeyModal,
  onOpenFlowsView,
  onOpenContextMenu,
}) {
  const { collections, apiKeys, deleteApi, deleteCollection, flows } = useWorkspace();
  const [expandedFolders, setExpandedFolders] = useState({
    'col-auth': true,
    'col-admin': true,
    'col-trailers': true,
    'col-notices': false,
    'col-misc': true,
    'col-environments': true,
    'col-documents': true,
    'col-specs': true,
    'col-mocks': true,
    'col-datasets': true,
  });
  const [searchTerm, setSearchTerm] = useState('');

  const toggleFolder = (folderId) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderId]: !prev[folderId],
    }));
  };

  const getMethodClass = (method) => {
    switch (method?.toUpperCase()) {
      case 'GET':
        return 'method-tag--get';
      case 'POST':
        return 'method-tag--post';
      case 'PUT':
        return 'method-tag--put';
      case 'DELETE':
        return 'method-tag--delete';
      case 'PATCH':
        return 'method-tag--patch';
      default:
        return 'method-tag--get';
    }
  };

  // Filter collections and apis based on searchTerm
  const filteredCollections = collections
    .map((col) => {
      const matchCol = col.name.toLowerCase().includes(searchTerm.toLowerCase());
      const filteredApis = col.apis.filter(
        (api) =>
          api.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          api.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
          api.method.toLowerCase().includes(searchTerm.toLowerCase())
      );
      if (matchCol) return col;
      if (filteredApis.length > 0) return { ...col, apis: filteredApis };
      return null;
    })
    .filter(Boolean);

  const filteredKeys = apiKeys.filter(
    (k) =>
      k.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.environment.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="wb-sidebar">
      {/* Rail on far left */}
      <nav className="wb-rail" aria-label="Navegación lateral de módulos">
        <button
          type="button"
          className={`wb-rail-btn ${activeView === 'collections' || activeView === 'api-detail' ? 'wb-rail-btn--active' : ''}`}
          onClick={() => setActiveView('collections')}
          title="Colecciones y APIs"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
            <line x1="12" y1="22.08" x2="12" y2="12" />
          </svg>
          <span className="wb-rail-label">APIs</span>
        </button>

        <button
          type="button"
          className={`wb-rail-btn ${activeView === 'apikeys' ? 'wb-rail-btn--active' : ''}`}
          onClick={() => setActiveView('apikeys')}
          title="Gestión de API Keys"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z" />
            <circle cx="9.5" cy="9.5" r="1.2" fill="currentColor" />
          </svg>
          <span className="wb-rail-label">Keys</span>
        </button>

        <button
          type="button"
          className={`wb-rail-btn ${activeView === 'overview' ? 'wb-rail-btn--active' : ''}`}
          onClick={() => setActiveView('overview')}
          title="Vista General del Workspace"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <span className="wb-rail-label">Info</span>
        </button>

      </nav>

      {/* Main left drawer list */}
      <div className="wb-sidebar-panel">
        {/* Header of panel */}
        <div className="wb-sidebar-header">
          <div className="wb-sidebar-title-row">
            <span className="wb-sidebar-title">
              {activeView === 'apikeys' ? 'API KEYS' : 'COLLECTIONS'}
            </span>
            <div className="wb-sidebar-actions">
              {activeView === 'apikeys' ? (
                <button
                  type="button"
                  className="wb-action-icon-btn"
                  onClick={onOpenNewKeyModal}
                  title="Nueva API Key"
                >
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
              ) : (
                <>
                  <button type="button" className="wb-action-icon-btn" onClick={onOpenNewCollection} title="Nueva carpeta">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <line x1="12" y1="10" x2="12" y2="16" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                    </svg>
                  </button>
                  <button type="button" className="wb-action-icon-btn" onClick={() => onOpenNewApiRequest()} title="Nuevo Endpoint / API">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Search/Filter */}
          <div className="wb-sidebar-search">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder={activeView === 'apikeys' ? 'Filtrar claves...' : 'Buscar APIs o carpetas...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="wb-clear-search-btn"
                onClick={() => setSearchTerm('')}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Panel Content Tree */}
        <div className="wb-sidebar-tree">
          {activeView === 'apikeys' ? (
            /* API Keys List in Sidebar */
            <div className="wb-keys-sidebar-list">
              <div className="wb-tree-item wb-tree-item--root" onClick={() => setActiveView('apikeys')}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14.5 9.5a5 5 0 1 0-1.6 3.7l6.1 6.1a1.5 1.5 0 0 0 2.1 0l.2-.2a1.5 1.5 0 0 0 0-2.1l-1.1-1.1 1.1-1.1a1.5 1.5 0 0 0 0-2.1l-.2-.2a1.5 1.5 0 0 0-2.1 0l-1.1 1.1-1.8-1.8A5 5 0 0 0 14.5 9.5Z" />
                </svg>
                <span className="wb-tree-label">Todas las API Keys ({apiKeys.length})</span>
              </div>

              {filteredKeys.length === 0 ? (
                <div className="wb-empty-sidebar-msg">No hay claves encontradas.</div>
              ) : (
                filteredKeys.map((k) => (
                  <div
                    key={k.id}
                    className="wb-sidebar-key-card"
                    onClick={() => setActiveView('apikeys')}
                  >
                    <div className="wb-key-card-header">
                      <span className="wb-key-name">{k.name}</span>
                      <span className={`wb-key-env-badge ${k.environment === 'Producción' ? 'env-prod' : 'env-test'}`}>
                        {k.environment}
                      </span>
                    </div>
                    <span className="wb-key-preview">
                      {k.key ? `${k.key.substring(0, 10)}••••••••••` : `${k.prefix || 'sk_live'}_••••${k.lastFourCharacters || '••••'}`}
                    </span>
                  </div>
                ))
              )}

              <button
                type="button"
                className="wb-add-key-inline-btn"
                onClick={onOpenNewKeyModal}
              >
                + Generar nueva API Key
              </button>
            </div>
          ) : (
            /* Collections & Endpoints Tree */
            <div className="wb-collections-tree">
              {/* Workspace root folder link */}
              <div
                className={`wb-tree-item wb-tree-item--root ${activeView === 'overview' ? 'wb-tree-item--active' : ''}`}
                onClick={() => setActiveView('overview')}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
                <span className="wb-tree-label">My Collection</span>
                <span className="wb-count-badge">
                  {collections.reduce((acc, c) => acc + c.apis.length, 0)}
                </span>
              </div>

              {filteredCollections.length === 0 ? (
                <div className="wb-empty-sidebar-msg">
                  {collections.length === 0
                    ? 'No hay colecciones creadas.'
                    : 'Ningún endpoint coincide con la búsqueda.'}
                </div>
              ) : (
                filteredCollections.filter((collection) => !collection.parentId).map((col) => {
                  return (
                    <CollectionNode key={col.id} collection={col} collections={filteredCollections} expandedFolders={expandedFolders} toggleFolder={toggleFolder} selectedApiId={selectedApiId} activeView={activeView} onSelectApi={onSelectApi} onOpenNewApiRequest={onOpenNewApiRequest} deleteApi={deleteApi} getMethodClass={getMethodClass} onOpenContextMenu={onOpenContextMenu} />
                    /*
                      {/* Folder Title Item * /}
                      <div
                        className="wb-tree-item wb-tree-item--folder"
                        onClick={() => toggleFolder(col.id)}
                      >
                        <span className="wb-chevron-icon">
                          <svg
                            viewBox="0 0 24 24"
                            width="11"
                            height="11"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            style={{
                              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                              transition: 'transform 0.15s ease',
                            }}
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </span>
                        <svg
                          viewBox="0 0 24 24"
                          width="14"
                          height="14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="wb-folder-icon"
                        >
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                        </svg>
                        <span className="wb-tree-label">{col.name}</span>
                        <span className="wb-count-badge">{col.apis.length}</span>
                      </div>

                      {/* Endpoints in folder * /}
                      {isExpanded && (
                        <div className="wb-folder-children">
                          {col.apis.length === 0 ? (
                            <div className="wb-empty-folder">
                              <span>Carpeta vacía</span>
                              <button type="button" className="wb-add-request-inline" onClick={(event) => { event.stopPropagation(); onOpenNewApiRequest(col.id); }}>↗ Add request</button>
                              <button type="button" className="wb-add-request-inline" onClick={(event) => { event.stopPropagation(); onOpenNewApiRequest(col.id); }}>↗ Add request</button>
                            </div>
                          ) : (
                            col.apis.map((api) => {
                              const isSelected = selectedApiId === api.id && activeView === 'api-detail';
                              return (
                                <div
                                  key={api.id}
                                  className={`wb-tree-item wb-tree-item--api ${isSelected ? 'wb-tree-item--selected' : ''}`}
                                  onClick={() => onSelectApi({ ...api, collectionAuthorization: col.authorization, collectionPreRequestScript: col.preRequestScript, collectionTestScript: col.testScript })}
                                >
                                  <span className={`wb-method-badge ${getMethodClass(api.method)}`}>
                                    {api.method}
                                  </span>
                                  <span className="wb-api-name" title={api.path}>
                                    {api.name}
                                  </span>
                                  <button
                                    type="button"
                                    className="wb-item-delete-btn"
                                    title="Eliminar este endpoint"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteApi(api.id);
                                    }}
                                  >
                                    ✕
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div> */
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Bottom footer links */}
        <div className="wb-sidebar-footer">
          <div className="wb-footer-links">
            <button type="button" className={`wb-footer-link ${activeView === 'environments' ? 'wb-footer-link--active' : ''}`} onClick={() => setActiveView('environments')}>
              › ENVIRONMENTS
            </button>
            <button type="button" className={`wb-footer-link ${activeView === 'documents' ? 'wb-footer-link--active' : ''}`} onClick={() => setActiveView('documents')}>
              › DOCUMENTS
            </button>
            <button type="button" className={`wb-footer-link ${activeView === 'mocks' ? 'wb-footer-link--active' : ''}`} onClick={() => setActiveView('mocks')}>
              › MOCKS
            </button>
            <button type="button" className={`wb-footer-link ${activeView === 'datasets' ? 'wb-footer-link--active' : ''}`} onClick={() => setActiveView('datasets')}>
              › DATASETS
            </button>
            <button type="button" className={`wb-footer-link ${activeView === 'flows' ? 'wb-footer-link--active' : ''}`} onClick={() => onOpenFlowsView?.()}>
              › FLOWS ({flows.length})
            </button>
            <button type="button" className={`wb-footer-link ${activeView === 'history' ? 'wb-footer-link--active' : ''}`} onClick={() => setActiveView('history')}>
              › LINE HISTORY
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default LeftSidebar;
