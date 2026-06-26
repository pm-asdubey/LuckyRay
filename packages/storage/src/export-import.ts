/**
 * Export and import functionality for LuckyRay data.
 *
 * Supports exporting the entire database or individual entities to JSON.
 * Import validates schema version before writing data.
 */

import { getDB } from './db';
import type { Profile, StoredChart, Conversation, Message } from '@luckyray/shared';

export const EXPORT_SCHEMA_VERSION = '1.0';

export interface LuckyRayExport {
  exportVersion: string;
  exportedAt: string;
  profiles: Profile[];
  charts: StoredChart[];
  conversations: Conversation[];
  messages: Message[];
}

/**
 * Export all data as a JSON string.
 */
export async function exportAllData(): Promise<string> {
  const db = await getDB();

  const [profiles, charts, conversations, messages] = await Promise.all([
    db.getAll('profiles'),
    db.getAll('charts'),
    db.getAll('conversations'),
    db.getAll('messages'),
  ]);

  const exportData: LuckyRayExport = {
    exportVersion: EXPORT_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    profiles,
    charts,
    conversations,
    messages,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import data from a JSON export string.
 * Validates schema version before importing.
 * Existing data is preserved — import adds/updates records.
 */
export async function importData(jsonString: string): Promise<{
  success: boolean;
  imported: { profiles: number; charts: number; conversations: number; messages: number };
  error?: string;
}> {
  let data: LuckyRayExport;

  try {
    data = JSON.parse(jsonString) as LuckyRayExport;
  } catch {
    return { success: false, imported: { profiles: 0, charts: 0, conversations: 0, messages: 0 }, error: 'Invalid JSON format' };
  }

  if (!data.exportVersion || !data.profiles || !data.charts || !data.conversations || !data.messages) {
    return { success: false, imported: { profiles: 0, charts: 0, conversations: 0, messages: 0 }, error: 'Invalid export format — missing required fields' };
  }

  const db = await getDB();
  const tx = db.transaction(['profiles', 'charts', 'conversations', 'messages'], 'readwrite');

  try {
    for (const profile of data.profiles) {
      await tx.objectStore('profiles').put(profile);
    }
    for (const chart of data.charts) {
      await tx.objectStore('charts').put(chart);
    }
    for (const conversation of data.conversations) {
      await tx.objectStore('conversations').put(conversation);
    }
    for (const message of data.messages) {
      await tx.objectStore('messages').put(message);
    }

    await tx.done;

    return {
      success: true,
      imported: {
        profiles: data.profiles.length,
        charts: data.charts.length,
        conversations: data.conversations.length,
        messages: data.messages.length,
      },
    };
  } catch (err) {
    return {
      success: false,
      imported: { profiles: 0, charts: 0, conversations: 0, messages: 0 },
      error: err instanceof Error ? err.message : 'Import failed',
    };
  }
}

/**
 * Delete all data from the database.
 */
export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'charts', 'conversations', 'messages', 'settings'], 'readwrite');
  await Promise.all([
    tx.objectStore('profiles').clear(),
    tx.objectStore('charts').clear(),
    tx.objectStore('conversations').clear(),
    tx.objectStore('messages').clear(),
    tx.objectStore('settings').clear(),
  ]);
  await tx.done;
}
