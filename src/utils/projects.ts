import type { Project, ProjectStatus } from '../models/types';

export interface Summary {
  count: number;
  quotedValue: number;
  profit: number;
  hours: number;
  grams: number;
}

export function summarize(projects: Project[]): Summary {
  return projects.reduce<Summary>(
    (s, p) => ({
      count: s.count + 1,
      quotedValue: s.quotedValue + p.result.recommendedPrice,
      profit: s.profit + p.result.profit,
      hours: s.hours + p.result.printHours,
      grams: s.grams + p.result.totalGrams,
    }),
    { count: 0, quotedValue: 0, profit: 0, hours: 0, grams: 0 },
  );
}

export type SortKey = 'date' | 'cost' | 'price';
export type SortDir = 'asc' | 'desc';

export function filterAndSort(
  projects: Project[],
  query: string,
  status: ProjectStatus | 'todos',
  sort: SortKey,
  dir: SortDir,
): Project[] {
  const q = query.trim().toLowerCase();
  const value = (p: Project): number =>
    sort === 'cost' ? p.result.totalCost : sort === 'price' ? p.result.recommendedPrice : new Date(p.createdAt).getTime();
  return projects
    .filter((p) => (status === 'todos' ? true : (p.status ?? 'cotizacion') === status))
    .filter((p) => (q ? p.name.toLowerCase().includes(q) : true))
    .sort((a, b) => (dir === 'asc' ? value(a) - value(b) : value(b) - value(a)));
}

/** Datos de la cotización (lo que ve el cliente). */
export function quoteLines(p: Project): { unitPrice: number; total: number; pieces: number } {
  const pieces = p.input.pieces;
  const total = Math.round((p.result.recommendedPrice + Number.EPSILON) * 100) / 100;
  const unitPrice = Math.round((p.result.recommendedPrice / pieces + Number.EPSILON) * 100) / 100;
  return { unitPrice, total, pieces };
}
