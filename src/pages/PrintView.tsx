import { useState } from 'react';
import { BreakdownTable, FilamentList } from '../components/ResultView';
import { CostChart, costSlices } from '../components/CostChart';
import { Icon } from '../components/Icon';
import { useApp } from '../context/AppContext';
import { STATUS_LABELS } from '../models/types';
import { href } from '../router';
import { formatDate, formatGrams, formatHours, formatMoney, formatPct } from '../utils/format';
import { quoteLines } from '../utils/projects';

export function PrintView({ id, kind }: { id: string; kind: 'cotizacion' | 'interno' }) {
  const { data, saveProject } = useApp();
  const project = data.projects.find((p) => p.id === id);
  const [notes, setNotes] = useState(project?.quoteNotes ?? '');

  if (!project) {
    return (
      <div className="boot">
        <h1>No encontramos ese proyecto</h1>
        <p><a href={href('/proyectos')}>Volver a Mis proyectos</a></p>
      </div>
    );
  }

  const r = project.result;
  const today = new Date().toISOString();
  const saveNotes = () => {
    const clean = notes.trim();
    if ((project.quoteNotes ?? '') !== clean) void saveProject({ ...project, quoteNotes: clean || undefined });
  };

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <a className="btn secondary" href={href(`/proyecto/${project.id}`)}>Volver al proyecto</a>
        <a className="btn secondary" href={href(`/imprimir/${project.id}/${kind === 'cotizacion' ? 'interno' : 'cotizacion'}`)}>
          {kind === 'cotizacion' ? 'Ver informe interno' : 'Ver cotización'}
        </a>
        <button type="button" className="btn primary" onClick={() => window.print()}><Icon name="print" />Imprimir o guardar como PDF</button>
        {kind === 'cotizacion' && (
          <div className="field notes-field">
            <label htmlFor="q-notes">Notas comerciales (aparecen en la cotización)</label>
            <textarea id="q-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} />
          </div>
        )}
      </div>

      {kind === 'cotizacion' ? (
        <article className="print-doc">
          <header className="doc-head">
            <div>
              <p className="doc-business">{data.settings.businessName || 'Costo3D'}</p>
              <h1>Cotización</h1>
            </div>
            <p className="doc-date">Fecha: {formatDate(today)}</p>
          </header>
          {(() => {
            const q = quoteLines(project);
            return (
              <>
                <table className="quote-table">
                  <thead>
                    <tr><th scope="col">Descripción</th><th scope="col" className="num">Cantidad</th><th scope="col" className="num">Precio por unidad</th><th scope="col" className="num">Total</th></tr>
                  </thead>
                  <tbody>
                    <tr><td>{project.name}</td><td className="num">{q.pieces}</td><td className="num">{formatMoney(q.unitPrice)}</td><td className="num">{formatMoney(q.total)}</td></tr>
                  </tbody>
                </table>
                <p className="quote-total">Precio total: <strong>{formatMoney(q.total)}</strong></p>
              </>
            );
          })()}
          {notes.trim() && (
            <section className="doc-notes">
              <h2>Notas</h2>
              <p className="pre">{notes.trim()}</p>
            </section>
          )}
          <footer className="doc-foot">Precios expresados en quetzales (Q).</footer>
        </article>
      ) : (
        <article className="print-doc">
          <header className="doc-head">
            <div>
              <p className="doc-business">Informe interno · {data.settings.businessName || data.settings.printerName}</p>
              <h1>{project.name}</h1>
            </div>
            <p className="doc-date">Fecha: {formatDate(today)}<br />Estado: {STATUS_LABELS[project.status ?? 'cotizacion']}</p>
          </header>
          <p className="internal-flag">Documento confidencial: contiene costos, margen y ganancia. No lo compartas con el cliente.</p>

          <section className="doc-summary">
            <div><span>Costo total</span><strong>{formatMoney(r.totalCost)}</strong></div>
            <div><span>Costo por unidad</span><strong>{formatMoney(r.costPerUnit)}</strong></div>
            <div><span>Precio mínimo</span><strong>{formatMoney(r.minPrice)}</strong></div>
            <div><span>Precio recomendado</span><strong>{formatMoney(r.recommendedPrice)}</strong></div>
            <div><span>Ganancia total</span><strong>{formatMoney(r.profit)}</strong></div>
            <div><span>Ganancia por unidad</span><strong>{formatMoney(r.profitPerUnit)}</strong></div>
            <div><span>Margen real</span><strong>{formatPct(r.realMarginPct)}</strong></div>
            <div><span>Tiempo de impresión</span><strong>{formatHours(r.printHours)}</strong></div>
            <div><span>Filamento total</span><strong>{formatGrams(r.totalGrams)}</strong></div>
          </section>

          <section><h2>Desglose</h2><BreakdownTable project={project} /></section>
          <section><h2>Filamentos usados</h2><FilamentList project={project} /></section>
          <section className="avoid-break"><h2>Composición del costo</h2><CostChart slices={costSlices(r)} total={r.totalCost} /></section>
          {r.warnings.length > 0 && <section><h2>Advertencias</h2>{r.warnings.map((w) => <p key={w}>{w}</p>)}</section>}
          {project.notes && <section><h2>Notas internas</h2><p className="pre">{project.notes}</p></section>}
        </article>
      )}
    </div>
  );
}
