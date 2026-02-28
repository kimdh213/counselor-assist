import Anthropic from '@anthropic-ai/sdk';
import type { SearchResult, Message } from './types';

const client = new Anthropic();

const SYSTEM_PROMPT = `당신은 고객센터 상담사를 돕는 AI 어시스턴트입니다.
상담사가 고객 문의에 대한 답변을 찾을 수 있도록 지식관리시스템(KMS)의 문서를 기반으로 정확하고 친절한 답변을 제공합니다.

## 규칙
1. 반드시 제공된 참고 문서를 기반으로 답변하세요.
2. 참고 문서에 없는 내용은 "관련 문서를 찾지 못했습니다"라고 안내하세요.
3. 답변은 상담사가 고객에게 바로 전달할 수 있는 형태로 작성하세요.
4. 정책이나 절차를 인용할 때는 구체적인 내용을 포함하세요.
5. 답변은 한국어로 작성하세요.`;

function buildContextPrompt(sources: SearchResult[], history: Message[]): string {
  let context = '';

  if (sources.length > 0) {
    context += '## 참고 문서\n\n';
    sources.forEach((s, i) => {
      context += `### 문서 ${i + 1}: ${s.title}\n`;
      context += `카테고리: ${s.category}\n`;
      context += `${s.content}\n\n`;
    });
  } else {
    context += '## 참고 문서\n\n관련 문서를 찾지 못했습니다.\n\n';
  }

  return context;
}

function buildMessages(
  userMessage: string,
  sources: SearchResult[],
  history: Message[]
): Anthropic.MessageParam[] {
  const messages: Anthropic.MessageParam[] = [];

  // Add conversation history (last 10 messages)
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  // Add current user message with context
  const contextPrompt = buildContextPrompt(sources, history);
  const augmentedMessage = `${contextPrompt}\n## 상담사 질문\n${userMessage}`;

  messages.push({
    role: 'user',
    content: augmentedMessage,
  });

  return messages;
}

export async function* streamChatResponse(
  userMessage: string,
  sources: SearchResult[],
  history: Message[]
): AsyncGenerator<string> {
  const messages = buildMessages(userMessage, sources, history);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
