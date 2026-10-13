import type { Project } from '../models/types';
import { formatGrams, formatHours, formatMoney } from '../utils/format';
import { summarize } from '../utils/projects';

export function SummaryStrip({ projects }: { projects: Project[] }) {
  const s = summarize(projects);
  const items: [string, string][] = [
    ['Proyectos', String(s.count)],
    ['Valor total cotizado', formatMoney(s.quotedValue)],
    ['Ganancia estimada acumulada', formatMoney(s.profit)],
    ['Horas de impresión', formatHours(s.hours)],
    ['Filamento calculado', formatGrams(s.grams)],
  ];
  return (
    <dl className="summary">
      {items.map(([label, value]) => (
        <div key={label} className="summary-item">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
