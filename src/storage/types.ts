import { AppData, BaseDoc, CollectionName } from '../types';

/**
 * The app talks to persistence only through this interface.
 * - LocalStorageAdapter: JSON in AsyncStorage (localStorage on web, native storage on iOS).
 * - RemoteApiAdapter:    a REST API, e.g. the reference Express + MongoDB server in /server.
 * Add another adapter (Realm, SQLite, Firebase…) by implementing these four methods.
 */
export interface StorageAdapter {
  readonly name: string;
  loadAll(): Promise<AppData>;
  upsert(collection: CollectionName, doc: BaseDoc): Promise<void>;
  remove(collection: CollectionName, id: string): Promise<void>;
  replaceAll(data: AppData): Promise<void>;
}

export function emptyData(): AppData {
  return { version: 1, exercises: [], plans: [], sessions: [], foods: [], foodLogs: [], waterLogs: [], bodyLogs: [], profile: [] };
}

export const EMPTY_DATA: AppData = emptyData();

export const COLLECTIONS: CollectionName[] = ['exercises', 'plans', 'sessions', 'foods', 'foodLogs', 'waterLogs', 'bodyLogs', 'profile'];

/** Validate and normalize data coming from an import or a remote server. */
export function normalizeAppData(raw: unknown): AppData {
  if (!raw || typeof raw !== 'object') throw new Error('Data must be a JSON object.');
  const obj = raw as Record<string, unknown>;
  const out: AppData = emptyData();
  for (const c of COLLECTIONS) {
    const list = obj[c];
    if (list === undefined) continue;
    if (!Array.isArray(list)) throw new Error(`"${c}" must be an array.`);
    for (const item of list) {
      if (!item || typeof item !== 'object' || typeof (item as BaseDoc).id !== 'string') {
        throw new Error(`Every item in "${c}" needs a string "id".`);
      }
    }
    // Strip Mongo's _id if the data came straight out of a database dump.
    (out as unknown as Record<string, unknown[]>)[c] = list.map((item) => {
      const { _id, ...rest } = item as Record<string, unknown>;
      return rest;
    });
  }
  return out;
}
