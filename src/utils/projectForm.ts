import { buildCalcInput, calculateProject, validateCalcInput } from '../calculations/calculator';
import { costPerGram } from '../calculations/calculator';
import type {
  AdvancedInput, CalcResult, Filament, FilamentUsage, Project, ProjectFormState, ProjectInput, Settings,
} from '../models/types';
import { isInvalid, parseNumber } from './parse';

export const MAX_COLORS = 4;
export const filamentLabel = (f: Pick<Filament, 'brand' | 'name'>): string => [f.brand, f.name].filter(Boolean).join(' ');

const emptyAdv = (): ProjectFormState['adv'] => ({
  modelGrams: '', supportGrams: '', purgeGrams: '', prepMinutes: '', designMinutes: '', finishMinutes: '',
  packagingCost: '', deliveryCost: '', otherCosts: '', commissionPct: '', commissionFixed: '', marginPct: '',
});

export function emptyForm(defaultFilamentId = ''): ProjectFormState {
  return {
    name: '', hours: '', minutes: '', multicolor: false,
    usages: [{ filamentId: defaultFilamentId, grams: '' }],
    pieces: '1', adv: emptyAdv(), notes: '', quoteNotes: '',
  };
}

const text = (n: number | null): string => (n === null ? '' : String(n));
const textIfPositive = (n: number): string => (n > 0 ? String(n) : '');

export function formFromProject(p: Project): ProjectFormState {
  const a = p.input.advanced;
  return {
    name: p.name,
    hours: textIfPositive(p.input.hours),
    minutes: textIfPositive(p.input.minutes),
    multicolor: p.input.multicolor,
    usages: p.input.usages.map((u) => ({ filamentId: u.filamentId, grams: String(u.grams) })),
    pieces: String(p.input.pieces),
    adv: {
      modelGrams: text(a.modelGrams), supportGrams: text(a.supportGrams), purgeGrams: text(a.purgeGrams),
      prepMinutes: textIfPositive(a.prepMinutes), designMinutes: textIfPositive(a.designMinutes),
      finishMinutes: textIfPositive(a.finishMinutes), packagingCost: text(a.packagingCost),
      deliveryCost: textIfPositive(a.deliveryCost), otherCosts: textIfPositive(a.otherCosts),
      commissionPct: text(a.commissionPct), commissionFixed: text(a.commissionFixed), marginPct: text(a.marginPct),
    },
    notes: p.notes ?? '',
    quoteNotes: p.quoteNotes ?? '',
  };
}

/** True si el formulario no tiene nada escrito (se ignora el filamento preseleccionado). */
export function isFormPristine(f: ProjectFormState): boolean {
  return (
    f.name.trim() === '' && f.hours === '' && f.minutes === '' && !f.multicolor && f.pieces === '1' &&
    f.usages.length === 1 && f.usages[0].grams === '' &&
    Object.values(f.adv).every((v) => v === '') && f.notes === '' && f.quoteNotes === ''
  );
}

export function hasAdvancedValues(f: ProjectFormState): boolean {
  return Object.values(f.adv).some((v) => v !== '') || f.notes !== '' || f.quoteNotes !== '';
}

/** Comparación en vivo entre el desglose de gramos y el consumo total. */
export function gramBreakdownCheck(f: ProjectFormState): { total: number; breakdown: number; mismatch: boolean } {
  const active = f.multicolor ? f.usages : f.usages.slice(0, 1);
  const total = active.reduce((s, u) => s + (parseNumber(u.grams) || 0), 0);
  const parts = [f.adv.modelGrams, f.adv.supportGrams, f.adv.purgeGrams].map((v) => parseNumber(v));
  const entered = parts.some((p) => p !== null && !Number.isNaN(p) && p > 0);
  const breakdown = parts.reduce<number>((s, p) => s + (p && !Number.isNaN(p) ? p : 0), 0);
  return { total, breakdown, mismatch: entered && total > 0 && Math.abs(breakdown - total) > 0.1 };
}

export interface ParsedForm {
  fieldErrors: Record<string, string>;
  formErrors: string[];
  input?: ProjectInput;
  result?: CalcResult;
}

/**
 * Convierte el formulario (texto) en datos del proyecto y calcula el resultado.
 * previousUsages: usos del proyecto que se está editando, para conservar el costo de filamentos eliminados.
 */
export function parseProjectForm(
  form: ProjectFormState,
  filaments: Filament[],
  settings: Settings,
  previousUsages: FilamentUsage[] = [],
): ParsedForm {
  const fieldErrors: Record<string, string> = {};

  /** Lee un número: vacío → null; inválido o fuera de rango → error. */
  const read = (key: string, value: string, label: string, opts: { max?: number; integer?: boolean; min?: number } = {}): number | null => {
    const n = parseNumber(value);
    if (n === null) return null;
    if (isInvalid(n)) fieldErrors[key] = `${label}: escribe un número.`;
    else if (n < (opts.min ?? 0)) fieldErrors[key] = `${label}: no puede ser negativo.`;
    else if (opts.max !== undefined && n > opts.max) fieldErrors[key] = `${label}: el máximo es ${opts.max}.`;
    else if (opts.integer && !Number.isInteger(n)) fieldErrors[key] = `${label}: usa un número entero.`;
    else return n;
    return null;
  };

  const name = form.name.trim();
  if (!name) fieldErrors.name = 'Escribe un nombre para el proyecto.';
  else if (name.length > 80) fieldErrors.name = 'El nombre es demasiado largo (máximo 80 caracteres).';

  const hours = read('hours', form.hours, 'Horas') ?? 0;
  const minutes = read('minutes', form.minutes, 'Minutos', { max: 59 }) ?? 0;
  if (!fieldErrors.hours && !fieldErrors.minutes && hours === 0 && minutes === 0) {
    fieldErrors.time = 'Indica el tiempo de impresión que muestra Flash Studio.';
  }

  const piecesN = read('pieces', form.pieces, 'Cantidad de piezas', { integer: true });
  if (piecesN === null && !fieldErrors.pieces) fieldErrors.pieces = 'Indica cuántas piezas produces.';
  else if (piecesN !== null && piecesN < 1) fieldErrors.pieces = 'Debe ser al menos 1 pieza.';

  const active = (form.multicolor ? form.usages : form.usages.slice(0, 1)).slice(0, MAX_COLORS);
  const usages: FilamentUsage[] = [];
  active.forEach((u, i) => {
    const grams = read(`usage-${i}-grams`, u.grams, 'Gramos');
    if (grams === null && !fieldErrors[`usage-${i}-grams`]) fieldErrors[`usage-${i}-grams`] = 'Indica los gramos consumidos.';
    else if (grams !== null && grams <= 0) fieldErrors[`usage-${i}-grams`] = 'Los gramos deben ser mayores que 0.';
    const profile = filaments.find((f) => f.id === u.filamentId);
    const previous = previousUsages.find((p) => p.filamentId === u.filamentId);
    if (!u.filamentId || (!profile && !previous)) {
      fieldErrors[`usage-${i}-filament`] = 'Elige un perfil de filamento.';
    } else if (grams !== null && grams > 0) {
      usages.push(
        profile
          ? { filamentId: profile.id, grams, label: filamentLabel(profile), costPerGram: costPerGram(profile) }
          : { filamentId: previous!.filamentId, grams, label: previous!.label, costPerGram: previous!.costPerGram },
      );
    }
  });

  const a = form.adv;
  const advanced: AdvancedInput = {
    modelGrams: read('adv.modelGrams', a.modelGrams, 'Gramos del modelo'),
    supportGrams: read('adv.supportGrams', a.supportGrams, 'Gramos de soportes'),
    purgeGrams: read('adv.purgeGrams', a.purgeGrams, 'Gramos de purga'),
    prepMinutes: read('adv.prepMinutes', a.prepMinutes, 'Minutos de preparación') ?? 0,
    designMinutes: read('adv.designMinutes', a.designMinutes, 'Minutos de diseño') ?? 0,
    finishMinutes: read('adv.finishMinutes', a.finishMinutes, 'Minutos de acabado') ?? 0,
    packagingCost: read('adv.packagingCost', a.packagingCost, 'Costo de empaque'),
    deliveryCost: read('adv.deliveryCost', a.deliveryCost, 'Costo de entrega') ?? 0,
    otherCosts: read('adv.otherCosts', a.otherCosts, 'Otros gastos') ?? 0,
    commissionPct: read('adv.commissionPct', a.commissionPct, 'Comisión porcentual', { max: 99 }),
    commissionFixed: read('adv.commissionFixed', a.commissionFixed, 'Comisión fija'),
    marginPct: read('adv.marginPct', a.marginPct, 'Margen de ganancia', { max: 99 }),
  };

  if (Object.keys(fieldErrors).length) return { fieldErrors, formErrors: [] };

  const input: ProjectInput = { hours, minutes, multicolor: form.multicolor, usages, pieces: piecesN as number, advanced };
  const calcInput = buildCalcInput(input, settings);
  const formErrors = validateCalcInput(calcInput);
  if (formErrors.length) return { fieldErrors, formErrors, input };
  return { fieldErrors, formErrors, input, result: calculateProject(calcInput) };
}
