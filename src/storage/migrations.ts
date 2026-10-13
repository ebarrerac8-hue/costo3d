import { SCHEMA_VERSION } from './defaults';

export class StorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StorageError';
  }
}

/**
 * Migraciones: la clave N transforma datos de la versión N a la versión N + 1.
 * Ejemplo para el futuro (cuando SCHEMA_VERSION sea 2):
 *
 *   1: (data) => ({ ...data, projects: data.projects.map(p => ({ ...p, tags: [] })) }),
 *
 * Cada migración debe conservar todos los datos existentes.
 */
type Migration = (data: Record<string, unknown>) => Record<string, unknown>;
const migrations: Record<number, Migration> = {};

export function migrateToCurrent(raw: Record<string, unknown>): Record<string, unknown> {
  let version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new StorageError('Los datos no indican una versión de esquema válida.');
  }
  if (version > SCHEMA_VERSION) {
    throw new StorageError(
      `Los datos fueron creados con una versión más nueva de Costo3D (esquema ${version}). Actualiza la aplicación para abrirlos.`,
    );
  }
  let data = raw;
  while (version < SCHEMA_VERSION) {
    const step = migrations[version];
    if (!step) throw new StorageError(`No existe una migración desde la versión ${version}.`);
    data = { ...step(data), schemaVersion: version + 1 };
    version += 1;
  }
  return data;
}
