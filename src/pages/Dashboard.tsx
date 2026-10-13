import { Icon } from '../components/Icon';
import { PageHeader } from '../components/PageHeader';
import { StatusBadge } from '../components/StatusBadge';
import { SummaryStrip } from '../components/SummaryStrip';
import { useApp } from '../context/AppContext';
import { href } from '../router';
import { formatDate, formatMoney } from '../utils/format';

export function DashboardPage() {
  const { data, loadExample } = useApp();
  const recent = [...data.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 5);

  return (
    <>
      <PageHeader
        title="Panel principal"
        subtitle={`Resumen de tus proyectos con la ${data.settings.printerName}.`}
        actions={<a className="btn primary" href={href('/nuevo')}><Icon name="plus" />Nuevo cálculo</a>}
      />
      <SummaryStrip projects={data.projects} />

      {recent.length === 0 ? (
        <div className="empty card">
          <Icon name="cube" size={32} />
          <h2>Tu panel está vacío</h2>
          <p>{data.filaments.length === 0 ? 'Crea un perfil de filamento y calcula tu primera impresión, o carga datos de ejemplo.' : 'Calcula tu primera impresión, o carga datos de ejemplo.'}</p>
          <div className="actions center">
            <a className="btn primary" href={href('/nuevo')}>Nuevo cálculo</a>
            {data.filaments.length === 0 && <a className="btn secondary" href={href('/filamentos')}>Crear filamento</a>}
            <button type="button" className="btn secondary" onClick={() => void loadExample()}>Cargar ejemplo</button>
          </div>
        </div>
      ) : (
        <section className="card">
          <div className="section-head">
            <h2>Proyectos recientes</h2>
            <a href={href('/proyectos')}>Ver todos</a>
          </div>
          <ul className="plain-list">
            {recent.map((p) => (
              <li key={p.id}>
                <span>
                  <a href={href(`/proyecto/${p.id}`)}><strong>{p.name}</strong></a>
                  <small className="muted block">{formatDate(p.updatedAt)}</small>
                </span>
                <span className="row-end">
                  <StatusBadge status={p.status} />
                  <strong>{formatMoney(p.result.recommendedPrice)}</strong>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
