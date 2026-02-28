'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message } from '@/lib/types';

interface SourceMeta {
  id: string;
  title: string;
}

interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isStreaming: boolean;
  error: string | null;
  sources: string[];
  sourceMeta: SourceMeta[];
  nAnswers: number;
}

export function useChat(initialConversationId?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: initialConversationId || null,
    isStreaming: false,
    error: null,
    sources: [],
    sourceMeta: [],
    nAnswers: 1,
  });
  const abortRef = useRef<AbortController | null>(null);

  const loadConversation = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}`);
    if (!res.ok) return;
    const json = await res.json();
    setState(prev => ({
      ...prev,
      conversationId,
      messages: json.data.messages || [],
    }));
  }, []);

  const sendMessage = useCallback(async (content: string, nAnswers: number = 1) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: state.conversationId || '',
      role: 'user',
      content: content.trim(),
      sources: [],
      created_at: new Date().toISOString(),
    };

    const assistantMessage: Message = {
      id: `temp-assistant-${Date.now()}`,
      conversation_id: state.conversationId || '',
      role: 'assistant',
      content: '',
      sources: [],
      created_at: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage, assistantMessage],
      isStreaming: true,
      error: null,
      sources: [],
      sourceMeta: [],
      nAnswers,
    }));

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversation_id: state.conversationId,
          n_answers: nAnswers,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Chat request failed');
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = JSON.parse(line.slice(6));

          if (data.type === 'meta') {
            setState(prev => ({
              ...prev,
              conversationId: data.conversation_id,
              sources: data.sources || [],
              sourceMeta: data.source_meta || [],
              nAnswers: data.n_answers || 1,
            }));
          } else if (data.type === 'delta') {
            setState(prev => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              if (lastMsg.role === 'assistant') {
                messages[messages.length - 1] = {
                  ...lastMsg,
                  content: lastMsg.content + data.content,
                };
              }
              return { ...prev, messages };
            });
          } else if (data.type === 'done') {
            setState(prev => {
              const messages = [...prev.messages];
              const lastMsg = messages[messages.length - 1];
              if (lastMsg.role === 'assistant') {
                messages[messages.length - 1] = {
                  ...lastMsg,
                  sources: prev.sources,
                };
              }
              return { ...prev, messages, isStreaming: false };
            });
          } else if (data.type === 'error') {
            setState(prev => ({
              ...prev,
              isStreaming: false,
              error: data.error,
            }));
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState(prev => ({
        ...prev,
        isStreaming: false,
        error: (err as Error).message,
        messages: prev.messages.filter(m => m.content || m.role !== 'assistant'),
      }));
    }
  }, [state.conversationId]);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setState(prev => ({ ...prev, isStreaming: false }));
  }, []);

  const newConversation = useCallback(() => {
    setState({
      messages: [],
      conversationId: null,
      isStreaming: false,
      error: null,
      sources: [],
      sourceMeta: [],
      nAnswers: 1,
    });
  }, []);

  return {
    messages: state.messages,
    conversationId: state.conversationId,
    isStreaming: state.isStreaming,
    error: state.error,
    nAnswers: state.nAnswers,
    sourceMeta: state.sourceMeta,
    sendMessage,
    stopStreaming,
    newConversation,
    loadConversation,
  };
}
