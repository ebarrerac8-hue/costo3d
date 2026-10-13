import { buildCalcInput, calculateProject, costPerGram } from '../calculations/calculator';
import type { AdvancedInput, Filament, FilamentUsage, Project, ProjectStatus, Settings } from '../models/types';
import { newId } from './id';
import { filamentLabel } from './projectForm';

const noExtras: AdvancedInput = {
  modelGrams: null, supportGrams: null, purgeGrams: null, prepMinutes: 0, designMinutes: 0, finishMinutes: 0,
  packagingCost: null, deliveryCost: 0, otherCosts: 0, commissionPct: null, commissionFixed: null, marginPct: null,
};

/** Datos de ejemplo. Solo se crean cuando la persona pulsa "Cargar ejemplo". */
export function buildExampleData(settings: Settings): { filaments: Filament[]; projects: Project[] } {
  const now = new Date().toISOString();
  const mk = (name: string, type: Filament['type'], color: string, price: number, extra: number): Filament => ({
    id: newId(), brand: 'Ejemplo', name, type, spoolPrice: price, shippingAndTaxes: extra, spoolWeightGrams: 1000, color,
    createdAt: now, updatedAt: now,
  });
  const black = mk('PLA Negro', 'PLA', '#1f2937', 150, 25);
  const orange = mk('PLA Naranja', 'PLA', '#f26a1b', 160, 25);
  const petg = mk('PETG Transparente', 'PETG', '#9ec5e8', 175, 25);

  const usage = (f: Filament, grams: number): FilamentUsage => ({
    filamentId: f.id, grams, label: filamentLabel(f), costPerGram: costPerGram(f),
  });

  const make = (
    name: string, hours: number, minutes: number, usages: FilamentUsage[], pieces: number,
    advanced: Partial<AdvancedInput>, status: ProjectStatus, notes: string,
  ): Project => {
    const input = { hours, minutes, multicolor: usages.length > 1, usages, pieces, advanced: { ...noExtras, ...advanced } };
    return {
      id: newId(), name, createdAt: now, updatedAt: now, input,
      result: calculateProject(buildCalcInput(input, settings)), status, notes,
    };
  };

  const projects = [
    make('Soporte de auriculares (ejemplo)', 4, 30, [usage(black, 120)], 1,
      { modelGrams: 105, supportGrams: 15, prepMinutes: 10, finishMinutes: 10 }, 'cotizacion', 'Ejemplo con desglose de gramos.'),
    make('Llaveros multicolor (ejemplo)', 3, 10, [usage(black, 38), usage(orange, 12)], 10,
      { purgeGrams: 8, prepMinutes: 15, packagingCost: 1.5 }, 'pendiente', 'Ejemplo multicolor con varias piezas.'),
    make('Tapa protectora PETG (ejemplo)', 1, 45, [usage(petg, 42)], 2,
      { deliveryCost: 15 }, 'entregado', 'Ejemplo con costo de entrega.'),
  ];
  return { filaments: [black, orange, petg], projects };
}
