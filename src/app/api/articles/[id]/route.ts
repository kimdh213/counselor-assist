import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Article, UpdateArticleRequest } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const article = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined;

  if (!article) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  return NextResponse.json({
    data: { ...article, tags: JSON.parse(article.tags as unknown as string) }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body: UpdateArticleRequest = await request.json();
  const db = getDb();

  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article | undefined;
  if (!existing) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  const updates: string[] = [];
  const values: (string)[] = [];

  if (body.title !== undefined) {
    updates.push('title = ?');
    values.push(body.title.trim());
  }
  if (body.content !== undefined) {
    updates.push('content = ?');
    values.push(body.content.trim());
  }
  if (body.category !== undefined) {
    updates.push('category = ?');
    values.push(body.category);
  }
  if (body.tags !== undefined) {
    updates.push('tags = ?');
    values.push(JSON.stringify(body.tags));
  }
  if (body.status !== undefined) {
    updates.push('status = ?');
    values.push(body.status);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  updates.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE articles SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as Article;
  return NextResponse.json({
    data: { ...updated, tags: JSON.parse(updated.tags as unknown as string) }
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM articles WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Article not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM articles WHERE id = ?').run(id);
  return NextResponse.json({ data: { success: true } });
}
