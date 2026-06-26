import { getDB } from './db';
import type { Profile } from '@luckyray/shared';

export async function createProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', profile);
}

export async function getProfile(id: string): Promise<Profile | undefined> {
  const db = await getDB();
  return db.get('profiles', id);
}

export async function getAllProfiles(): Promise<Profile[]> {
  const db = await getDB();
  const profiles = await db.getAll('profiles');
  return profiles.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function updateProfile(profile: Profile): Promise<void> {
  const db = await getDB();
  await db.put('profiles', { ...profile, updatedAt: new Date().toISOString() });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['profiles', 'charts', 'conversations', 'messages'], 'readwrite');

  // Delete profile
  await tx.objectStore('profiles').delete(id);

  // Delete associated charts
  const chartIndex = tx.objectStore('charts').index('byProfileId');
  let chartCursor = await chartIndex.openCursor(id);
  while (chartCursor) {
    await chartCursor.delete();
    chartCursor = await chartCursor.continue();
  }

  // Delete associated conversations and their messages
  const convIndex = tx.objectStore('conversations').index('byProfileId');
  let convCursor = await convIndex.openCursor(id);
  while (convCursor) {
    const convId = convCursor.value.id;
    await convCursor.delete();

    const msgIndex = tx.objectStore('messages').index('byConversationId');
    let msgCursor = await msgIndex.openCursor(convId);
    while (msgCursor) {
      await msgCursor.delete();
      msgCursor = await msgCursor.continue();
    }

    convCursor = await convCursor.continue();
  }

  await tx.done;
}
