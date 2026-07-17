'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { RefreshCw } from 'lucide-react';
import type { Message } from '@luckyray/shared';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/layout/nav';

interface MessageBubbleProps {
  message: Message;
  profileName?: string;
  onContinue?: () => void;
}

const INCOMPLETE_MARKER = '_(response stopped)_';

export function MessageBubble({ message, profileName, onContinue }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isIncomplete = !isUser && message.content.includes(INCOMPLETE_MARKER);
  const displayContent = isIncomplete
    ? message.content.replace(INCOMPLETE_MARKER, '').trim()
    : message.content;

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <Avatar name={profileName ?? 'You'} size="sm" />
        ) : (
          <AiAvatar />
        )}
      </div>

      <div className={cn('max-w-[75%] space-y-1.5', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-accent text-white rounded-tr-sm'
              : 'bg-surface-elevated border border-surface-border rounded-tl-sm',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{displayContent}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayContent}</ReactMarkdown>
            </div>
          )}
        </div>

        {isIncomplete && onContinue && (
          <button
            onClick={onContinue}
            className={cn(
              'flex items-center gap-1.5 text-2xs font-medium',
              'text-accent hover:text-accent-hover transition-colors',
              'px-1 py-0.5 rounded',
            )}
          >
            <RefreshCw size={10} />
            Continue response
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Shown while the AI is generating a response.
 * Renders plain text (no markdown) to avoid ReactMarkdown choking on incomplete
 * syntax mid-stream. The text is swapped for a real MessageBubble once complete.
 */
export function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-1">
        <AiAvatar />
      </div>
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-surface-elevated border border-surface-border">
          {text ? (
            <p className="whitespace-pre-wrap text-content leading-relaxed">{text}<span className="stream-cursor" aria-hidden="true" /></p>
          ) : (
            <div className="flex gap-1 items-center h-5">
              <span className="w-1.5 h-1.5 rounded-full bg-content-muted animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-content-muted animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-content-muted animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AiAvatar() {
  return (
    <div className="h-7 w-7 rounded-full bg-accent-subtle border border-accent-muted flex items-center justify-center flex-shrink-0">
      <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="text-accent">
        <path d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}
