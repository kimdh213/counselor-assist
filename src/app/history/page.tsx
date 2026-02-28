'use client';

import PageHeader from '@/components/layout/PageHeader';
import ConversationList from '@/components/history/ConversationList';
import { useConversations } from '@/hooks/useConversations';

export default function HistoryPage() {
  const { conversations, loading, deleteConversation } = useConversations();

  const handleDelete = async (id: string) => {
    if (confirm('이 대화를 삭제하시겠습니까?')) {
      await deleteConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="대화 기록" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <ConversationList
            conversations={conversations}
            loading={loading}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
