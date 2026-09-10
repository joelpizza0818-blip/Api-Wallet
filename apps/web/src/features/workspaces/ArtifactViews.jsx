import { useState } from 'react';
import { useWorkspace } from './WorkspaceContext';
import './ArtifactViews.css';

const ENVIRONMENTS = [
  { name: 'Producción', variables: 8, updated: 'Hoy, 16:42', color: 'success' },
  { name: 'Staging', variables: 6, updated: 'Ayer, 11:20', color: 'warning' },
  { name: 'Desarrollo local', variables: 5, updated: '03 Sep 2026', color: 'muted' },
];

const DOCUMENTS = [
  { name: 'Guía de autenticación', type: 'Markdown', updated: 'Hace 2 horas', status: 'Publicado' },
  { name: 'Referencia de endpoints', type: 'OpenAPI 3.1', updated: 'Ayer', status: 'Borrador' },
  { name: 'Integración SDK móvil', type: 'Markdown', updated: '01 Sep 2026', status: 'Publicado' },
];

const MOCKS = [
  { name: 'Payments mock server', url: 'mock.apiwallet.dev/payments', port: '3001', routes: 12, status: 'Activo' },
  { name: 'Trailer catalog sandbox', url: 'mock.apiwallet.dev/trailers', port: '3002', routes: 8, status: 'Activo' },
];

function ViewHeader({ title, description, action }) {
  return <div className="wb-artifact-header"><div><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function EnvironmentsView() {
  const [activeEnvironment, setActiveEnvironment] = useState('Producción');
  return <div className="wb-artifact-view">
    <ViewHeader title="Entornos" description="Variables y valores por ambiente para ejecutar tus APIs con seguridad." action={<button className="btn btn--primary btn--md" type="button">+ Nuevo entorno</button>} />
    <div className="wb-artifact-grid">{ENVIRONMENTS.map((env) => <button key={env.name} type="button" className={`wb-artifact-card ${activeEnvironment === env.name ? 'wb-artifact-card--selected' : ''}`} onClick={() => setActiveEnvironment(env.name)}><span className={`wb-artifact-dot wb-artifact-dot--${env.color}`} /><strong>{env.name}</strong><span>{env.variables} variables</span><small>Actualizado {env.updated}</small></button>)}</div>
    <section className="wb-artifact-panel"><div className="wb-artifact-panel__title"><div><h2>{activeEnvironment}</h2><p>Variables disponibles para este entorno</p></div><button type="button" className="wb-artifact-action">+ Agregar variable</button></div><table className="wb-artifact-table"><thead><tr><th>Variable</th><th>Valor inicial</th><th>Actual</th></tr></thead><tbody><tr><td>BASE_URL</td><td>https://api.apiwallet.dev</td><td>https://api.apiwallet.dev</td></tr><tr><td>API_VERSION</td><td>v1</td><td>v1</td></tr><tr><td>AUTH_TOKEN</td><td>••••••••••••</td><td>••••••••••••</td></tr></tbody></table></section>
  </div>;
}

export function DocumentsView() {
  return <div className="wb-artifact-view"><ViewHeader title="Documentos" description="Centraliza guías, referencias y especificaciones de tu workspace." action={<button className="btn btn--primary btn--md" type="button">+ Nuevo documento</button>} /><section className="wb-artifact-panel"><div className="wb-artifact-panel__title"><div><h2>Documentación del workspace</h2><p>{DOCUMENTS.length} documentos disponibles</p></div></div><div className="wb-artifact-list">{DOCUMENTS.map((doc) => <button key={doc.name} type="button" className="wb-artifact-row"><span className="wb-artifact-file">▤</span><span className="wb-artifact-row__main"><strong>{doc.name}</strong><small>{doc.type} · Actualizado {doc.updated}</small></span><span className={`wb-artifact-status ${doc.status === 'Publicado' ? 'is-success' : ''}`}>{doc.status}</span><span>›</span></button>)}</div></section></div>;
}

export function MocksView() {
  return <div className="wb-artifact-view"><ViewHeader title="Mocks" description="Simula tus servicios para desarrollar y probar sin depender de APIs externas." action={<button className="btn btn--primary btn--md" type="button">+ Crear mock</button>} /><div className="wb-artifact-grid">{MOCKS.map((mock) => <article key={mock.name} className="wb-artifact-card wb-artifact-card--static"><div className="wb-artifact-card__top"><span className="wb-artifact-dot wb-artifact-dot--success" /><span className="wb-artifact-status is-success">{mock.status}</span></div><strong>{mock.name}</strong><code>{mock.url}</code><small>Puerto {mock.port} · {mock.routes} rutas configuradas</small><button className="wb-artifact-action" type="button">Abrir mock</button></article>)}</div></div>;
}

export function LineHistoryView() {
  const { flows } = useWorkspace();
  const events = flows.slice(0, 5).map((flow, index) => ({ ...flow, time: index === 0 ? 'Hace unos segundos' : flow.lastRun }));
  return <div className="wb-artifact-view"><ViewHeader title="Line History" description="Consulta las últimas ejecuciones manuales y programadas de tus APIs." action={<button className="wb-artifact-action" type="button">Exportar historial</button>} /><section className="wb-artifact-panel"><div className="wb-artifact-panel__title"><div><h2>Últimas ejecuciones</h2><p>Se actualiza cuando ejecutas un flow.</p></div><span className="wb-artifact-live">● En vivo</span></div><div className="wb-artifact-table-wrap"><table className="wb-artifact-table"><thead><tr><th>Hora</th><th>Flow</th><th>Destino</th><th>Estado</th><th>Latencia</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{event.time}</td><td>{event.name}</td><td><code>{event.targetName}</code></td><td><span className="wb-artifact-status is-success">{event.lastStatus}</span></td><td>{event.latency}</td></tr>)}</tbody></table></div></section></div>;
}
