'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ConversationDetail from '@/components/history/ConversationDetail';
import { useConversation } from '@/hooks/useConversation';

export default function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { conversation, loading } = useConversation(id);

  const handleContinue = () => {
    // Navigate to assist page - the conversation will be loaded there
    router.push(`/assist?conversation_id=${id}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="대화 상세" />
        <div className="flex-1 flex items-center justify-center text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="대화 상세" />
        <div className="flex-1 flex items-center justify-center text-slate-400">대화를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="대화 상세"
        action={
          <button
            onClick={() => router.push('/history')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            목록으로
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <ConversationDetail
            conversation={conversation}
            onContinue={handleContinue}
          />
        </div>
      </div>
    </div>
  );
}
