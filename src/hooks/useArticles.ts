'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Article, ArticleCategory, CreateArticleRequest, UpdateArticleRequest } from '@/lib/types';

export function useArticles(category?: ArticleCategory, query?: string) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (category) params.set('category', category);
    if (query) params.set('q', query);

    const res = await fetch(`/api/articles?${params}`);
    const json = await res.json();
    setArticles(json.data || []);
    setLoading(false);
  }, [category, query]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const createArticle = async (data: CreateArticleRequest) => {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create article');
    await fetchArticles();
    return (await res.json()).data as Article;
  };

  const updateArticle = async (id: string, data: UpdateArticleRequest) => {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update article');
    await fetchArticles();
    return (await res.json()).data as Article;
  };

  const deleteArticle = async (id: string) => {
    const res = await fetch(`/api/articles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete article');
    await fetchArticles();
  };

  return { articles, loading, refetch: fetchArticles, createArticle, updateArticle, deleteArticle };
}
