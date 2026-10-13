import type { AppData, Settings } from '../models/types';

/** Versión actual del esquema guardado. Súbela cuando cambie la estructura y agrega una migración. */
export const SCHEMA_VERSION = 1;

/** Valores iniciales sugeridos. La persona los ajusta en el asistente o en Configuración. */
export const DEFAULT_SETTINGS: Settings = {
  printerName: 'FlashForge AD5X',
  businessName: '',
  printerInvestment: 0,
  printerLifetimeHours: 4000,
  powerWatts: 120,
  electricityPricePerKwh: 1.5,
  maintenancePct: 10,
  failureRatePct: 5,
  laborHourValue: 25,
  profitMarginPct: 40,
  commissionPct: 0,
  commissionFixed: 0,
  defaultPackagingCost: 0,
  currency: 'GTQ',
  usdToGtq: null,
  setupCompleted: false,
};

export function createEmptyData(): AppData {
  return {
    schemaVersion: SCHEMA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    filaments: [],
    projects: [],
    preferences: { theme: 'system' },
  };
}
