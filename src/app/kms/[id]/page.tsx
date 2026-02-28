'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/layout/PageHeader';
import ArticleForm from '@/components/kms/ArticleForm';
import type { Article, UpdateArticleRequest } from '@/lib/types';

export default function ArticleEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${id}`)
      .then(res => res.json())
      .then(json => {
        setArticle(json.data);
        setLoading(false);
      });
  }, [id]);

  const handleUpdate = async (data: UpdateArticleRequest) => {
    setSaving(true);
    try {
      await fetch(`/api/articles/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      router.push('/kms');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="문서 편집" />
        <div className="flex-1 flex items-center justify-center text-slate-400">로딩 중...</div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="문서 편집" />
        <div className="flex-1 flex items-center justify-center text-slate-400">문서를 찾을 수 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="문서 편집" />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          <ArticleForm
            article={article}
            onSubmit={handleUpdate}
            onCancel={() => router.push('/kms')}
            loading={saving}
          />
        </div>
      </div>
    </div>
  );
}
