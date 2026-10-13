import { describe, expect, it } from 'vitest';
import type { Filament, Settings } from '../models/types';
import { DEFAULT_SETTINGS } from '../storage/defaults';
import { emptyForm, formFromProject, gramBreakdownCheck, isFormPristine, parseProjectForm } from './projectForm';
import { quoteLines, filterAndSort, summarize } from './projects';

const settings: Settings = { ...DEFAULT_SETTINGS, printerInvestment: 3000, setupCompleted: true };
const filament: Filament = {
  id: 'f1', brand: 'Marca', name: 'Negro', type: 'PLA', spoolPrice: 150, shippingAndTaxes: 50,
  spoolWeightGrams: 1000, color: '#000000', createdAt: '', updatedAt: '',
};
const valid = () => ({ ...emptyForm('f1'), name: 'Soporte', hours: '2', minutes: '30', pieces: '2', usages: [{ filamentId: 'f1', grams: '100' }] });

describe('formulario del proyecto', () => {
  it('un formulario vacío está "limpio"; uno con datos no', () => {
    expect(isFormPristine(emptyForm('f1'))).toBe(true);
    expect(isFormPristine(valid())).toBe(false);
  });

  it('calcula con solo los campos esenciales', () => {
    const r = parseProjectForm(valid(), [filament], settings);
    expect(r.formErrors).toEqual([]);
    expect(Object.keys(r.fieldErrors).length).toBe(0);
    expect(r.result?.totalGrams).toBe(100);
    expect(r.result?.filamentCost).toBeCloseTo(20, 8);
    expect(r.result?.printHours).toBeCloseTo(2.5, 8);
  });

  it('pide los datos que faltan con mensajes claros', () => {
    const r = parseProjectForm(emptyForm(), [filament], settings);
    expect(r.fieldErrors.name).toBeDefined();
    expect(r.fieldErrors.time).toBeDefined();
    expect(r.fieldErrors['usage-0-filament']).toBeDefined();
    expect(r.fieldErrors['usage-0-grams']).toBeDefined();
    expect(r.result).toBeUndefined();
  });

  it('no permite negativos ni minutos mayores que 59', () => {
    const f = { ...valid(), minutes: '75', adv: { ...valid().adv, otherCosts: '-3' } };
    const r = parseProjectForm(f, [filament], settings);
    expect(r.fieldErrors.minutes).toBeDefined();
    expect(r.fieldErrors['adv.otherCosts']).toBeDefined();
  });

  it('en modo normal solo cuenta el primer filamento; en multicolor suma todos', () => {
    const two = { ...valid(), usages: [{ filamentId: 'f1', grams: '60' }, { filamentId: 'f1', grams: '40' }] };
    expect(parseProjectForm(two, [filament], settings).result?.totalGrams).toBe(60);
    expect(parseProjectForm({ ...two, multicolor: true }, [filament], settings).result?.totalGrams).toBe(100);
  });

  it('advierte (sin bloquear) cuando el desglose no coincide', () => {
    const f = { ...valid(), adv: { ...valid().adv, modelGrams: '80', supportGrams: '10' } };
    expect(gramBreakdownCheck(f).mismatch).toBe(true);
    const r = parseProjectForm(f, [filament], settings);
    expect(r.result?.warnings.length).toBe(1);
  });

  it('conserva el costo de un filamento eliminado al editar un proyecto', () => {
    const first = parseProjectForm(valid(), [filament], settings);
    const again = parseProjectForm(formFromProject({
      id: 'p', name: 'Soporte', createdAt: '', updatedAt: '', input: first.input!, result: first.result!,
    }), [], settings, first.input!.usages);
    expect(again.result?.filamentCost).toBeCloseTo(first.result!.filamentCost, 10);
  });

  it('rechaza comisión + margen ≥ 100 %', () => {
    const f = { ...valid(), adv: { ...valid().adv, commissionPct: '60', marginPct: '45' } };
    expect(parseProjectForm(f, [filament], settings).formErrors.length).toBeGreaterThan(0);
  });
});

describe('proyectos: resumen, filtros y cotización', () => {
  const make = (name: string, status: 'cotizacion' | 'entregado', price: number, createdAt: string) => {
    const base = parseProjectForm(valid(), [filament], settings);
    return {
      id: name, name, createdAt, updatedAt: createdAt, status, input: base.input!,
      result: { ...base.result!, recommendedPrice: price, totalCost: price / 2, profit: price / 4 },
    };
  };
  const list = [make('Alfa', 'cotizacion', 100, '2026-01-01'), make('Beta', 'entregado', 300, '2026-02-01'), make('Gamma', 'cotizacion', 200, '2026-03-01')];

  it('suma los totales', () => {
    const s = summarize(list);
    expect(s.count).toBe(3);
    expect(s.quotedValue).toBe(600);
    expect(s.profit).toBe(150);
  });
  it('busca por nombre, filtra por estado y ordena', () => {
    expect(filterAndSort(list, 'be', 'todos', 'date', 'desc').map((p) => p.name)).toEqual(['Beta']);
    expect(filterAndSort(list, '', 'cotizacion', 'price', 'desc').map((p) => p.name)).toEqual(['Gamma', 'Alfa']);
    expect(filterAndSort(list, '', 'todos', 'cost', 'asc').map((p) => p.name)).toEqual(['Alfa', 'Gamma', 'Beta']);
    expect(filterAndSort(list, '', 'todos', 'date', 'desc').map((p) => p.name)).toEqual(['Gamma', 'Beta', 'Alfa']);
  });
  it('la cotización muestra precio por unidad y total', () => {
    const q = quoteLines(make('X', 'cotizacion', 100, '2026-01-01'));
    expect(q.pieces).toBe(2);
    expect(q.unitPrice).toBe(50);
    expect(q.total).toBe(100);
  });
});
