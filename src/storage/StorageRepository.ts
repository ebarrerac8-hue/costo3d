import type { AppData, Filament, Preferences, Project, ProjectFormState, Settings } from '../models/types';

export interface LoadResult {
  data: AppData;
  /** Mensaje para mostrar si hubo que ignorar datos dañados. */
  warning?: string;
}

export interface FormDraft {
  savedAt: string;
  form: ProjectFormState;
}

/**
 * Contrato de almacenamiento. Toda la aplicación usa SOLO esta interfaz.
 * Es asíncrona a propósito para que una base de datos remota (Supabase, etc.)
 * pueda reemplazar a LocalStorageRepository sin tocar los componentes.
 */
export interface StorageRepository {
  load(): Promise<LoadResult>;
  saveSettings(settings: Settings): Promise<void>;
  savePreferences(preferences: Preferences): Promise<void>;
  upsertFilament(filament: Filament): Promise<void>;
  deleteFilament(id: string): Promise<void>;
  upsertProject(project: Project): Promise<void>;
  deleteProject(id: string): Promise<void>;
  /** Reemplaza todos los datos (importación de respaldos). */
  replaceAll(data: AppData): Promise<void>;
  loadDraft(): Promise<FormDraft | null>;
  saveDraft(draft: FormDraft): Promise<void>;
  clearDraft(): Promise<void>;
}
