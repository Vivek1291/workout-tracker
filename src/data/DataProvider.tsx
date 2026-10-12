import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppData, BaseDoc, CollectionName, DEFAULT_SETTINGS, Exercise, Settings, WorkoutPlan, WorkoutSession } from '../types';
import { createAdapter, EMPTY_DATA, normalizeAppData, StorageAdapter } from '../storage';
import { loadDataVersion, loadSettingsRaw, saveDataVersion, saveSettingsRaw } from '../storage/localAdapter';
import { nowIso } from '../lib/id';
import { DATA_VERSION, upgradeData } from './migrations';

interface DataContextValue {
  ready: boolean;
  error: string | null;
  clearError(): void;
  data: AppData;
  settings: Settings;
  storageName: string;

  exerciseById(id: string): Exercise | undefined;
  saveExercise(ex: Exercise): Promise<void>;
  deleteExercise(id: string): Promise<void>;

  savePlan(plan: WorkoutPlan): Promise<void>;
  deletePlan(id: string): Promise<void>;
  setActivePlan(id: string | null): Promise<void>;

  saveSession(session: WorkoutSession): Promise<void>;
  deleteSession(id: string): Promise<void>;

  importData(raw: unknown): Promise<void>;
  /** Change settings; when `copyData` is set, the current data is written to the new storage before switching. */
  updateSettings(next: Settings, opts?: { copyData?: boolean }): Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function upsertIn<T extends BaseDoc>(list: T[], doc: T): T[] {
  const i = list.findIndex((d) => d.id === doc.id);
  if (i < 0) return [...list, doc];
  const copy = list.slice();
  copy[i] = doc;
  return copy;
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const adapterRef = useRef<StorageAdapter>(createAdapter(DEFAULT_SETTINGS));
  const dataRef = useRef<AppData>(EMPTY_DATA);
  dataRef.current = data;

  const report = useCallback((e: unknown) => {
    setError(e instanceof Error ? e.message : String(e));
  }, []);

  const loadFrom = useCallback(async (adapter: StorageAdapter) => {
    let loaded = await adapter.loadAll();
    const isEmpty = loaded.exercises.length === 0 && loaded.plans.length === 0 && loaded.sessions.length === 0;
    // Existing data without a recorded version came from the first app release.
    const version = isEmpty ? 0 : ((await loadDataVersion()) ?? 1);
    if (version < DATA_VERSION) {
      loaded = upgradeData(loaded, version);
      await adapter.replaceAll(loaded);
      await saveDataVersion(DATA_VERSION);
    }
    adapterRef.current = adapter;
    setData(loaded);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const raw = await loadSettingsRaw();
        const s: Settings = { ...DEFAULT_SETTINGS, ...((raw as Partial<Settings>) ?? {}) };
        setSettings(s);
        try {
          await loadFrom(createAdapter(s));
        } catch (e) {
          // Remote unreachable: fall back to on-device data so the app stays usable.
          report(new Error(`Could not load from ${s.storage} storage (${(e as Error).message}). Showing local data.`));
          await loadFrom(createAdapter({ ...s, storage: 'local' }));
        }
      } catch (e) {
        report(e);
      } finally {
        setReady(true);
      }
    })();
  }, [loadFrom, report]);

  /** Optimistically update in-memory state, then persist. */
  const persist = useCallback(
    async (collection: CollectionName, doc: BaseDoc) => {
      const stamped = { ...doc, updatedAt: nowIso() };
      setData((d) => ({ ...d, [collection]: upsertIn(d[collection] as BaseDoc[], stamped) }));
      try {
        await adapterRef.current.upsert(collection, stamped);
      } catch (e) {
        report(e);
      }
    },
    [report],
  );

  const remove = useCallback(
    async (collection: CollectionName, id: string) => {
      setData((d) => ({ ...d, [collection]: (d[collection] as BaseDoc[]).filter((x) => x.id !== id) }));
      try {
        await adapterRef.current.remove(collection, id);
      } catch (e) {
        report(e);
      }
    },
    [report],
  );

  const exerciseIndex = useMemo(() => new Map(data.exercises.map((e) => [e.id, e])), [data.exercises]);

  const value = useMemo<DataContextValue>(
    () => ({
      ready,
      error,
      clearError: () => setError(null),
      data,
      settings,
      storageName: adapterRef.current.name,
      exerciseById: (id) => exerciseIndex.get(id),

      saveExercise: (ex) => persist('exercises', ex),
      deleteExercise: (id) => remove('exercises', id),

      savePlan: (plan) => persist('plans', plan),
      deletePlan: (id) => remove('plans', id),
      setActivePlan: async (id) => {
        const changed = dataRef.current.plans.filter((p) => p.isActive !== (p.id === id));
        for (const p of changed) await persist('plans', { ...p, isActive: p.id === id } as WorkoutPlan);
      },

      saveSession: (s) => persist('sessions', s),
      deleteSession: (id) => remove('sessions', id),

      importData: async (raw) => {
        const next = normalizeAppData(raw);
        await adapterRef.current.replaceAll(next);
        setData(next);
      },

      updateSettings: async (next, opts) => {
        const storageChanged =
          next.storage !== settings.storage ||
          next.remoteUrl !== settings.remoteUrl ||
          next.remoteApiKey !== settings.remoteApiKey;
        if (storageChanged) {
          const adapter = createAdapter(next);
          if (opts?.copyData) await adapter.replaceAll(dataRef.current);
          await loadFrom(adapter); // throws if the new storage is unreachable; settings stay unchanged
        }
        await saveSettingsRaw(next);
        setSettings(next);
      },
    }),
    [ready, error, data, settings, exerciseIndex, persist, remove, loadFrom],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
