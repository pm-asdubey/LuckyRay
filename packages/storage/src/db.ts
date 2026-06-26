/**
 * IndexedDB initialization for LuckyRay local storage.
 *
 * Storage Decision (ADR-014):
 *   Technology: IndexedDB via the `idb` wrapper library
 *   Rationale:
 *   - Native browser storage — no server required
 *   - Supports structured data (objects, arrays)
 *   - Larger storage limits than localStorage
 *   - Transactional — prevents data corruption
 *   - `idb` provides a clean Promise-based API
 *   Trade-off: Not available in non-browser environments.
 *   Since LuckyRay is a browser application, this is acceptable.
 *   Future: If desktop packaging is needed, migrate to SQLite via
 *   electron/tauri bridge or an abstraction layer.
 *
 * Schema version: 1
 * Upgrade policy: Preserve all existing data on upgrade.
 */

import { openDB, type IDBPDatabase } from 'idb';
import type { LuckyRayDB } from './types';

export const DB_NAME = 'luckyray';
export const DB_VERSION = 1;

let dbInstance: IDBPDatabase<LuckyRayDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<LuckyRayDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<LuckyRayDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        // Profiles store
        const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
        profileStore.createIndex('byCreatedAt', 'createdAt');
        profileStore.createIndex('byUpdatedAt', 'updatedAt');

        // Charts store
        const chartStore = db.createObjectStore('charts', { keyPath: 'id' });
        chartStore.createIndex('byProfileId', 'profileId');
        chartStore.createIndex('byGeneratedAt', 'generatedAt');

        // Conversations store
        const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
        convStore.createIndex('byProfileId', 'profileId');
        convStore.createIndex('byUpdatedAt', 'updatedAt');

        // Messages store
        const msgStore = db.createObjectStore('messages', { keyPath: 'id' });
        msgStore.createIndex('byConversationId', 'conversationId');
        msgStore.createIndex('byCreatedAt', 'createdAt');

        // Settings store (key-value)
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    },
  });

  return dbInstance;
}

/**
 * Close and reset the database connection.
 * Useful for testing and cleanup.
 */
export function closeDB(): void {
  dbInstance?.close();
  dbInstance = null;
}
