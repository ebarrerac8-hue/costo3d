import { PROJECT_STATUSES, STATUS_LABELS, type ProjectStatus } from '../models/types';

export function StatusBadge({ status }: { status?: ProjectStatus }) {
  const s = status ?? 'cotizacion';
  return <span className={`badge status-${s}`}>{STATUS_LABELS[s]}</span>;
}

export function StatusSelect({ id, value, onChange }: { id: string; value?: ProjectStatus; onChange: (s: ProjectStatus) => void }) {
  return (
    <select id={id} className="status-select" value={value ?? 'cotizacion'} onChange={(e) => onChange(e.target.value as ProjectStatus)} aria-label="Estado del proyecto">
      {PROJECT_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
    </select>
  );
}
