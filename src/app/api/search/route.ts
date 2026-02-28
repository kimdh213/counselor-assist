import { NextRequest, NextResponse } from 'next/server';
import { searchArticles } from '@/lib/search';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q');

  if (!q?.trim()) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  const results = searchArticles(q.trim());
  return NextResponse.json({ data: results });
}
