import { useEffect, useState } from 'react';
import { useWorkspace } from '../../features/workspaces/WorkspaceContext';
import { useFeedback } from '../common/Feedback/FeedbackContext';
import './Modals.css';

export function NewApiModal({ isOpen, onClose, onApiCreated, initialCollectionId }) {
  const { collections, addApi } = useWorkspace();
  const [name, setName] = useState('');
  const [collectionId, setCollectionId] = useState(collections[0]?.id || 'col-auth');
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/v1/');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (initialCollectionId) setCollectionId(initialCollectionId);
    else if (collections[0]) setCollectionId(collections[0].id);
  }, [initialCollectionId, collections]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !collectionId || !collections.some((collection) => collection.id === collectionId)) return;
    const createdApi = await addApi(collectionId, {
      name,
      method,
      path,
      description,
    });
    onApiCreated(createdApi);
    onClose();
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3>Nuevo Endpoint / API</h3>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-modal-form">
          <div className="wb-form-row">
            <label>Nombre del Endpoint</label>
            <input
              type="text"
              placeholder="p. ej. Get User Profile"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="wb-form-row-group">
            <div className="wb-form-row">
              <label>Método HTTP</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>

            <div className="wb-form-row">
              <label>Colección de destino</label>
              <select value={collectionId} onChange={(e) => setCollectionId(e.target.value)}>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="wb-form-row">
            <label>Ruta / Path relativo</label>
            <input
              type="text"
              placeholder="/api/v1/users/me"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              required
            />
          </div>

          <div className="wb-form-row">
            <label>Descripción (opcional)</label>
            <textarea
              placeholder="¿Qué hace este endpoint?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="wb-modal-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm" disabled={!collections.length}>
              Crear Endpoint
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewCollectionModal({ isOpen, onClose }) {
  const { collections, addCollection } = useWorkspace();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await addCollection(name.trim(), description.trim(), parentId || null);
      setName('');
      setDescription('');
      setParentId('');
      notify('Carpeta creada.');
      onClose();
    } catch (error) { notify(error.message || 'No se pudo crear la carpeta.', 'error'); }
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
        <div className="wb-modal-header">
          <div className="wb-header-with-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <line x1="12" y1="10" x2="12" y2="16" />
              <line x1="9" y1="13" x2="15" y2="13" />
            </svg>
            <h3>Nueva carpeta</h3>
          </div>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-modal-form">
          <div className="wb-form-row">
            <label>Nombre de la carpeta</label>
            <input type="text" placeholder="p. ej. Pagos, Usuarios o Auth" value={name} onChange={(event) => setName(event.target.value)} required autoFocus />
          </div>
          <div className="wb-form-row">
            <label>Descripción (opcional)</label>
            <textarea placeholder="Qué requests agrupa esta carpeta" value={description} onChange={(event) => setDescription(event.target.value)} rows={2} />
          </div>
          <div className="wb-form-row">
            <label>Carpeta padre (opcional)</label>
            <select value={parentId} onChange={(event) => setParentId(event.target.value)}>
              <option value="">En la raíz</option>
              {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}
            </select>
          </div>
          <div className="wb-modal-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn--primary btn--sm">Crear carpeta</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function EditResourceModal({ isOpen, item, kind, collections, onClose }) {
  const { updateApi, updateCollection } = useWorkspace();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');

  useEffect(() => {
    if (!item) return;
    setName(item.name || '');
    setDescription(item.description || '');
    setParentId(item.parentId || '');
  }, [item]);

  if (!isOpen || !item) return null;
  const descendants = new Set();
  const collectDescendants = (id) => collections.filter((collection) => collection.parentId === id).forEach((child) => { descendants.add(child.id); collectDescendants(child.id); });
  if (kind === 'collection') collectDescendants(item.id);
  const availableParents = collections.filter((collection) => collection.id !== item.id && !descendants.has(collection.id));

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      if (kind === 'collection') await updateCollection(item.id, { name: name.trim(), description: description.trim(), parentId: parentId || null });
      else await updateApi(item.id, { name: name.trim() });
      notify(kind === 'collection' ? 'Carpeta actualizada.' : 'Request renombrada.');
      onClose();
    } catch (error) { notify(error.message || 'No se pudo guardar el cambio.', 'error'); }
  };

  return <div className="wb-modal-overlay" onClick={onClose}>
    <div className="wb-modal" onClick={(event) => event.stopPropagation()}>
      <div className="wb-modal-header"><div className="wb-header-with-icon"><h3>{kind === 'collection' ? 'Editar carpeta' : 'Renombrar request'}</h3></div><button type="button" className="wb-modal-close" onClick={onClose}>✕</button></div>
      <form className="wb-modal-form" onSubmit={handleSubmit}>
        <div className="wb-form-row"><label>{kind === 'collection' ? 'Nombre de la carpeta' : 'Nombre de la request'}</label><input required autoFocus value={name} onChange={(event) => setName(event.target.value)} /></div>
        {kind === 'collection' && <><div className="wb-form-row"><label>Descripción</label><textarea rows={2} value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="wb-form-row"><label>Carpeta padre</label><select value={parentId} onChange={(event) => setParentId(event.target.value)}><option value="">En la raíz</option>{availableParents.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></div></>}
        <div className="wb-modal-actions"><button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>Cancelar</button><button type="submit" className="btn btn--primary btn--sm">Guardar cambios</button></div>
      </form>
    </div>
  </div>;
}

export function NewKeyModal({ isOpen, onClose }) {
  const { addApiKey } = useWorkspace();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState('Producción');
  const [scope, setScope] = useState('Full Access (Read/Write)');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try { await addApiKey({ name, environment, scope }); onClose(); notify('API Key generada.'); } catch (error) { notify(error.message || 'No se pudo generar la API Key.', 'error'); }
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <h3>Generar nueva API Key</h3>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-modal-form">
          <div className="wb-form-row">
            <label>Nombre identificador de la Key</label>
            <input
              type="text"
              placeholder="p. ej. Servidor Backend AWS o App Móvil"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="wb-form-row">
            <label>Entorno de Ejecución</label>
            <select value={environment} onChange={(e) => setEnvironment(e.target.value)}>
              <option value="Producción">Producción (sk_live_...)</option>
              <option value="Staging / Dev">Staging / Dev (sk_test_...)</option>
            </select>
          </div>

          <div className="wb-form-row">
            <label>Nivel de Permisos / Scope</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="Full Access (Read/Write)">Full Access (Lectura y Escritura)</option>
              <option value="Read Only">Solo Lectura (GET endpoints)</option>
              <option value="Restricted (Auth & Misc)">Restringido (Solo autenticación)</option>
            </select>
          </div>

          <div className="wb-key-security-notice">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span>Tu API Key se generará de manera segura y podrás copiarla inmediatamente.</span>
          </div>

          <div className="wb-modal-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Generar Clave
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ConfirmDeleteApisModal({ isOpen, onClose }) {
  const { deleteAllApis } = useWorkspace();

  if (!isOpen) return null;

  const handleConfirm = async () => {
    await deleteAllApis();
    onClose();
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal--danger" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <div className="wb-danger-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3>¿Borrar todas las APIs?</h3>
          </div>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="wb-modal-body">
          <p>
            Esta acción eliminará permanentemente todos los endpoints de tus colecciones actuales. Las carpetas y las API Keys permanecerán intactas.
          </p>
        </div>

        <div className="wb-modal-actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn-danger-solid" onClick={handleConfirm}>
            Sí, borrar todas las APIs
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmDeleteProjectModal({ isOpen, onClose }) {
  const { deleteProject } = useWorkspace();
  const [confirmWord, setConfirmWord] = useState('');

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmWord.trim().toUpperCase() === 'BORRAR') {
      await deleteProject();
      setConfirmWord('');
      onClose();
    }
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal wb-modal--danger" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <div className="wb-danger-title">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <h3>Borrar proyecto completo</h3>
          </div>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="wb-modal-body">
          <p>
            Esta acción reiniciará por completo el espacio de trabajo: se eliminarán todas las colecciones, todos los endpoints y todas las API Keys configuradas.
          </p>
          <p className="wb-confirm-prompt">
            Escribe <strong>BORRAR</strong> a continuación para confirmar:
          </p>
          <input
            type="text"
            className="wb-confirm-input"
            placeholder="BORRAR"
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
          />
        </div>

        <div className="wb-modal-actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn-danger-solid"
            disabled={confirmWord.trim().toUpperCase() !== 'BORRAR'}
            onClick={handleConfirm}
          >
            Confirmar eliminación total
          </button>
        </div>
      </div>
    </div>
  );
}

export function NewWorkspaceModal({ isOpen, onClose, onWorkspaceCreated }) {
  const { createWorkspace } = useWorkspace();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState('team');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const newWs = await createWorkspace({ name, description });
      if (onWorkspaceCreated) onWorkspaceCreated(newWs);
      setName('');
      setDescription('');
      onClose();
      notify('Workspace creado.');
    } catch (error) { notify(error.message || 'No se pudo crear el workspace.', 'error'); }
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <div className="wb-header-with-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3.5" y="5" width="17" height="14" rx="2.2" />
              <path d="M3.5 9.5h17M8 5v14" />
            </svg>
            <h3>Crear nuevo Workspace</h3>
          </div>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-modal-form">
          <div className="wb-form-row">
            <label>Nombre del Workspace</label>
            <input
              type="text"
              placeholder="p. ej. Mobile Cloud Gateway o Testing Sandbox"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="wb-form-row">
            <label>Descripción (opcional)</label>
            <textarea
              placeholder="Objetivo y servicios alojados en este espacio de trabajo..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="wb-form-row">
            <label>Tipo de Espacio</label>
            <select value={visibility} onChange={(e) => setVisibility(e.target.value)}>
              <option value="team">Team / Colaborativo (Compartido con el equipo)</option>
              <option value="personal">Personal (Solo visible para ti)</option>
              <option value="public">Público (Para documentación comunitaria)</option>
            </select>
          </div>

          <div className="wb-modal-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Crear Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function NewFlowModal({ isOpen, onClose, onFlowCreated }) {
  const { collections, createFlow } = useWorkspace();
  const { notify } = useFeedback();
  const [name, setName] = useState('');
  const [targetType, setTargetType] = useState('group'); // 'group' | 'individual'
  const [selectedTarget, setSelectedTarget] = useState(collections[0]?.id || '');
  const [frequency, setFrequency] = useState('Cada 1 hora');
  const [notifyOnError, setNotifyOnError] = useState(true);

  if (!isOpen) return null;

  // Flatten all APIs for individual selection
  const allApis = collections.flatMap((c) =>
    c.apis.map((a) => ({ id: a.id, label: `${a.method} ${a.path} (${c.name})` }))
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    let intervalMinutes = 60;
    if (frequency === 'Cada 30 minutos') intervalMinutes = 30;
    else if (frequency === 'Cada 2 horas') intervalMinutes = 120;
    else if (frequency === 'Diario (24h)') intervalMinutes = 1440;

    try {
      const newFlow = await createFlow({ name, targetType, targetName: selectedTarget, frequency, intervalMinutes, notifyOnError });
      if (onFlowCreated) onFlowCreated(newFlow);
      setName('');
      onClose();
      notify('Flow programado.');
    } catch (error) { notify(error.message || 'No se pudo programar el flow.', 'error'); }
  };

  return (
    <div className="wb-modal-overlay" onClick={onClose}>
      <div className="wb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="wb-modal-header">
          <div className="wb-header-with-icon">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <h3>Programar Nuevo Flow de Monitoreo</h3>
          </div>
          <button type="button" className="wb-modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="wb-modal-form">
          <div className="wb-form-row">
            <label>Nombre del Flow / Monitor</label>
            <input
              type="text"
              placeholder="p. ej. Monitoreo Horario de Auth & Tokens"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="wb-form-row">
            <label>Modalidad de Ejecución</label>
            <div className="wb-radio-toggle-group">
              <label className={`wb-radio-label ${targetType === 'group' ? 'wb-radio-active' : ''}`}>
                <input
                  type="radio"
                  name="targetType"
                  value="group"
                  checked={targetType === 'group'}
                  onChange={() => {
                    setTargetType('group');
                    setSelectedTarget(collections[0]?.id || '');
                  }}
                />
                Por Grupo (Colección)
              </label>

              <label className={`wb-radio-label ${targetType === 'individual' ? 'wb-radio-active' : ''}`}>
                <input
                  type="radio"
                  name="targetType"
                  value="individual"
                  checked={targetType === 'individual'}
                  onChange={() => {
                    setTargetType('individual');
                    setSelectedTarget(allApis[0]?.id || '');
                  }}
                />
                Individual (1 Endpoint)
              </label>
            </div>
          </div>

          <div className="wb-form-row">
            <label>{targetType === 'group' ? 'Seleccionar Colección' : 'Seleccionar Endpoint Individual'}</label>
            {targetType === 'group' ? (
              <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
                {collections.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.apis.length} endpoints)
                  </option>
                ))}
              </select>
            ) : (
              <select value={selectedTarget} onChange={(e) => setSelectedTarget(e.target.value)}>
                {allApis.map((a) => (
                  <option key={a.id} value={a.name}>
                    {a.label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="wb-form-row">
            <label>Frecuencia de Ejecución Programada</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)}>
              <option value="Cada 1 hora">Cada 1 hora (Recomendado para monitoreo)</option>
              <option value="Cada 2 horas">Cada 2 horas</option>
              <option value="Cada 30 minutos">Cada 30 minutos (Alta frecuencia)</option>
              <option value="Diario (24h)">Diario (1 vez al día)</option>
            </select>
          </div>

          <div className="wb-form-checkbox-row">
            <input
              type="checkbox"
              id="notify-error"
              checked={notifyOnError}
              onChange={(e) => setNotifyOnError(e.target.checked)}
            />
            <label htmlFor="notify-error">
              Notificar inmediatamente si un endpoint responde con error (4xx o 5xx)
            </label>
          </div>

          <div className="wb-modal-actions">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary btn--sm">
              Guardar y Activar Flow
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
