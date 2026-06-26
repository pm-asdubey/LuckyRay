'use client';

import ReactMarkdown from 'react-markdown';
import type { Message } from '@luckyray/shared';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/layout/nav';

interface MessageBubbleProps {
  message: Message;
  profileName?: string;
  isStreaming?: boolean;
}

export function MessageBubble({ message, profileName, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className="flex-shrink-0 mt-1">
        {isUser ? (
          <Avatar name={profileName ?? 'You'} size="sm" />
        ) : (
          <div className="h-7 w-7 rounded-full bg-accent-subtle border border-accent-muted flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="text-accent">
              <path d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>

      {/* Bubble */}
      <div className={cn('max-w-[75%] space-y-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'bg-accent text-white rounded-tr-sm'
              : 'bg-surface-elevated border border-surface-border rounded-tl-sm prose-chat',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose-chat">
              <ReactMarkdown>{message.content}</ReactMarkdown>
              {isStreaming && (
                <span className="stream-cursor" aria-hidden="true" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StreamingBubble({ text }: { text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 mt-1">
        <div className="h-7 w-7 rounded-full bg-accent-subtle border border-accent-muted flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 32 32" fill="none" className="text-accent">
            <path d="M16 2L19 12H29L21 18L24 28L16 22L8 28L11 18L3 12H13L16 2Z" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <div className="max-w-[75%]">
        <div className="rounded-2xl rounded-tl-sm px-4 py-3 text-sm bg-surface-elevated border border-surface-border prose-chat">
          {text ? (
            <div className="prose-chat">
              <ReactMarkdown>{text}</ReactMarkdown>
              <span className="stream-cursor" aria-hidden="true" />
            </div>
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
