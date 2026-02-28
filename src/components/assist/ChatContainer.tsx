'use client';

import { useRef, useEffect } from 'react';
import type { Message } from '@/lib/types';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import ConversationStarter from './ConversationStarter';

interface SourceMeta {
  id: string;
  title: string;
}

interface ChatContainerProps {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
  nAnswers: number;
  sourceMeta: SourceMeta[];
  onSend: (message: string) => void;
  onStop: () => void;
  onNewConversation: () => void;
  onNAnswersChange: (n: number) => void;
  selectedNAnswers: number;
}

export default function ChatContainer({
  messages,
  isStreaming,
  error,
  nAnswers,
  sourceMeta,
  onSend,
  onStop,
  onNewConversation,
  onNAnswersChange,
  selectedNAnswers,
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
        <div className="flex items-center gap-2">
          {/* Answer count selector */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {[1, 2, 3].map(n => (
              <button
                key={n}
                onClick={() => onNAnswersChange(n)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                  selectedNAnswers === n
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {n}개
              </button>
            ))}
          </div>
          {messages.length > 0 && (
            <button
              onClick={onNewConversation}
              className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
            >
              + 새 대화
            </button>
          )}
        </div>
      </header>

      {/* Messages or Starter */}
      {messages.length === 0 ? (
        <ConversationStarter onSelect={onSend} />
      ) : (
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg, i) => {
              const isLastAssistant = isStreaming && i === messages.length - 1 && msg.role === 'assistant';
              return (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  isStreaming={isLastAssistant}
                  nAnswers={msg.role === 'assistant' ? nAnswers : 1}
                  sourceMeta={msg.role === 'assistant' ? sourceMeta : []}
                />
              );
            })}
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
