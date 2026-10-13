/**
 * Modelos de datos de Costo3D.
 * Los porcentajes se guardan como número "humano" (10 = 10 %).
 */

export type FilamentType = 'PLA' | 'PETG' | 'TPU' | 'PLA-CF' | 'PETG-CF' | 'Otro';
export const FILAMENT_TYPES: FilamentType[] = ['PLA', 'PETG', 'TPU', 'PLA-CF', 'PETG-CF', 'Otro'];

export type ProjectStatus = 'cotizacion' | 'pendiente' | 'producido' | 'entregado';
export const PROJECT_STATUSES: ProjectStatus[] = ['cotizacion', 'pendiente', 'producido', 'entregado'];
export const STATUS_LABELS: Record<ProjectStatus, string> = {
  cotizacion: 'Cotización',
  pendiente: 'Pendiente',
  producido: 'Producido',
  entregado: 'Entregado',
};

export type ThemePreference = 'system' | 'light' | 'dark';

/** Configuración general (se completa una sola vez). */
export interface Settings {
  printerName: string;
  businessName: string;
  /** Compra + envío + impuestos, en quetzales. */
  printerInvestment: number;
  printerLifetimeHours: number;
  powerWatts: number;
  electricityPricePerKwh: number;
  maintenancePct: number;
  failureRatePct: number;
  laborHourValue: number;
  profitMarginPct: number;
  commissionPct: number;
  commissionFixed: number;
  defaultPackagingCost: number;
  currency: 'GTQ';
  /** Quetzales por cada dólar. null = conversión desactivada. */
  usdToGtq: number | null;
  setupCompleted: boolean;
}

/** Subconjunto de la configuración que usan las fórmulas. */
export type CalcSettings = Pick<
  Settings,
  | 'printerInvestment'
  | 'printerLifetimeHours'
  | 'powerWatts'
  | 'electricityPricePerKwh'
  | 'maintenancePct'
  | 'failureRatePct'
  | 'laborHourValue'
  | 'profitMarginPct'
  | 'commissionPct'
  | 'commissionFixed'
  | 'defaultPackagingCost'
>;

/** Perfil de filamento. El costo por gramo se calcula, no se guarda. */
export interface Filament {
  id: string;
  brand: string;
  name: string;
  type: FilamentType;
  spoolPrice: number;
  shippingAndTaxes: number;
  spoolWeightGrams: number;
  color: string;
  createdAt: string;
  updatedAt: string;
}

/** Uso de un filamento en un proyecto (con copia del costo por gramo del momento). */
export interface FilamentUsage {
  filamentId: string;
  grams: number;
  label: string;
  costPerGram: number;
}

export interface AdvancedInput {
  modelGrams: number | null;
  supportGrams: number | null;
  purgeGrams: number | null;
  prepMinutes: number;
  designMinutes: number;
  finishMinutes: number;
  /** null = usar el costo de empaque predeterminado. */
  packagingCost: number | null;
  deliveryCost: number;
  otherCosts: number;
  commissionPct: number | null;
  commissionFixed: number | null;
  marginPct: number | null;
}

export interface ProjectInput {
  hours: number;
  minutes: number;
  multicolor: boolean;
  usages: FilamentUsage[];
  pieces: number;
  advanced: AdvancedInput;
}

export interface CalcResult {
  printHours: number;
  totalGrams: number;
  pieces: number;

  filamentCost: number;
  hasGramBreakdown: boolean;
  modelCost: number;
  supportCost: number;
  purgeCost: number;
  unclassifiedFilamentCost: number;

  electricityCost: number;
  wearCost: number;
  maintenanceCost: number;
  activeMinutes: number;
  laborCost: number;
  packagingCost: number;
  deliveryCost: number;
  otherCosts: number;

  productionSubtotal: number;
  failureReserve: number;
  totalCost: number;
  costPerUnit: number;

  minPrice: number;
  minPricePerUnit: number;
  recommendedPrice: number;
  recommendedPricePerUnit: number;
  commissionTotal: number;
  profit: number;
  profitPerUnit: number;
  realMarginPct: number;

  /** Valores efectivamente usados (configuración general o específicos del proyecto). */
  effective: {
    commissionPct: number;
    commissionFixed: number;
    marginPct: number;
    failureRatePct: number;
  };
  warnings: string[];
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  input: ProjectInput;
  result: CalcResult;
  status?: ProjectStatus;
  /** Notas internas. */
  notes?: string;
  /** Notas comerciales: se muestran en la cotización. */
  quoteNotes?: string;
}

export interface Preferences {
  theme: ThemePreference;
}

export interface AppData {
  schemaVersion: number;
  settings: Settings;
  filaments: Filament[];
  projects: Project[];
  preferences: Preferences;
}

/** Estado del formulario del proyecto (todo en texto, como lo escribe la persona). */
export interface ProjectFormState {
  name: string;
  hours: string;
  minutes: string;
  multicolor: boolean;
  usages: { filamentId: string; grams: string }[];
  pieces: string;
  adv: {
    modelGrams: string;
    supportGrams: string;
    purgeGrams: string;
    prepMinutes: string;
    designMinutes: string;
    finishMinutes: string;
    packagingCost: string;
    deliveryCost: string;
    otherCosts: string;
    commissionPct: string;
    commissionFixed: string;
    marginPct: string;
  };
  notes: string;
  quoteNotes: string;
}
