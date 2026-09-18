import { useEffect, useMemo, useState } from 'react';
import { useFeedback } from '../../components/common/Feedback/FeedbackContext';
import { useWorkspace } from './WorkspaceContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

function parseCsv(text) {
  const records = []; let record = []; let value = ''; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"' && text[i + 1] === '"' && quoted) { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { record.push(value.trim()); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && text[i + 1] === '\n') i += 1; record.push(value.trim()); if (record.some(Boolean)) records.push(record); record = []; value = ''; }
    else value += char;
  }
  record.push(value.trim()); if (record.some(Boolean)) records.push(record);
  if (!records.length) return [];
  const columns = records.shift().map((column, index) => column || `column_${index + 1}`);
  return records.map((row) => Object.fromEntries(columns.map((column, index) => [column, row[index] || ''])));
}

function parseDatasetFile(file, text) {
  const parsed = file.name.toLowerCase().endsWith('.json') ? JSON.parse(text) : parseCsv(text);
  const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
  if (!Array.isArray(rows)) throw new Error('El JSON debe contener un array de filas.');
  return rows.map((row) => Array.isArray(row) ? Object.fromEntries(row.map((value, index) => [`column_${index + 1}`, value])) : row);
}

export default function DatasetsView() {
  const { activeProjectId, collections, environments } = useWorkspace();
  const { notify, confirm } = useFeedback();
  const [datasets, setDatasets] = useState([]); const [selectedId, setSelectedId] = useState('');
  const [rows, setRows] = useState([]); const [columns, setColumns] = useState([]); const [name, setName] = useState(''); const [description, setDescription] = useState('');
  const [requestId, setRequestId] = useState(''); const [environmentId, setEnvironmentId] = useState(''); const [results, setResults] = useState([]); const [error, setError] = useState(''); const [running, setRunning] = useState(false);
  const requests = useMemo(() => collections.flatMap((collection) => (collection.apis || []).map((request) => ({ ...request, collectionName: collection.name }))), [collections]);
  const selected = datasets.find((item) => item.id === selectedId);

  const load = async () => {
    if (!activeProjectId) return;
    const response = await fetch(`${API_URL}/api/projects/${activeProjectId}/datasets`, { credentials: 'include' });
    if (!response.ok) { setError('No se pudieron cargar los datasets.'); return; }
    const data = (await response.json()).data || []; setDatasets(data); if (!selectedId && data[0]) setSelectedId(data[0].id);
  };
  useEffect(() => { setSelectedId(''); setRows([]); setColumns([]); setResults([]); load(); }, [activeProjectId]);
  useEffect(() => { if (selected) { setRows(selected.rows || []); setColumns(selected.columns || []); setName(selected.name); setDescription(selected.description || ''); } }, [selected]);

  const readFile = (file) => {
    if (!file || file.size > 5 * 1024 * 1024) { setError('Archivo inválido o mayor de 5 MB.'); return; }
    const reader = new FileReader(); reader.onload = () => { try { const parsedRows = parseDatasetFile(file, String(reader.result || '')); if (!parsedRows.length) throw new Error('El dataset no contiene filas.'); setRows(parsedRows); setColumns([...new Set(parsedRows.flatMap((row) => Object.keys(row)))]); setError(''); if (!name) setName(file.name.replace(/\.(csv|json)$/i, '')); } catch (parseError) { setError(parseError.message); } }; reader.readAsText(file);
  };

  const save = async () => {
    if (!name.trim() || !rows.length) { setError('Indica un nombre y carga al menos una fila.'); return; }
    const url = selectedId ? `${API_URL}/api/datasets/${selectedId}` : `${API_URL}/api/projects/${activeProjectId}/datasets`;
    const response = await fetch(url, { method: selectedId ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, rows }) });
    if (!response.ok) { setError((await response.json()).message || 'No se pudo guardar el dataset.'); return; }
    notify('Dataset guardado.'); await load();
  };
  const remove = async () => { if (!selectedId || !await confirm({ title: 'Eliminar dataset', message: 'Se eliminarán todas sus filas.', confirmLabel: 'Eliminar' })) return; const response = await fetch(`${API_URL}/api/datasets/${selectedId}`, { method: 'DELETE', credentials: 'include' }); if (!response.ok) { setError('No se pudo eliminar el dataset.'); return; } setSelectedId(''); setRows([]); setColumns([]); notify('Dataset eliminado.'); load(); };
  const run = async () => {
    if (!selectedId || !requestId) { setError('Selecciona un dataset y una request.'); return; }
    setRunning(true); setResults([]); setError('');
    try { const response = await fetch(`${API_URL}/api/datasets/${selectedId}/run`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, environmentId: environmentId || undefined }) }); const payload = await response.json(); if (!response.ok) throw new Error(payload.message || 'No se pudo ejecutar el dataset.'); setResults(payload.data.results || []); notify(`Runner completado: ${payload.data.total} filas.`); } catch (runError) { setError(runError.message); } finally { setRunning(false); }
  };

  return <div className="wb-artifact-view"><div className="wb-view-header"><div><span className="wb-section-kicker">DATA RUNNER</span><h1>Datasets</h1><p>Guarda filas y ejecuta una request por cada fila.</p></div></div>
    <div className="wb-create-panel"><label>Dataset<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}><option value="">Nuevo dataset</option>{datasets.map((item) => <option key={item.id} value={item.id}>{item.name} ({item.rows?.length || 0} filas)</option>)}</select></label><label>Nombre<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Usuarios de prueba" /></label><label>Descripción<input value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Datos para login" /></label><label>Archivo CSV o JSON<input type="file" accept=".csv,.json,application/json,text/csv" onChange={(event) => readFile(event.target.files?.[0])} /></label><div className="wb-form-actions"><button className="wb-artifact-primary" type="button" onClick={save}>Guardar dataset</button>{selectedId && <button className="wb-table-action wb-table-action--danger" type="button" onClick={remove}>Eliminar</button>}</div></div>
    {error && <p className="wb-alert-error">{error}</p>}
    {rows.length > 0 && <div className="wb-data-panel"><strong>{rows.length} filas · {columns.length} variables disponibles como {'{{variable}}'}</strong><div className="wb-artifact-table-wrap"><table className="wb-artifact-table"><thead><tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr></thead><tbody>{rows.slice(0, 10).map((row, index) => <tr key={index}>{columns.map((column) => <td key={column}>{String(row[column] ?? '')}</td>)}</tr>)}</tbody></table></div></div>}
    <div className="wb-create-panel"><h2>Collection runner</h2><label>Request<select value={requestId} onChange={(event) => setRequestId(event.target.value)}><option value="">Selecciona una request</option>{requests.map((request) => <option key={request.id} value={request.id}>{request.method} {request.path} · {request.collectionName}</option>)}</select></label><label>Entorno<select value={environmentId} onChange={(event) => setEnvironmentId(event.target.value)}><option value="">Entorno default</option>{environments.map((environment) => <option key={environment.id} value={environment.id}>{environment.name}</option>)}</select></label><button className="wb-artifact-primary" type="button" onClick={run} disabled={running || !selectedId || !requestId}>{running ? 'Ejecutando...' : `Ejecutar ${rows.length} filas`}</button></div>
    {results.length > 0 && <div className="wb-data-panel"><strong>Resultados del runner</strong><div className="wb-artifact-list">{results.map((result) => <div className="wb-artifact-row" key={result.row}><div className="wb-artifact-row__main"><strong>Fila {result.row}</strong><small>{result.statusCode || 'Error'} · {result.latencyMs} ms</small></div><span>{result.error || (result.statusCode >= 200 && result.statusCode < 400 ? 'Correcta' : 'Fallida')}</span></div>)}</div></div>}
  </div>;
}
