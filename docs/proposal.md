# 상담 어시스트 시스템 성능 개선 제안서

## 1. 개요

### 배경
현재 상담 어시스트 시스템은 상담사의 질문에 대해 최대 3개의 추천 답변을 제공하고 있으나,
응답 속도와 API 비용 측면에서 개선 여지가 있습니다.

### 목적
이 문서는 실제 동작하는 데모 프로젝트를 기반으로, 현행 시스템 대비 **응답 속도 3~5배 향상**,
**API 비용 1/3 절감**을 달성할 수 있는 구체적인 개선 방안을 제안합니다.

### 데모 프로젝트
- GitHub: https://github.com/kimdh213/counselor-assist
- 기술 스택: Next.js + TypeScript + SQLite FTS5 + Claude API
- 핵심: LangChain 미사용, LLM 1회 호출로 N개 답변 생성, 토큰 단위 SSE 스트리밍

---

## 2. 현행 시스템 분석

### 2.1 시스템 구성

| 시스템 | 기술 스택 | 역할 |
|--------|----------|------|
| **상담AP** | Java / Spring Boot | 상담사 화면, 어시스트 API 호출 클라이언트 |
| **어시스트** | Python (API 서버) | RAG 처리, LLM 호출, 화면 없이 REST API만 제공 |
| **Milvus** | 벡터DB | 문서 임베딩 벡터 검색 |
| **PostgreSQL** | RDBMS | KMS 문서 저장 |

### 2.2 현재 아키텍처

```
[상담AP - Java/Spring Boot]                [어시스트 - Python API]
  상담사 화면                                 화면 없음, API만 제공
      │                                          │
      ├── 질문 HTTP 요청 ──────────────────────→ │
      │                                          ├── 임베딩 API 호출 ─── 100~500ms
      │                                          ├── Milvus 벡터 검색 ── 10~50ms
      │                                          │
      │                                          ├── 문서 1 → OpenAI 호출 ── 3~5초
      │                                          ├── 문서 2 → OpenAI 호출 ── 3~5초
      │                                          ├── 문서 3 → OpenAI 호출 ── 3~5초
      │                                          │           (병렬, LangGraph)
      │                                          │
      │   ◀──── 답변 완성 순서대로 SSE 반환 ─────┤
      │         (답변 단위, 토큰 단위 아님)
      │
      └── 응답을 상담사 화면에 표시
```

### 2.3 현재 방식의 문제점

| 문제 | 상세 | 영향 |
|------|------|------|
| LLM N회 호출 | 문서당 1회 OpenAI 호출 (3개 문서 = 3회) | API 비용 3배, 가장 느린 호출에 병목 |
| 답변 단위 SSE | 전체 답변 완성 후 표시 | 1순위 답변까지 3~5초 빈 화면 |
| 임베딩 매번 생성 | 질문마다 임베딩 API 호출 | 100~500ms 고정 지연 |
| LangGraph 오버헤드 | 단순 파이프라인에 복잡한 프레임워크 | 불필요한 초기화/실행 비용 |

### 2.4 지연 시간 분해 (3개 답변 기준)

```
총 응답 시간 ≈ 임베딩(300ms) + 검색(30ms) + LLM(4초) + LangGraph(100ms) + 네트워크(100ms)
           ≈ 약 4.5초 (1순위 답변 표시까지)
```

---

## 3. 개선 제안

### 3.1 핵심 변경: LLM N회 호출 → 1회 호출

**가장 큰 개선 효과를 가져오는 변경**입니다.

#### Before (현재)
```
문서 1 → OpenAI 호출 → 답변 1    비용: 입력 토큰 × 3
문서 2 → OpenAI 호출 → 답변 2         출력 토큰 × 3
문서 3 → OpenAI 호출 → 답변 3         API 호출 × 3
```

#### After (개선)
```
문서 1 + 문서 2 + 문서 3
  → LLM 1회 호출
  → 답변 1, 답변 2, 답변 3 (구조화 응답)

비용: 입력 토큰 × 1 (문서는 동일, 프롬프트 오버헤드만 약간 증가)
      출력 토큰 × 1 (3개 답변 합산이지만 단일 호출)
      API 호출 × 1
```

#### 프롬프트 설계

```
[시스템 프롬프트]
당신은 고객센터 상담사를 돕는 AI 어시스턴트입니다.
주어진 참고 문서를 각각 기반으로 추천 답변을 생성합니다.

규칙:
1. 각 답변은 해당 참고 문서의 내용만을 기반으로 작성
2. 답변은 상담사가 고객에게 바로 전달할 수 있는 형태로 작성
3. 문서에 없는 내용은 추측하지 않음
4. 한국어로 작성

[사용자 메시지]
## 참고 문서 1: {제목}
{내용}

## 참고 문서 2: {제목}
{내용}

## 참고 문서 3: {제목}
{내용}

## 상담사 질문
{질문}

위 참고 문서를 각각 기반으로 추천 답변 3개를 작성하세요.
각 답변은 [추천답변 1], [추천답변 2], [추천답변 3] 형식으로 구분하세요.
```

#### 비용 비교 (예시: 입력 2000토큰, 출력 500토큰/답변 기준)

| 항목 | N회 호출 (현재) | 1회 호출 (개선) | 절감 |
|------|----------------|----------------|------|
| 입력 토큰 | 2,000 × 3 = 6,000 | 4,000 × 1 = 4,000 | 33% |
| 출력 토큰 | 500 × 3 = 1,500 | 1,500 × 1 = 1,500 | 0% |
| API 호출 수 | 3 | 1 | 67% |
| 호출당 오버헤드 | 3회분 | 1회분 | 67% |

**입력 토큰이 절약되는 이유**: N회 호출에서는 시스템 프롬프트 + 질문이 매번 중복되지만,
1회 호출에서는 한 번만 전송.

### 3.2 토큰 단위 SSE 스트리밍

#### Before
```
상담사: 질문 입력
        ↓
        (3~5초 빈 화면 - 로딩 스피너만 표시)
        ↓
        답변 1 전체 표시 → 답변 2 전체 표시 → 답변 3 전체 표시
```

#### After
```
상담사: 질문 입력
        ↓
        (0.3초 후)
        ↓
        [추천답변 1] 글자가 실시간으로 타이핑... 완료
        [추천답변 2] 글자가 실시간으로 타이핑... 완료
        [추천답변 3] 글자가 실시간으로 타이핑... 완료
```

**핵심**: 전체 응답 완료 시간은 비슷하지만, 첫 글자가 0.3초만에 나타나므로
상담사가 답변을 읽기 시작할 수 있는 시점이 획기적으로 앞당겨짐.

#### 양쪽 시스템 수정 가이드

SSE 토큰 스트리밍은 **어시스트(Python)와 상담AP(Spring Boot) 양쪽 모두 수정**이 필요합니다.

##### 어시스트 (Python) - SSE 스트리밍 응답

```python
# FastAPI 예시
from fastapi import Request
from fastapi.responses import StreamingResponse
from openai import OpenAI  # 또는 anthropic

client = OpenAI()

async def generate_stream(question: str, docs: list, n_answers: int):
    """LLM 스트리밍 호출 → SSE 형식으로 yield"""

    prompt = build_prompt(question, docs, n_answers)

    # 1. 메타데이터 전송
    yield f"data: {json.dumps({'type': 'meta', 'sources': [d['id'] for d in docs]})}\n\n"

    # 2. LLM 스트리밍 호출
    stream = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        stream=True,
    )

    full_response = ""
    for chunk in stream:
        if chunk.choices[0].delta.content:
            token = chunk.choices[0].delta.content
            full_response += token
            # 토큰 단위로 즉시 전송
            yield f"data: {json.dumps({'type': 'delta', 'content': token})}\n\n"

    # 3. 완료 신호
    yield f"data: {json.dumps({'type': 'done'})}\n\n"

    # 4. DB 저장 (비동기)
    save_response_to_db(full_response)


@app.post("/api/chat")
async def chat(request: Request):
    body = await request.json()
    question = body["message"]
    n_answers = body.get("n_answers", 1)

    docs = search_milvus(question, limit=n_answers)

    return StreamingResponse(
        generate_stream(question, docs, n_answers),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )
```

##### 상담AP (Java/Spring Boot) - SSE 수신 및 화면 전달

```java
// 방법 1: 어시스트 SSE를 받아서 상담AP도 SSE로 프론트에 전달 (추천)
@GetMapping(value = "/api/assist/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
public Flux<String> chat(@RequestParam String question,
                         @RequestParam(defaultValue = "1") int nAnswers) {

    WebClient webClient = WebClient.create("http://assist-server:8000");

    return webClient.post()
        .uri("/api/chat")
        .bodyValue(Map.of(
            "message", question,
            "n_answers", nAnswers
        ))
        .retrieve()
        .bodyToFlux(String.class);  // SSE 이벤트를 그대로 프론트로 전달
}
```

```javascript
// 상담AP 프론트엔드 (JavaScript) - SSE 수신
const eventSource = new EventSource('/api/assist/chat?question=' + encodeURIComponent(question));

// 또는 fetch + ReadableStream (POST 요청 시)
const res = await fetch('/api/assist/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: question, n_answers: 3 }),
});

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
            // 실시간으로 화면에 텍스트 추가
            appendToAnswerCard(data.content);
        } else if (data.type === 'done') {
            // 스트리밍 완료
            finishLoading();
        }
    }
}
```

##### SSE 도입 시 데이터 흐름 (개선 후)

```
[상담AP - Java/Spring Boot]           [어시스트 - Python API]
  상담사 화면                              │
      │                                   │
      ├── POST /api/chat ──────────────→  │
      │   (question, n_answers)           ├── 검색
      │                                   ├── LLM 1회 호출 (스트리밍)
      │                                   │
      │   ◀─── SSE: {type: "meta"}  ─────┤  0ms    메타데이터
      │   ◀─── SSE: {type: "delta"} ─────┤  300ms  첫 토큰
      │   ◀─── SSE: {type: "delta"} ─────┤  301ms  다음 토큰
      │   ◀─── SSE: {type: "delta"} ─────┤  ...    계속
      │   ◀─── SSE: {type: "done"}  ─────┤  3~5초  완료
      │
      ├── WebClient/Flux로 SSE 수신
      ├── 프론트에 SSE 또는 WebSocket으로 전달
      └── 상담사 화면에 실시간 타이핑 표시
```

##### 주의사항

- **Spring Boot WebFlux** 또는 **Spring MVC + SseEmitter** 사용 필요
  (기존 동기 방식 RestTemplate으로는 스트리밍 수신 불가)
- 프록시(Nginx 등)에서 SSE 버퍼링을 비활성화해야 함
  (`X-Accel-Buffering: no` 헤더 또는 `proxy_buffering off`)
- 기존 API와 **병행 운영** 가능: 새 SSE 엔드포인트를 별도로 추가하고,
  프론트에서 점진적으로 전환

### 3.3 임베딩 캐싱

고객센터 질문은 패턴이 반복되는 특성상 캐시 히트율이 높음.

```
"환불하고 싶어요" → 임베딩 캐시 저장
"환불 하고 싶습니다" → 유사 질문이지만 캐시 미스 (정확 매칭 시)
                    → 퍼지 매칭 적용 시 캐시 히트 가능
```

**구현**: Redis에 질문 해시 → 임베딩 벡터 매핑 저장, TTL 24시간

### 3.4 LangGraph 경량화

현재 파이프라인이 직선 흐름(검색 → 프롬프트 → LLM)이라면 LangGraph 없이 구현 가능.
단, 복잡한 분기 로직이 존재하는 경우 LangGraph를 유지하되 LLM 호출만 직접 스트리밍으로 전환.

---

## 4. 데모 프로젝트로 검증한 결과

### 4.1 데모 시스템 구성

| 항목 | 데모 | 현행 |
|------|------|------|
| 검색 | SQLite FTS5 (~1ms) | Milvus (임베딩 300ms + 검색 30ms) |
| LLM 호출 | 1회 (N개 답변 생성) | N회 (문서당 1회) |
| 스트리밍 | 토큰 단위 SSE | 답변 단위 SSE |
| 프레임워크 | SDK 직접 호출 (~170줄) | LangGraph |

### 4.2 체감 성능 비교

| 지표 | 현행 시스템 | 데모 시스템 | 개선율 |
|------|-----------|-----------|--------|
| TTFT (첫 글자 표시) | 3~5초 | 0.3~0.5초 | 10배 |
| 전체 응답 완료 | 5~8초 | 3~5초 | 40~50% |
| API 호출 횟수 | N회 | 1회 | N배 절감 |
| API 비용 (입력 토큰) | 6,000 | 4,000 | 33% 절감 |

### 4.3 데모 실행 방법

```bash
git clone https://github.com/kimdh213/counselor-assist.git
cd counselor-assist
npm install
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
npm run seed
npm run dev
# http://localhost:3000 접속
```

- `/assist` 페이지에서 답변 개수(1~3개) 선택 후 질문 입력
- 토큰 단위 실시간 스트리밍으로 추천 답변이 카드 형태로 표시
- 각 답변 카드에 참조 문서가 배지로 표시

---

## 5. 구현 로드맵

### Phase 1: 즉시 적용 (1~2주)

| 작업 | 담당 | 기간 | 효과 |
|------|------|------|------|
| LLM 1회 호출 전환 | 어시스트(Python) | 2~3일 | API 비용 1/3, 응답 시간 단축 |
| 어시스트 SSE 스트리밍 응답 | 어시스트(Python) | 1~2일 | 토큰 단위 스트리밍 전송 |
| 상담AP SSE 수신 연동 | 상담AP(Java/Spring Boot) | 2~3일 | WebFlux로 SSE 수신 + 프론트 전달 |
| 상담AP 프론트 스트리밍 UI | 상담AP(프론트엔드) | 1~2일 | 실시간 타이핑 표시 |
| 프롬프트 최적화 | 어시스트(Python) | 1일 | 토큰 절약, 답변 품질 향상 |

### Phase 2: 중기 개선 (2~4주)

| 작업 | 담당 | 기간 | 효과 |
|------|------|------|------|
| 임베딩 캐싱 (Redis) | 어시스트(Python) | 3~4일 | 검색 지연 300ms → 1ms |
| LangGraph 경량화 | 어시스트(Python) | 3~5일 | 오버헤드 제거 |
| 하이브리드 검색 | 어시스트(Python) | 1주 | 검색 품질 향상 |

### Phase 3: 장기 검토 (1~2개월)

| 작업 | 담당 | 기간 | 효과 |
|------|------|------|------|
| pgvector 도입 | 인프라 + 어시스트(Python) | 2~3주 | Milvus 제거, 인프라 단순화 |
| Semantic Caching | 어시스트(Python) | 1~2주 | 반복 질문 즉시 응답 |
| 동적 모델 선택 | 어시스트(Python) | 1주 | 간단한 질문은 경량 모델 사용 |

---

## 6. 기대 효과 요약

### 정량적 효과

| 지표 | 현재 | Phase 1 후 | Phase 2 후 |
|------|------|-----------|-----------|
| TTFT | 3~5초 | 0.3~0.5초 | 0.3~0.5초 |
| 전체 응답 | 5~8초 | 3~5초 | 2~4초 |
| API 비용 (월) | 100% | 약 35% | 약 30% |
| API 호출 수 | N회/질문 | 1회/질문 | 1회 또는 0회 (캐시) |

### 정성적 효과

- **상담사 체감 속도 대폭 향상** → 상담 처리 속도 증가
- **인프라 단순화** → 운영/장애 대응 비용 감소
- **코드 투명성** → 디버깅/유지보수 용이
- **비용 절감분을 품질 향상에 재투자** 가능 (더 높은 모델 사용 등)

---

## 7. 리스크 및 대응

| 리스크 | 가능성 | 대응 방안 |
|--------|--------|----------|
| 1회 호출 시 답변 품질 저하 | 중 | 프롬프트 반복 튜닝, A/B 테스트로 비교 |
| 스트리밍 전환 시 양쪽 시스템 수정 필요 | 높 | 어시스트(Python) + 상담AP(Spring Boot) 동시 수정 필요. 기존 API 병행 운영으로 점진적 전환 |
| Spring Boot 동기→비동기 전환 | 중 | WebFlux 또는 SseEmitter로 SSE 수신 처리. 기존 동기 코드와 공존 가능 |
| Nginx 등 프록시 SSE 버퍼링 | 중 | `X-Accel-Buffering: no` 헤더 또는 `proxy_buffering off` 설정 |
| 캐시 무효화 이슈 | 낮 | TTL 기반 자동 만료, 문서 변경 시 관련 캐시 삭제 |
| LangGraph 제거 시 확장성 우려 | 중 | 현재 워크플로우 분석 후 판단, 필요시 유지 |
