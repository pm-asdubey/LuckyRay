import { getDB } from './db';
import type { AppSettings } from '@luckyray/shared';

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  aiModel: 'meta/llama-3.1-70b-instruct',
  aiProvider: 'nvidia',
  chartStyle: 'north-indian',
  animationsEnabled: true,
  debugMode: false,
};

export async function getSetting<K extends keyof AppSettings>(key: K): Promise<AppSettings[K]> {
  const db = await getDB();
  const record = await db.get('settings', key);
  if (record === undefined) return DEFAULT_SETTINGS[key];
  return record.value as AppSettings[K];
}

export async function setSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const db = await getDB();
  await db.put('settings', { key, value });
}

export async function getAllSettings(): Promise<AppSettings> {
  const db = await getDB();
  const allRecords = await db.getAll('settings');
  const settings = { ...DEFAULT_SETTINGS };
  for (const record of allRecords) {
    if (record.key in settings) {
      (settings as Record<string, unknown>)[record.key] = record.value;
    }
  }
  return settings;
}

export async function resetSettings(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('settings', 'readwrite');
  await tx.store.clear();
  await tx.done;
}
