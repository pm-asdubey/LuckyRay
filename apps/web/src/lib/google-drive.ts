/**
 * Google Drive Sync — client-side only, uses Google Identity Services (GIS).
 *
 * Stores data as a single file `luckyray-data.json` in the Drive `appDataFolder`
 * (app-specific hidden folder that does not appear in the user's Drive UI).
 *
 * No npm packages are required — the GIS script is loaded dynamically at runtime.
 *
 * Architecture Decision (ADR-020):
 *   We use the token client flow (implicit grant) because this is a pure SPA with no
 *   server-side callback. The access token is short-lived (1 hour) and stored in
 *   localStorage alongside its expiry. This is acceptable for a local-first app where
 *   the user explicitly consents to the OAuth popup.
 */

import { exportAllData, importData } from '@luckyray/storage';

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_TOKEN      = 'lr_gdrive_token';
const LS_EXPIRY     = 'lr_gdrive_expiry';
const LS_FILE_ID    = 'lr_gdrive_file_id';
const LS_LAST_SYNC  = 'lr_gdrive_last_sync';

const DRIVE_FILES_URL  = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DATA_FILENAME    = 'luckyray-data.json';
const BOUNDARY         = 'luckyray_boundary';
const SCOPE            = 'https://www.googleapis.com/auth/drive.appdata';

// ─── GIS loader ──────────────────────────────────────────────────────────────

function loadGIS(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) { resolve(); return; }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

// ─── Token helpers ────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  const token  = localStorage.getItem(LS_TOKEN);
  const expiry = localStorage.getItem(LS_EXPIRY);
  if (!token || !expiry) return null;
  if (Date.now() > parseInt(expiry, 10)) {
    // Token expired — clear it
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_EXPIRY);
    return null;
  }
  return token;
}

function storeToken(accessToken: string, expiresIn: number): void {
  localStorage.setItem(LS_TOKEN, accessToken);
  // 1-minute buffer so we never use a token that is about to expire
  localStorage.setItem(LS_EXPIRY, String(Date.now() + expiresIn * 1000 - 60_000));
}

function requireToken(): string {
  const token = getStoredToken();
  if (!token) throw new Error('Not connected to Google Drive. Please reconnect.');
  return token;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if NEXT_PUBLIC_GOOGLE_CLIENT_ID is set at build time.
 * Without the Client ID the OAuth flow cannot start.
 */
export function isGoogleDriveConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
}

/**
 * Opens the GIS OAuth popup and stores the resulting access token.
 * After a successful token grant, performs a test list call to confirm
 * appDataFolder access and caches the file ID if the backup already exists.
 */
export async function connectGoogleDrive(): Promise<void> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured.');

  await loadGIS();

  await new Promise<void>((resolve, reject) => {
    const client = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response: any) => {
        if (response.error) {
          reject(new Error(response.error_description ?? response.error));
          return;
        }
        storeToken(response.access_token, parseInt(response.expires_in, 10));
        resolve();
      },
    });
    client.requestAccessToken({ prompt: 'consent' });
  });

  // Confirm access + cache file ID
  const token = requireToken();
  const res = await fetch(
    `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name%3D'${DATA_FILENAME}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error(`Drive access check failed: ${res.status}`);
  const data = await res.json();
  const files: { id: string }[] = data.files ?? [];
  if (files.length > 0 && files[0]) {
    localStorage.setItem(LS_FILE_ID, files[0].id);
  }
  // Initialise last-sync marker only if none exists yet
  if (!localStorage.getItem(LS_LAST_SYNC)) {
    localStorage.setItem(LS_LAST_SYNC, 'never');
  }
}

/**
 * Removes the stored token, expiry, file ID and last-sync marker.
 */
export function disconnectGoogleDrive(): void {
  localStorage.removeItem(LS_TOKEN);
  localStorage.removeItem(LS_EXPIRY);
  localStorage.removeItem(LS_FILE_ID);
  localStorage.removeItem(LS_LAST_SYNC);
}

/**
 * Returns the current connection state derived from localStorage.
 * `connected` is true only if a non-expired token exists.
 */
export function getDriveConnectionState(): { connected: boolean; lastSync: string | null } {
  const connected = getStoredToken() !== null;
  const lastSync  = typeof window !== 'undefined' ? localStorage.getItem(LS_LAST_SYNC) : null;
  return { connected, lastSync };
}

// ─── Multipart upload helpers ─────────────────────────────────────────────────

function buildMultipartBody(jsonData: string, includeParents: boolean): string {
  const metadata = includeParents
    ? JSON.stringify({ name: DATA_FILENAME, parents: ['appDataFolder'] })
    : JSON.stringify({ name: DATA_FILENAME });

  return (
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${metadata}\r\n` +
    `--${BOUNDARY}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${jsonData}\r\n` +
    `--${BOUNDARY}--`
  );
}

async function findOrCreateFileId(token: string): Promise<string> {
  const cached = typeof window !== 'undefined' ? localStorage.getItem(LS_FILE_ID) : null;
  if (cached) return cached;

  // Search for an existing file
  const listRes = await fetch(
    `${DRIVE_FILES_URL}?spaces=appDataFolder&q=name%3D'${DATA_FILENAME}'&fields=files(id)`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok) throw new Error(`Drive list failed: ${listRes.status}`);
  const listData = await listRes.json();
  const existing: { id: string }[] = listData.files ?? [];
  if (existing.length > 0 && existing[0]) {
    localStorage.setItem(LS_FILE_ID, existing[0].id);
    return existing[0].id;
  }

  return ''; // Will be created during first upload
}

// ─── Sync / Import ────────────────────────────────────────────────────────────

/**
 * Exports all local data and uploads it to the `appDataFolder` on Drive.
 * Creates the file on first use; patches it on subsequent calls.
 */
export async function syncToGoogleDrive(): Promise<void> {
  const token    = requireToken();
  const jsonData = await exportAllData();
  const fileId   = await findOrCreateFileId(token);
  const body     = buildMultipartBody(jsonData, !fileId);
  const headers  = {
    Authorization: `Bearer ${token}`,
    'Content-Type': `multipart/related; boundary="${BOUNDARY}"`,
  };

  let res: Response;
  if (fileId) {
    res = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=multipart`, {
      method: 'PATCH',
      headers,
      body,
    });
  } else {
    res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&spaces=appDataFolder`, {
      method: 'POST',
      headers,
      body,
    });
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Drive upload failed (${res.status}): ${errText}`);
  }

  const result = await res.json();
  if (result.id) {
    localStorage.setItem(LS_FILE_ID, result.id);
  }
  localStorage.setItem(LS_LAST_SYNC, new Date().toISOString());
}

/**
 * Downloads the backup file from Drive and merges it into local storage.
 * Returns a summary of how many records were imported.
 */
export async function importFromGoogleDrive(): Promise<{
  profiles: number;
  charts: number;
  conversations: number;
  messages: number;
}> {
  const token  = requireToken();
  const fileId = await findOrCreateFileId(token);

  if (!fileId) {
    throw new Error('No backup found on Google Drive. Sync your data first.');
  }

  const res = await fetch(`${DRIVE_FILES_URL}/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Drive download failed (${res.status})`);
  }

  const jsonStr = await res.text();
  const result  = await importData(jsonStr);

  if (!result.success) {
    throw new Error(result.error ?? 'Import failed');
  }

  return {
    profiles:      result.imported.profiles,
    charts:        result.imported.charts,
    conversations: result.imported.conversations,
    messages:      result.imported.messages,
  };
}
