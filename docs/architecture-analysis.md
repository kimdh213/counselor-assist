# Counselor Assist - 아키텍처 분석 및 성능 최적화 인사이트

## 1. 프로젝트 개요

고객센터 상담사를 위한 AI 기반 상담 어시스트 시스템.
상담사가 질문을 입력하면 KMS(지식관리시스템)에서 관련 문서를 검색하고,
Claude API를 통해 자연어 답변을 생성하는 RAG(Retrieval-Augmented Generation) 시스템.

---

## 2. 기술 스택

| 구분 | 기술 | 비고 |
|------|------|------|
| Framework | Next.js 16 (App Router) + TypeScript | 풀스택 단일 서버 |
| Styling | TailwindCSS v4 | 모바일 퍼스트 |
| KMS DB | SQLite (better-sqlite3) | 서버 내장, 네트워크 홉 없음 |
| 전문검색 | SQLite FTS5 (BM25 랭킹) | 벡터DB 없이 키워드 기반 검색 |
| LLM | Claude API (Anthropic SDK 직접 호출) | LangChain/LangGraph 미사용 |
| 응답 방식 | SSE (Server-Sent Events) 스트리밍 | 실시간 토큰 단위 전송 |

---

## 3. 이 프로젝트가 빠른 이유

### 3.1 LangChain/LangGraph를 사용하지 않음

```
[일반적인 LangChain RAG 파이프라인]
사용자 질문
  → LangChain 체인 초기화 (오버헤드)
  → Retriever 추상화 레이어
  → Vector Store 추상화 레이어
  → 벡터DB 네트워크 호출
  → Document Loader / Splitter
  → Prompt Template 처리
  → LLM 호출 (추상화 레이어 경유)
  → Output Parser
  → 응답

[이 프로젝트의 RAG 파이프라인]
사용자 질문
  → FTS5 인프로세스 검색 (네트워크 홉 없음, ~1ms)
  → 프롬프트 직접 구성 (문자열 조합)
  → Claude API 직접 스트리밍 호출
  → SSE로 즉시 전송
```

**핵심 차이**: 중간 추상화 레이어가 없다.
LangChain은 범용 프레임워크로서 유연성을 제공하지만, 그만큼 레이어가 많고 오버헤드가 존재한다.
직접 구현하면 필요한 로직만 최소한으로 실행되므로 지연이 줄어든다.

### 3.2 검색 단계의 지연시간 최소화

| 방식 | 네트워크 홉 | 평균 지연 | 비고 |
|------|------------|-----------|------|
| SQLite FTS5 (인프로세스) | 0 | ~1ms | 이 프로젝트 |
| Milvus (벡터DB 별도 서버) | 1~2 | 10~50ms | 회사 프로젝트 |
| PostgreSQL (별도 서버) | 1 | 5~20ms | 회사 프로젝트 |
| 임베딩 생성 API 호출 | 1 | 100~500ms | 벡터 검색 시 필요 |

**벡터 검색 시 추가 단계**: 사용자 질문 → 임베딩 API 호출(100~500ms) → Milvus 검색(10~50ms)
**FTS5**: 사용자 질문 → 인프로세스 검색(~1ms) → 끝

### 3.3 SSE 스트리밍의 체감 효과

```
[일반 응답 방식]
사용자 질문 → (2~5초 대기, 빈 화면) → 전체 답변 한번에 표시

[SSE 스트리밍 방식]
사용자 질문 → (0.3~0.5초) → 첫 글자 표시 시작 → 실시간 타이핑 효과
```

실제 전체 응답 완료 시간은 비슷하지만, **첫 토큰까지의 시간(TTFT)**이 짧고
글자가 실시간으로 나타나므로 체감 속도가 훨씬 빠르다.

### 3.4 단일 서버 아키텍처

```
[회사 프로젝트 - 분산 구조]
상담AP → API Gateway → Assist 서버 → Milvus (벡터 검색)
                                    → PostgreSQL (KMS 조회)
                                    → LLM API 호출
                                    → 응답 조합 → 상담AP로 반환

[이 프로젝트 - 단일 서버]
브라우저 → Next.js 서버 → SQLite 인프로세스 검색
                       → Claude API 직접 호출
                       → SSE 스트리밍 직접 전송
```

네트워크 홉이 줄어들수록 지연시간이 줄어든다.

---

## 4. RAG 파이프라인 상세

### 4.1 처리 흐름 (`POST /api/chat`)

```
1. 사용자 메시지 수신 → DB 저장
2. [Retrieval]  FTS5로 관련 문서 5개 검색 (BM25 랭킹)
3. [Augment]    검색된 문서 + 대화 이력(최근 10개)으로 프롬프트 구성
4. [Generate]   Claude API 스트리밍 호출 → SSE로 실시간 전송
5. 응답 완료 → assistant 메시지 DB 저장 (출처 문서 ID 포함)
```

### 4.2 프롬프트 구조

```
[System Prompt]
당신은 고객센터 상담사를 돕는 AI 어시스턴트입니다.
- 반드시 제공된 참고 문서를 기반으로 답변
- 참고 문서에 없는 내용은 안내 불가 표시
- 상담사가 고객에게 바로 전달할 수 있는 형태로 작성

[User Message]
## 참고 문서
### 문서 1: {제목}
카테고리: {카테고리}
{내용}

### 문서 2: {제목}
...

## 상담사 질문
{사용자 입력}
```

### 4.3 FTS5 검색 쿼리

```sql
SELECT a.id, a.title, a.content, a.category, rank,
       snippet(articles_fts, 1, '<mark>', '</mark>', '...', 40) as snippet
FROM articles_fts
JOIN articles a ON a.rowid = articles_fts.rowid
WHERE articles_fts MATCH '"검색어"*' AND a.status = 'active'
ORDER BY rank  -- BM25 랭킹
LIMIT 5
```

---

## 5. 회사 프로젝트에 적용 가능한 개선 포인트

### 5.1 즉시 적용 가능 (인프라 변경 없음)

#### (1) SSE 스트리밍 도입
현재 회사 프로젝트가 전체 응답을 기다린 후 반환하는 방식이라면,
SSE 스트리밍으로 전환하는 것만으로도 체감 속도가 크게 개선된다.

```typescript
// Claude API 스트리밍 호출 (Anthropic SDK 직접 사용)
const stream = client.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2048,
  system: SYSTEM_PROMPT,
  messages,
});

for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    // SSE로 즉시 전송
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ type: 'delta', content: event.delta.text })}\n\n`
    ));
  }
}
```

#### (2) LangChain 레이어 제거 또는 경량화
LangChain을 사용 중이라면:
- **옵션 A**: Claude SDK 직접 호출로 전환 (이 프로젝트 방식)
- **옵션 B**: LangChain을 유지하되 LCEL(LangChain Expression Language) 스트리밍 활용
- **옵션 C**: LangChain의 Retriever만 사용하고, LLM 호출은 직접 처리

#### (3) 프롬프트 최적화
- 검색된 문서를 전부 넣지 말고, 관련도 높은 상위 3~5개만 포함
- 문서 전문 대신 핵심 내용만 추출하여 토큰 절약
- 대화 이력도 최근 10개로 제한

### 5.2 아키텍처 개선 (중기)

#### (1) 검색 레이턴시 줄이기
```
현재: 질문 → 임베딩 API 호출(100~500ms) → Milvus 검색(10~50ms)

개선안 1: 임베딩 캐싱
  - 자주 나오는 질문 패턴의 임베딩을 Redis에 캐시
  - 캐시 히트 시 임베딩 API 호출 생략

개선안 2: 하이브리드 검색
  - 1차: 키워드 검색 (PostgreSQL Full-Text Search, 빠름)
  - 2차: 벡터 검색 (Milvus, 의미 기반)
  - 두 결과를 합산하여 더 높은 검색 품질 달성

개선안 3: PostgreSQL pgvector
  - Milvus를 제거하고 PostgreSQL의 pgvector 확장 사용
  - KMS와 벡터 검색을 하나의 DB로 통합 → 네트워크 홉 1개 절약
```

#### (2) 상담AP ↔ Assist 통신 최적화
```
현재: 상담AP → HTTP 요청 → Assist 서버 → HTTP 응답 (전체 대기)

개선안: 상담AP → SSE/WebSocket → Assist 서버 → 스트리밍 응답
  - 상담AP 화면에서도 실시간 타이핑 효과 구현 가능
  - WebSocket이면 양방향 통신으로 중간 취소도 가능
```

### 5.3 고급 최적화 (장기)

#### (1) Semantic Caching
자주 묻는 질문의 답변을 캐싱하여 LLM 호출 자체를 생략.
```
질문 임베딩 → 캐시 검색 (유사도 > 0.95) → 캐시 히트 시 즉시 반환
                                         → 캐시 미스 시 RAG 파이프라인 실행
```

#### (2) 문서 청킹 전략 개선
큰 문서를 의미 단위로 분할하면 검색 정확도가 올라가고,
프롬프트에 불필요한 내용이 줄어 응답 속도도 빨라진다.

#### (3) 모델 선택 최적화
- 간단한 질문: Claude Haiku (빠르고 저렴)
- 복잡한 질문: Claude Sonnet (균형)
- 질문 복잡도를 사전 분류하여 모델을 동적으로 선택

---

## 6. FTS5 vs Vector Search 비교

| 항목 | FTS5 (키워드) | Vector Search (의미) |
|------|--------------|---------------------|
| 검색 방식 | 키워드 매칭 + BM25 랭킹 | 임베딩 유사도 (코사인/내적) |
| 장점 | 빠름, 외부 의존성 없음, 정확한 키워드 매칭 | 의미적 유사성 파악, 동의어/유사 표현 처리 |
| 단점 | 동의어/유사 표현 처리 어려움 | 임베딩 생성 지연, 별도 인프라 필요 |
| 적합한 경우 | 정형화된 문서, 키워드가 명확한 도메인 | 자연어 질문이 다양한 경우 |
| MVP 적합성 | 매우 높음 | 중간 (인프라 복잡도 증가) |

**추천**: MVP는 FTS5로 시작하고, 검색 품질이 부족하면 하이브리드(키워드 + 벡터)로 확장.

---

## 7. 이 프로젝트에서 LangChain/LangGraph를 쓰지 않은 이유

### LangChain을 쓰면 좋은 경우
- 여러 LLM 프로바이더를 교체해가며 테스트할 때
- 복잡한 에이전트 워크플로우 (도구 사용, 멀티스텝 추론)
- 다양한 데이터 소스를 통합할 때
- 팀원이 LangChain에 익숙하여 생산성이 높을 때

### 이 프로젝트에서 쓰지 않은 이유
- **단일 LLM (Claude)만 사용** → 프로바이더 추상화 불필요
- **단순한 RAG 파이프라인** → 검색 → 프롬프트 구성 → LLM 호출, 3단계뿐
- **성능 최우선** → 중간 레이어 제거로 지연시간 최소화
- **코드 투명성** → 동작을 100% 이해하고 디버깅 가능

### 직접 구현한 코드량
```
src/lib/claude.ts   - Claude API 호출 + 프롬프트 구성 (~60줄)
src/lib/search.ts   - FTS5 검색 헬퍼 (~25줄)
src/app/api/chat/   - RAG 엔드포인트 + SSE 스트리밍 (~85줄)
```
총 ~170줄. LangChain 없이도 RAG 파이프라인은 이 정도 코드로 충분하다.

---

## 8. 핵심 코드 스니펫

### SSE 스트리밍 응답 (서버)
```typescript
const stream = new ReadableStream({
  async start(controller) {
    // 메타데이터 전송 (대화 ID, 출처 문서)
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ type: 'meta', conversation_id, sources })}\n\n`
    ));

    // Claude 스트리밍 응답을 실시간 전달
    for await (const chunk of streamChatResponse(message, sources, history)) {
      controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ type: 'delta', content: chunk })}\n\n`
      ));
    }

    // 완료 신호
    controller.enqueue(encoder.encode(
      `data: ${JSON.stringify({ type: 'done' })}\n\n`
    ));
    controller.close();
  },
});

return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' },
});
```

### SSE 스트리밍 수신 (클라이언트)
```typescript
const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const lines = decoder.decode(value).split('\n\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));

    if (data.type === 'delta') {
      // 실시간으로 UI에 텍스트 추가
      appendToMessage(data.content);
    }
  }
}
```

---

## 9. 결론 및 제안

### 회사 프로젝트에 바로 시도해볼 것 (우선순위순)

1. **SSE 스트리밍 도입** → 체감 속도 즉시 개선 (작업량: 1~2일)
2. **LLM 호출 직접화** → LangChain 레이어 제거 또는 최소화 (작업량: 2~3일)
3. **검색 단계 병렬화** → 키워드 검색과 벡터 검색을 동시 실행 (작업량: 1일)
4. **프롬프트 토큰 최적화** → 불필요한 문서 내용 제거 (작업량: 0.5일)
5. **pgvector 검토** → Milvus 제거 가능 여부 평가 (작업량: 평가 1주)

### 기대 효과
- TTFT (첫 토큰 시간): 2~5초 → 0.3~0.8초
- 체감 응답 속도: 3~5배 향상
- 인프라 복잡도: Milvus 제거 시 운영 비용 절감
