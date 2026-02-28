# Counselor Assist

고객센터 상담사를 위한 AI 기반 상담 어시스트 시스템.
KMS(지식관리시스템) 문서를 기반으로 Claude API가 실시간 스트리밍 답변을 생성하는 RAG 시스템입니다.

## 주요 특징

- **RAG 파이프라인**: SQLite FTS5 전문검색(BM25) → 프롬프트 구성 → Claude API 스트리밍
- **LangChain 미사용**: Anthropic SDK 직접 호출로 지연시간 최소화 (~170줄)
- **SSE 스트리밍**: 첫 토큰 0.3~0.5초, 실시간 타이핑 효과
- **외부 의존성 제로**: 벡터DB 없이 SQLite만으로 동작
- **모바일 퍼스트**: 데스크탑 사이드바 + 모바일 하단 탭 반응형 레이아웃

## 기술 스택

| 구분 | 기술 |
|------|------|
| Framework | Next.js 16 (App Router) + TypeScript |
| Styling | TailwindCSS v4 |
| Database | SQLite (better-sqlite3) + FTS5 전문검색 |
| LLM | Claude API (`@anthropic-ai/sdk`) |
| 응답 방식 | SSE (Server-Sent Events) |

## 빠른 시작

### 1. 클론 및 의존성 설치

```bash
git clone https://github.com/kimdh213/counselor-assist.git
cd counselor-assist
npm install
```

### 2. API 키 설정

[Anthropic Console](https://console.anthropic.com)에서 API 키를 발급받은 후:

```bash
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local
```

### 3. 샘플 데이터 등록

```bash
npm run seed
```

환불 정책, 배송 안내, 회원 탈퇴, 결제 오류, FAQ 등 5개 샘플 문서가 등록됩니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

http://localhost:3000 접속 → `/assist` 페이지로 자동 이동됩니다.

## 화면 구성

| 경로 | 설명 |
|------|------|
| `/assist` | 상담 어시스트 채팅 (메인 화면) |
| `/kms` | KMS 문서 관리 (CRUD, 검색, 카테고리 필터) |
| `/history` | 대화 기록 목록 및 상세 보기 |

## API 엔드포인트

| Method | Route | 설명 |
|--------|-------|------|
| GET | `/api/articles?category=X&q=search` | 문서 목록 |
| POST | `/api/articles` | 문서 생성 |
| GET | `/api/articles/[id]` | 문서 조회 |
| PUT | `/api/articles/[id]` | 문서 수정 |
| DELETE | `/api/articles/[id]` | 문서 삭제 |
| GET | `/api/conversations` | 대화 목록 |
| POST | `/api/conversations` | 대화 생성 |
| GET | `/api/conversations/[id]` | 대화+메시지 조회 |
| DELETE | `/api/conversations/[id]` | 대화 삭제 |
| POST | `/api/chat` | RAG 채팅 (SSE 스트리밍) |
| GET | `/api/search?q=keyword` | FTS5 문서 검색 |

## RAG 파이프라인 흐름

```
사용자 질문
  │
  ├─ 1. DB 저장 (user 메시지)
  │
  ├─ 2. [Retrieval] FTS5 검색 → 관련 문서 상위 5개 (BM25 랭킹)
  │
  ├─ 3. [Augmentation] 검색 문서 + 대화 이력(최근 10개) → 프롬프트 구성
  │
  ├─ 4. [Generation] Claude API 스트리밍 호출 → SSE로 실시간 전송
  │
  └─ 5. DB 저장 (assistant 메시지 + 출처 문서 ID)
```

## 프로젝트 구조

```
src/
├── lib/
│   ├── types.ts          # 타입 정의
│   ├── db.ts             # SQLite 싱글턴 + 스키마 + FTS5
│   ├── search.ts         # FTS5 검색 헬퍼
│   └── claude.ts         # Claude API 클라이언트 + RAG 프롬프트
├── app/
│   ├── api/              # API 라우트 핸들러
│   ├── assist/page.tsx   # 채팅 페이지
│   ├── kms/              # KMS 관리 페이지
│   └── history/          # 대화 기록 페이지
├── components/
│   ├── assist/           # 채팅 UI 컴포넌트
│   ├── kms/              # KMS UI 컴포넌트
│   ├── history/          # 대화 기록 UI 컴포넌트
│   └── layout/           # 사이드바, 모바일 네비게이션
├── hooks/                # 데이터 패칭 커스텀 훅
scripts/
└── seed.ts               # 샘플 데이터 시딩
docs/
└── architecture-analysis.md  # 아키텍처 분석 및 성능 비교 문서
```

## 아키텍처 비교 문서

`docs/architecture-analysis.md`에 다음 내용이 정리되어 있습니다:

- 이 프로젝트가 빠른 이유 (LangChain 미사용, FTS5, SSE)
- FTS5 vs Vector Search 비교표
- 기존 시스템(Milvus + PostgreSQL) 대비 개선 포인트
- 회사 프로젝트에 적용 가능한 최적화 로드맵
- 핵심 코드 스니펫
