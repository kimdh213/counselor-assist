import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { Article, CreateArticleRequest } from '@/lib/types';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const q = searchParams.get('q');

  const db = getDb();

  let query = 'SELECT * FROM articles WHERE status = ?';
  const params: (string)[] = ['active'];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (q) {
    query += ' AND (title LIKE ? OR content LIKE ?)';
    const like = `%${q}%`;
    params.push(like, like);
  }

  query += ' ORDER BY updated_at DESC';

  const rows = db.prepare(query).all(...params) as Article[];
  const articles = rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags as unknown as string),
  }));

  return NextResponse.json({ data: articles });
}

export async function POST(request: NextRequest) {
  const body: CreateArticleRequest = await request.json();

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
  }

  const db = getDb();
  const id = uuidv4();

  db.prepare(`
    INSERT INTO articles (id, title, content, category, tags)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    id,
    body.title.trim(),
    body.content.trim(),
    body.category || 'general',
    JSON.stringify(body.tags || []),
  );

  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article;

  return NextResponse.json({
    data: { ...article, tags: JSON.parse(article.tags as unknown as string) }
  }, { status: 201 });
}
