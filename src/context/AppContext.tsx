import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppData, Filament, Project, ProjectStatus, Settings, ThemePreference,
} from '../models/types';
import type { FormDraft, StorageRepository } from '../storage/StorageRepository';
import { newId } from '../utils/id';
import { buildExampleData } from '../utils/examples';

export type ToastKind = 'ok' | 'error' | 'info';
export interface ToastItem { id: number; kind: ToastKind; message: string }

export type FilamentDraft = Omit<Filament, 'id' | 'createdAt' | 'updatedAt'> & { id?: string };

interface AppApi {
  data: AppData;
  toasts: ToastItem[];
  notify: (kind: ToastKind, message: string) => void;
  dismissToast: (id: number) => void;
  saveSettings: (settings: Settings, opts?: { silent?: boolean }) => Promise<boolean>;
  setTheme: (theme: ThemePreference) => Promise<void>;
  saveFilament: (draft: FilamentDraft) => Promise<boolean>;
  deleteFilament: (id: string) => Promise<void>;
  saveProject: (project: Project, message?: string) => Promise<boolean>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<Project | null>;
  setProjectStatus: (id: string, status: ProjectStatus) => Promise<void>;
  replaceAll: (data: AppData) => Promise<boolean>;
  loadExample: () => Promise<void>;
  loadDraft: () => Promise<FormDraft | null>;
  saveDraft: (draft: FormDraft) => Promise<void>;
  clearDraft: () => Promise<void>;
}

const Ctx = createContext<AppApi | null>(null);

export function useApp(): AppApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp debe usarse dentro de AppProvider.');
  return v;
}

const errorText = (e: unknown): string => (e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
const upsertById = <T extends { id: string }>(list: T[], item: T): T[] =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export function AppProvider({ repo, children }: { repo: StorageRepository; children: ReactNode }) {
  const [data, setData] = useState<AppData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dataRef = useRef<AppData | null>(null);
  const toastId = useRef(0);

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
  }, []);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const notify = useCallback((kind: ToastKind, message: string) => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, kind, message }]);
    window.setTimeout(() => dismissToast(id), kind === 'error' ? 8000 : 3500);
  }, [dismissToast]);

  useEffect(() => {
    repo
      .load()
      .then(({ data: loaded, warning }) => {
        commit(loaded);
        if (warning) notify('error', warning);
      })
      .catch((e) => setLoadError(errorText(e)));
  }, [repo, commit, notify]);

  useEffect(() => {
    document.documentElement.dataset.theme = data?.preferences.theme ?? 'system';
  }, [data?.preferences.theme]);

  const api = useMemo<AppApi | null>(() => {
    if (!data) return null;
    const cur = (): AppData => dataRef.current as AppData;

    const attempt = async (fn: () => Promise<void>): Promise<boolean> => {
      try {
        await fn();
        return true;
      } catch (e) {
        notify('error', errorText(e));
        return false;
      }
    };

    const saveProject: AppApi['saveProject'] = async (project, message) => {
      const ok = await attempt(async () => {
        await repo.upsertProject(project);
        commit({ ...cur(), projects: upsertById(cur().projects, project) });
      });
      if (ok && message) notify('ok', message);
      return ok;
    };

    return {
      data,
      toasts,
      notify,
      dismissToast,
      saveSettings: async (settings, opts) => {
        const ok = await attempt(async () => {
          await repo.saveSettings(settings);
          commit({ ...cur(), settings });
        });
        if (ok && !opts?.silent) notify('ok', 'Configuración guardada');
        return ok;
      },
      setTheme: async (theme) => {
        await attempt(async () => {
          await repo.savePreferences({ theme });
          commit({ ...cur(), preferences: { ...cur().preferences, theme } });
        });
      },
      saveFilament: async (draft) => {
        const now = new Date().toISOString();
        const existing = draft.id ? cur().filaments.find((f) => f.id === draft.id) : undefined;
        const filament: Filament = {
          ...draft,
          id: existing?.id ?? newId(),
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        };
        const ok = await attempt(async () => {
          await repo.upsertFilament(filament);
          commit({ ...cur(), filaments: upsertById(cur().filaments, filament) });
        });
        if (ok) notify('ok', existing ? 'Filamento actualizado' : 'Filamento creado');
        return ok;
      },
      deleteFilament: async (id) => {
        const ok = await attempt(async () => {
          await repo.deleteFilament(id);
          commit({ ...cur(), filaments: cur().filaments.filter((f) => f.id !== id) });
        });
        if (ok) notify('ok', 'Filamento eliminado');
      },
      saveProject,
      deleteProject: async (id) => {
        const ok = await attempt(async () => {
          await repo.deleteProject(id);
          commit({ ...cur(), projects: cur().projects.filter((p) => p.id !== id) });
        });
        if (ok) notify('ok', 'Proyecto eliminado');
      },
      duplicateProject: async (id) => {
        const original = cur().projects.find((p) => p.id === id);
        if (!original) return null;
        const now = new Date().toISOString();
        const copy: Project = {
          ...structuredCloneSafe(original),
          id: newId(),
          name: `${original.name} (copia)`.slice(0, 80),
          createdAt: now,
          updatedAt: now,
          status: 'cotizacion',
        };
        const ok = await saveProject(copy, 'Proyecto duplicado');
        return ok ? copy : null;
      },
      setProjectStatus: async (id, status) => {
        const p = cur().projects.find((x) => x.id === id);
        if (!p) return;
        await saveProject({ ...p, status, updatedAt: new Date().toISOString() }, 'Estado actualizado');
      },
      replaceAll: async (next) => {
        const ok = await attempt(async () => {
          await repo.replaceAll(next);
          await repo.clearDraft();
          commit(next);
        });
        if (ok) notify('ok', 'Respaldo importado');
        return ok;
      },
      loadExample: async () => {
        try {
          const example = buildExampleData(cur().settings);
          for (const f of example.filaments) await repo.upsertFilament(f);
          for (const p of example.projects) await repo.upsertProject(p);
          commit({
            ...cur(),
            filaments: [...cur().filaments, ...example.filaments],
            projects: [...cur().projects, ...example.projects],
          });
          notify('ok', 'Ejemplo cargado: 3 filamentos y 3 proyectos');
        } catch (e) {
          notify('error', errorText(e));
        }
      },
      loadDraft: () => repo.loadDraft(),
      saveDraft: (d) => repo.saveDraft(d),
      clearDraft: () => repo.clearDraft(),
    };
  }, [data, toasts, repo, commit, notify, dismissToast]);

  if (loadError) {
    return (
      <div className="boot" role="alert">
        <h1>No se pudo abrir Costo3D</h1>
        <p>{loadError}</p>
      </div>
    );
  }
  if (!api) return <div className="boot" role="status">Cargando…</div>;
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

function structuredCloneSafe<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
