/**
 * Global application state using Zustand.
 *
 * State Management Decision (ADR-015):
 *   Zustand was chosen over React Context + useReducer because:
 *   1. Minimal boilerplate for the scale of this application
 *   2. Excellent TypeScript support
 *   3. Selective subscriptions (performance)
 *   4. Easy to test and reason about
 *   Trade-off: Not as structured as Redux, but sufficient for LuckyRay's needs.
 *
 * State is NOT persisted in Zustand — persistence is handled by @luckyray/storage.
 * Zustand holds only the current session's in-memory state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Profile, StoredChart, Conversation, Message, AppSettings } from '@luckyray/shared';
import type { Language } from '@/lib/i18n';

export type AppMode = 'astrologer' | 'user';

interface AppState {
  // Language
  language: Language;
  setLanguage: (lang: Language) => void;

  // App mode — controls what features are visible
  appMode: AppMode;
  setAppMode: (mode: AppMode) => void;

  // Current active profile
  activeProfile: Profile | null;
  setActiveProfile: (profile: Profile | null) => void;

  // Current active chart for the active profile
  activeChart: StoredChart | null;
  setActiveChart: (chart: StoredChart | null) => void;

  // Current active conversation
  activeConversation: Conversation | null;
  setActiveConversation: (conversation: Conversation | null) => void;

  // Messages for the active conversation (in-memory cache)
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  appendMessage: (message: Message) => void;
  updateLastMessage: (update: Partial<Message>) => void;

  // App settings
  settings: AppSettings | null;
  setSettings: (settings: AppSettings) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;

  // UI state
  isSidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Loading states
  isGeneratingChart: boolean;
  setIsGeneratingChart: (loading: boolean) => void;
  isStreaming: boolean;
  setIsStreaming: (streaming: boolean) => void;

  // Toast notifications
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
  language: 'en' as Language,
  setLanguage: (lang) => set({ language: lang }),

  appMode: 'user' as AppMode,
  setAppMode: (mode) => set({ appMode: mode }),

  activeProfile: null,
  setActiveProfile: (profile) => set({ activeProfile: profile }),

  activeChart: null,
  setActiveChart: (chart) => set({ activeChart: chart }),

  activeConversation: null,
  setActiveConversation: (conversation) => set({ activeConversation: conversation }),

  messages: [],
  setMessages: (messages) => set({ messages }),
  appendMessage: (message) => set(state => ({ messages: [...state.messages, message] })),
  updateLastMessage: (update) => set(state => {
    const messages = [...state.messages];
    const lastIndex = messages.length - 1;
    if (lastIndex >= 0) {
      messages[lastIndex] = { ...messages[lastIndex]!, ...update };
    }
    return { messages };
  }),

  settings: null,
  setSettings: (settings) => set({ settings }),
  updateSettings: (partial) => set(state => ({
    settings: state.settings ? { ...state.settings, ...partial } : null,
  })),

  isSidebarOpen: true,
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),

  isGeneratingChart: false,
  setIsGeneratingChart: (loading) => set({ isGeneratingChart: loading }),
  isStreaming: false,
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),

  toasts: [],
  addToast: (toast) => {
    const id = crypto.randomUUID();
    set(state => ({ toasts: [...state.toasts, { ...toast, id }] }));
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
      }, duration);
    }
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
    }),
    {
      name: 'luckyray-app',
      partialize: (state) => ({ appMode: state.appMode, language: state.language }),
    },
  ),
);
