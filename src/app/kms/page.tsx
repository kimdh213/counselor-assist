'use client';

import { useState } from 'react';
import PageHeader from '@/components/layout/PageHeader';
import ArticleList from '@/components/kms/ArticleList';
import ArticleForm from '@/components/kms/ArticleForm';
import { useArticles } from '@/hooks/useArticles';
import type { ArticleCategory, CreateArticleRequest } from '@/lib/types';

export default function KmsPage() {
  const [category, setCategory] = useState<ArticleCategory | undefined>();
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  const { articles, loading, createArticle, deleteArticle } = useArticles(category, query || undefined);

  const handleCreate = async (data: CreateArticleRequest) => {
    setFormLoading(true);
    try {
      await createArticle(data);
      setShowForm(false);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('이 문서를 삭제하시겠습니까?')) {
      await deleteArticle(id);
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        title="KMS 관리"
        action={
          <button
            onClick={() => setShowForm(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            + 새 문서
          </button>
        }
      />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        {showForm ? (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold mb-4">새 문서 등록</h3>
            <ArticleForm
              onSubmit={handleCreate}
              onCancel={() => setShowForm(false)}
              loading={formLoading}
            />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <ArticleList
              articles={articles}
              loading={loading}
              onCategoryChange={setCategory}
              onSearchChange={setQuery}
              onDelete={handleDelete}
              selectedCategory={category}
              searchQuery={query}
            />
          </div>
        )}
      </div>
    </div>
  );
}
