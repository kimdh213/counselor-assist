'use client';

import type { Message } from '@/lib/types';
import SourceBadge from './SourceBadge';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[85%] md:max-w-[70%] ${isUser ? 'order-1' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-600 text-white rounded-br-md'
              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-md'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="chat-content whitespace-pre-wrap">
              {message.content}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-indigo-500 ml-0.5 animate-pulse" />
              )}
            </div>
          )}
        </div>
        {/* Source badges */}
        {!isUser && message.sources.length > 0 && !isStreaming && (
          <div className="flex flex-wrap gap-1.5 mt-2 ml-1">
            {message.sources.map(sourceId => (
              <SourceBadge key={sourceId} articleId={sourceId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
