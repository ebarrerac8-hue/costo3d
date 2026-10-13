import { FILAMENT_TYPES, PROJECT_STATUSES, type AppData, type Filament, type Project, type Settings } from '../models/types';
import { DEFAULT_SETTINGS } from './defaults';
import { migrateToCurrent, StorageError } from './migrations';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isNonNeg = (v: unknown): v is number => isNum(v) && v >= 0;
const isNumOrNull = (v: unknown): boolean => v === null || isNonNeg(v);

const SETTINGS_NUMBERS: (keyof Settings)[] = [
  'printerInvestment', 'printerLifetimeHours', 'powerWatts', 'electricityPricePerKwh', 'maintenancePct',
  'failureRatePct', 'laborHourValue', 'profitMarginPct', 'commissionPct', 'commissionFixed', 'defaultPackagingCost',
];

const RESULT_NUMBERS = [
  'printHours', 'totalGrams', 'pieces', 'filamentCost', 'modelCost', 'supportCost', 'purgeCost',
  'unclassifiedFilamentCost', 'electricityCost', 'wearCost', 'maintenanceCost', 'activeMinutes', 'laborCost',
  'packagingCost', 'deliveryCost', 'otherCosts', 'productionSubtotal', 'failureReserve', 'totalCost', 'costPerUnit',
  'minPrice', 'minPricePerUnit', 'recommendedPrice', 'recommendedPricePerUnit', 'commissionTotal', 'profit',
  'profitPerUnit', 'realMarginPct',
];

const ADVANCED_NULLABLE = [
  'modelGrams', 'supportGrams', 'purgeGrams', 'packagingCost', 'commissionPct', 'commissionFixed', 'marginPct',
];
const ADVANCED_NUMBERS = ['prepMinutes', 'designMinutes', 'finishMinutes', 'deliveryCost', 'otherCosts'];

function checkSettings(raw: unknown, errors: string[]): Settings | null {
  if (!isObj(raw)) {
    errors.push('Falta la configuración general.');
    return null;
  }
  const s = { ...DEFAULT_SETTINGS, ...raw } as Obj;
  for (const k of SETTINGS_NUMBERS) {
    if (!isNonNeg(s[k])) errors.push(`Configuración: el campo "${k}" no es un número válido.`);
  }
  if (!isStr(s.printerName)) errors.push('Configuración: el nombre de la impresora no es válido.');
  if (!isStr(s.businessName)) s.businessName = '';
  if (typeof s.setupCompleted !== 'boolean') errors.push('Configuración: "setupCompleted" no es válido.');
  if (!(s.usdToGtq === null || (isNum(s.usdToGtq) && s.usdToGtq > 0))) errors.push('Configuración: el tipo de cambio no es válido.');
  s.currency = 'GTQ';
  return errors.length ? null : (s as unknown as Settings);
}

function checkFilament(raw: unknown, index: number, errors: string[]): Filament | null {
  const tag = `Filamento ${index + 1}`;
  if (!isObj(raw)) {
    errors.push(`${tag}: formato no válido.`);
    return null;
  }
  const before = errors.length;
  if (!isStr(raw.id) || !raw.id) errors.push(`${tag}: falta el identificador.`);
  if (!isStr(raw.brand) || !isStr(raw.name)) errors.push(`${tag}: marca o nombre no válidos.`);
  if (!FILAMENT_TYPES.includes(raw.type as never)) errors.push(`${tag}: tipo no válido.`);
  if (!isNonNeg(raw.spoolPrice) || !isNonNeg(raw.shippingAndTaxes)) errors.push(`${tag}: precio o envío no válidos.`);
  if (!isNum(raw.spoolWeightGrams) || raw.spoolWeightGrams <= 0) errors.push(`${tag}: el peso de la bobina debe ser mayor que 0.`);
  if (!isStr(raw.color)) errors.push(`${tag}: color no válido.`);
  if (!isStr(raw.createdAt) || !isStr(raw.updatedAt)) errors.push(`${tag}: fechas no válidas.`);
  return errors.length === before ? (raw as unknown as Filament) : null;
}

function checkProject(raw: unknown, index: number, errors: string[]): Project | null {
  const tag = `Proyecto ${index + 1}`;
  if (!isObj(raw)) {
    errors.push(`${tag}: formato no válido.`);
    return null;
  }
  const before = errors.length;
  if (!isStr(raw.id) || !raw.id) errors.push(`${tag}: falta el identificador.`);
  if (!isStr(raw.name)) errors.push(`${tag}: falta el nombre.`);
  if (!isStr(raw.createdAt) || !isStr(raw.updatedAt)) errors.push(`${tag}: fechas no válidas.`);
  if (raw.status !== undefined && !PROJECT_STATUSES.includes(raw.status as never)) errors.push(`${tag}: estado no válido.`);
  if (raw.notes !== undefined && !isStr(raw.notes)) errors.push(`${tag}: notas no válidas.`);
  if (raw.quoteNotes !== undefined && !isStr(raw.quoteNotes)) errors.push(`${tag}: notas comerciales no válidas.`);

  const input = raw.input;
  if (!isObj(input)) {
    errors.push(`${tag}: faltan los datos ingresados.`);
  } else {
    if (!isNonNeg(input.hours) || !isNonNeg(input.minutes)) errors.push(`${tag}: tiempo no válido.`);
    if (!isNum(input.pieces) || input.pieces < 1) errors.push(`${tag}: cantidad de piezas no válida.`);
    if (typeof input.multicolor !== 'boolean') errors.push(`${tag}: modo multicolor no válido.`);
    if (!Array.isArray(input.usages) || input.usages.length < 1 || input.usages.length > 4) {
      errors.push(`${tag}: los filamentos no son válidos.`);
    } else if (
      !input.usages.every((u) => isObj(u) && isStr(u.filamentId) && isStr(u.label) && isNonNeg(u.grams) && isNonNeg(u.costPerGram))
    ) {
      errors.push(`${tag}: algún filamento tiene datos no válidos.`);
    }
    const adv = input.advanced;
    if (!isObj(adv)) {
      errors.push(`${tag}: faltan los costos adicionales.`);
    } else if (!ADVANCED_NULLABLE.every((k) => isNumOrNull(adv[k])) || !ADVANCED_NUMBERS.every((k) => isNonNeg(adv[k]))) {
      errors.push(`${tag}: costos adicionales no válidos.`);
    }
  }

  const result = raw.result;
  if (!isObj(result)) {
    errors.push(`${tag}: faltan los costos calculados.`);
  } else {
    if (!RESULT_NUMBERS.every((k) => isNum(result[k]))) errors.push(`${tag}: costos calculados no válidos.`);
    if (!Array.isArray(result.warnings) || !result.warnings.every(isStr)) errors.push(`${tag}: advertencias no válidas.`);
    if (!isObj(result.effective)) errors.push(`${tag}: parámetros efectivos no válidos.`);
    if (typeof result.hasGramBreakdown !== 'boolean') errors.push(`${tag}: desglose de gramos no válido.`);
  }
  return errors.length === before ? (raw as unknown as Project) : null;
}

export type ParseResult = { ok: true; data: AppData } | { ok: false; errors: string[] };

/**
 * Valida y migra datos de cualquier origen (almacenamiento local o archivo de respaldo).
 * Devuelve datos listos para usar o una lista de problemas comprensibles.
 */
export function parseAppData(raw: unknown): ParseResult {
  if (!isObj(raw)) return { ok: false, errors: ['El contenido no tiene el formato esperado.'] };
  let migrated: Obj;
  try {
    migrated = migrateToCurrent(raw);
  } catch (e) {
    return { ok: false, errors: [e instanceof StorageError ? e.message : 'No se pudo leer la versión de los datos.'] };
  }
  const errors: string[] = [];
  const settings = checkSettings(migrated.settings, errors);
  const filamentsRaw = Array.isArray(migrated.filaments) ? migrated.filaments : (errors.push('Falta la lista de filamentos.'), []);
  const projectsRaw = Array.isArray(migrated.projects) ? migrated.projects : (errors.push('Falta la lista de proyectos.'), []);
  const filaments = filamentsRaw.map((f, i) => checkFilament(f, i, errors));
  const projects = projectsRaw.map((p, i) => checkProject(p, i, errors));
  const ids = new Set<string>();
  for (const item of [...filaments, ...projects]) {
    if (item) {
      if (ids.has(item.id)) errors.push(`Hay un identificador repetido (${item.id}).`);
      ids.add(item.id);
    }
  }
  const prefs = isObj(migrated.preferences) ? migrated.preferences : {};
  const theme = prefs.theme === 'light' || prefs.theme === 'dark' ? prefs.theme : 'system';
  if (errors.length || !settings) return { ok: false, errors: errors.slice(0, 8) };
  return {
    ok: true,
    data: {
      schemaVersion: migrated.schemaVersion as number,
      settings,
      filaments: filaments as Filament[],
      projects: projects as Project[],
      preferences: { theme },
    },
  };
}
