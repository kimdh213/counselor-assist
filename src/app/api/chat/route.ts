import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { searchArticlesForRAG } from '@/lib/search';
import { streamChatResponse } from '@/lib/claude';
import { v4 as uuidv4 } from 'uuid';
import type { Message, Conversation } from '@/lib/types';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { message, conversation_id } = body;

  if (!message?.trim()) {
    return new Response(JSON.stringify({ error: 'Message is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const db = getDb();

  // Get or create conversation
  let convId = conversation_id;
  if (!convId) {
    convId = uuidv4();
    db.prepare('INSERT INTO conversations (id, title) VALUES (?, ?)').run(
      convId,
      message.trim().slice(0, 50)
    );
  } else {
    const existing = db.prepare('SELECT * FROM conversations WHERE id = ?').get(convId) as Conversation | undefined;
    if (!existing) {
      return new Response(JSON.stringify({ error: 'Conversation not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Save user message
  const userMsgId = uuidv4();
  db.prepare(
    'INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, ?, ?)'
  ).run(userMsgId, convId, 'user', message.trim());

  // Retrieve: FTS5 search
  const sources = searchArticlesForRAG(message.trim(), 5);

  // Get conversation history
  const history = db.prepare(
    'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC'
  ).all(convId) as Message[];

  // Remove the just-inserted user message from history (we pass it separately)
  const pastHistory = history.filter(m => m.id !== userMsgId).map(m => ({
    ...m,
    sources: JSON.parse(m.sources as unknown as string),
  }));

  // Stream response via SSE
  const encoder = new TextEncoder();
  const sourceIds = sources.map(s => s.id);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send conversation_id and sources first
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'meta', conversation_id: convId, sources: sourceIds })}\n\n`
        ));

        let fullResponse = '';

        for await (const chunk of streamChatResponse(message.trim(), sources, pastHistory)) {
          fullResponse += chunk;
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`
          ));
        }

        // Save assistant message
        const assistantMsgId = uuidv4();
        db.prepare(
          'INSERT INTO messages (id, conversation_id, role, content, sources) VALUES (?, ?, ?, ?, ?)'
        ).run(assistantMsgId, convId, 'assistant', fullResponse, JSON.stringify(sourceIds));

        // Update conversation
        db.prepare("UPDATE conversations SET updated_at = datetime('now') WHERE id = ?").run(convId);

        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'done' })}\n\n`
        ));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`
        ));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
