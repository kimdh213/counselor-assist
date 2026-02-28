'use client';

import type { ConversationSummary } from '@/lib/types';
import ConversationCard from './ConversationCard';

interface ConversationListProps {
  conversations: ConversationSummary[];
  loading: boolean;
  onDelete: (id: string) => void;
}

export default function ConversationList({ conversations, loading, onDelete }: ConversationListProps) {
  if (loading) {
    return <div className="text-center py-8 text-slate-400">로딩 중...</div>;
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        대화 기록이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map(conv => (
        <ConversationCard key={conv.id} conversation={conv} onDelete={onDelete} />
      ))}
    </div>
  );
}
