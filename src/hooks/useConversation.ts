'use client';

import { useState, useEffect } from 'react';
import type { ConversationWithMessages } from '@/lib/types';

export function useConversation(id: string) {
  const [conversation, setConversation] = useState<ConversationWithMessages | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/conversations/${id}`)
      .then(res => res.json())
      .then(json => {
        setConversation(json.data || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  return { conversation, loading };
}
