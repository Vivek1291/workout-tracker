import { Settings } from '../types';
import { LocalStorageAdapter } from './localAdapter';
import { RemoteApiAdapter } from './remoteAdapter';
import { StorageAdapter } from './types';

export function createAdapter(settings: Settings): StorageAdapter {
  if (settings.storage === 'remote' && settings.remoteUrl.trim()) {
    return new RemoteApiAdapter(settings.remoteUrl.trim(), settings.remoteApiKey);
  }
  return new LocalStorageAdapter();
}

export * from './types';
