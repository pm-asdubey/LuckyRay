import { getDB } from './db';
import type { StoredChart, CanonicalChart } from '@luckyray/shared';

export async function saveChart(chart: StoredChart): Promise<void> {
  const db = await getDB();
  await db.put('charts', chart);
}

export async function getChart(id: string): Promise<StoredChart | undefined> {
  const db = await getDB();
  return db.get('charts', id);
}

export async function getLatestChart(profileId: string): Promise<StoredChart | undefined> {
  const db = await getDB();
  const index = db.transaction('charts').store.index('byProfileId');
  const charts: StoredChart[] = [];
  let cursor = await index.openCursor(profileId);
  while (cursor) {
    charts.push(cursor.value);
    cursor = await cursor.continue();
  }
  return charts.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  )[0];
}

export async function getChartsForProfile(profileId: string): Promise<StoredChart[]> {
  const db = await getDB();
  const index = db.transaction('charts').store.index('byProfileId');
  const charts: StoredChart[] = [];
  let cursor = await index.openCursor(profileId);
  while (cursor) {
    charts.push(cursor.value);
    cursor = await cursor.continue();
  }
  return charts.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
  );
}

export async function deleteChart(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('charts', id);
}

/**
 * Export a chart as a downloadable JSON string.
 */
export function exportChartAsJson(chart: StoredChart): string {
  return JSON.stringify(chart, null, 2);
}
