import { describe, expect, it } from 'vitest';
import {
  CalculationError,
  buildCalcInput,
  calculateProject,
  clampFailureRate,
  costPerGram,
  electricityCost,
  failureReserve,
  laborCost,
  maintenanceReserve,
  minimumPrice,
  recommendedPrice,
  validateCalcInput,
  wearCost,
  type CalcInput,
} from './calculator';
import type { ProjectInput, Settings } from '../models/types';

const settings: Settings = {
  printerName: 'FlashForge AD5X',
  businessName: '',
  printerInvestment: 3000,
  printerLifetimeHours: 3000,
  powerWatts: 100,
  electricityPricePerKwh: 2,
  maintenancePct: 10,
  failureRatePct: 10,
  laborHourValue: 30,
  profitMarginPct: 40,
  commissionPct: 0,
  commissionFixed: 0,
  defaultPackagingCost: 0,
  currency: 'GTQ',
  usdToGtq: null,
  setupCompleted: true,
};

const baseInput = (over: Partial<CalcInput> = {}): CalcInput => ({
  printHours: 5,
  pieces: 1,
  filaments: [{ grams: 100, costPerGram: 0.2 }],
  modelGrams: null,
  supportGrams: null,
  purgeGrams: null,
  prepMinutes: 0,
  designMinutes: 0,
  finishMinutes: 0,
  packagingCost: 0,
  deliveryCost: 0,
  otherCosts: 0,
  commissionPct: 0,
  commissionFixed: 0,
  marginPct: 40,
  settings,
  ...over,
});

describe('fórmulas individuales', () => {
  it('costo por gramo incluye envío e impuestos', () => {
    expect(costPerGram({ spoolPrice: 150, shippingAndTaxes: 50, spoolWeightGrams: 1000 })).toBeCloseTo(0.2, 10);
  });
  it('costo por gramo con peso inválido devuelve 0', () => {
    expect(costPerGram({ spoolPrice: 150, shippingAndTaxes: 0, spoolWeightGrams: 0 })).toBe(0);
  });
  it('electricidad = kW × horas × precio', () => {
    expect(electricityCost(100, 5, 2)).toBeCloseTo(1, 10);
  });
  it('desgaste = inversión / vida útil × horas', () => {
    expect(wearCost(3000, 3000, 5)).toBeCloseTo(5, 10);
    expect(wearCost(3000, 0, 5)).toBe(0);
  });
  it('mantenimiento es un porcentaje del desgaste', () => {
    expect(maintenanceReserve(5, 10)).toBeCloseTo(0.5, 10);
  });
  it('mano de obra usa minutos activos', () => {
    expect(laborCost(90, 30)).toBeCloseTo(45, 10);
  });
  it('reserva por fallos = subtotal × tasa / (1 − tasa)', () => {
    expect(failureReserve(90, 10)).toBeCloseTo(10, 10);
    expect(failureReserve(100, 0)).toBe(0);
  });
  it('limita la tasa de fallos por debajo de 100 %', () => {
    expect(clampFailureRate(150)).toBe(99);
    expect(clampFailureRate(-5)).toBe(0);
    expect(Number.isFinite(failureReserve(100, 100))).toBe(true);
  });
  it('precio mínimo cubre costo y comisiones', () => {
    expect(minimumPrice(80, 2, 10)).toBeCloseTo((80 + 2) / 0.9, 10);
  });
  it('precio recomendado usa margen sobre el precio de venta', () => {
    expect(recommendedPrice(60, 0, 0, 40)).toBeCloseTo(100, 10);
    expect(recommendedPrice(58, 2, 0, 40)).toBeCloseTo(100, 10);
  });
});

describe('calculateProject', () => {
  it('calcula un caso completo con valores conocidos', () => {
    // filamento 20, electricidad 1, desgaste 5, mantenimiento 0.5, mano de obra 15 (30 min)
    const r = calculateProject(baseInput({ prepMinutes: 20, finishMinutes: 10 }));
    expect(r.filamentCost).toBeCloseTo(20, 8);
    expect(r.electricityCost).toBeCloseTo(1, 8);
    expect(r.wearCost).toBeCloseTo(5, 8);
    expect(r.maintenanceCost).toBeCloseTo(0.5, 8);
    expect(r.laborCost).toBeCloseTo(15, 8);
    expect(r.productionSubtotal).toBeCloseTo(41.5, 8);
    expect(r.failureReserve).toBeCloseTo((41.5 * 0.1) / 0.9, 8);
    expect(r.totalCost).toBeCloseTo(41.5 / 0.9, 8);
    expect(r.recommendedPrice).toBeCloseTo(r.totalCost / 0.6, 8);
    expect(r.realMarginPct).toBeCloseTo(40, 8);
  });

  it('no cobra mano de obra por las horas de máquina', () => {
    const r = calculateProject(baseInput({ printHours: 20 }));
    expect(r.laborCost).toBe(0);
  });

  it('funciona solo con gramos totales (sin desglose)', () => {
    const r = calculateProject(baseInput());
    expect(r.hasGramBreakdown).toBe(false);
    expect(r.modelCost + r.supportCost + r.purgeCost).toBe(0);
    expect(r.warnings).toEqual([]);
  });

  it('desglose que suma el total no genera advertencia', () => {
    const r = calculateProject(baseInput({ modelGrams: 80, supportGrams: 12, purgeGrams: 8 }));
    expect(r.hasGramBreakdown).toBe(true);
    expect(r.modelCost + r.supportCost + r.purgeCost).toBeCloseTo(r.filamentCost, 8);
    expect(r.unclassifiedFilamentCost).toBeCloseTo(0, 8);
    expect(r.warnings).toEqual([]);
  });

  it('desglose que no coincide advierte pero calcula', () => {
    const r = calculateProject(baseInput({ modelGrams: 80, supportGrams: 5, purgeGrams: 0 }));
    expect(r.warnings.length).toBe(1);
    expect(r.totalCost).toBeGreaterThan(0);
    expect(r.unclassifiedFilamentCost).toBeCloseTo(3, 8);
  });

  it('suma varios filamentos (multicolor)', () => {
    const r = calculateProject(
      baseInput({
        filaments: [
          { grams: 50, costPerGram: 0.2 },
          { grams: 30, costPerGram: 0.3 },
        ],
      }),
    );
    expect(r.totalGrams).toBe(80);
    expect(r.filamentCost).toBeCloseTo(19, 8);
  });

  it('aplica comisiones y mantiene el margen real', () => {
    const r = calculateProject(baseInput({ commissionPct: 5, commissionFixed: 3, marginPct: 30 }));
    expect(r.recommendedPrice).toBeCloseTo((r.totalCost + 3) / (1 - 0.05 - 0.3), 8);
    expect(r.commissionTotal).toBeCloseTo(r.recommendedPrice * 0.05 + 3, 8);
    expect(r.profit).toBeCloseTo(r.recommendedPrice - r.totalCost - r.commissionTotal, 8);
    expect(r.realMarginPct).toBeCloseTo(30, 8);
  });

  it('el precio mínimo deja ganancia cero', () => {
    const r = calculateProject(baseInput({ commissionPct: 8, commissionFixed: 2 }));
    const commissionAtMin = r.minPrice * 0.08 + 2;
    expect(r.minPrice - r.totalCost - commissionAtMin).toBeCloseTo(0, 8);
    expect(r.minPrice).toBeLessThan(r.recommendedPrice);
  });

  it('divide costos y precios entre la cantidad de piezas', () => {
    const r = calculateProject(baseInput({ pieces: 4 }));
    expect(r.costPerUnit).toBeCloseTo(r.totalCost / 4, 10);
    expect(r.recommendedPricePerUnit).toBeCloseTo(r.recommendedPrice / 4, 10);
    expect(r.profitPerUnit).toBeCloseTo(r.profit / 4, 10);
  });

  it('conserva precisión completa (sin redondear internamente)', () => {
    const r = calculateProject(baseInput({ printHours: 1 / 3 }));
    expect(r.wearCost).toBeCloseTo(1 / 3, 12);
  });
});

describe('validaciones', () => {
  it('rechaza comisión + margen ≥ 100 %', () => {
    expect(validateCalcInput(baseInput({ commissionPct: 60, marginPct: 40 })).length).toBeGreaterThan(0);
    expect(() => calculateProject(baseInput({ commissionPct: 60, marginPct: 40 }))).toThrow(CalculationError);
  });
  it('rechaza negativos, piezas inválidas, sin tiempo o sin gramos', () => {
    expect(validateCalcInput(baseInput({ otherCosts: -1 })).length).toBeGreaterThan(0);
    expect(validateCalcInput(baseInput({ pieces: 0 })).length).toBeGreaterThan(0);
    expect(validateCalcInput(baseInput({ pieces: 1.5 })).length).toBeGreaterThan(0);
    expect(validateCalcInput(baseInput({ printHours: 0 })).length).toBeGreaterThan(0);
    expect(validateCalcInput(baseInput({ filaments: [{ grams: 0, costPerGram: 0.2 }] })).length).toBeGreaterThan(0);
  });
  it('rechaza vida útil de 0 horas', () => {
    expect(validateCalcInput(baseInput({ settings: { ...settings, printerLifetimeHours: 0 } })).length).toBeGreaterThan(0);
  });
  it('con tasa de fallos extrema no produce valores inválidos', () => {
    const r = calculateProject(baseInput({ settings: { ...settings, failureRatePct: 100 } }));
    expect(Number.isFinite(r.totalCost)).toBe(true);
    expect(r.effective.failureRatePct).toBe(99);
    expect(r.warnings.length).toBe(1);
  });
});

describe('buildCalcInput', () => {
  const project: ProjectInput = {
    hours: 2,
    minutes: 30,
    multicolor: false,
    usages: [{ filamentId: 'f1', grams: 100, label: 'PLA', costPerGram: 0.2 }],
    pieces: 2,
    advanced: {
      modelGrams: null, supportGrams: null, purgeGrams: null,
      prepMinutes: 0, designMinutes: 0, finishMinutes: 0,
      packagingCost: null, deliveryCost: 0, otherCosts: 0,
      commissionPct: null, commissionFixed: null, marginPct: null,
    },
  };
  it('convierte horas + minutos y usa los valores de configuración por defecto', () => {
    const i = buildCalcInput(project, { ...settings, defaultPackagingCost: 4, commissionPct: 3, commissionFixed: 1, profitMarginPct: 25 });
    expect(i.printHours).toBeCloseTo(2.5, 10);
    expect(i.packagingCost).toBe(4);
    expect(i.commissionPct).toBe(3);
    expect(i.commissionFixed).toBe(1);
    expect(i.marginPct).toBe(25);
  });
  it('los valores específicos del proyecto reemplazan a los generales', () => {
    const i = buildCalcInput(
      { ...project, advanced: { ...project.advanced, packagingCost: 0, commissionPct: 0, marginPct: 10 } },
      { ...settings, defaultPackagingCost: 4, commissionPct: 3 },
    );
    expect(i.packagingCost).toBe(0);
    expect(i.commissionPct).toBe(0);
    expect(i.marginPct).toBe(10);
  });
});
