import Anthropic from '@anthropic-ai/sdk';
import type { SearchResult, Message } from './types';

const client = new Anthropic();

function getSystemPrompt(nAnswers: number): string {
  if (nAnswers <= 1) {
    return `당신은 고객센터 상담사를 돕는 AI 어시스턴트입니다.
상담사가 고객 문의에 대한 답변을 찾을 수 있도록 지식관리시스템(KMS)의 문서를 기반으로 정확하고 친절한 답변을 제공합니다.

## 규칙
1. 반드시 제공된 참고 문서를 기반으로 답변하세요.
2. 참고 문서에 없는 내용은 "관련 문서를 찾지 못했습니다"라고 안내하세요.
3. 답변은 상담사가 고객에게 바로 전달할 수 있는 형태로 작성하세요.
4. 정책이나 절차를 인용할 때는 구체적인 내용을 포함하세요.
5. 답변은 한국어로 작성하세요.`;
  }

  return `당신은 고객센터 상담사를 돕는 AI 어시스턴트입니다.
상담사가 고객 문의에 대한 답변을 찾을 수 있도록 지식관리시스템(KMS)의 문서를 기반으로 추천 답변을 제공합니다.

## 규칙
1. 각 참고 문서를 기반으로 개별 추천 답변을 작성하세요.
2. 각 답변은 해당 문서의 내용만을 기반으로 작성하세요.
3. 답변은 상담사가 고객에게 바로 전달할 수 있는 형태로 작성하세요.
4. 정책이나 절차를 인용할 때는 구체적인 내용을 포함하세요.
5. 답변은 한국어로 작성하세요.
6. 반드시 아래 형식을 지켜주세요:

[추천답변 1]
(문서 1 기반 답변 내용)

[추천답변 2]
(문서 2 기반 답변 내용)

이런 식으로 ${nAnswers}개의 답변을 작성하세요.
각 답변 사이에 빈 줄을 넣어 구분하세요.`;
}

function buildMessages(
  userMessage: string,
  sources: SearchResult[],
  history: Message[],
  nAnswers: number
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

  // Build context with documents
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

  let instruction = '';
  if (nAnswers > 1) {
    instruction = `\n\n위 참고 문서를 각각 기반으로 추천 답변 ${nAnswers}개를 작성하세요. [추천답변 N] 형식을 반드시 지켜주세요.`;
  }

  const augmentedMessage = `${context}## 상담사 질문\n${userMessage}${instruction}`;

  messages.push({
    role: 'user',
    content: augmentedMessage,
  });

  return messages;
}

export async function* streamChatResponse(
  userMessage: string,
  sources: SearchResult[],
  history: Message[],
  nAnswers: number = 1
): AsyncGenerator<string> {
  const messages = buildMessages(userMessage, sources, history, nAnswers);

  const stream = client.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: nAnswers > 1 ? 4096 : 2048,
    system: getSystemPrompt(nAnswers),
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text;
    }
  }
}
