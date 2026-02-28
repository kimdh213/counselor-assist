'use client';

import { useState } from 'react';
import type { Article, ArticleCategory } from '@/lib/types';
import ArticleCard from './ArticleCard';

const categories: { value: string; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'general', label: '일반' },
  { value: 'policy', label: '정책' },
  { value: 'faq', label: 'FAQ' },
  { value: 'procedure', label: '절차' },
  { value: 'troubleshooting', label: '문제해결' },
];

interface ArticleListProps {
  articles: Article[];
  loading: boolean;
  onCategoryChange: (category: ArticleCategory | undefined) => void;
  onSearchChange: (query: string) => void;
  onDelete: (id: string) => void;
  selectedCategory?: string;
  searchQuery?: string;
}

export default function ArticleList({
  articles,
  loading,
  onCategoryChange,
  onSearchChange,
  onDelete,
  selectedCategory,
  searchQuery,
}: ArticleListProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearchChange(localSearch);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <input
            type="text"
            value={localSearch}
            onChange={e => setLocalSearch(e.target.value)}
            placeholder="문서 검색..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            검색
          </button>
        </form>
        <select
          value={selectedCategory || ''}
          onChange={e => onCategoryChange(e.target.value as ArticleCategory || undefined)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {categories.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-8 text-slate-400">로딩 중...</div>
      ) : articles.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          등록된 문서가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map(article => (
            <ArticleCard
              key={article.id}
              article={article}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
