import Database from 'better-sqlite3';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'todos.db');

// Ensure data directory exists
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    tags TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    sources TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );
`);

// FTS5
const ftsExists = db.prepare(
  "SELECT name FROM sqlite_master WHERE type='table' AND name='articles_fts'"
).get();

if (!ftsExists) {
  db.exec(`
    CREATE VIRTUAL TABLE articles_fts USING fts5(
      title, content, tags, content=articles, content_rowid=rowid
    );

    CREATE TRIGGER articles_ai AFTER INSERT ON articles BEGIN
      INSERT INTO articles_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;

    CREATE TRIGGER articles_ad AFTER DELETE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
    END;

    CREATE TRIGGER articles_au AFTER UPDATE ON articles BEGIN
      INSERT INTO articles_fts(articles_fts, rowid, title, content, tags)
      VALUES ('delete', old.rowid, old.title, old.content, old.tags);
      INSERT INTO articles_fts(rowid, title, content, tags)
      VALUES (new.rowid, new.title, new.content, new.tags);
    END;
  `);
}

const articles = [
  {
    title: '환불 정책 안내',
    content: `## 환불 정책

### 환불 가능 기간
- 상품 수령 후 7일 이내 환불 가능
- 디지털 콘텐츠는 다운로드 전까지만 환불 가능

### 환불 절차
1. 고객센터 또는 마이페이지에서 환불 요청
2. 상품 반송 (택배비 착불 - 고객 변심 시)
3. 반송 확인 후 영업일 기준 3-5일 이내 환불 처리
4. 카드결제: 카드사에 따라 2-3일 추가 소요
5. 계좌이체: 환불 계좌로 직접 입금

### 환불 불가 사항
- 상품 수령 후 7일 경과
- 상품 사용 흔적이 있는 경우
- 고객 과실로 상품이 훼손된 경우
- 식품, 화장품 등 위생상 반품이 어려운 경우

### 부분 환불
- 세트 상품 중 일부만 반품 시 부분 환불 가능
- 할인 적용 상품은 할인율에 따라 환불 금액 조정`,
    category: 'policy',
    tags: ['환불', '반품', '정책'],
  },
  {
    title: '배송 안내 및 배송 지연 처리 방법',
    content: `## 배송 안내

### 일반 배송
- 결제 완료 후 영업일 기준 1-3일 이내 출고
- 출고 후 1-2일 이내 배송 완료 (도서산간 제외)
- 도서산간 지역은 추가 1-2일 소요

### 배송 추적
- 마이페이지 > 주문내역에서 송장번호 확인
- CJ대한통운, 한진택배, 로젠택배 등 택배사 홈페이지에서 조회

### 배송 지연 시 안내 방법
1. 먼저 택배사 추적 시스템에서 현재 상태 확인
2. '배달 준비중'에서 2일 이상 변동 없을 경우:
   - 택배사 고객센터에 직접 문의 요청
   - 또는 우리 고객센터에서 택배사에 확인 후 고객에게 회신
3. 상품 분실이 확인된 경우:
   - 즉시 재발송 또는 환불 중 선택 안내
   - 재발송 시 당일 출고 처리

### 주소 변경
- 출고 전: 고객센터 또는 마이페이지에서 변경 가능
- 출고 후: 택배사에 직접 요청 필요`,
    category: 'procedure',
    tags: ['배송', '택배', '지연', '추적'],
  },
  {
    title: '회원 탈퇴 절차',
    content: `## 회원 탈퇴

### 탈퇴 전 확인 사항
- 미사용 포인트는 탈퇴 시 소멸됩니다
- 진행 중인 주문이 있으면 탈퇴가 불가합니다
- 쿠폰, 적립금 등 모든 혜택이 소멸됩니다
- 탈퇴 후 동일 아이디로 재가입이 30일간 불가합니다

### 탈퇴 방법
1. 웹사이트: 마이페이지 > 회원정보 > 회원탈퇴
2. 앱: 설정 > 계정 관리 > 회원 탈퇴
3. 고객센터: 본인 확인 후 대리 탈퇴 처리 가능

### 본인 확인 절차 (고객센터 탈퇴 시)
- 이름, 가입 이메일, 최근 주문번호 확인
- 또는 가입 시 등록한 휴대폰 번호로 인증

### 개인정보 보유
- 전자상거래법에 따라 거래 기록은 5년간 보관
- 개인정보는 탈퇴 즉시 파기 (법적 보관 의무 항목 제외)`,
    category: 'procedure',
    tags: ['회원탈퇴', '계정', '탈퇴'],
  },
  {
    title: '결제 오류 해결 가이드',
    content: `## 결제 오류 해결

### 자주 발생하는 결제 오류

#### 1. 카드 결제 실패
- **한도 초과**: 카드사 앱에서 한도 확인 후 재시도
- **카드 정보 오류**: 카드번호, 유효기간, CVC 재확인
- **3D Secure 인증 실패**: 카드사 앱에서 온라인 결제 설정 확인
- **해외 결제 차단**: 카드사에 해외 온라인 결제 허용 요청

#### 2. 간편결제 오류 (네이버페이, 카카오페이 등)
- 앱 최신 버전 업데이트 확인
- 결제 비밀번호 재설정 시도
- 앱 캐시 삭제 후 재시도

#### 3. 계좌이체 오류
- 이체 한도 확인
- 공인인증서/금융인증서 유효기간 확인
- 브라우저 보안 프로그램 설치 확인

### 결제 후 금액이 이중 차감된 경우
1. 대부분 승인 취소 건으로 3-5일 내 자동 취소
2. 5일 경과 후에도 미취소 시 카드사에 이의 제기
3. 고객센터에서 결제 내역 확인 후 수동 취소 처리 가능

### PG사 점검 시간
- 매월 셋째 주 일요일 01:00-05:00 정기점검
- 점검 중에는 카드결제 불가, 가상계좌는 가능`,
    category: 'troubleshooting',
    tags: ['결제', '오류', '카드', '간편결제'],
  },
  {
    title: '자주 묻는 질문 (FAQ) - 주문/배송',
    content: `## FAQ - 주문/배송

### Q: 주문 취소는 어떻게 하나요?
A: 마이페이지 > 주문내역에서 '주문취소' 버튼을 클릭하세요. 출고 전까지 취소 가능하며, 출고 후에는 반품 절차로 진행됩니다.

### Q: 배송비는 얼마인가요?
A: 3만원 이상 구매 시 무료배송입니다. 3만원 미만 주문 시 배송비 3,000원이 부과됩니다. 도서산간 지역은 추가 배송비 3,000원이 발생합니다.

### Q: 해외 배송이 가능한가요?
A: 현재 국내 배송만 지원하고 있습니다. 해외 배송 서비스는 준비 중이며, 출시 시 별도 안내드리겠습니다.

### Q: 선물 포장은 가능한가요?
A: 네, 주문 시 '선물 포장' 옵션을 선택하시면 됩니다. 선물 포장비는 2,000원이며, 메시지 카드를 함께 넣어드립니다.

### Q: 묶음 배송이 가능한가요?
A: 같은 날 주문한 상품 중 같은 배송지인 경우 자동으로 묶음 배송됩니다. 단, 출고 창고가 다른 경우 개별 배송될 수 있습니다.`,
    category: 'faq',
    tags: ['FAQ', '주문', '배송', '취소'],
  },
];

const insertStmt = db.prepare(`
  INSERT INTO articles (id, title, content, category, tags) VALUES (?, ?, ?, ?, ?)
`);

// Clear existing articles
db.prepare('DELETE FROM articles').run();

for (const article of articles) {
  insertStmt.run(
    uuidv4(),
    article.title,
    article.content,
    article.category,
    JSON.stringify(article.tags),
  );
}

// Rebuild FTS index
db.exec("INSERT INTO articles_fts(articles_fts) VALUES('rebuild')");

console.log(`Seeded ${articles.length} articles successfully.`);
db.close();
