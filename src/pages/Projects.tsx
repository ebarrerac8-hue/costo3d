import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { StatusSelect } from '../components/StatusBadge';
import { SummaryStrip } from '../components/SummaryStrip';
import { useApp } from '../context/AppContext';
import { PROJECT_STATUSES, STATUS_LABELS, type Project, type ProjectStatus } from '../models/types';
import { href } from '../router';
import { formatDate, formatHours, formatMoney } from '../utils/format';
import { filterAndSort, type SortDir, type SortKey } from '../utils/projects';

export function ProjectsPage() {
  const { data, deleteProject, duplicateProject, setProjectStatus, loadExample } = useApp();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<ProjectStatus | 'todos'>('todos');
  const [sort, setSort] = useState<SortKey>('date');
  const [dir, setDir] = useState<SortDir>('desc');
  const [toDelete, setToDelete] = useState<Project | null>(null);

  const list = filterAndSort(data.projects, query, status, sort, dir);

  return (
    <>
      <PageHeader
        title="Mis proyectos"
        subtitle="Consulta, edita o cotiza tus cálculos guardados."
        actions={<a className="btn primary" href={href('/nuevo')}><Icon name="plus" />Nuevo cálculo</a>}
      />
      <SummaryStrip projects={data.projects} />

      {data.projects.length === 0 ? (
        <div className="empty card">
          <Icon name="folder" size={32} />
          <h2>Todavía no hay proyectos</h2>
          <p>Calcula tu primera impresión o carga datos de ejemplo para explorar la aplicación.</p>
          <div className="actions center">
            <a className="btn primary" href={href('/nuevo')}><Icon name="plus" />Nuevo cálculo</a>
            <button type="button" className="btn secondary" onClick={() => void loadExample()}>Cargar ejemplo</button>
          </div>
        </div>
      ) : (
        <>
          <div className="toolbar card">
            <div className="field grow">
              <label htmlFor="q">Buscar por nombre</label>
              <div className="input-wrap"><span className="affix" aria-hidden="true"><Icon name="search" size={16} /></span>
                <input id="q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre del proyecto" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="f-status">Estado</label>
              <select id="f-status" value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus | 'todos')}>
                <option value="todos">Todos</option>
                {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-sort">Ordenar por</label>
              <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
                <option value="date">Fecha</option>
                <option value="cost">Costo total</option>
                <option value="price">Precio recomendado</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="f-dir">Orden</label>
              <select id="f-dir" value={dir} onChange={(e) => setDir(e.target.value as SortDir)}>
                <option value="desc">De mayor a menor</option>
                <option value="asc">De menor a mayor</option>
              </select>
            </div>
          </div>

          <p className="muted" role="status">{list.length} de {data.projects.length} proyectos</p>

          {list.length === 0 ? (
            <div className="empty card"><h2>Ningún proyecto coincide</h2><p>Prueba con otro nombre o cambia el filtro de estado.</p></div>
          ) : (
            <ul className="card-grid wide">
              {list.map((p) => (
                <li key={p.id} className="card project-card">
                  <div className="project-head">
                    <div>
                      <h3><a href={href(`/proyecto/${p.id}`)}>{p.name}</a></h3>
                      <p className="muted">{formatDate(p.createdAt)} · {p.input.pieces} {p.input.pieces === 1 ? 'unidad' : 'unidades'} · {formatHours(p.result.printHours)}</p>
                    </div>
                    <StatusSelect id={`st-${p.id}`} value={p.status} onChange={(s) => void setProjectStatus(p.id, s)} />
                  </div>
                  <dl className="mini-stats">
                    <div><dt>Costo total</dt><dd>{formatMoney(p.result.totalCost)}</dd></div>
                    <div><dt>Precio recomendado</dt><dd className="accent-text">{formatMoney(p.result.recommendedPrice)}</dd></div>
                    <div><dt>Ganancia</dt><dd>{formatMoney(p.result.profit)}</dd></div>
                  </dl>
                  <div className="actions tight" role="group" aria-label={`Acciones para ${p.name}`}>
                    <a className="btn secondary small" href={href(`/proyecto/${p.id}`)}><Icon name="open" size={16} />Abrir</a>
                    <a className="btn secondary small" href={href(`/editar/${p.id}`)}><Icon name="edit" size={16} />Editar</a>
                    <button type="button" className="btn secondary small" onClick={() => void duplicateProject(p.id)}><Icon name="copy" size={16} />Duplicar</button>
                    <a className="btn secondary small" href={href(`/imprimir/${p.id}/cotizacion`)}><Icon name="file" size={16} />Cotización</a>
                    <a className="btn secondary small" href={href(`/imprimir/${p.id}/interno`)}><Icon name="print" size={16} />Informe</a>
                    <button type="button" className="btn ghost-danger small" onClick={() => setToDelete(p)}><Icon name="trash" size={16} />Eliminar</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {toDelete && (
        <ConfirmDialog
          title="¿Eliminar este proyecto?" confirmLabel="Eliminar" danger onCancel={() => setToDelete(null)}
          onConfirm={() => { void deleteProject(toDelete.id); setToDelete(null); }}
        >
          <p>Se eliminará <strong>{toDelete.name}</strong>. Esta acción no se puede deshacer, a menos que tengas un respaldo.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
