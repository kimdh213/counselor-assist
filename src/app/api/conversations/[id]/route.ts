import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import type { Conversation, Message, ConversationWithMessages } from '@/lib/types';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id) as Conversation | undefined;
  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  const rawMessages = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(id) as Message[];

  const messages = rawMessages.map(m => ({
    ...m,
    sources: JSON.parse(m.sources as unknown as string),
  }));

  const result: ConversationWithMessages = { ...conversation, messages };
  return NextResponse.json({ data: result });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const existing = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  if (!existing) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  return NextResponse.json({ data: { success: true } });
}
