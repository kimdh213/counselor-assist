'use client';

import { useState, useEffect } from 'react';
import type { Article } from '@/lib/types';

interface SourceBadgeProps {
  articleId: string;
}

export default function SourceBadge({ articleId }: SourceBadgeProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    fetch(`/api/articles/${articleId}`)
      .then(res => res.json())
      .then(json => setArticle(json.data))
      .catch(() => {});
  }, [articleId]);

  if (!article) return null;

  return (
    <div className="inline-block">
      <button
        onClick={() => setExpanded(!expanded)}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-medium rounded-full hover:bg-indigo-100 transition-colors"
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
        {article.title}
      </button>
      {expanded && (
        <div className="mt-2 p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 max-h-40 overflow-y-auto">
          {article.content.slice(0, 300)}
          {article.content.length > 300 && '...'}
        </div>
      )}
    </div>
  );
}
