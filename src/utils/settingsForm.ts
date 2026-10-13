import type { Settings } from '../models/types';
import { isInvalid, parseNumber } from './parse';

export type SettingsKey =
  | 'printerName' | 'businessName' | 'printerInvestment' | 'printerLifetimeHours' | 'powerWatts'
  | 'electricityPricePerKwh' | 'maintenancePct' | 'failureRatePct' | 'laborHourValue' | 'profitMarginPct'
  | 'commissionPct' | 'commissionFixed' | 'defaultPackagingCost' | 'usdToGtq';

export interface SettingsFieldDef {
  key: SettingsKey;
  label: string;
  hint: string;
  kind: 'text' | 'number';
  prefix?: string;
  suffix?: string;
  /** Debe ser mayor que 0. */
  positive?: boolean;
  max?: number;
  optional?: boolean;
}

export const SETTINGS_FIELDS: Record<SettingsKey, SettingsFieldDef> = {
  printerName: { key: 'printerName', label: 'Nombre de la impresora', hint: 'Se muestra en los informes.', kind: 'text' },
  businessName: { key: 'businessName', label: 'Nombre de tu negocio (opcional)', hint: 'Aparece en la parte superior de la cotización.', kind: 'text', optional: true },
  printerInvestment: { key: 'printerInvestment', label: 'Inversión total de la impresora', hint: 'Compra + envío + impuestos.', kind: 'number', prefix: 'Q', positive: true },
  printerLifetimeHours: { key: 'printerLifetimeHours', label: 'Vida útil estimada', hint: 'Horas de impresión que esperas obtener de ella.', kind: 'number', suffix: 'horas', positive: true },
  powerWatts: { key: 'powerWatts', label: 'Consumo eléctrico promedio', hint: 'Promedio durante una impresión, no el máximo.', kind: 'number', suffix: 'W' },
  electricityPricePerKwh: { key: 'electricityPricePerKwh', label: 'Precio de la electricidad', hint: 'Lo encuentras en tu recibo, por kWh.', kind: 'number', prefix: 'Q', suffix: 'por kWh' },
  maintenancePct: { key: 'maintenancePct', label: 'Reserva de mantenimiento', hint: 'Porcentaje que se suma al desgaste.', kind: 'number', suffix: '%', max: 100 },
  failureRatePct: { key: 'failureRatePct', label: 'Impresiones fallidas', hint: 'Porcentaje de impresiones que salen mal.', kind: 'number', suffix: '%', max: 99 },
  laborHourValue: { key: 'laborHourValue', label: 'Valor de una hora de trabajo', hint: 'Solo se cobra el tiempo activo que tú dedicas.', kind: 'number', prefix: 'Q', suffix: 'por hora' },
  profitMarginPct: { key: 'profitMarginPct', label: 'Ganancia deseada', hint: 'Porcentaje del precio de venta que queda como ganancia.', kind: 'number', suffix: '%', max: 99 },
  commissionPct: { key: 'commissionPct', label: 'Comisión porcentual por venta', hint: 'Porcentaje del precio que cobra la plataforma o el cobro.', kind: 'number', suffix: '%', max: 99 },
  commissionFixed: { key: 'commissionFixed', label: 'Comisión fija por venta', hint: 'Monto fijo por cada venta.', kind: 'number', prefix: 'Q' },
  defaultPackagingCost: { key: 'defaultPackagingCost', label: 'Costo de empaque predeterminado', hint: 'Se usa cuando el proyecto no indica otro.', kind: 'number', prefix: 'Q' },
  usdToGtq: { key: 'usdToGtq', label: 'Quetzales por cada dólar (opcional)', hint: 'Si lo llenas, podrás escribir precios de filamento en dólares.', kind: 'number', prefix: 'Q', suffix: 'por US$1', positive: true, optional: true },
};

export const SETTINGS_GROUPS: { title: string; description: string; keys: SettingsKey[] }[] = [
  { title: 'Tu impresora', description: 'Datos para repartir el costo de la máquina entre cada impresión.', keys: ['printerName', 'businessName', 'printerInvestment', 'printerLifetimeHours', 'powerWatts', 'electricityPricePerKwh'] },
  { title: 'Reservas', description: 'Dinero que conviene apartar por desgaste y errores.', keys: ['maintenancePct', 'failureRatePct'] },
  { title: 'Trabajo y ganancia', description: 'Cuánto vale tu tiempo y cuánto quieres ganar.', keys: ['laborHourValue', 'profitMarginPct'] },
  { title: 'Ventas y empaque', description: 'Valores generales; cada proyecto puede cambiarlos.', keys: ['commissionPct', 'commissionFixed', 'defaultPackagingCost'] },
  { title: 'Moneda', description: 'Todos los montos se calculan y muestran en quetzales (Q).', keys: ['usdToGtq'] },
];

export type SettingsForm = Record<SettingsKey, string>;
export type SettingsErrors = Partial<Record<SettingsKey, string>>;

export function settingsToForm(s: Settings): SettingsForm {
  return {
    printerName: s.printerName, businessName: s.businessName,
    printerInvestment: s.printerInvestment ? String(s.printerInvestment) : '',
    printerLifetimeHours: String(s.printerLifetimeHours), powerWatts: String(s.powerWatts),
    electricityPricePerKwh: String(s.electricityPricePerKwh), maintenancePct: String(s.maintenancePct),
    failureRatePct: String(s.failureRatePct), laborHourValue: String(s.laborHourValue),
    profitMarginPct: String(s.profitMarginPct), commissionPct: String(s.commissionPct),
    commissionFixed: String(s.commissionFixed), defaultPackagingCost: String(s.defaultPackagingCost),
    usdToGtq: s.usdToGtq === null ? '' : String(s.usdToGtq),
  };
}

/** Valida los campos indicados (por defecto todos). */
export function validateSettingsForm(form: SettingsForm, keys: SettingsKey[] = Object.keys(SETTINGS_FIELDS) as SettingsKey[]): SettingsErrors {
  const errors: SettingsErrors = {};
  for (const key of keys) {
    const def = SETTINGS_FIELDS[key];
    const value = form[key];
    if (def.kind === 'text') {
      if (!def.optional && value.trim() === '') errors[key] = 'Escribe un nombre.';
      else if (value.length > 60) errors[key] = 'Máximo 60 caracteres.';
      continue;
    }
    const n = parseNumber(value);
    if (n === null) {
      if (!def.optional) errors[key] = 'Este dato es necesario.';
    } else if (isInvalid(n)) errors[key] = 'Escribe un número.';
    else if (n < 0) errors[key] = 'No puede ser negativo.';
    else if (def.positive && n <= 0) errors[key] = 'Debe ser mayor que 0.';
    else if (def.max !== undefined && n > def.max) errors[key] = `El máximo es ${def.max}.`;
  }
  if (keys.includes('profitMarginPct') || keys.includes('commissionPct')) {
    const c = parseNumber(form.commissionPct) ?? 0;
    const m = parseNumber(form.profitMarginPct) ?? 0;
    if (!errors.profitMarginPct && !errors.commissionPct && c + m >= 100) {
      errors.profitMarginPct = 'La comisión y la ganancia no pueden sumar 100 % o más.';
    }
  }
  return errors;
}

/** Construye la configuración a partir del formulario (debe estar validado). */
export function formToSettings(form: SettingsForm, base: Settings): Settings {
  const num = (v: string): number => parseNumber(v) ?? 0;
  const usd = parseNumber(form.usdToGtq);
  return {
    ...base,
    printerName: form.printerName.trim(),
    businessName: form.businessName.trim(),
    printerInvestment: num(form.printerInvestment),
    printerLifetimeHours: num(form.printerLifetimeHours),
    powerWatts: num(form.powerWatts),
    electricityPricePerKwh: num(form.electricityPricePerKwh),
    maintenancePct: num(form.maintenancePct),
    failureRatePct: num(form.failureRatePct),
    laborHourValue: num(form.laborHourValue),
    profitMarginPct: num(form.profitMarginPct),
    commissionPct: num(form.commissionPct),
    commissionFixed: num(form.commissionFixed),
    defaultPackagingCost: num(form.defaultPackagingCost),
    currency: 'GTQ',
    usdToGtq: usd === null || Number.isNaN(usd) ? null : usd,
  };
}
