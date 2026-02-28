'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useChat } from '@/hooks/useChat';
import ChatContainer from '@/components/assist/ChatContainer';
import { Suspense } from 'react';

function AssistContent() {
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('conversation_id');

  const {
    messages,
    isStreaming,
    error,
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

  return (
    <div className="h-screen flex flex-col">
      <ChatContainer
        messages={messages}
        isStreaming={isStreaming}
        error={error}
        onSend={sendMessage}
        onStop={stopStreaming}
        onNewConversation={newConversation}
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
