'use client';

import Link from 'next/link';
import type { Article } from '@/lib/types';

const categoryLabels: Record<string, string> = {
  general: '일반',
  policy: '정책',
  faq: 'FAQ',
  procedure: '절차',
  troubleshooting: '문제해결',
};

const categoryColors: Record<string, string> = {
  general: 'bg-slate-100 text-slate-700',
  policy: 'bg-blue-100 text-blue-700',
  faq: 'bg-green-100 text-green-700',
  procedure: 'bg-amber-100 text-amber-700',
  troubleshooting: 'bg-red-100 text-red-700',
};

interface ArticleCardProps {
  article: Article;
  onDelete?: (id: string) => void;
}

export default function ArticleCard({ article, onDelete }: ArticleCardProps) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${categoryColors[article.category] || categoryColors.general}`}>
              {categoryLabels[article.category] || article.category}
            </span>
          </div>
          <Link href={`/kms/${article.id}`} className="block">
            <h3 className="font-medium text-slate-900 truncate hover:text-indigo-600 transition-colors">
              {article.title}
            </h3>
          </Link>
          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{article.content}</p>
          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {article.tags.map(tag => (
                <span key={tag} className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(article.id)}
            className="text-slate-400 hover:text-red-500 transition-colors p-1"
            title="삭제"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
