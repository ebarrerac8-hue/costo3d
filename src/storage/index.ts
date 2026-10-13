import { LocalStorageRepository } from './LocalStorageRepository';
import type { StorageRepository } from './StorageRepository';

/**
 * Único lugar donde se decide qué almacenamiento usa la aplicación.
 * Para migrar a una base de datos, devuelve aquí otra implementación de StorageRepository.
 */
export function createRepository(): StorageRepository {
  return new LocalStorageRepository();
}

export type { StorageRepository } from './StorageRepository';
