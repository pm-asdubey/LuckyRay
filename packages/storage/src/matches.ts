import { getDB } from './db';
import type { StoredMatch } from '@luckyray/shared';

export async function saveMatch(match: StoredMatch): Promise<void> {
  const db = await getDB();
  await db.put('matches', match);
}

export async function getMatch(id: string): Promise<StoredMatch | undefined> {
  const db = await getDB();
  return db.get('matches', id);
}

export async function getMatchesForProfile(profileId: string): Promise<StoredMatch[]> {
  const db = await getDB();
  const aIndex = db.transaction('matches').store.index('byProfileAId');
  const bIndex = db.transaction('matches').store.index('byProfileBId');

  const matches: StoredMatch[] = [];

  let aCursor = await aIndex.openCursor(profileId);
  while (aCursor) {
    matches.push(aCursor.value);
    aCursor = await aCursor.continue();
  }

  let bCursor = await bIndex.openCursor(profileId);
  while (bCursor) {
    if (!matches.find(m => m.id === bCursor!.value.id)) {
      matches.push(bCursor.value);
    }
    bCursor = await bCursor.continue();
  }

  return matches.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function deleteMatch(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('matches', id);
}
