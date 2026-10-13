import { describe, expect, it } from 'vitest';
import { buildCalcInput, calculateProject } from '../calculations/calculator';
import type { Filament, Project } from '../models/types';
import { backupFileName, createBackup, parseBackup } from './backup';
import { createEmptyData, DEFAULT_SETTINGS, SCHEMA_VERSION } from './defaults';
import { DATA_KEY, DRAFT_KEY, LocalStorageRepository, type KeyValueStore } from './LocalStorageRepository';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  getItem(k: string) { return this.map.has(k) ? (this.map.get(k) as string) : null; }
  setItem(k: string, v: string) { this.map.set(k, v); }
  removeItem(k: string) { this.map.delete(k); }
}

const settings = { ...DEFAULT_SETTINGS, printerInvestment: 3000, setupCompleted: true };
const filament: Filament = {
  id: 'f1', brand: 'Marca', name: 'Negro', type: 'PLA', spoolPrice: 150, shippingAndTaxes: 25,
  spoolWeightGrams: 1000, color: '#000000', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
};

function makeProject(id = 'p1'): Project {
  const input = {
    hours: 2, minutes: 0, multicolor: false, pieces: 1,
    usages: [{ filamentId: 'f1', grams: 50, label: 'Marca Negro', costPerGram: 0.175 }],
    advanced: {
      modelGrams: null, supportGrams: null, purgeGrams: null, prepMinutes: 0, designMinutes: 0, finishMinutes: 0,
      packagingCost: null, deliveryCost: 0, otherCosts: 0, commissionPct: null, commissionFixed: null, marginPct: null,
    },
  };
  return {
    id, name: 'Pieza de prueba', createdAt: '2026-01-02T00:00:00.000Z', updatedAt: '2026-01-02T00:00:00.000Z',
    input, result: calculateProject(buildCalcInput(input, settings)), status: 'cotizacion',
  };
}

describe('LocalStorageRepository', () => {
  it('inicia vacío cuando no hay datos', async () => {
    const repo = new LocalStorageRepository(new MemoryStore());
    const { data, warning } = await repo.load();
    expect(data.projects).toEqual([]);
    expect(data.settings.setupCompleted).toBe(false);
    expect(warning).toBeUndefined();
  });

  it('guarda y recupera configuración, filamentos y proyectos', async () => {
    const store = new MemoryStore();
    const repo = new LocalStorageRepository(store);
    await repo.load();
    await repo.saveSettings(settings);
    await repo.upsertFilament(filament);
    await repo.upsertProject(makeProject());

    const again = await new LocalStorageRepository(store).load();
    expect(again.data.settings.printerInvestment).toBe(3000);
    expect(again.data.filaments.length).toBe(1);
    expect(again.data.projects.length).toBe(1);
    expect(again.data.projects[0].name).toBe('Pieza de prueba');
    expect(again.data.schemaVersion).toBe(SCHEMA_VERSION);
  });

  it('actualiza (upsert) y elimina sin duplicar', async () => {
    const store = new MemoryStore();
    const repo = new LocalStorageRepository(store);
    await repo.load();
    await repo.upsertProject(makeProject('p1'));
    await repo.upsertProject({ ...makeProject('p1'), name: 'Renombrado' });
    await repo.upsertProject(makeProject('p2'));
    let data = (await new LocalStorageRepository(store).load()).data;
    expect(data.projects.length).toBe(2);
    expect(data.projects[0].name).toBe('Renombrado');
    await repo.deleteProject('p1');
    data = (await new LocalStorageRepository(store).load()).data;
    expect(data.projects.length).toBe(1);
    expect(data.projects[0].id).toBe('p2');
  });

  it('no pierde campos nuevos de configuración al cargar datos antiguos', async () => {
    const store = new MemoryStore();
    const old = createEmptyData();
    const { businessName: _omit, ...withoutBusiness } = old.settings;
    store.setItem(DATA_KEY, JSON.stringify({ ...old, settings: withoutBusiness }));
    const { data } = await new LocalStorageRepository(store).load();
    expect(data.settings.businessName).toBe('');
  });

  it('conserva una copia si los datos están dañados', async () => {
    const store = new MemoryStore();
    store.setItem(DATA_KEY, '{esto no es json');
    const { data, warning } = await new LocalStorageRepository(store).load();
    expect(data.projects).toEqual([]);
    expect(warning).toBeDefined();
    const copies = [...store.map.keys()].filter((k) => k.startsWith(`${DATA_KEY}:corrupt:`));
    expect(copies.length).toBe(1);
    expect(store.map.get(copies[0])).toBe('{esto no es json');
  });

  it('rechaza datos de una versión de esquema más nueva sin borrarlos', async () => {
    const store = new MemoryStore();
    store.setItem(DATA_KEY, JSON.stringify({ ...createEmptyData(), schemaVersion: SCHEMA_VERSION + 1 }));
    const { warning } = await new LocalStorageRepository(store).load();
    expect(warning).toBeDefined();
    expect([...store.map.keys()].some((k) => k.includes(':corrupt:'))).toBe(true);
  });

  it('guarda, recupera y borra el borrador', async () => {
    const store = new MemoryStore();
    const repo = new LocalStorageRepository(store);
    await repo.load();
    expect(await repo.loadDraft()).toBeNull();
    await repo.saveDraft({ savedAt: '2026-01-01T00:00:00.000Z', form: { name: 'Borrador' } as never });
    expect((await repo.loadDraft())?.form.name).toBe('Borrador');
    await repo.clearDraft();
    expect(await repo.loadDraft()).toBeNull();
    expect(store.map.has(DRAFT_KEY)).toBe(false);
  });
});

describe('respaldo JSON', () => {
  const data = { ...createEmptyData(), settings, filaments: [filament], projects: [makeProject()] };

  it('exporta e importa sin perder información', () => {
    const text = JSON.stringify(createBackup(data));
    const parsed = parseBackup(text);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.projects.length).toBe(1);
      expect(parsed.data.filaments[0].id).toBe('f1');
      expect(parsed.data.projects[0].result.totalCost).toBeCloseTo(data.projects[0].result.totalCost, 10);
    }
  });

  it('rechaza archivos que no son JSON o que no son de Costo3D', () => {
    expect(parseBackup('hola').ok).toBe(false);
    expect(parseBackup('{"app":"otra","appData":{}}').ok).toBe(false);
    expect(parseBackup('[]').ok).toBe(false);
  });

  it('rechaza proyectos con datos inválidos', () => {
    const bad = createBackup(data);
    (bad.appData.projects[0].result as { totalCost: unknown }).totalCost = 'mucho';
    expect(parseBackup(JSON.stringify(bad)).ok).toBe(false);
    const bad2 = createBackup(data);
    (bad2.appData.filaments[0] as { spoolWeightGrams: number }).spoolWeightGrams = 0;
    expect(parseBackup(JSON.stringify(bad2)).ok).toBe(false);
  });

  it('rechaza identificadores repetidos', () => {
    const dup = createBackup({ ...data, projects: [makeProject('x'), makeProject('x')] });
    expect(parseBackup(JSON.stringify(dup)).ok).toBe(false);
  });

  it('rechaza una versión de esquema más nueva', () => {
    const future = createBackup(data);
    future.appData.schemaVersion = SCHEMA_VERSION + 5;
    expect(parseBackup(JSON.stringify(future)).ok).toBe(false);
  });

  it('el nombre del archivo incluye la fecha', () => {
    expect(backupFileName(new Date(2026, 9, 12))).toBe('costo3d-respaldo-2026-10-12.json');
  });
});
