'use client';

import type { Message } from '@/lib/types';
import SourceBadge from './SourceBadge';
import AnswerCards from './AnswerCards';

interface SourceMeta {
  id: string;
  title: string;
}

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  nAnswers?: number;
  sourceMeta?: SourceMeta[];
}

export default function ChatMessage({ message, isStreaming, nAnswers = 1, sourceMeta = [] }: ChatMessageProps) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[70%]">
          <div className="rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed bg-indigo-600 text-white">
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  const isMultiAnswer = nAnswers > 1;

  return (
    <div className="flex justify-start">
      <div className={isMultiAnswer ? 'w-full' : 'max-w-[85%] md:max-w-[70%]'}>
        <AnswerCards
          content={message.content}
          nAnswers={nAnswers}
          sourceMeta={sourceMeta}
          isStreaming={!!isStreaming}
        />
        {/* Source badges for single answer mode */}
        {!isMultiAnswer && message.sources.length > 0 && !isStreaming && (
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
