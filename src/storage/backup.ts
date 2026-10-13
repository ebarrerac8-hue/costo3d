import type { AppData } from '../models/types';
import { SCHEMA_VERSION } from './defaults';
import { parseAppData } from './validation';

export const BACKUP_APP_ID = 'costo3d';

export interface BackupFile {
  app: typeof BACKUP_APP_ID;
  exportedAt: string;
  appData: AppData;
}

export function createBackup(data: AppData, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, exportedAt: now.toISOString(), appData: { ...data, schemaVersion: SCHEMA_VERSION } };
}

export type BackupParseResult =
  | { ok: true; data: AppData; exportedAt: string | null }
  | { ok: false; errors: string[] };

/** Valida el texto de un archivo de respaldo antes de importarlo. */
export function parseBackup(text: string): BackupParseResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['El archivo no es un JSON válido.'] };
  }
  if (typeof json !== 'object' || json === null || (json as { app?: unknown }).app !== BACKUP_APP_ID) {
    return { ok: false, errors: ['Este archivo no parece un respaldo de Costo3D.'] };
  }
  const file = json as { exportedAt?: unknown; appData?: unknown };
  const parsed = parseAppData(file.appData);
  if (!parsed.ok) return parsed;
  return { ok: true, data: parsed.data, exportedAt: typeof file.exportedAt === 'string' ? file.exportedAt : null };
}

export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `costo3d-respaldo-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}
