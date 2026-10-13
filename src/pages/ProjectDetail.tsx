import { useState } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { ResultView } from '../components/ResultView';
import { StatusSelect } from '../components/StatusBadge';
import { useApp } from '../context/AppContext';
import { href, navigate } from '../router';
import { formatDate } from '../utils/format';

export function ProjectDetailPage({ id }: { id: string }) {
  const { data, deleteProject, duplicateProject, setProjectStatus } = useApp();
  const project = data.projects.find((p) => p.id === id);
  const [confirming, setConfirming] = useState(false);

  if (!project) {
    return (
      <div className="empty card">
        <h2>No encontramos ese proyecto</h2>
        <p>Es posible que se haya eliminado.</p>
        <a className="btn primary" href={href('/proyectos')}>Ir a Mis proyectos</a>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={`Creado el ${formatDate(project.createdAt)} · Actualizado el ${formatDate(project.updatedAt)}`}
        actions={
          <>
            <a className="btn secondary" href={href(`/editar/${project.id}`)}><Icon name="edit" />Editar</a>
            <button type="button" className="btn secondary" onClick={async () => { const c = await duplicateProject(project.id); if (c) navigate(`/proyecto/${c.id}`); }}>
              <Icon name="copy" />Duplicar
            </button>
            <a className="btn primary" href={href(`/imprimir/${project.id}/cotizacion`)}><Icon name="file" />Cotización</a>
            <a className="btn secondary" href={href(`/imprimir/${project.id}/interno`)}><Icon name="print" />Informe interno</a>
            <button type="button" className="btn ghost-danger" onClick={() => setConfirming(true)}><Icon name="trash" />Eliminar</button>
          </>
        }
      />

      <div className="status-row">
        <label htmlFor="detail-status">Estado</label>
        <StatusSelect id="detail-status" value={project.status} onChange={(s) => void setProjectStatus(project.id, s)} />
      </div>

      <ResultView project={project} />

      {(project.notes || project.quoteNotes) && (
        <section className="card stack-sm">
          {project.notes && <div><h2>Notas internas</h2><p className="pre">{project.notes}</p></div>}
          {project.quoteNotes && <div><h2>Notas comerciales</h2><p className="pre">{project.quoteNotes}</p></div>}
        </section>
      )}

      {confirming && (
        <ConfirmDialog
          title="¿Eliminar este proyecto?" confirmLabel="Eliminar" danger onCancel={() => setConfirming(false)}
          onConfirm={async () => { setConfirming(false); await deleteProject(project.id); navigate('/proyectos'); }}
        >
          <p>Se eliminará <strong>{project.name}</strong>. Esta acción no se puede deshacer, a menos que tengas un respaldo.</p>
        </ConfirmDialog>
      )}
    </>
  );
}
