/**
 * Convierte el texto de un campo numérico.
 * Devuelve null si está vacío y NaN si no es un número.
 */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : Number.NaN;
}

export const isInvalid = (n: number | null): n is number => typeof n === 'number' && Number.isNaN(n);
