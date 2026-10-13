/**
 * Módulo ÚNICO de fórmulas de Costo3D.
 * Funciones puras: no leen almacenamiento ni interfaz.
 * Los porcentajes entran como número humano (10 = 10 %).
 * Se conserva precisión completa; el redondeo es solo para mostrar (ver utils/format.ts).
 */
import type { AdvancedInput, CalcResult, CalcSettings, Filament, ProjectInput, Settings } from '../models/types';

/** La tasa de fallos se limita por debajo de 100 % para evitar divisiones inválidas. */
export const MAX_FAILURE_PCT = 99;
/** Diferencia máxima (en gramos) entre el desglose y el total antes de advertir. */
export const GRAM_TOLERANCE = 0.1;

const positive = (n: number | null | undefined): number => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/** 1. Costo por gramo = (precio de bobina + envío + impuestos) / gramos de la bobina. */
export function costPerGram(f: Pick<Filament, 'spoolPrice' | 'shippingAndTaxes' | 'spoolWeightGrams'>): number {
  if (!(f.spoolWeightGrams > 0)) return 0;
  return (f.spoolPrice + f.shippingAndTaxes) / f.spoolWeightGrams;
}

/** 1. Costo de filamento usado = gramos × costo por gramo. */
export function filamentCost(grams: number, costPerGramValue: number): number {
  return grams * costPerGramValue;
}

/** 2. Costo eléctrico = (watts / 1000) × horas × precio por kWh. */
export function electricityCost(watts: number, hours: number, pricePerKwh: number): number {
  return (watts / 1000) * hours * pricePerKwh;
}

/** 3. Desgaste = (inversión / vida útil en horas) × horas de impresión. */
export function wearCost(investment: number, lifetimeHours: number, hours: number): number {
  if (!(lifetimeHours > 0)) return 0;
  return (investment / lifetimeHours) * hours;
}

/** 4. Reserva de mantenimiento = desgaste × porcentaje de mantenimiento. */
export function maintenanceReserve(wear: number, maintenancePct: number): number {
  return wear * (maintenancePct / 100);
}

/** 5. Mano de obra = minutos activos / 60 × valor de la hora (nunca las horas de máquina). */
export function laborCost(activeMinutes: number, hourValue: number): number {
  return (activeMinutes / 60) * hourValue;
}

/** Tasa de fallos acotada a [0, 99] %. */
export function clampFailureRate(ratePct: number): number {
  if (!Number.isFinite(ratePct) || ratePct < 0) return 0;
  return Math.min(ratePct, MAX_FAILURE_PCT);
}

/** 7. Reserva por fallos = subtotal × tasa / (1 − tasa). */
export function failureReserve(subtotal: number, failureRatePct: number): number {
  const rate = clampFailureRate(failureRatePct) / 100;
  return (subtotal * rate) / (1 - rate);
}

/** 10. Precio mínimo = (costo total + comisión fija) / (1 − comisión %). */
export function minimumPrice(totalCost: number, commissionFixed: number, commissionPct: number): number {
  return (totalCost + commissionFixed) / (1 - commissionPct / 100);
}

/** 11. Precio recomendado = (costo total + comisión fija) / (1 − comisión % − margen deseado). */
export function recommendedPrice(
  totalCost: number,
  commissionFixed: number,
  commissionPct: number,
  marginPct: number,
): number {
  return (totalCost + commissionFixed) / (1 - commissionPct / 100 - marginPct / 100);
}

/** Datos ya resueltos (sin textos ni valores por defecto pendientes) para calcular. */
export interface CalcInput {
  printHours: number;
  pieces: number;
  filaments: { grams: number; costPerGram: number }[];
  modelGrams: number | null;
  supportGrams: number | null;
  purgeGrams: number | null;
  prepMinutes: number;
  designMinutes: number;
  finishMinutes: number;
  packagingCost: number;
  deliveryCost: number;
  otherCosts: number;
  commissionPct: number;
  commissionFixed: number;
  marginPct: number;
  settings: CalcSettings;
}

/** Combina los datos del proyecto con la configuración (aplica valores predeterminados). */
export function buildCalcInput(input: ProjectInput, settings: Settings | CalcSettings): CalcInput {
  const a: AdvancedInput = input.advanced;
  return {
    printHours: input.hours + input.minutes / 60,
    pieces: input.pieces,
    filaments: input.usages.map((u) => ({ grams: u.grams, costPerGram: u.costPerGram })),
    modelGrams: a.modelGrams,
    supportGrams: a.supportGrams,
    purgeGrams: a.purgeGrams,
    prepMinutes: a.prepMinutes,
    designMinutes: a.designMinutes,
    finishMinutes: a.finishMinutes,
    packagingCost: a.packagingCost ?? settings.defaultPackagingCost,
    deliveryCost: a.deliveryCost,
    otherCosts: a.otherCosts,
    commissionPct: a.commissionPct ?? settings.commissionPct,
    commissionFixed: a.commissionFixed ?? settings.commissionFixed,
    marginPct: a.marginPct ?? settings.profitMarginPct,
    settings,
  };
}

/** Devuelve mensajes comprensibles; lista vacía = datos válidos. */
export function validateCalcInput(i: CalcInput): string[] {
  const errors: string[] = [];
  const nums: [string, number | null][] = [
    ['las horas de impresión', i.printHours],
    ['los gramos del modelo', i.modelGrams],
    ['los gramos de soportes', i.supportGrams],
    ['los gramos de purga', i.purgeGrams],
    ['los minutos de preparación', i.prepMinutes],
    ['los minutos de diseño', i.designMinutes],
    ['los minutos de acabado', i.finishMinutes],
    ['el costo de empaque', i.packagingCost],
    ['el costo de entrega', i.deliveryCost],
    ['otros gastos', i.otherCosts],
    ['la comisión porcentual', i.commissionPct],
    ['la comisión fija', i.commissionFixed],
    ['el margen de ganancia', i.marginPct],
  ];
  for (const [label, v] of nums) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) errors.push(`Revisa ${label}: no puede ser negativo.`);
  }
  if (!(i.printHours > 0)) errors.push('Indica el tiempo de impresión (horas y/o minutos).');
  if (!Number.isInteger(i.pieces) || i.pieces < 1) errors.push('La cantidad de piezas debe ser un número entero de 1 o más.');
  if (!i.filaments.length || !i.filaments.some((f) => f.grams > 0)) errors.push('Indica los gramos de filamento consumidos.');
  if (i.filaments.some((f) => !Number.isFinite(f.grams) || f.grams < 0 || !Number.isFinite(f.costPerGram) || f.costPerGram < 0)) {
    errors.push('Revisa los filamentos: los gramos y el costo por gramo no pueden ser negativos.');
  }
  if (i.commissionPct + i.marginPct >= 100) {
    errors.push('La comisión porcentual y el margen de ganancia suman 100 % o más. Reduce alguno de los dos.');
  }
  if (!(i.settings.printerLifetimeHours > 0)) errors.push('En Configuración, la vida útil de la impresora debe ser mayor que 0 horas.');
  return errors;
}

export class CalculationError extends Error {
  readonly details: string[];
  constructor(details: string[]) {
    super(details.join(' '));
    this.name = 'CalculationError';
    this.details = details;
  }
}

/** 12–13 y resto de fórmulas: calcula el resultado completo de un proyecto. */
export function calculateProject(i: CalcInput): CalcResult {
  const errors = validateCalcInput(i);
  if (errors.length) throw new CalculationError(errors);

  const s = i.settings;
  const warnings: string[] = [];
  const totalGrams = i.filaments.reduce((sum, f) => sum + f.grams, 0);
  const filamentTotal = i.filaments.reduce((sum, f) => sum + filamentCost(f.grams, f.costPerGram), 0);
  const avgCostPerGram = totalGrams > 0 ? filamentTotal / totalGrams : 0;

  const model = positive(i.modelGrams);
  const support = positive(i.supportGrams);
  const purge = positive(i.purgeGrams);
  const hasGramBreakdown = model + support + purge > 0;
  const modelCost = filamentCost(model, avgCostPerGram);
  const supportCost = filamentCost(support, avgCostPerGram);
  const purgeCost = filamentCost(purge, avgCostPerGram);
  const unclassifiedFilamentCost = hasGramBreakdown ? filamentTotal - (modelCost + supportCost + purgeCost) : 0;
  if (hasGramBreakdown && Math.abs(model + support + purge - totalGrams) > GRAM_TOLERANCE) {
    warnings.push(
      `La suma de modelo, soportes y purga (${round1(model + support + purge)} g) no coincide con el consumo total (${round1(totalGrams)} g).`,
    );
  }

  const electricity = electricityCost(s.powerWatts, i.printHours, s.electricityPricePerKwh);
  const wear = wearCost(s.printerInvestment, s.printerLifetimeHours, i.printHours);
  const maintenance = maintenanceReserve(wear, s.maintenancePct);
  const activeMinutes = i.prepMinutes + i.designMinutes + i.finishMinutes;
  const labor = laborCost(activeMinutes, s.laborHourValue);

  const productionSubtotal =
    filamentTotal + electricity + wear + maintenance + labor + i.packagingCost + i.deliveryCost + i.otherCosts;
  if (s.failureRatePct > MAX_FAILURE_PCT) {
    warnings.push(`La tasa de fallos se limitó a ${MAX_FAILURE_PCT} %.`);
  }
  const failures = failureReserve(productionSubtotal, s.failureRatePct);
  const totalCost = productionSubtotal + failures;
  const costPerUnit = totalCost / i.pieces;

  const minPrice = minimumPrice(totalCost, i.commissionFixed, i.commissionPct);
  const price = recommendedPrice(totalCost, i.commissionFixed, i.commissionPct, i.marginPct);
  const commissionTotal = price * (i.commissionPct / 100) + i.commissionFixed;
  const profit = price - totalCost - commissionTotal;

  return {
    printHours: i.printHours,
    totalGrams,
    pieces: i.pieces,
    filamentCost: filamentTotal,
    hasGramBreakdown,
    modelCost,
    supportCost,
    purgeCost,
    unclassifiedFilamentCost,
    electricityCost: electricity,
    wearCost: wear,
    maintenanceCost: maintenance,
    activeMinutes,
    laborCost: labor,
    packagingCost: i.packagingCost,
    deliveryCost: i.deliveryCost,
    otherCosts: i.otherCosts,
    productionSubtotal,
    failureReserve: failures,
    totalCost,
    costPerUnit,
    minPrice,
    minPricePerUnit: minPrice / i.pieces,
    recommendedPrice: price,
    recommendedPricePerUnit: price / i.pieces,
    commissionTotal,
    profit,
    profitPerUnit: profit / i.pieces,
    realMarginPct: price > 0 ? (profit / price) * 100 : 0,
    effective: {
      commissionPct: i.commissionPct,
      commissionFixed: i.commissionFixed,
      marginPct: i.marginPct,
      failureRatePct: clampFailureRate(s.failureRatePct),
    },
    warnings,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
