'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSend: (text: string) => void;
  onAbort?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

const SUGGESTIONS = [
  'What career paths suit my chart?',
  'How is my current dasha influencing life?',
  'Describe my personality from the ascendant.',
  'What do my yogas indicate?',
  'When is a good period for relationships?',
];

export function ChatInput({ onSend, onAbort, isStreaming, disabled, placeholder }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    setText('');
    onSend(trimmed);
    // Reset height
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="space-y-2">
      <div className={cn(
        'flex items-end gap-2 rounded-2xl border p-2 transition-colors',
        'bg-surface-elevated border-surface-border',
        'focus-within:border-accent-muted',
      )}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          rows={1}
          disabled={disabled}
          placeholder={placeholder ?? 'Ask about your chart…'}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-content placeholder:text-content-muted',
            'outline-none px-2 py-1 max-h-40 leading-relaxed',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="Message input"
        />
        {isStreaming ? (
          <Button
            variant="primary"
            size="sm"
            onClick={onAbort}
            aria-label="Stop generation"
          >
            <Square size={14} />
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            aria-label="Send message"
          >
            <Send size={14} />
          </Button>
        )}
      </div>

      {/* Suggestion chips (shown when empty) */}
      {!text && !isStreaming && (
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTIONS.slice(0, 3).map(s => (
            <button
              key={s}
              onClick={() => onSend(s)}
              disabled={disabled}
              className={cn(
                'rounded-full border border-surface-border bg-surface-elevated',
                'text-xs text-content-muted hover:text-content hover:border-accent-muted',
                'px-3 py-1 transition-colors',
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
