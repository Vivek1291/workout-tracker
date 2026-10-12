import { AppData, BaseDoc, CollectionName } from '../types';
import { normalizeAppData, StorageAdapter } from './types';

/**
 * Talks to a REST API backed by MongoDB (see /server for a reference implementation).
 *
 *   GET    {baseUrl}/data                   → AppData
 *   PUT    {baseUrl}/data                   ← AppData (replace everything)
 *   PUT    {baseUrl}/:collection/:id        ← document (upsert)
 *   DELETE {baseUrl}/:collection/:id
 */
export class RemoteApiAdapter implements StorageAdapter {
  readonly name = 'Remote API (MongoDB)';
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly apiKey: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey ? { 'x-api-key': this.apiKey } : {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Server responded ${res.status}${text ? `: ${text}` : ''}`);
    }
    return res;
  }

  async loadAll(): Promise<AppData> {
    const res = await this.request('/data');
    return normalizeAppData(await res.json());
  }

  async upsert(c: CollectionName, doc: BaseDoc) {
    await this.request(`/${c}/${encodeURIComponent(doc.id)}`, { method: 'PUT', body: JSON.stringify(doc) });
  }

  async remove(c: CollectionName, id: string) {
    await this.request(`/${c}/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  async replaceAll(data: AppData) {
    await this.request('/data', { method: 'PUT', body: JSON.stringify(data) });
  }
}
