import type { CalcResult } from '../models/types';
import { formatMoney, formatPct } from '../utils/format';

export interface Slice { label: string; value: number; color: string }

const COLORS = ['#12305a', '#f26a1b', '#3d7bd9', '#f5a35c', '#5f8f9e', '#8a6fd1', '#2e9e6f', '#c9a227', '#9aa5b8'];

/** Elementos del costo total, de mayor a menor (solo los que tienen valor). */
export function costSlices(r: CalcResult): Slice[] {
  const raw: [string, number][] = [
    ['Filamento', r.filamentCost],
    ['Electricidad', r.electricityCost],
    ['Desgaste', r.wearCost],
    ['Mantenimiento', r.maintenanceCost],
    ['Mano de obra', r.laborCost],
    ['Fallos', r.failureReserve],
    ['Empaque', r.packagingCost],
    ['Entrega', r.deliveryCost],
    ['Otros gastos', r.otherCosts],
  ];
  return raw
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: COLORS[i % COLORS.length] }));
}

export function CostChart({ slices, total }: { slices: Slice[]; total: number }) {
  const R = 60;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const description = slices.map((s) => `${s.label} ${formatPct((s.value / total) * 100)}`).join(', ');
  return (
    <div className="chart">
      <svg viewBox="0 0 160 160" role="img" aria-label={`Composición del costo total: ${description}`} className="donut">
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={R} fill="none" stroke="var(--border)" strokeWidth="22" />
          {slices.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.label} cx="80" cy="80" r={R} fill="none" stroke={s.color} strokeWidth="22"
                strokeDasharray={`${Math.max(len - 1, 0)} ${C - Math.max(len - 1, 0)}`} strokeDashoffset={-offset}
              />
            );
            offset += len;
            return el;
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="donut-label">Costo total</text>
        <text x="80" y="95" textAnchor="middle" className="donut-value">{formatMoney(total)}</text>
      </svg>
      <ul className="legend">
        {slices.map((s) => (
          <li key={s.label}>
            <span className="swatch" style={{ background: s.color }} aria-hidden="true" />
            <span className="legend-name">{s.label}</span>
            <span className="legend-pct">{formatPct((s.value / total) * 100)}</span>
            <span className="legend-value">{formatMoney(s.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
