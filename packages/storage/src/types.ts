import type { DBSchema } from 'idb';
import type { Profile, StoredChart, Conversation, Message, AppSettings } from '@luckyray/shared';

export interface SettingRecord {
  key: string;
  value: string | number | boolean;
}

export interface LuckyRayDB extends DBSchema {
  profiles: {
    key: string;
    value: Profile;
    indexes: {
      byCreatedAt: string;
      byUpdatedAt: string;
    };
  };
  charts: {
    key: string;
    value: StoredChart;
    indexes: {
      byProfileId: string;
      byGeneratedAt: string;
    };
  };
  conversations: {
    key: string;
    value: Conversation;
    indexes: {
      byProfileId: string;
      byUpdatedAt: string;
    };
  };
  messages: {
    key: string;
    value: Message;
    indexes: {
      byConversationId: string;
      byCreatedAt: string;
    };
  };
  settings: {
    key: string;
    value: SettingRecord;
  };
}
