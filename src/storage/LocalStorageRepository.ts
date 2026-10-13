import type { AppData, Filament, Preferences, Project, Settings } from '../models/types';
import { createEmptyData, DEFAULT_SETTINGS, SCHEMA_VERSION } from './defaults';
import { StorageError } from './migrations';
import type { FormDraft, LoadResult, StorageRepository } from './StorageRepository';
import { parseAppData } from './validation';

export const DATA_KEY = 'costo3d:data';
export const DRAFT_KEY = 'costo3d:draft';

/** Subconjunto de Storage que necesitamos (permite pruebas con un almacén falso). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Guarda todo en un único documento JSON dentro de localStorage:
 * { schemaVersion, settings, filaments, projects, preferences }.
 */
export class LocalStorageRepository implements StorageRepository {
  private cache: AppData | null = null;
  private readonly store: KeyValueStore;

  constructor(store?: KeyValueStore) {
    this.store = store ?? window.localStorage;
  }

  async load(): Promise<LoadResult> {
    let raw: string | null = null;
    try {
      raw = this.store.getItem(DATA_KEY);
    } catch {
      this.cache = createEmptyData();
      return { data: this.cache, warning: 'El navegador no permite leer datos guardados. Lo que hagas no se conservará.' };
    }
    if (raw === null) {
      this.cache = createEmptyData();
      return { data: this.cache };
    }

    let parsedJson: unknown = null;
    let problem: string | null = null;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      problem = 'Los datos guardados estaban dañados.';
    }
    if (!problem) {
      const result = parseAppData(parsedJson);
      if (result.ok) {
        const migrated = result.data.schemaVersion !== (parsedJson as { schemaVersion?: number }).schemaVersion;
        this.cache = {
          ...result.data,
          schemaVersion: SCHEMA_VERSION,
          settings: { ...DEFAULT_SETTINGS, ...result.data.settings },
        };
        if (migrated) this.persist();
        return { data: this.cache };
      }
      problem = `Los datos guardados no se pudieron leer (${result.errors[0]}).`;
    }

    // Nunca se descartan datos en silencio: se conserva una copia del contenido original.
    const backupKey = `${DATA_KEY}:corrupt:${Date.now()}`;
    try {
      this.store.setItem(backupKey, raw);
    } catch {
      /* si no hay espacio, se continúa igualmente */
    }
    this.cache = createEmptyData();
    return {
      data: this.cache,
      warning: `${problem} Se conservó una copia en el navegador (${backupKey}) y se inició con datos vacíos. Si tienes un respaldo JSON, impórtalo en Respaldo.`,
    };
  }

  private data(): AppData {
    if (!this.cache) throw new StorageError('El almacenamiento todavía no se ha cargado.');
    return this.cache;
  }

  private persist(): void {
    try {
      this.store.setItem(DATA_KEY, JSON.stringify(this.data()));
    } catch {
      throw new StorageError('No se pudo guardar en este navegador (¿sin espacio o en modo privado?). Exporta un respaldo.');
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    this.data().settings = { ...settings };
    this.persist();
  }

  async savePreferences(preferences: Preferences): Promise<void> {
    this.data().preferences = { ...preferences };
    this.persist();
  }

  async upsertFilament(filament: Filament): Promise<void> {
    const d = this.data();
    const i = d.filaments.findIndex((f) => f.id === filament.id);
    if (i >= 0) d.filaments[i] = filament;
    else d.filaments.push(filament);
    this.persist();
  }

  async deleteFilament(id: string): Promise<void> {
    const d = this.data();
    d.filaments = d.filaments.filter((f) => f.id !== id);
    this.persist();
  }

  async upsertProject(project: Project): Promise<void> {
    const d = this.data();
    const i = d.projects.findIndex((p) => p.id === project.id);
    if (i >= 0) d.projects[i] = project;
    else d.projects.push(project);
    this.persist();
  }

  async deleteProject(id: string): Promise<void> {
    const d = this.data();
    d.projects = d.projects.filter((p) => p.id !== id);
    this.persist();
  }

  async replaceAll(data: AppData): Promise<void> {
    this.cache = { ...data, schemaVersion: SCHEMA_VERSION };
    this.persist();
  }

  async loadDraft(): Promise<FormDraft | null> {
    try {
      const raw = this.store.getItem(DRAFT_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<FormDraft>;
      if (parsed && typeof parsed.savedAt === 'string' && parsed.form && typeof parsed.form === 'object') {
        return parsed as FormDraft;
      }
    } catch {
      /* borrador ilegible: se ignora */
    }
    return null;
  }

  async saveDraft(draft: FormDraft): Promise<void> {
    try {
      this.store.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      /* un borrador no guardado no debe interrumpir el trabajo */
    }
  }

  async clearDraft(): Promise<void> {
    try {
      this.store.removeItem(DRAFT_KEY);
    } catch {
      /* nada que hacer */
    }
  }
}
