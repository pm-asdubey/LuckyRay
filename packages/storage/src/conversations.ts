import { getDB } from './db';
import type { Conversation, Message } from '@luckyray/shared';

export async function createConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

export async function getConversation(id: string): Promise<Conversation | undefined> {
  const db = await getDB();
  return db.get('conversations', id);
}

export async function getConversationsForProfile(profileId: string): Promise<Conversation[]> {
  const db = await getDB();
  const index = db.transaction('conversations').store.index('byProfileId');
  const conversations: Conversation[] = [];
  let cursor = await index.openCursor(profileId);
  while (cursor) {
    conversations.push(cursor.value);
    cursor = await cursor.continue();
  }
  return conversations.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export async function updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
  const db = await getDB();
  const existing = await db.get('conversations', id);
  if (!existing) return;
  await db.put('conversations', { ...existing, ...updates, updatedAt: new Date().toISOString() });
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'messages'], 'readwrite');
  await tx.objectStore('conversations').delete(id);

  const msgIndex = tx.objectStore('messages').index('byConversationId');
  let cursor = await msgIndex.openCursor(id);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.done;
}

export async function addMessage(message: Message): Promise<void> {
  const db = await getDB();
  await db.put('messages', message);
  // Update conversation's updatedAt
  const conv = await db.get('conversations', message.conversationId);
  if (conv) {
    await db.put('conversations', { ...conv, updatedAt: new Date().toISOString() });
  }
}

export async function getMessagesForConversation(conversationId: string): Promise<Message[]> {
  const db = await getDB();
  const index = db.transaction('messages').store.index('byConversationId');
  const messages: Message[] = [];
  let cursor = await index.openCursor(conversationId);
  while (cursor) {
    messages.push(cursor.value);
    cursor = await cursor.continue();
  }
  return messages.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}
