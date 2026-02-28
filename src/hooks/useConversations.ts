'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ConversationSummary } from '@/lib/types';

export function useConversations() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/conversations');
    const json = await res.json();
    setConversations(json.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const deleteConversation = async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete conversation');
    await fetchConversations();
  };

  return { conversations, loading, refetch: fetchConversations, deleteConversation };
}
