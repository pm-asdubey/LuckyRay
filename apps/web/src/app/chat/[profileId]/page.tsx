'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard, Plus } from 'lucide-react';

const INCOMPLETE_MARKER = '_(response stopped)_';
import {
  getProfile, getLatestChart,
  createConversation, getConversationsForProfile,
  addMessage, getMessagesForConversation, updateConversation,
} from '@luckyray/storage';
import type { Profile, StoredChart, Message, Conversation } from '@luckyray/shared';
import { buildChartContext } from '@luckyray/ai';
import { computeCurrentGochar } from '@luckyray/jyotish';
import { AppShell } from '@/components/layout/app-shell';
import { Sidebar, BottomNav } from '@/components/layout/nav';
import { Button } from '@/components/ui/button';
import { MessageBubble, StreamingBubble } from '@/components/chat/message-bubble';
import { ChatInput } from '@/components/chat/chat-input';
import { ErrorCard } from '@/components/ui/error-card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/store/app-store';
import { useAIChat } from '@/hooks/use-ai-chat';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/hooks/use-translation';

// ─── Dynamic Suggestions ──────────────────────────────────────────────────────

const BASE_SUGGESTIONS = [
  'What career paths suit my chart?',
  'How does my current dasha influence daily life?',
  'Describe my personality from the ascendant.',
  'What do my yogas indicate?',
  'When is a good period for relationships?',
  'What does my Moon placement say about my mind?',
  'How is my 10th house placed for career?',
  'What upcoming transits should I watch?',
];

const TOPIC_SUGGESTIONS: Record<string, string[]> = {
  career:     ['Which dasha is best for a job change?', 'How strong is my 10th house lord?', 'What planets support professional growth?'],
  marriage:   ['When is a favorable period for marriage?', 'What does my 7th house say about partnership?', 'How is Venus placed in my chart?'],
  wealth:     ['Which period is best for financial growth?', 'What yogas affect my wealth?', 'How is my 11th house lord placed?'],
  health:     ['What does my 6th house indicate about health?', 'Which planets affect my vitality?', 'How is my lagna lord placed?'],
  moon:       ['How does my Moon nakshatra shape my personality?', 'What does my Moon sign indicate emotionally?'],
  saturn:     ['How is my Saturn influencing current events?', 'What does my Sade Sati indicate?'],
  jupiter:    ['How is Jupiter influencing my chart right now?', 'What does my Jupiter dasha indicate?'],
  dasha:      ['What is the theme of my current Mahadasha?', 'When does my next Antardasha begin?'],
  transit:    ['Which current transits are most significant?', 'How does the Saturn transit affect me?'],
};

function getDynamicSuggestions(lastAssistantMessage?: string): string[] {
  if (!lastAssistantMessage) return BASE_SUGGESTIONS.slice(0, 3);

  const lower = lastAssistantMessage.toLowerCase();
  const picked: string[] = [];

  const topicChecks: [string, string[]][] = [
    ['career|profession|10th|job|work', TOPIC_SUGGESTIONS.career!],
    ['marriage|partner|7th|relationship|venus', TOPIC_SUGGESTIONS.marriage!],
    ['wealth|finance|money|11th|2nd', TOPIC_SUGGESTIONS.wealth!],
    ['health|vitality|6th|illness', TOPIC_SUGGESTIONS.health!],
    ['moon|mind|emotion|nakshatra', TOPIC_SUGGESTIONS.moon!],
    ['saturn|sade sati|shani', TOPIC_SUGGESTIONS.saturn!],
    ['jupiter|guru|dasha', TOPIC_SUGGESTIONS.jupiter!],
    ['mahadasha|antardasha|dasha period', TOPIC_SUGGESTIONS.dasha!],
    ['transit|gochar|current', TOPIC_SUGGESTIONS.transit!],
  ];

  for (const [pattern, suggs] of topicChecks) {
    if (picked.length >= 3) break;
    if (new RegExp(pattern).test(lower)) {
      suggs.forEach(s => { if (picked.length < 3 && !picked.includes(s)) picked.push(s); });
    }
  }

  if (picked.length < 3) {
    BASE_SUGGESTIONS.forEach(s => { if (picked.length < 3 && !picked.includes(s)) picked.push(s); });
  }

  return picked.slice(0, 3);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [incompleteMessageId, setIncompleteMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // Token batching: accumulate in a ref, flush to React state at most once per animation frame
  const tokenAccumRef = useRef('');
  const rafRef = useRef<number | null>(null);
  // Mirror of messages state for use in async callbacks without stale closures
  const messagesRef = useRef<Message[]>([]);
  const { addToast, setActiveProfile, setActiveChart, setActiveConversation, setIsStreaming: setStoreStreaming, appMode, language } = useAppStore();
  const t = useTranslation();

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const chartContext = storedChart?.chart
    ? buildChartContext(
        storedChart.chart,
        'general',
        computeCurrentGochar(storedChart.chart.ascendant.signIndex).planets,
      )
    : undefined;

  // Dynamic suggestions based on the last AI message
  const dynamicSuggestions = useMemo(() => {
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    return getDynamicSuggestions(lastAssistant?.content);
  }, [messages]);

  const { send, continue: continueResponse, abort } = useAIChat({
    systemMode: appMode,
    chartContext,
    language,
    onToken: (token) => {
      // Batch token appends into a single RAF-gated state update.
      // Without this, 100 tokens/sec = 100 setState calls/sec = browser choke.
      tokenAccumRef.current += token;
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          setStreamingText(tokenAccumRef.current);
          rafRef.current = null;
        });
      }
    },
    onComplete: async (fullText) => {
      // Cancel any pending RAF and do one final flush
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      tokenAccumRef.current = '';

      setIsStreaming(false);
      setStoreStreaming(false);
      setStreamingText('');

      if (!conversation) return;

      const now = new Date().toISOString();

      // If we were continuing a halted response, replace the incomplete message.
      if (incompleteMessageId) {
        let updatedMessage: Message | undefined;
        setMessages(prev => {
          const idx = prev.findIndex(m => m.id === incompleteMessageId);
          if (idx === -1) return prev;
          updatedMessage = { ...prev[idx]!, content: fullText };
          const updated = [...prev];
          updated[idx] = updatedMessage;
          return updated;
        });
        if (updatedMessage) await addMessage(updatedMessage);
        setIncompleteMessageId(null);
      } else {
        const assistantMessage: Message = {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'assistant',
          content: fullText,
          createdAt: now,
        };
        await addMessage(assistantMessage);
        setMessages(prev => [...prev, assistantMessage]);
      }
      await updateConversation(conversation.id, { updatedAt: now });
    },
    onError: (errMsg) => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      const captured = tokenAccumRef.current;
      tokenAccumRef.current = '';
      setIsStreaming(false);
      setStoreStreaming(false);
      setStreamingText('');

      // Preserve whatever was generated before the error so the user can continue.
      const partial = streamingText || captured;
      if (partial && conversation) {
        const now = new Date().toISOString();
        const incompleteMsg: Message = {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'assistant',
          content: partial.trim() + ' ' + INCOMPLETE_MARKER,
          createdAt: now,
        };
        addMessage(incompleteMsg);
        setMessages(prev => [...prev, incompleteMsg]);
        setIncompleteMessageId(incompleteMsg.id);
        updateConversation(conversation.id, { updatedAt: now });
      }

      addToast({ type: 'error', message: errMsg });
    },
  });

  const createNewConversation = useCallback(async (profileId: string): Promise<Conversation> => {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: crypto.randomUUID(),
      profileId,
      title: `Chart reading — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      createdAt: now,
      updatedAt: now,
    };
    await createConversation(conv);
    return conv;
  }, []);

  const load = useCallback(async (forceNew = false) => {
    setLoading(true);
    setError(null);
    try {
      const [p, c] = await Promise.all([
        getProfile(params.profileId),
        getLatestChart(params.profileId),
      ]);
      if (!p) { setError('Profile not found'); return; }
      setProfile(p);
      setActiveProfile(p);

      if (c) { setStoredChart(c); setActiveChart(c); }

      let conv: Conversation;
      let msgs: Message[] = [];

      if (!forceNew) {
        const existing = await getConversationsForProfile(p.id);
        if (existing.length > 0) {
          conv = existing[0]!;
          msgs = await getMessagesForConversation(conv.id);
        } else {
          conv = await createNewConversation(p.id);
        }
      } else {
        conv = await createNewConversation(p.id);
      }

      setConversation(conv);
      setMessages(msgs);
      setActiveConversation(conv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [params.profileId, setActiveProfile, setActiveChart, setActiveConversation, createNewConversation]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingText]);

  const handleSend = async (text: string) => {
    if (!conversation || isStreaming) return;

    if (!storedChart) {
      addToast({ type: 'error', message: 'Generate a chart first before chatting.' });
      router.push(`/chart/${params.profileId}`);
      return;
    }

    const now = new Date().toISOString();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      conversationId: conversation.id,
      role: 'user',
      content: text,
      createdAt: now,
    };

    await addMessage(userMessage);
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);

    tokenAccumRef.current = '';
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreamingText('');
    setIsStreaming(true);
    setStoreStreaming(true);
    setIncompleteMessageId(null);

    const apiMessages = updatedMessages
      .filter(m => m.role !== 'system')
      .slice(-20)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    send(apiMessages);
  };

  const handleAbort = () => {
    abort();
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const captured = tokenAccumRef.current;
    tokenAccumRef.current = '';
    setIsStreaming(false);
    setStoreStreaming(false);
    const abortedText = streamingText || captured;
    if (abortedText) {
      const partial = abortedText + ' ' + INCOMPLETE_MARKER;
      if (conversation) {
        const msg: Message = {
          id: crypto.randomUUID(),
          conversationId: conversation.id,
          role: 'assistant',
          content: partial,
          createdAt: new Date().toISOString(),
        };
        addMessage(msg);
        setMessages(prev => [...prev, msg]);
        setIncompleteMessageId(msg.id);
      }
    }
    setStreamingText('');
  };

  const handleNewChat = () => load(true);

  const handleContinue = async (messageId: string) => {
    if (!conversation || isStreaming) return;

    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const incompleteMsg = messages[messageIndex]!;
    const cleaned = incompleteMsg.content.replace(INCOMPLETE_MARKER, '').trim();

    // Messages sent to the AI: everything before the incomplete assistant message.
    const historyForAI = messages
      .slice(0, messageIndex)
      .filter(m => m.role !== 'system')
      .slice(-20)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    tokenAccumRef.current = cleaned;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    setStreamingText(cleaned);
    setIsStreaming(true);
    setStoreStreaming(true);

    continueResponse(historyForAI, cleaned);
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col p-6 space-y-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton lines={4} />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!profile || error) {
    return (
      <AppShell>
        <div className="flex h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col p-6">
            <ErrorCard title="Could not load chat" message={error ?? 'Unknown error'} onRetry={() => load()} />
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Header */}
          <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-surface-border bg-surface">
            <Link href={`/chart/${profile.id}`}>
              <Button variant="icon" size="sm" aria-label="Back to chart">
                <ArrowLeft size={16} />
              </Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-content truncate">{profile.name}</div>
              <div className="text-xs text-content-muted">
                {messages.length > 0 ? t.chatPage.messageCount(messages.length) : t.chatPage.jyotishAdvisor}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNewChat}
              aria-label={t.chatPage.newChat}
              title={t.chatPage.newChat}
            >
              <Plus size={14} />
              <span className="hidden sm:inline">{t.chatPage.newChat}</span>
            </Button>
            <Link href={`/chart/${profile.id}`}>
              <Button variant="ghost" size="sm">
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">{t.chatPage.viewChart}</span>
              </Button>
            </Link>
          </div>

          {/* No chart warning */}
          {!storedChart && (
            <div className="px-4 py-3 bg-warning/10 border-b border-warning/20">
              <p className="text-xs text-warning">
                {t.chatPage.noChartWarning}{' '}
                <Link href={`/chart/${profile.id}`} className="underline hover:no-underline">
                  {t.chatPage.noChartLink}
                </Link>{' '}
                {t.chatPage.noChartSuffix}
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 pb-4">
            {messages.length === 0 && !isStreaming && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                <div className="h-14 w-14 rounded-2xl bg-accent-subtle border border-accent-muted flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 32 32" fill="none" className="text-accent">
                    <path d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-sm font-semibold text-content">
                    {t.chatPage.askAbout(profile.name)}
                  </h2>
                  <p className="text-xs text-content-muted max-w-xs leading-relaxed">
                    {t.chatPage.askAboutDesc}
                  </p>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                profileName={profile.name}
                onContinue={msg.id === incompleteMessageId ? () => handleContinue(msg.id) : undefined}
              />
            ))}

            {isStreaming && <StreamingBubble text={streamingText} />}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className={cn(
            'flex-shrink-0 px-4 py-4 border-t border-surface-border bg-surface',
            'pb-safe-area-inset-bottom',
          )}>
            <ChatInput
              onSend={handleSend}
              onAbort={handleAbort}
              isStreaming={isStreaming}
              disabled={!conversation}
              suggestions={dynamicSuggestions}
            />
            <p className="text-2xs text-content-subtle text-center mt-2">
              {t.chatPage.disclaimer}
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    </AppShell>
  );
}
