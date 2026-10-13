import type { AppData, Filament, Preferences, Project, Settings } from '../models/types';
import type { FormDraft, LoadResult, StorageRepository } from './StorageRepository';

/**
 * Punto de partida para una base de datos remota (por ejemplo Supabase).
 * NO está conectada: en esta versión la aplicación usa LocalStorageRepository.
 *
 * Para activarla, implementa cada método y cambia la fábrica en storage/index.ts.
 * Los componentes no necesitan cambios porque solo conocen StorageRepository.
 * La guía paso a paso está en el README (sección "Conectar Supabase en el futuro").
 */
export class FutureDatabaseRepository implements StorageRepository {
  private notReady(): never {
    throw new Error('FutureDatabaseRepository aún no está implementado. Usa LocalStorageRepository.');
  }
  async load(): Promise<LoadResult> { return this.notReady(); }
  async saveSettings(_settings: Settings): Promise<void> { this.notReady(); }
  async savePreferences(_preferences: Preferences): Promise<void> { this.notReady(); }
  async upsertFilament(_filament: Filament): Promise<void> { this.notReady(); }
  async deleteFilament(_id: string): Promise<void> { this.notReady(); }
  async upsertProject(_project: Project): Promise<void> { this.notReady(); }
  async deleteProject(_id: string): Promise<void> { this.notReady(); }
  async replaceAll(_data: AppData): Promise<void> { this.notReady(); }
  async loadDraft(): Promise<FormDraft | null> { return this.notReady(); }
  async saveDraft(_draft: FormDraft): Promise<void> { this.notReady(); }
  async clearDraft(): Promise<void> { this.notReady(); }
}
