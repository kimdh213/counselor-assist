# 회사 PC에서 이어서 진행하기

## 1. 환경 세팅

```bash
# 프로젝트 클론
git clone https://github.com/kimdh213/counselor-assist.git
cd counselor-assist

# 의존성 설치
npm install

# API 키 설정 (Anthropic Console에서 발급)
echo 'ANTHROPIC_API_KEY=sk-ant-...' > .env.local

# 샘플 데이터 등록
npm run seed

# 개발 서버 실행
npm run dev
```

http://localhost:3000 접속 → `/assist` 페이지에서 데모 확인

## 2. 데모 확인 포인트

1. **1개 답변 모드**: 헤더에서 "1개" 선택 → 일반 채팅처럼 스트리밍 답변
2. **3개 답변 모드**: 헤더에서 "3개" 선택 → 컬러 카드 3장이 스트리밍으로 표시
3. **KMS 관리** (`/kms`): 문서 추가/편집/삭제 → 검색 결과에 바로 반영
4. **대화 기록** (`/history`): 과거 대화 확인 + "대화 계속하기"

## 3. 회사 동료에게 보여줄 때

### 핵심 메시지
> "같은 3개 추천답변인데, 우리는 OpenAI를 3번 호출하고 이건 1번만 호출한다.
> 비용 1/3이고 첫 글자가 0.3초만에 나온다."

### 데모 시나리오
1. "3개" 모드로 "환불 정책 알려줘" 입력
2. 카드 3장이 실시간으로 타이핑되는 걸 보여줌
3. 회사 시스템과 체감 속도 차이 비교
4. `docs/proposal.md` 공유 → 구체적 개선 방안 + 코드 예시

## 4. 회사 프로젝트에 실제 적용할 때

### Phase 1 작업 (1~2주, 가장 효과 큼)

#### 어시스트 (Python) 수정
1. **프롬프트 변경**: N개 문서를 1개 프롬프트에 넣고 N개 답변 요청
2. **SSE 스트리밍**: FastAPI StreamingResponse로 토큰 단위 전송
3. 코드 예시: `docs/proposal.md` → 3.2절 Python 코드 참고

#### 상담AP (Java/Spring Boot) 수정
1. **SSE 수신**: WebClient + Flux로 어시스트 SSE 수신
2. **프론트 전달**: SSE 또는 WebSocket으로 상담사 화면에 전달
3. **UI 변경**: 답변 카드에 실시간 타이핑 표시
4. 코드 예시: `docs/proposal.md` → 3.2절 Spring Boot + JS 코드 참고

#### 주의사항
- Nginx 프록시 사용 시 SSE 버퍼링 비활성화 필요
- 기존 API와 병행 운영 가능 (새 엔드포인트 추가 방식)

## 5. Claude Code에서 이어서 작업할 때

회사 PC에서 Claude Code를 열고:

```bash
cd counselor-assist
claude
```

첫 대화에서:

```
이 프로젝트의 docs/conversation-summary.md 를 읽고 맥락을 파악해줘.
회사 상담 어시스트 시스템 개선 작업을 이어서 하려고 해.

회사 시스템 정보:
- 상담AP: Java/Spring Boot (상담사 화면)
- 어시스트: Python API (RAG 처리)
- DB: PostgreSQL(KMS) + Milvus(벡터)
- LLM: OpenAI, LangGraph 사용
- 현재 문서별 OpenAI 병렬 호출, 답변 단위 SSE
```

이렇게 하면 맥락을 바로 파악하고 이어서 작업할 수 있습니다.

## 6. 프로젝트 파일 구조 (참고)

```
docs/
├── conversation-summary.md   ← 지금까지 대화 요약
├── next-steps.md              ← 이 문서 (다음 단계 가이드)
├── proposal.md                ← 회사 제안서 (코드 예시 포함)
└── architecture-analysis.md   ← 아키텍처 분석 + 제안 우선순위

src/
├── lib/          # 핵심 로직 (types, db, search, claude)
├── app/api/      # API 라우트
├── app/assist/   # 채팅 페이지
├── app/kms/      # KMS 페이지
├── app/history/  # 대화 기록 페이지
├── components/   # UI 컴포넌트
└── hooks/        # 커스텀 훅

scripts/
└── seed.ts       # 샘플 데이터
```
