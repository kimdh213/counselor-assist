'use client';

import { useState } from 'react';
import type { Article, ArticleCategory, CreateArticleRequest, UpdateArticleRequest } from '@/lib/types';

const categories: { value: ArticleCategory; label: string }[] = [
  { value: 'general', label: '일반' },
  { value: 'policy', label: '정책' },
  { value: 'faq', label: 'FAQ' },
  { value: 'procedure', label: '절차' },
  { value: 'troubleshooting', label: '문제해결' },
];

interface ArticleFormProps {
  article?: Article;
  onSubmit: (data: { title: string; content: string; category: ArticleCategory; tags: string[] }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export default function ArticleForm({ article, onSubmit, onCancel, loading }: ArticleFormProps) {
  const [title, setTitle] = useState(article?.title || '');
  const [content, setContent] = useState(article?.content || '');
  const [category, setCategory] = useState<ArticleCategory>(article?.category || 'general');
  const [tagsInput, setTagsInput] = useState(article?.tags.join(', ') || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    await onSubmit({ title, content, category, tags });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">제목</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="문서 제목"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">카테고리</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value as ArticleCategory)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">내용</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          required
          rows={10}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
          placeholder="문서 내용을 입력하세요..."
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">태그 (쉼표로 구분)</label>
        <input
          type="text"
          value={tagsInput}
          onChange={e => setTagsInput(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="환불, 교환, 정책"
        />
      </div>
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? '저장 중...' : article ? '수정' : '등록'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-white text-slate-700 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
        >
          취소
        </button>
      </div>
    </form>
  );
}
