import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import type { ConversationSummary } from '@/lib/types';

export async function GET() {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      c.*,
      COUNT(m.id) as message_count,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message
    FROM conversations c
    LEFT JOIN messages m ON m.conversation_id = c.id
    GROUP BY c.id
    ORDER BY c.updated_at DESC
  `).all() as ConversationSummary[];

  return NextResponse.json({ data: rows });
}

export async function POST() {
  const db = getDb();
  const id = uuidv4();

  db.prepare('INSERT INTO conversations (id) VALUES (?)').run(id);

  const conversation = db.prepare('SELECT * FROM conversations WHERE id = ?').get(id);
  return NextResponse.json({ data: conversation }, { status: 201 });
}
