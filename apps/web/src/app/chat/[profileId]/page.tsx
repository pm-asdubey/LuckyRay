'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, LayoutDashboard } from 'lucide-react';
import { getProfile, getLatestChart, createConversation, getConversation, addMessage, getMessagesForConversation, updateConversation } from '@luckyray/storage';
import type { Profile, StoredChart, Message, Conversation } from '@luckyray/shared';
import { buildChartContext } from '@luckyray/ai';
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

export default function ChatPage() {
  const params = useParams<{ profileId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [storedChart, setStoredChart] = useState<StoredChart | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const { addToast, setActiveProfile, setActiveChart, setActiveConversation, setIsStreaming: setStoreStreaming } = useAppStore();

  // Build context once chart is loaded
  const chartContext = storedChart?.chart
    ? buildChartContext(storedChart.chart, 'general')
    : undefined;

  const { send, abort } = useAIChat({
    chartContext,
    onToken: (token) => {
      setStreamingText(prev => prev + token);
    },
    onComplete: async (fullText) => {
      setIsStreaming(false);
      setStoreStreaming(false);
      setStreamingText('');

      if (!conversation) return;

      const now = new Date().toISOString();
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        conversationId: conversation.id,
        role: 'assistant',
        content: fullText,
        createdAt: now,
      };
      await addMessage(assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);
      await updateConversation(conversation.id, { updatedAt: now });
    },
    onError: (errMsg) => {
      setIsStreaming(false);
      setStoreStreaming(false);
      setStreamingText('');
      addToast({ type: 'error', message: errMsg });
    },
  });

  const load = useCallback(async () => {
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

      if (c) {
        setStoredChart(c);
        setActiveChart(c);
      }

      // Create or get latest conversation
      const now = new Date().toISOString();
      const convId = crypto.randomUUID();
      const newConv: Conversation = {
        id: convId,
        profileId: p.id,
        title: `Chart reading – ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
        createdAt: now,
        updatedAt: now,
      };
      await createConversation(newConv);
      setConversation(newConv);
      setActiveConversation(newConv);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [params.profileId, setActiveProfile, setActiveChart, setActiveConversation]);

  useEffect(() => { load(); }, [load]);

  // Scroll to bottom
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

    setIsStreaming(true);
    setStoreStreaming(true);

    // Build messages array for API (exclude system messages)
    const apiMessages = updatedMessages
      .filter(m => m.role !== 'system')
      .slice(-20) // Send last 20 messages for context
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    send(apiMessages);
  };

  const handleAbort = () => {
    abort();
    setIsStreaming(false);
    setStoreStreaming(false);
    if (streamingText) {
      // Save partial response
      const partial = streamingText + ' _(response stopped)_';
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
      }
    }
    setStreamingText('');
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
            <ErrorCard title="Could not load chat" message={error ?? 'Unknown error'} onRetry={load} />
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
              <div className="text-xs text-content-muted">Jyotish advisor</div>
            </div>
            <Link href={`/chart/${profile.id}`}>
              <Button variant="ghost" size="sm">
                <LayoutDashboard size={14} />
                <span className="hidden sm:inline">View chart</span>
              </Button>
            </Link>
          </div>

          {/* No chart warning */}
          {!storedChart && (
            <div className="px-4 py-3 bg-warning/10 border-b border-warning/20">
              <p className="text-xs text-warning">
                No chart generated yet.{' '}
                <Link href={`/chart/${profile.id}`} className="underline hover:no-underline">
                  Generate a chart
                </Link>{' '}
                to enable context-aware answers.
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
                    Ask about {profile.name}&apos;s chart
                  </h2>
                  <p className="text-xs text-content-muted max-w-xs leading-relaxed">
                    I can interpret planetary positions, dashas, yogas, and provide Jyotish guidance based on the birth chart.
                  </p>
                </div>
              </div>
            )}

            {messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                profileName={profile.name}
              />
            ))}

            {isStreaming && (
              <StreamingBubble text={streamingText} />
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 px-4 py-4 border-t border-surface-border bg-surface pb-safe-area-inset-bottom">
            <ChatInput
              onSend={handleSend}
              onAbort={handleAbort}
              isStreaming={isStreaming}
              disabled={!conversation}
            />
            <p className="text-2xs text-content-subtle text-center mt-2">
              LuckyRay provides Jyotish interpretations for reflection, not predictions or professional advice.
            </p>
          </div>
        </div>
        <BottomNav />
      </div>
    </AppShell>
  );
}
