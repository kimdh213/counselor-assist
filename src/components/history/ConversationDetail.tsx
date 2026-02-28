'use client';

import type { ConversationWithMessages } from '@/lib/types';
import ChatMessage from '@/components/assist/ChatMessage';

interface ConversationDetailProps {
  conversation: ConversationWithMessages;
  onContinue: () => void;
}

export default function ConversationDetail({ conversation, onContinue }: ConversationDetailProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium text-slate-900">{conversation.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {conversation.messages.length}개 메시지
          </p>
        </div>
        <button
          onClick={onContinue}
          className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          대화 계속하기
        </button>
      </div>
      <div className="space-y-4">
        {conversation.messages.map(msg => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
      </div>
    </div>
  );
}
