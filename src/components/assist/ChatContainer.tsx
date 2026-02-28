'use client';

import { useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ConversationStarter from './ConversationStarter';

interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  onSend: (message: string) => void;
  onStop: () => void;
  onNewConversation: () => void;
}

export default function ChatContainer({
  messages,
  isStreaming,
  error,
  onSend,
  onStop,
  onNewConversation,
}: ChatContainerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between h-14 px-4 md:px-6 border-b border-slate-200 bg-white">
        <h2 className="text-lg font-semibold text-slate-900">상담 어시스트</h2>
        {messages.length > 0 && (
          <button
            onClick={onNewConversation}
            className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
          >
            + 새 대화
          </button>
        )}
      </header>

      {/* Messages or Starter */}
      {messages.length === 0 ? (
        <ConversationStarter onSelect={onSend} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
              />
            ))}
            {error && (
              <div className="flex justify-center">
                <div className="px-4 py-2 bg-red-50 text-red-600 text-sm rounded-lg">
                  {error}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSend={onSend}
        onStop={onStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}
