/**
 * @luckyray/storage
 *
 * Local-first data persistence for LuckyRay.
 *
 * All data is stored in the user's browser via IndexedDB.
 * Nothing is transmitted to any server.
 *
 * Storage Decision (ADR-014):
 *   IndexedDB via `idb` wrapper (MIT license).
 *   See db.ts for full rationale.
 */

export { getDB, closeDB, DB_NAME, DB_VERSION } from './db';
export {
  createProfile, getProfile, getAllProfiles,
  updateProfile, deleteProfile,
} from './profiles';
export {
  saveChart, getChart, getLatestChart,
  getChartsForProfile, deleteChart, exportChartAsJson,
} from './charts';
export {
  createConversation, getConversation, getConversationsForProfile,
  updateConversation, deleteConversation,
  addMessage, getMessagesForConversation,
} from './conversations';
export {
  getSetting, setSetting, getAllSettings, resetSettings, DEFAULT_SETTINGS,
} from './settings';
export {
  exportAllData, importData, deleteAllData, EXPORT_SCHEMA_VERSION,
} from './export-import';
export type { LuckyRayExport } from './export-import';
