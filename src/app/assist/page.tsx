'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatContainer from '@/components/assist/ChatContainer';
import { Suspense } from 'react';

function AssistContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation_id');
  const [selectedNAnswers, setSelectedNAnswers] = useState(1);

  const {
    messages,
    isStreaming,
    error,
    nAnswers,
    sourceMeta,
    sendMessage,
    stopStreaming,
    newConversation,
    loadConversation,
  } = useChat(conversationId || undefined);

  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    }
  }, [conversationId, loadConversation]);

  const handleSend = useCallback((content: string) => {
    sendMessage(content, selectedNAnswers);
  }, [sendMessage, selectedNAnswers]);

  return (
    <div className="h-screen flex flex-col">
      <ChatContainer
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        nAnswers={nAnswers}
        sourceMeta={sourceMeta}
        onSend={handleSend}
        onStop={stopStreaming}
        onNewConversation={newConversation}
        onNAnswersChange={setSelectedNAnswers}
        selectedNAnswers={selectedNAnswers}
      />
    </div>
  );
}

export default function AssistPage() {
  return (
    <Suspense>
      <AssistContent />
    </Suspense>
  );
}
