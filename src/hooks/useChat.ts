'use client';

import { useState, useCallback, useRef } from 'react';
import type { Message } from '@/lib/types';

interface ChatState {
  messages: Message[];
  conversationId: string | null;
  isStreaming: boolean;
  error: string | null;
  sources: string[];
}

export function useChat(initialConversationId?: string) {
  const [state, setState] = useState<ChatState>({
    messages: [],
    conversationId: initialConversationId || null,
    isStreaming: false,
    error: null,
    sources: [],
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

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    // Add user message optimistically
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: state.conversationId || '',
      role: 'user',
      content: content.trim(),
      sources: [],
      created_at: new Date().toISOString(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isStreaming: true,
      error: null,
      sources: [],
    }));

    // Create assistant message placeholder
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
      messages: [...prev.messages, assistantMessage],
    }));

    try {
      abortRef.current = new AbortController();

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          conversation_id: state.conversationId,
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
        // Remove the empty assistant message
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
    });
  }, []);

  return {
    messages: state.messages,
    conversationId: state.conversationId,
    isStreaming: state.isStreaming,
    error: state.error,
    sendMessage,
    stopStreaming,
    newConversation,
    loadConversation,
  };
}
