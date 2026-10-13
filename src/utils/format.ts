const LOCALE = 'es-GT';
const money = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Redondeo a 2 decimales SOLO para mostrar. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

export function formatMoney(n: number): string {
  const v = round2(n);
  return `${v < 0 ? '-' : ''}Q${money.format(Math.abs(v))}`;
}

/** Costo por gramo con 4 decimales (los valores son muy pequeños). */
export function formatPerGram(n: number): string {
  return `Q${n.toFixed(4)}/g`;
}

export function formatNumber(n: number, maxDecimals = 1): string {
  return new Intl.NumberFormat(LOCALE, { maximumFractionDigits: maxDecimals }).format(n);
}

export const formatGrams = (g: number): string => `${formatNumber(g, 1)} g`;
export const formatPct = (n: number): string => `${formatNumber(n, 1)} %`;

export function formatHours(hours: number): string {
  const total = Math.round(hours * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(LOCALE, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
