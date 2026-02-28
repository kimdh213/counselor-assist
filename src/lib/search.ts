import { getDb } from './db';
import type { SearchResult } from './types';

export function searchArticles(query: string, limit: number = 5): SearchResult[] {
  const db = getDb();

  // Tokenize and prepare FTS5 query: add * for prefix matching
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(t => `"${t}"*`)
    .join(' OR ');

  if (!terms) return [];

  const rows = db.prepare(`
    SELECT
      a.id,
      a.title,
      a.content,
      a.category,
      rank,
      snippet(articles_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
    FROM articles_fts
    JOIN articles a ON a.rowid = articles_fts.rowid
    WHERE articles_fts MATCH ? AND a.status = 'active'
    ORDER BY rank
    LIMIT ?
  `).all(terms, limit) as SearchResult[];

  return rows;
}

export function searchArticlesForRAG(query: string, limit: number = 5): SearchResult[] {
  return searchArticles(query, limit);
}
