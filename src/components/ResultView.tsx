import type { Project } from '../models/types';
import { formatGrams, formatHours, formatMoney, formatNumber, formatPct, formatPerGram } from '../utils/format';
import { CostChart, costSlices } from './CostChart';
import { Icon } from './Icon';

function Card({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: 'accent' | 'primary' }) {
  return (
    <div className={`result-card${tone ? ` ${tone}` : ''}`}>
      <p className="result-label">{label}</p>
      <p className="result-value">{value}</p>
      {note && <p className="result-note">{note}</p>}
    </div>
  );
}

interface Row { label: string; value: number; note?: string; strong?: boolean; negative?: boolean }

export function breakdownRows(p: Project): Row[] {
  const r = p.result;
  const rows: Row[] = [];
  if (r.hasGramBreakdown) {
    rows.push({ label: 'Modelo', value: r.modelCost }, { label: 'Soportes', value: r.supportCost }, { label: 'Purga o torre', value: r.purgeCost });
    if (Math.abs(r.unclassifiedFilamentCost) > 0.005) rows.push({ label: 'Filamento sin clasificar', value: r.unclassifiedFilamentCost });
  } else {
    rows.push({ label: 'Filamento total', value: r.filamentCost });
  }
  rows.push(
    { label: 'Electricidad', value: r.electricityCost },
    { label: 'Desgaste de la impresora', value: r.wearCost },
    { label: 'Mantenimiento', value: r.maintenanceCost },
    { label: 'Mano de obra', value: r.laborCost, note: r.activeMinutes > 0 ? `${formatNumber(r.activeMinutes, 0)} min activos` : undefined },
    { label: 'Reserva por fallos', value: r.failureReserve, note: `${formatPct(r.effective.failureRatePct)} de fallos` },
    { label: 'Empaque', value: r.packagingCost },
    { label: 'Entrega', value: r.deliveryCost },
    { label: 'Otros gastos', value: r.otherCosts },
    { label: 'Costo total', value: r.totalCost, strong: true },
    { label: 'Comisiones', value: r.commissionTotal, note: `${formatPct(r.effective.commissionPct)} + ${formatMoney(r.effective.commissionFixed)} fijos` },
    { label: 'Ganancia', value: r.profit, strong: true },
  );
  return rows;
}

export function BreakdownTable({ project }: { project: Project }) {
  const rows = breakdownRows(project);
  return (
    <table className="breakdown">
      <caption className="sr-only">Desglose de costos</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className={row.strong ? 'strong' : row.value === 0 ? 'zero' : undefined}>
            <th scope="row">
              {row.label}
              {row.note && <small>{row.note}</small>}
            </th>
            <td>{formatMoney(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function FilamentList({ project }: { project: Project }) {
  return (
    <ul className="plain-list">
      {project.input.usages.map((u, i) => (
        <li key={`${u.filamentId}-${i}`}>
          <span>{u.label}</span>
          <span>{formatGrams(u.grams)} × {formatPerGram(u.costPerGram)} = <strong>{formatMoney(u.grams * u.costPerGram)}</strong></span>
        </li>
      ))}
    </ul>
  );
}

export function ResultView({ project }: { project: Project }) {
  const r = project.result;
  const n = r.pieces;
  const units = `${n} ${n === 1 ? 'pieza' : 'piezas'}`;
  return (
    <div className="stack">
      {r.warnings.length > 0 && (
        <div className="callout warn" role="alert">
          <Icon name="alert" />
          <div>{r.warnings.map((w) => <p key={w}>{w}</p>)}</div>
        </div>
      )}

      <section aria-label="Resultados" className="result-grid">
        <Card label="Costo total de producción" value={formatMoney(r.totalCost)} note={units} tone="primary" />
        <Card label="Costo por unidad" value={formatMoney(r.costPerUnit)} />
        <Card label="Precio mínimo para no perder" value={formatMoney(r.minPrice)} note={`${formatMoney(r.minPricePerUnit)} por unidad`} />
        <Card label="Precio recomendado" value={formatMoney(r.recommendedPrice)} note={`${formatMoney(r.recommendedPricePerUnit)} por unidad`} tone="accent" />
        <Card label="Ganancia estimada total" value={formatMoney(r.profit)} />
        <Card label="Ganancia por unidad" value={formatMoney(r.profitPerUnit)} />
        <Card label="Margen real" value={formatPct(r.realMarginPct)} note="Sobre el precio de venta" />
        <Card label="Tiempo de impresión" value={formatHours(r.printHours)} />
        <Card label="Filamento total utilizado" value={formatGrams(r.totalGrams)} />
      </section>

      <div className="two-col">
        <section className="card">
          <h2>Desglose</h2>
          <BreakdownTable project={project} />
        </section>
        <section className="card">
          <h2>¿Dónde se va el costo?</h2>
          <CostChart slices={costSlices(r)} total={r.totalCost} />
        </section>
      </div>

      <section className="card">
        <h2>Filamentos usados</h2>
        <FilamentList project={project} />
      </section>
    </div>
  );
}
