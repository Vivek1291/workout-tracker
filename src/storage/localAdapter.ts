import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppData, BaseDoc, CollectionName } from '../types';
import { COLLECTIONS, StorageAdapter } from './types';

const KEY_PREFIX = 'workout-tracker:';
const key = (c: CollectionName) => `${KEY_PREFIX}${c}`;

/**
 * Stores each collection as a JSON array under its own key.
 * Keeps an in-memory copy and serializes writes so rapid edits never clobber each other.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = 'Local storage';
  private cache: AppData | null = null;
  private queue: Promise<void> = Promise.resolve();

  async loadAll(): Promise<AppData> {
    const entries = await AsyncStorage.multiGet(COLLECTIONS.map(key));
    const data: AppData = { version: 1, exercises: [], plans: [], sessions: [] };
    entries.forEach(([, value], i) => {
      if (!value) return;
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) (data as unknown as Record<string, unknown[]>)[COLLECTIONS[i]] = parsed;
      } catch {
        // Corrupt value: start that collection empty rather than crashing the app.
      }
    });
    this.cache = data;
    return JSON.parse(JSON.stringify(data));
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task, task);
    this.queue = run.catch(() => undefined);
    return run;
  }

  private async ensureCache(): Promise<AppData> {
    if (!this.cache) await this.loadAll();
    return this.cache!;
  }

  private async write(c: CollectionName) {
    const data = await this.ensureCache();
    await AsyncStorage.setItem(key(c), JSON.stringify(data[c]));
  }

  upsert(c: CollectionName, doc: BaseDoc) {
    return this.enqueue(async () => {
      const data = await this.ensureCache();
      const list = data[c] as BaseDoc[];
      const i = list.findIndex((d) => d.id === doc.id);
      if (i >= 0) list[i] = doc;
      else list.push(doc);
      await this.write(c);
    });
  }

  remove(c: CollectionName, id: string) {
    return this.enqueue(async () => {
      const data = await this.ensureCache();
      (data as unknown as Record<string, BaseDoc[]>)[c] = (data[c] as BaseDoc[]).filter((d) => d.id !== id);
      await this.write(c);
    });
  }

  replaceAll(next: AppData) {
    return this.enqueue(async () => {
      this.cache = JSON.parse(JSON.stringify(next));
      await AsyncStorage.multiSet(COLLECTIONS.map((c) => [key(c), JSON.stringify(next[c])]));
    });
  }
}

const SETTINGS_KEY = `${KEY_PREFIX}settings`;

/** Settings always live on the device (they say where the rest of the data lives). */
export async function loadSettingsRaw(): Promise<unknown> {
  const v = await AsyncStorage.getItem(SETTINGS_KEY);
  return v ? JSON.parse(v) : null;
}

export async function saveSettingsRaw(settings: unknown): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

const DATA_VERSION_KEY = `${KEY_PREFIX}dataVersion`;

/** Which built-in content upgrade this device has applied (null = never recorded). */
export async function loadDataVersion(): Promise<number | null> {
  const v = await AsyncStorage.getItem(DATA_VERSION_KEY);
  return v ? Number(v) : null;
}

export async function saveDataVersion(version: number): Promise<void> {
  await AsyncStorage.setItem(DATA_VERSION_KEY, String(version));
}
