# 대화 요약 (2026-02-28)

## 진행한 작업

### 1. 프로젝트 생성 및 구현
- `/Users/dohyoungkim/dev/projects/counselor-assist`에 Next.js 16 프로젝트 생성
- 의존성: better-sqlite3, uuid, @anthropic-ai/sdk
- 전체 구현 완료 후 `npm run build` 성공 확인

### 2. 구현된 기능

#### 백엔드 (src/lib/, src/app/api/)
- **SQLite + FTS5 전문검색**: BM25 랭킹 기반 문서 검색 (~1ms)
- **Claude API 직접 호출**: LangChain/LangGraph 미사용, SDK 직접 호출 (~170줄)
- **SSE 스트리밍**: 토큰 단위 실시간 응답 전송
- **N개 추천답변**: 1회 LLM 호출로 최대 3개 답변 생성 (회사 방식은 N회 호출)
- Articles CRUD API, Conversations CRUD API, Chat API, Search API

#### 프론트엔드 (src/components/, src/hooks/)
- **상담 어시스트** (`/assist`): 채팅 UI, 1/2/3개 답변 토글, 추천답변 카드 UI
- **KMS 관리** (`/kms`): 문서 CRUD, 카테고리 필터, 검색
- **대화 기록** (`/history`): 대화 목록, 상세 보기, 대화 계속하기
- 모바일 퍼스트 반응형 (사이드바 + 하단 탭)

#### 샘플 데이터 (scripts/seed.ts)
- 환불 정책, 배송 안내, 회원 탈퇴, 결제 오류, FAQ 등 5개 문서
- `npm run seed`로 등록

### 3. 작성된 문서

#### docs/architecture-analysis.md
- 이 프로젝트가 빠른 이유 분석 (LangChain 미사용, FTS5, SSE)
- FTS5 vs Vector Search 비교
- 회사 프로젝트 현황 분석 (Milvus + OpenAI N회 호출 + LangGraph)
- 제안 우선순위 로드맵 (5단계)

#### docs/proposal.md
- 회사 제안용 공식 문서
- 현행 시스템 구성 반영: 상담AP(Java/Spring Boot) ↔ 어시스트(Python API)
- LLM N회 → 1회 호출 전환 제안 + 비용 비교
- 양쪽 시스템 SSE 구현 가이드 (Python FastAPI + Spring Boot WebFlux + 프론트 JS)
- 구현 로드맵 (Phase 1~3), 기대 효과, 리스크 대응

### 4. 대화 중 확인된 회사 프로젝트 정보

| 항목 | 내용 |
|------|------|
| 상담AP | Java / Spring Boot (상담사 화면) |
| 어시스트 | Python (API 서버만, 화면 없음) |
| 벡터DB | Milvus |
| KMS DB | PostgreSQL |
| LLM | OpenAI |
| 프레임워크 | LangGraph |
| 추천답변 | 최대 3개, 고객사 설정에 따라 1~3개 |
| 답변 생성 방식 | 검색 결과 상위 N개 문서를 각각 OpenAI에 호출 (병렬) |
| SSE 방식 | 답변 단위 SSE (토큰 스트리밍 아님, 답변 완성 후 순위별 표시) |

### 5. 핵심 개선 제안 요약

| 순서 | 개선 | 효과 |
|------|------|------|
| 1 | LLM N회 → 1회 호출 | API 비용 1/3 |
| 2 | 토큰 단위 SSE 스트리밍 (양쪽 수정) | TTFT 3~5초 → 0.3초 |
| 3 | 임베딩 캐싱 | 검색 지연 500ms → 1ms |
| 4 | LangGraph 경량화/제거 | 오버헤드 제거 |
| 5 | pgvector 도입 | Milvus 제거, 인프라 단순화 |
